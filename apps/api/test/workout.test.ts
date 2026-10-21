import type { RoutineDTO, SessionSummary, TodayResponse } from "@lifemaxxing/core";
import { beforeAll, describe, expect, it } from "vitest";
import { mobileUser, testApp, uuid, type Client } from "./helpers";

const app = testApp();
let renzo: Client;
let otro: Client;

beforeAll(async () => {
  renzo = await mobileUser(app, "renzo.test@example.com", "Renzo");
  otro = await mobileUser(app, "otro.test@example.com", "Otro");
});

const work = (exerciseId: string, setIndex: number, weightKg: number, reps: number, extra: object = {}) => ({
  clientId: uuid(),
  exerciseId,
  kind: "work",
  setIndex,
  weightKg,
  reps,
  ...extra,
});

describe("programa", () => {
  it("rutinas de la fase 1 con ejercicios, series y alternativas", async () => {
    const r = await renzo.req("GET", "/api/program/routines?phase=1");
    expect(r.status).toBe(200);
    const routines: RoutineDTO[] = r.json.routines;
    expect(routines.map((x) => x.key)).toEqual(["A", "B", "C"]);
    const a = routines[0];
    expect(a.exercises.map((e) => e.exerciseId)).toEqual(["inc", "ohp", "tri", "lat", "knee"]);
    expect(a.exercises[0].sets.map((s) => [s.repsMin, s.repsMax, s.restSec])).toEqual([[4, 5, 180], [6, 7, 180], [8, 10, 270]]);
    expect(a.exercises[0].warmup).toEqual([[0.5, 6], [0.7, 5], [0.8, 3]]);
    const jal = routines[1].exercises.find((e) => e.exerciseId === "jal")!;
    expect(jal.alt?.id).toBe("chin_w");
    const p2 = await renzo.req("GET", "/api/program/routines?phase=3");
    expect(p2.json.templatePhase).toBe(1);
  });

  it("hoy (lunes 19-oct) toca A y los básicos requieren calibración", async () => {
    const r = await renzo.req("GET", "/api/program/today?date=2026-10-19");
    expect(r.status).toBe(200);
    const t: TodayResponse = r.json;
    expect(t.position.week).toBe(1);
    expect(t.suggestedKey).toBe("A");
    const inc = t.routines[0].exercises[0];
    expect(t.suggestions[inc.id].status).toBe("needs_calibration");
    const lat = t.routines[0].exercises[3];
    expect(t.suggestions[lat.id].status).toBe("none");
    expect(t.activeSession).toBeNull();
  });

  it("martes sugiere la próxima sesión (B el miércoles)", async () => {
    const t: TodayResponse = (await renzo.req("GET", "/api/program/today?date=2026-10-20")).json;
    expect(t.position.routineKey).toBeNull();
    expect(t.next.routineKey).toBe("B");
    expect(t.suggestedKey).toBe("B");
  });
});

describe("entreno completo (Workout A)", () => {
  let routineA: RoutineDTO;
  let sessionId: string;
  const incId = () => routineA.exercises[0].id;

  beforeAll(async () => {
    routineA = (await renzo.req("GET", "/api/program/routines?phase=1")).json.routines[0];
  });

  it("inicia la sesión y no permite otra en curso", async () => {
    const r = await renzo.req("POST", "/api/sessions", { routineId: routineA.id, date: "2026-10-19" });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ routineKey: "A", programWeek: 1, phaseId: 1, status: "in_progress" });
    sessionId = r.json.id;
    const again = await renzo.req("POST", "/api/sessions", { routineId: routineA.id });
    expect(again.status).toBe(409);
    expect(again.json.error.details.activeSessionId).toBe(sessionId);
    const active = await renzo.req("GET", "/api/sessions/active");
    expect(active.json.session.id).toBe(sessionId);
  });

  it("calibra el press inclinado: 60 × 6 RIR 1 → 62.5 / 57.5 / 52.5", async () => {
    const test = await renzo.req("POST", `/api/sessions/${sessionId}/sets`, {
      clientId: uuid(), exerciseId: "inc", kind: "test", setIndex: 1, weightKg: 60, reps: 6, rir: 1,
    });
    expect(test.status).toBe(200);
    const r = await renzo.req("POST", `/api/sessions/${sessionId}/calibrations`, { exerciseId: "inc", weightKg: 60, reps: 6, rir: 1 });
    expect(r.status).toBe(201);
    expect(r.json.e1rmKg).toBeCloseTo(74, 5);
    expect(r.json.loads).toEqual([62.5, 57.5, 52.5]);
    const bad = await renzo.req("POST", `/api/sessions/${sessionId}/calibrations`, { exerciseId: "bul", weightKg: 12, reps: 8, rir: 1 });
    expect(bad.status).toBe(400);
  });

  it("guarda series en lote y el upsert por client_id es idempotente", async () => {
    const s1 = work("inc", 1, 62.5, 5, { targetMin: 4, targetMax: 5, restSec: 180 });
    const batch = [s1, work("inc", 2, 57.5, 7), work("inc", 3, 52.5, 9), work("ohp", 1, 40, 7), work("ohp", 2, 35, 9), work("ohp", 3, 32.5, 10)];
    const r = await renzo.req("POST", `/api/sessions/${sessionId}/sets`, { sets: batch });
    expect(r.status).toBe(200);
    expect(r.json.sets).toHaveLength(6);
    // Reintento con la misma serie (y una corrección de reps): no duplica
    const retry = await renzo.req("POST", `/api/sessions/${sessionId}/sets`, { ...s1, reps: 4 });
    expect(retry.status).toBe(200);
    const again = await renzo.req("POST", `/api/sessions/${sessionId}/sets`, { ...s1, reps: 5 });
    expect(again.json.sets[0].id).toBe(r.json.sets[0].id);
    const active = await renzo.req("GET", "/api/sessions/active");
    const works = active.json.session.sets.filter((x: { kind: string }) => x.kind === "work");
    expect(works).toHaveLength(6);
    expect(works.find((x: { clientId: string }) => x.clientId === s1.clientId).reps).toBe(5);
    // Ejercicio inexistente
    const unk = await renzo.req("POST", `/api/sessions/${sessionId}/sets`, work("nope", 1, 10, 5));
    expect(unk.status).toBe(400);
  });

  it("otro usuario no puede leer ni escribir esta sesión", async () => {
    expect((await otro.req("GET", `/api/sessions/${sessionId}`)).status).toBe(404);
    expect((await otro.req("POST", `/api/sessions/${sessionId}/sets`, work("inc", 1, 100, 5))).status).toBe(404);
    expect((await otro.req("POST", `/api/sessions/${sessionId}/finish`)).status).toBe(404);
    expect((await otro.req("POST", `/api/sessions/${sessionId}/discard`)).status).toBe(404);
    expect((await otro.req("GET", "/api/sessions/active")).json.session).toBeNull();
  });

  it("no se puede reutilizar un client_id de otra sesión", async () => {
    const mine = (await renzo.req("GET", "/api/sessions/active")).json.session.sets[0].clientId;
    const s = await otro.req("POST", "/api/sessions", { routineId: routineA.id, date: "2026-10-19" });
    const r = await otro.req("POST", `/api/sessions/${s.json.id}/sets`, { ...work("inc", 1, 1, 1), clientId: mine });
    expect(r.status).toBe(409);
    await otro.req("POST", `/api/sessions/${s.json.id}/discard`);
  });

  it("finish devuelve el resumen y queda en el historial", async () => {
    const r = await renzo.req("POST", `/api/sessions/${sessionId}/finish`);
    expect(r.status).toBe(200);
    const sum: SessionSummary = r.json;
    expect(sum.setsCount).toBe(6);
    expect(sum.volumeKg).toBe(62.5 * 5 + 57.5 * 7 + 52.5 * 9 + 40 * 7 + 35 * 9 + 32.5 * 10);
    expect(sum.recordsCount).toBe(0);
    const inc = sum.exercises.find((e) => e.exerciseId === "inc")!;
    expect(inc.calibration).toMatchObject({ weightKg: 60, reps: 6, rir: 1 });
    expect(inc.next).toEqual([65, 60, 52.5]); // series 1 y 2 llegaron al tope → +2.5
    expect(inc.reachedTop).toBe(true);
    const tri = sum.exercises.find((e) => e.exerciseId === "tri")!;
    expect(tri.skipped).toBe(true);
    expect(sum.highlights).toBe("Press inclinado 62.5 × 5 · Press militar 40 × 7");

    expect((await renzo.req("POST", `/api/sessions/${sessionId}/finish`)).status).toBe(409);
    expect((await renzo.req("POST", `/api/sessions/${sessionId}/sets`, work("inc", 4, 1, 1))).status).toBe(409);

    const hist = await renzo.req("GET", "/api/sessions?limit=10");
    expect(hist.json.items).toHaveLength(1);
    expect(hist.json.items[0]).toMatchObject({ id: sessionId, routineKey: "A", setsCount: 6 });
    expect((await otro.req("GET", "/api/sessions")).json.items).toHaveLength(0);
  });

  it("la siguiente vez sugiere la doble progresión", async () => {
    const t: TodayResponse = (await renzo.req("GET", "/api/program/today?date=2026-10-23")).json;
    const s = t.suggestions[incId()];
    expect(s.status).toBe("progress");
    expect(s.weights).toEqual([65, 60, 52.5]);
    expect(s.reps).toEqual([4, 6, 10]);
    expect(s.reachedTop).toBe(true);
    expect(t.weekDone.length).toBeGreaterThanOrEqual(0);
  });

  it("una serie mejor marca récord", async () => {
    const s = await renzo.req("POST", "/api/sessions", { routineId: routineA.id, date: "2026-10-23" });
    await renzo.req("POST", `/api/sessions/${s.json.id}/sets`, { sets: [work("inc", 1, 65, 5), work("inc", 2, 57.5, 7)] });
    const sum: SessionSummary = (await renzo.req("POST", `/api/sessions/${s.json.id}/finish`)).json;
    expect(sum.recordsCount).toBe(1);
    expect(sum.exercises.find((e) => e.exerciseId === "inc")!.isRecord).toBe(true);
  });

  it("finish sin series → 400; discard la cierra", async () => {
    const s = await renzo.req("POST", "/api/sessions", { routineId: routineA.id });
    const f = await renzo.req("POST", `/api/sessions/${s.json.id}/finish`);
    expect(f.status).toBe(400);
    expect(f.json.error.code).toBe("empty_session");
    expect((await renzo.req("POST", `/api/sessions/${s.json.id}/discard`)).status).toBe(200);
    expect((await renzo.req("GET", "/api/sessions/active")).json.session).toBeNull();
  });

  it("estadísticas con datos reales", async () => {
    const ov = await renzo.req("GET", "/api/stats/overview");
    expect(ov.status).toBe(200);
    expect(ov.json.sessions.done).toBe(2);
    const lifts = await renzo.req("GET", "/api/stats/lifts");
    const inc = lifts.json.lifts.find((l: { exerciseId: string }) => l.exerciseId === "inc");
    expect(inc.points.map((p: { weightKg: number }) => p.weightKg)).toEqual([62.5, 65]);
    expect(lifts.json.lifts.map((l: { exerciseId: string }) => l.exerciseId)).toEqual(["inc", "ohp", "jal"]);
    const act = await renzo.req("GET", "/api/stats/activity?weeks=26");
    expect(act.status).toBe(200);
    expect(act.json.days.reduce((n: number, d: { sessions: number }) => n + d.sessions, 0)).toBe(2);
    const otroOv = await otro.req("GET", "/api/stats/overview");
    expect(otroOv.json.sessions.done).toBe(0);
    expect(otroOv.json.weight).toBeNull();
  });

  it("discard de una sesión terminada la saca del historial", async () => {
    const hist = await renzo.req("GET", "/api/sessions");
    const last = hist.json.items[0].id;
    expect((await renzo.req("POST", `/api/sessions/${last}/discard`)).status).toBe(200);
    expect((await renzo.req("GET", "/api/sessions")).json.items).toHaveLength(1);
  });
});
