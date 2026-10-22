// Lógica pura del modo Entrenar (port de build()/logSet() del prototipo). Sin React: se testea con vitest.
import {
  autoregulate,
  calibrate,
  propagateWeightChange,
  round,
  stepOf,
  warmups,
  type LoadSuggestion,
  type ResolvedExercise,
  type RoutineDTO,
  type RoutineExerciseDTO,
  type SetInput,
  type SetUnit,
  type WorkoutSessionDTO,
} from "@lifemaxxing/core";

export type ItemKind = "warmup" | "test" | "work";

export interface DoneInfo {
  w: number;
  r: number;
  at: string;
  clientId: string;
  rir?: number;
}

/** Ajuste automático de una serie por cómo salió la anterior del mismo ejercicio. */
export interface AdjustInfo {
  /** +1 subió, −1 bajó. */
  dir: 1 | -1;
  /** Peso planificado antes del ajuste. */
  fromKg: number;
  /** Reps que se hicieron en la serie que provocó el ajuste y su rango. */
  reps: number;
  lo: number;
  hi: number;
}

export interface PlannedItem {
  key: string;
  /** Índice del ejercicio en la rutina. */
  ei: number;
  reId: string;
  exerciseId: string;
  kind: ItemKind;
  /** Índice (0-based) dentro de su tipo (calentamientos o series). */
  k: number;
  /** Total de items de su tipo en el ejercicio. */
  n: number;
  /** set_index 1-based que se envía a la API. */
  setIndex: number;
  lo: number;
  hi: number;
  unit: SetUnit;
  label: string | null;
  w: number;
  r: number;
  rest: number;
  pct?: number;
  /** Serie de trabajo que espera el resultado de la serie de prueba. */
  pending?: boolean;
  /** e1RM con el que se calculó la carga. */
  cal?: number;
  /** El peso se ajustó por la serie anterior. */
  adj?: AdjustInfo;
  done?: DoneInfo;
  skip?: boolean;
}

export interface BuildOptions {
  calibrate: boolean;
  /** reId → usar la alternativa. */
  useAlt?: Record<string, boolean>;
}

export const suggestionKey = (re: RoutineExerciseDTO, alt: boolean) => (alt && re.alt ? `${re.id}:alt` : re.id);

export function resolveRe(re: RoutineExerciseDTO, alt = false): ResolvedExercise {
  if (alt && re.alt) return { ...re, exerciseId: re.alt.id, exercise: re.alt };
  return re;
}

/** Descanso tras la serie de prueba (casi al fallo: como un básico pesado). */
const TEST_REST_SEC = 120;

/** Peso inicial razonable para la serie de prueba cuando no hay historial. */
function defaultTestWeight(ex: ResolvedExercise): number {
  switch (ex.exercise.equipment) {
    case "barra":
      return 40;
    case "mancuernas":
      return 10;
    case "polea":
    case "maquina":
      return 25;
    default:
      return 0;
  }
}

/** ¿El ejercicio necesita serie de prueba hoy? */
export function needsCalibration(re: RoutineExerciseDTO, sug: LoadSuggestion | undefined, calibrateOn: boolean, alt = false): boolean {
  const ex = resolveRe(re, alt);
  return calibrateOn && ex.calibratable && ex.scheme !== "cardio" && (!sug || sug.status === "needs_calibration");
}

export function buildItems(routine: RoutineDTO, suggestions: Record<string, LoadSuggestion>, opts: BuildOptions): PlannedItem[] {
  const items: PlannedItem[] = [];
  let warmedUp = false;
  routine.exercises.forEach((re, ei) => {
    const alt = !!opts.useAlt?.[re.id];
    const ex = resolveRe(re, alt);
    const sug = suggestions[suggestionKey(re, alt)];
    const common = { ei, reId: re.id, exerciseId: ex.exerciseId };
    const kino = ex.scheme === "kino";

    if (needsCalibration(re, sug, opts.calibrate, alt)) {
      const first = ex.sets[0];
      items.push({
        ...common,
        key: `${re.id}:test`,
        kind: "test",
        k: 0,
        n: 1,
        setIndex: 1,
        lo: kino ? first.repsMin : 5,
        hi: kino ? first.repsMax : 8,
        unit: "reps",
        label: null,
        w: sug?.bestSet ? round(sug.bestSet.weightKg * 0.85, stepOf(ex.exercise)) : defaultTestWeight(ex),
        r: kino ? first.repsMin : 6,
        rest: TEST_REST_SEC,
      });
      ex.sets.forEach((s, k) =>
        items.push({
          ...common,
          key: `${re.id}:w${k}`,
          kind: "work",
          k,
          n: ex.sets.length,
          setIndex: s.setIndex,
          lo: s.repsMin,
          hi: s.repsMax,
          unit: s.unit,
          label: s.label ?? null,
          w: 0,
          r: s.repsMin,
          rest: s.restSec,
          pending: true,
        }),
      );
      return;
    }

    const weights = sug?.weights ?? ex.sets.map(() => 0);
    const reps = sug?.reps ?? ex.sets.map((s) => s.repsMin);
    const heavy = Math.max(0, ...weights);
    // Calentamiento calculado: solo en el primer ejercicio con carga (pirámide o kino) y si no hubo prueba.
    if (!warmedUp && heavy > 0 && (ex.scheme === "rpt" || ex.scheme === "kino") && ex.exercise.equipment !== "peso_corporal") {
      warmedUp = true;
      const ws = warmups(ex, weights[0] || heavy);
      ws.forEach((wu, k) =>
        items.push({
          ...common,
          key: `${re.id}:wu${k}`,
          kind: "warmup",
          k,
          n: ws.length,
          setIndex: k + 1,
          lo: wu.reps,
          hi: wu.reps,
          unit: "reps",
          label: null,
          w: wu.weightKg,
          r: wu.reps,
          // Calentamiento: 1 min entre series ligeras y 1:30 antes de la primera serie de trabajo.
          rest: k === ws.length - 1 ? 90 : 60,
          pct: wu.pct,
        }),
      );
    }
    ex.sets.forEach((s, k) =>
      items.push({
        ...common,
        key: `${re.id}:w${k}`,
        kind: "work",
        k,
        n: ex.sets.length,
        setIndex: s.setIndex,
        lo: s.repsMin,
        hi: s.repsMax,
        unit: s.unit,
        label: s.label ?? null,
        w: weights[k] ?? weights[weights.length - 1] ?? 0,
        r: reps[k] ?? s.repsMin,
        rest: s.restSec,
      }),
    );
  });
  return items;
}

/** Siguiente item pendiente desde `from` (inclusive). -1 si no queda nada. */
export function nextPending(items: PlannedItem[], from = 0): number {
  for (let i = Math.max(0, from); i < items.length; i++) if (!items[i].done && !items[i].skip) return i;
  for (let i = 0; i < Math.min(from, items.length); i++) if (!items[i].done && !items[i].skip) return i;
  return -1;
}

export interface LogResult {
  items: PlannedItem[];
  /** Si fue la serie de prueba: e1RM y cargas calculadas. */
  calibration?: { exerciseId: string; e1rmKg: number; loads: number[]; reliable: boolean; weightKg: number; reps: number; rir: number };
}

/** Registra el item `idx` con el peso y las reps hechas, y ajusta las series siguientes. */
export function logItem(
  routine: RoutineDTO,
  useAlt: Record<string, boolean>,
  items: PlannedItem[],
  idx: number,
  done: Omit<DoneInfo, "at"> & { at?: string },
): LogResult {
  const out = items.map((x) => ({ ...x }));
  const it = out[idx];
  const re = routine.exercises[it.ei];
  const ex = resolveRe(re, !!useAlt[re.id]);
  it.done = { ...done, at: done.at ?? new Date().toISOString() };
  let calibration: LogResult["calibration"];

  if (it.kind === "test") {
    const rir = done.rir ?? 2;
    const r = calibrate(ex, { weightKg: done.w, reps: done.r, rir });
    out.forEach((x) => {
      if (x.ei === it.ei && x.kind === "work" && x.pending) {
        x.w = r.loads[x.k] ?? 0;
        x.r = x.lo;
        x.cal = r.e1rmKg;
        x.pending = false;
      }
    });
    calibration = { exerciseId: ex.exerciseId, e1rmKg: r.e1rmKg, loads: r.loads, reliable: r.reliable, weightKg: done.w, reps: done.r, rir };
  } else if (it.kind === "work") {
    const works = out.filter((x) => x.ei === it.ei && x.kind === "work");
    let planned = works.map((x) => (x.done && x !== it ? x.done.w : x.w));
    // Si cambió el peso: pirámide recalcula las siguientes, Kino desplaza la rampa y rest-pause hereda el peso.
    if (done.w !== it.w) planned = propagateWeightChange(ex.scheme, ex, planned, it.k, done.w);
    // Ajuste por las reps: por encima del tope suben las siguientes y por debajo del mínimo bajan.
    const reg = autoregulate(ex, planned, it.k, { weightKg: done.w, reps: done.r }, (j) => works[j] !== it && !!works[j].done);
    works.forEach((x, k) => {
      if (x.done) return;
      if (reg.dir !== 0 && reg.weights[k] !== planned[k]) x.adj = { dir: reg.dir, fromKg: planned[k], reps: done.r, lo: it.lo, hi: it.hi };
      x.w = reg.weights[k];
    });
  }
  return { items: out, calibration };
}

/** Cambia el peso planificado de una serie aún no hecha (y propaga como en la sesión). */
export function replanWeight(routine: RoutineDTO, useAlt: Record<string, boolean>, items: PlannedItem[], idx: number, w: number): PlannedItem[] {
  const out = items.map((x) => ({ ...x }));
  const it = out[idx];
  if (it.done || it.kind !== "work") {
    it.w = w;
    return out;
  }
  const re = routine.exercises[it.ei];
  const ex = resolveRe(re, !!useAlt[re.id]);
  const works = out.filter((x) => x.ei === it.ei && x.kind === "work");
  const planned = works.map((x) => (x.done ? x.done.w : x.w));
  const changed = propagateWeightChange(ex.scheme, ex, planned, it.k, w);
  works.forEach((x, k) => {
    if (!x.done) x.w = changed[k];
  });
  return out;
}

export function skipExercise(items: PlannedItem[], ei: number): PlannedItem[] {
  return items.map((x) => (x.ei === ei && !x.done ? { ...x, skip: true } : x));
}

/** Salta una sola serie (queda pendiente de retomar tocando su punto). */
export function skipItem(items: PlannedItem[], idx: number): PlannedItem[] {
  return items.map((x, i) => (i === idx && !x.done ? { ...x, skip: true } : x));
}

export function unskipItem(items: PlannedItem[], idx: number): PlannedItem[] {
  return items.map((x, i) => (i === idx ? { ...x, skip: false } : x));
}

/** Series que faltan de un ejercicio (sin calentamientos ni saltadas). */
export function setsLeft(items: PlannedItem[], ei: number): number {
  return items.filter((x) => x.ei === ei && x.kind !== "warmup" && !x.done && !x.skip).length;
}

/** Descanso tras registrar `it` (0 = sin descanso). */
export function restAfter(it: PlannedItem, next: PlannedItem | undefined): number {
  if (!next) return 0;
  if (it.rest > 0) return it.rest;
  return next.ei !== it.ei ? 90 : 60;
}

/** Serie lista para la API. Minutos y segundos van en duration_sec. */
export function toSetInput(it: PlannedItem): SetInput {
  if (!it.done) throw new Error("La serie no está hecha");
  const timed = it.unit === "min" || it.unit === "sec";
  return {
    clientId: it.done.clientId,
    exerciseId: it.exerciseId,
    kind: it.kind,
    setIndex: it.setIndex,
    weightKg: it.done.w,
    reps: timed ? null : it.done.r,
    durationSec: timed ? (it.unit === "min" ? it.done.r * 60 : it.done.r) : null,
    rir: it.kind === "test" ? (it.done.rir ?? null) : null,
    targetMin: it.lo,
    targetMax: it.hi,
    restSec: it.rest,
    completedAt: it.done.at,
  };
}

/** Marca como hechas las series que ya están en el servidor (al reanudar en otro dispositivo). */
export function applyServerSets(items: PlannedItem[], session: WorkoutSessionDTO): PlannedItem[] {
  return items.map((x) => {
    const s = session.sets.find((y) => y.exerciseId === x.exerciseId && y.kind === x.kind && y.setIndex === x.setIndex);
    if (!s) return x;
    const r = s.reps ?? (s.durationSec != null ? (x.unit === "min" ? Math.round(s.durationSec / 60) : s.durationSec) : 0);
    return { ...x, done: { w: s.weightKg, r, at: s.completedAt, clientId: s.clientId, rir: s.rir ?? undefined } };
  });
}

/** Progreso de la sesión: series hechas / totales (sin contar las saltadas). */
export function progress(items: PlannedItem[]) {
  const total = items.filter((x) => !x.skip || x.done).length;
  const done = items.filter((x) => x.done).length;
  return { done, total, pct: total ? done / total : 0 };
}
