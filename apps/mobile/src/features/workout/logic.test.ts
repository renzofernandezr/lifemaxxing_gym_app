import { EXERCISE_BY_ID, resolveExercise, routineTemplate, type LoadSuggestion, type RoutineDTO } from "@lifemaxxing/core";
import { describe, expect, it } from "vitest";
import { applyServerSets, buildItems, logItem, nextPending, replanWeight, restAfter, skipExercise, toSetInput, type PlannedItem } from "./logic";

const routine = (tp: number, key: "A" | "B" | "C"): RoutineDTO => {
  const r = routineTemplate(tp, key);
  return {
    id: `${tp}${key}`,
    templatePhase: tp,
    key,
    name: r.name,
    focus: r.focus,
    exercises: r.exercises.map((e) => ({
      ...resolveExercise(e),
      id: `${tp}${key}-${e.position}`,
      alt: e.altExerciseId ? EXERCISE_BY_ID[e.altExerciseId] : null,
    })),
  };
};

const sug = (exerciseId: string, p: Partial<LoadSuggestion>): LoadSuggestion => ({
  exerciseId,
  status: "progress",
  lastSets: [],
  lastDate: null,
  weights: null,
  reps: null,
  reachedTop: false,
  e1rmKg: null,
  bestE1rmKg: null,
  bestSet: null,
  ...p,
});

/** Peso efectivo: el registrado si la serie está hecha, si no el planificado. */
const eff = (x: PlannedItem) => x.done?.w ?? x.w;

const A = routine(1, "A");
const B = routine(1, "B");
const none: Record<string, LoadSuggestion> = {};

describe("primera sesión con calibración", () => {
  const items = buildItems(A, none, { calibrate: true });

  it("serie de prueba en los calibrables y series pendientes", () => {
    const inc = items.filter((x) => x.exerciseId === "inc");
    expect(inc.map((x) => x.kind)).toEqual(["test", "work", "work", "work"]);
    expect(inc[0]).toMatchObject({ lo: 5, hi: 8, w: 40, rest: 180 });
    expect(inc.slice(1).every((x) => x.pending)).toBe(true);
    // Sin calentamiento calculado cuando hay prueba
    expect(items.some((x) => x.kind === "warmup")).toBe(false);
    // Elevaciones laterales no se calibran
    expect(items.filter((x) => x.exerciseId === "lat").every((x) => x.kind === "work" && !x.pending)).toBe(true);
  });

  it("registrar la prueba calcula 62.5 / 57.5 / 52.5", () => {
    const res = logItem(A, {}, items, 0, { w: 60, r: 6, rir: 1, clientId: "t1" });
    const inc = res.items.filter((x) => x.exerciseId === "inc" && x.kind === "work");
    expect(inc.map((x) => x.w)).toEqual([62.5, 57.5, 52.5]);
    expect(inc.every((x) => !x.pending && x.cal)).toBe(true);
    expect(res.calibration).toMatchObject({ exerciseId: "inc", loads: [62.5, 57.5, 52.5] });
    expect(nextPending(res.items, 1)).toBe(1);
  });

  it("Kino: la búlgara arma la rampa 6 / 8 / 10 / 12", () => {
    const b = buildItems(B, none, { calibrate: true });
    const idx = b.findIndex((x) => x.exerciseId === "bul" && x.kind === "test");
    expect(b[idx]).toMatchObject({ lo: 6, hi: 8, rest: 120 });
    const res = logItem(B, {}, b, idx, { w: 12, r: 8, rir: 1, clientId: "t2" });
    expect(res.items.filter((x) => x.exerciseId === "bul" && x.kind === "work").map((x) => x.w)).toEqual([6, 8, 10, 12]);
  });
});

describe("sesión con progresión", () => {
  const s = {
    [A.exercises[0].id]: sug("inc", { weights: [65, 60, 52.5], reps: [4, 6, 10], reachedTop: true }),
    [A.exercises[1].id]: sug("ohp", { weights: [40, 35, 32.5], reps: [7, 9, 10] }),
  };
  const items = buildItems(A, s, { calibrate: true });

  it("calentamiento calculado solo en el primer ejercicio con carga", () => {
    const warm = items.filter((x) => x.kind === "warmup");
    expect(warm.map((x) => [x.exerciseId, x.w, x.r])).toEqual([
      ["inc", 32.5, 6],
      ["inc", 45, 5],
      ["inc", 52.5, 3],
    ]);
  });

  it("usa las sugerencias de peso y reps", () => {
    const inc = items.filter((x) => x.exerciseId === "inc" && x.kind === "work");
    expect(inc.map((x) => [x.w, x.r])).toEqual([[65, 4], [60, 6], [52.5, 10]]);
  });

  it("pirámide: cambiar el peso de la serie 1 recalcula las siguientes", () => {
    const i1 = items.findIndex((x) => x.exerciseId === "inc" && x.kind === "work");
    const res = logItem(A, {}, items, i1, { w: 60, r: 5, clientId: "a" });
    expect(res.items.filter((x) => x.exerciseId === "inc" && x.kind === "work").map(eff)).toEqual([60, 55, 50]);
  });

  it("replanificar una serie futura también propaga", () => {
    const i2 = items.findIndex((x) => x.exerciseId === "ohp" && x.kind === "work");
    const out = replanWeight(A, {}, items, i2, 42.5);
    expect(out.filter((x) => x.exerciseId === "ohp" && x.kind === "work").map((x) => x.w)).toEqual([42.5, 37.5, 35]);
  });

  it("rest-pause: las mini-series heredan el peso", () => {
    const l = items.findIndex((x) => x.exerciseId === "lat");
    const res = logItem(A, {}, items, l, { w: 9, r: 14, clientId: "b" });
    expect(res.items.filter((x) => x.exerciseId === "lat").map(eff)).toEqual([9, 9, 9, 9]);
  });

  it("saltar un ejercicio y descansos", () => {
    const sk = skipExercise(items, 0);
    expect(nextPending(sk)).toBe(sk.findIndex((x) => x.exerciseId === "ohp"));
    const lat = items.filter((x) => x.exerciseId === "lat");
    expect(restAfter(lat[0], lat[1])).toBe(12);
  });
});

describe("API", () => {
  it("toSetInput: minutos van en duration_sec", () => {
    const C = routine(1, "C");
    const items = buildItems(C, none, { calibrate: false });
    const res = logItem(C, {}, items, 0, { w: 0, r: 45, clientId: "00000000-0000-4000-8000-000000000001" });
    const input = toSetInput(res.items[0]);
    expect(input).toMatchObject({ exerciseId: "car", reps: null, durationSec: 2700, kind: "work", setIndex: 1 });
  });

  it("applyServerSets marca como hechas las series del servidor", () => {
    const items = buildItems(A, none, { calibrate: false });
    const out = applyServerSets(items, {
      id: "s",
      routineId: A.id,
      routineKey: "A",
      routineName: "Workout A",
      templatePhase: 1,
      programWeek: 1,
      phaseId: 1,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      notes: null,
      calibrations: [],
      sets: [
        { id: "1", clientId: "c1", exerciseId: "inc", kind: "work", setIndex: 1, weightKg: 60, reps: 5, durationSec: null, rir: null, targetMin: 4, targetMax: 5, restSec: 180, completedAt: new Date().toISOString() },
      ],
    });
    expect(out.filter((x) => x.done).map((x) => [x.exerciseId, x.setIndex, x.done!.w])).toEqual([["inc", 1, 60]]);
  });
});
