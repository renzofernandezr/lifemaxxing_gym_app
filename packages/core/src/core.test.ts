import { describe, expect, it } from "vitest";
import {
  addDays,
  bodyComp,
  calibrate,
  checkinFeedback,
  e1rm,
  EXERCISES,
  fk,
  isRecord,
  loadsFromE1rm,
  localDate,
  macros,
  nextSession,
  plannedSessionsUntil,
  platesPerSide,
  programPosition,
  propagateWeightChange,
  resolveExercise,
  round,
  routineTemplate,
  ROUTINES,
  setsText,
  stepOf,
  suggestNext,
  warmups,
  weekday,
  weightForReps,
} from "./index";

const get = (phase: number, key: "A" | "B" | "C", id: string) => {
  const t = routineTemplate(phase, key).exercises.find((e) => e.exerciseId === id);
  if (!t) throw new Error(id);
  return resolveExercise(t);
};

describe("Epley", () => {
  it("con 1 rep el 1RM es el propio peso", () => {
    expect(e1rm(70, 1)).toBe(70);
    expect(e1rm(70, 0)).toBe(70);
  });
  it("e1rm(60, 6+1) ≈ 74", () => {
    expect(e1rm(60, 7)).toBeCloseTo(74, 6);
  });
  it("weightForReps es la inversa", () => {
    expect(weightForReps(e1rm(80, 5), 5)).toBeCloseTo(80, 6);
  });
  it("round y stepOf", () => {
    expect(round(56.25, 2.5)).toBe(57.5);
    expect(round(51.75, 2.5)).toBe(52.5);
    expect(round(10.56, 2)).toBe(10);
    expect(stepOf({ equipment: "mancuernas" })).toBe(2);
    expect(stepOf({ equipment: "barra" })).toBe(2.5);
    expect(stepOf({ equipment: "peso_corporal", incrementKg: 1.25 })).toBe(1.25);
  });
});

describe("calibración", () => {
  it("press inclinado 60 × 6, RIR 1 → e1RM 74 y 62.5 / 57.5 / 52.5", () => {
    const r = calibrate(get(1, "A", "inc"), { weightKg: 60, reps: 6, rir: 1 });
    expect(r.e1rmKg).toBeCloseTo(74, 6);
    expect(r.loads).toEqual([62.5, 57.5, 52.5]);
    expect(r.reliable).toBe(true);
  });
  it("búlgara 12 × 8, RIR 1 → rampa 6 / 8 / 10 / 12", () => {
    expect(calibrate(get(1, "B", "bul"), { weightKg: 12, reps: 8, rir: 1 }).loads).toEqual([6, 8, 10, 12]);
  });
  it("curl martillo (drop 2) 14 × 8, RIR 2 → 14 / 12 / 10", () => {
    expect(calibrate(get(1, "B", "ham"), { weightKg: 14, reps: 8, rir: 2 }).loads).toEqual([14, 12, 10]);
  });
  it("la rampa Kino es estrictamente ascendente y nunca baja del paso", () => {
    const L = loadsFromE1rm(get(1, "B", "rdl"), 20);
    for (let i = 1; i < L.length; i++) expect(L[i]).toBeGreaterThan(L[i - 1]);
    expect(L[0]).toBeGreaterThanOrEqual(2);
  });
  it("box squat tiene 5 series y también arma rampa", () => {
    const L = loadsFromE1rm(get(2, "B", "box"), 120);
    expect(L).toHaveLength(5);
    for (let i = 1; i < L.length; i++) expect(L[i]).toBeGreaterThan(L[i - 1]);
  });
  it("avisa si las reps de la prueba están fuera de 3–10", () => {
    expect(calibrate(get(1, "A", "inc"), { weightKg: 40, reps: 12, rir: 0 }).reliable).toBe(false);
  });
});

describe("discos", () => {
  it("platesPerSide(62.5) → [20, 1.25]", () => {
    expect(platesPerSide(62.5)?.perSide).toEqual([20, 1.25]);
    expect(platesPerSide(62.5)?.remainder).toBe(0);
  });
  it("solo barra y menos que la barra", () => {
    expect(platesPerSide(20)?.perSide).toEqual([]);
    expect(platesPerSide(15)).toBeNull();
  });
  it("resto que no se puede formar", () => {
    expect(platesPerSide(21)?.remainder).toBe(0.5);
  });
});

describe("calendario del programa", () => {
  it("2026-10-19 → semana 1, fase 1, A", () => {
    const p = programPosition("2026-10-19");
    expect([p.week, p.phase.id, p.routineKey]).toEqual([1, 1, "A"]);
  });
  it("2026-10-21 → B", () => expect(programPosition("2026-10-21").routineKey).toBe("B"));
  it("2026-10-26 → semana 2, B", () => {
    const p = programPosition("2026-10-26");
    expect([p.week, p.routineKey]).toEqual([2, "B"]);
  });
  it("2026-10-24 (sábado) → C", () => expect(programPosition("2026-10-24").routineKey).toBe("C"));
  it("2026-12-14 → semana 9, fase 2", () => {
    const p = programPosition("2026-12-14");
    expect([p.week, p.phase.id, p.templatePhase]).toEqual([9, 2, 2]);
  });
  it("fase 3 reutiliza la plantilla 1", () => {
    const p = programPosition(addDays("2026-10-19", 16 * 7));
    expect([p.week, p.phase.id, p.templatePhase]).toEqual([17, 3, 1]);
  });
  it("martes, jueves y domingo no hay sesión", () => {
    expect(programPosition("2026-10-20").routineKey).toBeNull();
    expect(programPosition("2026-10-22").routineKey).toBeNull();
    expect(programPosition("2026-10-25").routineKey).toBeNull();
  });
  it("usa la fecha local de Lima (UTC−5)", () => {
    // 2026-10-20 03:00 UTC = 2026-10-19 22:00 en Lima → lunes A
    expect(localDate(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-19");
    expect(programPosition(new Date("2026-10-20T03:00:00Z")).routineKey).toBe("A");
  });
  it("weekday y próxima sesión", () => {
    expect(weekday("2026-10-19")).toBe(0);
    const n = nextSession("2026-10-20");
    expect([n.date, n.routineKey, n.daysAhead]).toEqual(["2026-10-21", "B", 1]);
  });
  it("sesiones planificadas: 4 por semana", () => {
    expect(plannedSessionsUntil("2026-10-25")).toBe(4);
    expect(plannedSessionsUntil("2026-10-21")).toBe(2);
    expect(plannedSessionsUntil("2027-12-31")).toBe(96);
  });
});

describe("nutrición y composición", () => {
  it("macros(2900) → P 195 · G 81 · C 349", () => {
    const m = macros(2900);
    expect([m.proteinG, m.fatG, m.carbsG]).toEqual([195, 81, 349]);
  });
  it("macros(2600) → G 72 · C 292", () => {
    const m = macros(2600);
    expect([m.fatG, m.carbsG]).toEqual([72, 292]);
  });
  it("bodyComp", () => {
    const b = bodyComp(100, 25);
    expect(b.fatKg).toBe(25);
    expect(b.leanKg).toBe(75);
  });
});

describe("doble progresión", () => {
  it("RPT [[60,5],[55,6],[50,9]] con 4–5/6–7/8–10 → [62.5, 55, 50]", () => {
    const last = [[60, 5], [55, 6], [50, 9]].map(([weightKg, reps]) => ({ weightKg, reps }));
    expect(suggestNext(get(1, "A", "inc"), last)).toEqual([62.5, 55, 50]);
  });
  it("Kino: sube todas solo si todas llegan al tope", () => {
    const ex = get(1, "B", "bul");
    const all = [6, 8, 10, 12].map((w) => ({ weightKg: w, reps: 8 }));
    expect(suggestNext(ex, all)).toEqual([8, 10, 12, 14]);
    const notAll = [...all.slice(0, 3), { weightKg: 12, reps: 7 }];
    expect(suggestNext(ex, notAll)).toEqual([6, 8, 10, 12]);
  });
  it("rest-pause: 15 + 6 + 6 + 6 → +1 kg", () => {
    const ex = get(1, "A", "lat");
    const done = [15, 6, 6, 6].map((reps) => ({ weightKg: 8, reps }));
    expect(suggestNext(ex, done)).toEqual([9, 9, 9, 9]);
  });
  it("calentamientos del inclinado y default", () => {
    expect(warmups(get(1, "A", "inc"), 62.5).map((w) => w.weightKg)).toEqual([32.5, 45, 50]);
    expect(warmups(get(1, "A", "ohp"), 40).map((w) => [w.pct, w.reps])).toEqual([[0.6, 5], [0.75, 3], [0.9, 1]]);
  });
  it("propagación de cambios de peso en la sesión", () => {
    expect(propagateWeightChange("rpt", get(1, "A", "inc"), [62.5, 57.5, 52.5], 0, 60)).toEqual([60, 55, 50]);
    expect(propagateWeightChange("rpt", get(1, "B", "ham"), [14, 12, 10], 0, 16)).toEqual([16, 14, 12]);
    expect(propagateWeightChange("kino", get(1, "B", "bul"), [6, 8, 10, 12], 1, 10)).toEqual([6, 10, 12, 14]);
    expect(propagateWeightChange("rest_pause", get(1, "A", "lat"), [8, 8, 8, 8], 0, 9)).toEqual([9, 9, 9, 9]);
  });
  it("récords", () => {
    const h = [{ weightKg: 60, reps: 5 }];
    expect(isRecord([{ weightKg: 62.5, reps: 5 }], h)).toBe(true);
    expect(isRecord([{ weightKg: 60, reps: 5 }], h)).toBe(false);
    expect(isRecord([{ weightKg: 60, reps: 5 }], [])).toBe(false);
  });
});

describe("check-in", () => {
  it("ritmo lento", () => {
    expect(checkinFeedback({ weightKg: 100, bodyFatPct: 25 }, { weightKg: 99.8, bodyFatPct: 24.9 }).message).toContain("Ritmo lento");
  });
  it("bajada rápida", () => {
    expect(checkinFeedback({ weightKg: 100 }, { weightKg: 98.5 }).message).toContain("Bajaste rápido");
  });
  it("subida", () => {
    expect(checkinFeedback({ weightKg: 100 }, { weightKg: 100.4 }).message).toContain("Subiste");
  });
  it("mucha masa magra perdida", () => {
    expect(checkinFeedback({ weightKg: 100, bodyFatPct: 25 }, { weightKg: 99.2, bodyFatPct: 25.5 }).message).toContain("masa magra");
  });
  it("buen ritmo", () => {
    expect(checkinFeedback({ weightKg: 100, bodyFatPct: 25 }, { weightKg: 99.4, bodyFatPct: 24.6 }).message).toContain("Buen ritmo");
  });
});

describe("datos del programa", () => {
  it("todas las rutinas referencian ejercicios existentes", () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const r of ROUTINES) for (const e of r.exercises) {
      expect(ids.has(e.exerciseId)).toBe(true);
      if (e.altExerciseId) expect(ids.has(e.altExerciseId)).toBe(true);
    }
  });
  it("textos", () => {
    expect(setsText(get(1, "A", "inc"))).toBe("3 × 4–5, 6–7, 8–10");
    expect(setsText(get(1, "A", "lat"))).toBe("1 × 12–15 + 3 × 4–6");
    expect(setsText(get(1, "C", "car"))).toBe("40–60 min");
    expect(fk(62.5)).toBe("62.5");
    expect(fk(57.4999999)).toBe("57.5");
  });
});

describe("correcciones de la revisión", () => {
  it("peso corporal: las series siguientes nunca suben (piso 0)", () => {
    const dip = get(2, "A", "dip_w");
    expect(calibrate(dip, { weightKg: 0, reps: 8, rir: 1 }).loads).toEqual([0, 0, 0]);
    expect(propagateWeightChange("rpt", dip, [5, 2.5, 2.5], 0, 0)).toEqual([0, 0, 0]);
    // Con lastre sigue bajando 10 %
    expect(calibrate(dip, { weightKg: 20, reps: 8, rir: 1 }).loads.every((w, i, a) => i === 0 || w <= a[i - 1])).toBe(true);
  });
  it("una fecha de inicio que no es lunes cuenta desde su lunes", () => {
    expect(programPosition("2026-10-23", "2026-10-21").routineKey).toBe("A");
    expect(programPosition("2026-10-26", "2026-10-21")).toMatchObject({ week: 2, routineKey: "B" });
  });
  it("fechas imposibles no pasan la validación", async () => {
    const { checkinSchema } = await import("./schemas");
    expect(checkinSchema.safeParse({ measuredOn: "2026-02-30", weightKg: 90 }).success).toBe(false);
    expect(checkinSchema.safeParse({ measuredOn: "2026-02-28", weightKg: 90 }).success).toBe(true);
  });
});

describe("grupos de Fuerza", () => {
  it("incluyen todos los ejercicios menos los de tiempo, sin repetir", async () => {
    const { STRENGTH_IDS } = await import("./program");
    const expected = EXERCISES.map((e) => e.id).filter((id) => id !== "car" && id !== "brg").sort();
    expect([...STRENGTH_IDS].sort()).toEqual(expected);
    expect(new Set(STRENGTH_IDS).size).toBe(STRENGTH_IDS.length);
  });
});
