// Lógica de entrenamiento portada del prototipo (index.html). Funciones puras, sin dependencias de UI.
import type { DoneSet, Equipment, ResolvedExercise, Scheme, WarmupStep } from "./types";

/** Calentamiento por defecto del Cap. 4: 60 % × 5, 75 % × 3, 90 % × 1. */
export const DEFAULT_WARMUP: WarmupStep[] = [[0.6, 5], [0.75, 3], [0.9, 1]];
/** Factores de la rampa Kino (la última serie es la pesada). */
const KINO_RAMP = [0.64, 0.76, 0.88, 1];
const EPS = 1e-9;

/** Limpia el ruido de coma flotante (57.49999 → 57.5). */
export const clean = (x: number) => Math.round(x * 1000) / 1000;

/** 1RM estimado (Epley). Con 1 rep al fallo el 1RM es el propio peso. */
export function e1rm(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Inversa de Epley: peso con el que se hacen `reps` repeticiones al fallo. */
export function weightForReps(e1rmKg: number, reps: number): number {
  return e1rmKg / (1 + reps / 30);
}

/** Redondea al múltiplo más cercano del paso. */
export function round(weightKg: number, step: number): number {
  if (step <= 0) return clean(weightKg);
  return clean(Math.round(weightKg / step + EPS) * step);
}

/** Paso de carga: el incremento del ejercicio o, si no tiene, 2 kg en mancuernas y 2.5 kg en el resto. */
export function stepOf(ex: { equipment: Equipment; incrementKg?: number | null }): number {
  if (ex.incrementKg && ex.incrementKg > 0) return ex.incrementKg;
  return ex.equipment === "mancuernas" ? 2 : 2.5;
}

/**
 * Cargas de todas las series a partir del 1RM estimado.
 * - RPT: serie 1 = tope del rango con 1 rep en reserva; siguientes −10 % (o −drop_kg).
 * - Kino: la última serie apunta al tope del rango con 1 rep en reserva; rampa ascendente estricta hacia atrás.
 * - Rest-pause y rectas: el peso de la serie 1 para todas.
 */
export function loadsFromE1rm(ex: ResolvedExercise, e1rmKg: number): number[] {
  const st = stepOf(ex.exercise);
  const sets = ex.sets;
  const n = sets.length;
  if (n === 0) return [];
  if (ex.scheme === "kino") {
    const top = round(weightForReps(e1rmKg, sets[n - 1].repsMax + 1), st);
    const ramp = KINO_RAMP.slice(Math.max(0, KINO_RAMP.length - n));
    while (ramp.length < n) ramp.unshift(ramp[0] - 0.12);
    const out = new Array<number>(n);
    out[n - 1] = top;
    for (let k = n - 2; k >= 0; k--) {
      out[k] = Math.max(st, Math.min(clean(out[k + 1] - st), round(top * ramp[k], st)));
    }
    return out;
  }
  const first = round(weightForReps(e1rmKg, sets[0].repsMax + 1), st);
  if (ex.scheme !== "rpt") return sets.map(() => first);
  const out: number[] = [first];
  for (let k = 1; k < n; k++) {
    const prev = out[k - 1];
    out.push(Math.max(st, ex.dropKg ? clean(prev - ex.dropKg) : round(prev * 0.9, st)));
  }
  return out;
}

export interface CalibrationTest {
  weightKg: number;
  reps: number;
  /** Reps en reserva (0–3). */
  rir: number;
}

export interface CalibrationResult {
  e1rmKg: number;
  loads: number[];
  /** Fuera de 3–10 reps la estimación pierde precisión. */
  reliable: boolean;
}

/** Serie de prueba → 1RM estimado → cargas de todas las series. */
export function calibrate(ex: ResolvedExercise, test: CalibrationTest): CalibrationResult {
  const e = e1rm(test.weightKg, test.reps + test.rir);
  return { e1rmKg: clean(e), loads: loadsFromE1rm(ex, e), reliable: test.reps >= 3 && test.reps <= 10 };
}

/**
 * Doble progresión.
 * - RPT: por serie, si llegaste al tope del rango → +incremento en esa serie.
 * - Kino, rest-pause y rectas: si todas las series llegaron al tope → +incremento en todas.
 * Las series que faltan en `lastSets` se ignoran (la salida tiene el largo de `lastSets`).
 */
export function suggestNext(ex: ResolvedExercise, lastSets: DoneSet[]): number[] {
  const inc = ex.exercise.incrementKg;
  if (ex.scheme === "rpt") {
    return lastSets.map((l, i) => clean(l.weightKg + (ex.sets[i] && l.reps >= ex.sets[i].repsMax ? inc : 0)));
  }
  const all = lastSets.length > 0 && lastSets.every((l, i) => !ex.sets[i] || l.reps >= ex.sets[i].repsMax);
  return lastSets.map((l) => clean(l.weightKg + (all ? inc : 0)));
}

/** ¿Llegó al tope en alguna serie (RPT) o en todas (resto)? */
export function reachedTop(ex: ResolvedExercise, lastSets: DoneSet[]): boolean {
  const next = suggestNext(ex, lastSets);
  return next.some((w, i) => w > lastSets[i].weightKg);
}

export interface WarmupSet {
  pct: number;
  reps: number;
  weightKg: number;
}

/** Calentamientos según el `warmup` del ejercicio o el default del Cap. 4. */
export function warmups(ex: ResolvedExercise, heavyWeightKg: number): WarmupSet[] {
  const st = stepOf(ex.exercise);
  return (ex.warmup ?? DEFAULT_WARMUP).map(([pct, reps]) => ({ pct, reps, weightKg: round(heavyWeightKg * pct, st) }));
}

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface PlatesResult {
  /** Discos por lado, de mayor a menor. */
  perSide: number[];
  /** Lo que no se puede formar con los discos (por lado). */
  remainder: number;
}

/** Discos por lado para un peso total con barra. `null` si el peso es menor que la barra. */
export function platesPerSide(totalKg: number, barKg = 20): PlatesResult | null {
  let rem = (totalKg - barKg) / 2;
  if (rem < -EPS) return null;
  const perSide: number[] = [];
  for (const p of PLATES) {
    while (rem >= p - EPS) {
      perSide.push(p);
      rem -= p;
    }
  }
  return { perSide, remainder: Math.max(0, clean(rem)) };
}

/** Reglas: ¿esta sesión supera el mejor e1RM histórico? Sin historial no hay récord (es la base). */
export function bestE1rm(sets: DoneSet[]): number {
  return sets.reduce((m, s) => Math.max(m, e1rm(s.weightKg, s.reps)), 0);
}

export function isRecord(sessionSets: DoneSet[], history: DoneSet[]): boolean {
  const valid = (x: DoneSet) => x.weightKg > 0 && x.reps > 0;
  const cur = sessionSets.filter(valid);
  const hist = history.filter(valid);
  if (!cur.length || !hist.length) return false;
  return bestE1rm(cur) > bestE1rm(hist) + 0.01;
}

/** Volumen de una lista de series (kg × reps). */
export function volume(sets: DoneSet[]): number {
  return sets.reduce((v, s) => v + s.weightKg * s.reps, 0);
}

/** Recalcula las series siguientes cuando se cambia el peso de una serie durante la sesión. */
export function propagateWeightChange(
  scheme: Scheme,
  ex: ResolvedExercise,
  planned: number[],
  changedIndex: number,
  newWeight: number,
): number[] {
  const out = planned.slice();
  const old = out[changedIndex];
  out[changedIndex] = newWeight;
  if (newWeight === old) return out;
  const st = stepOf(ex.exercise);
  if (scheme === "rpt") {
    for (let k = changedIndex + 1; k < out.length; k++) {
      out[k] = Math.max(st, ex.dropKg ? clean(out[k - 1] - ex.dropKg) : round(out[k - 1] * 0.9, st));
    }
  } else if (scheme === "kino") {
    const d = newWeight - old;
    for (let k = changedIndex + 1; k < out.length; k++) out[k] = Math.max(0, clean(out[k] + d));
  } else if (scheme === "rest_pause") {
    for (let k = changedIndex + 1; k < out.length; k++) out[k] = newWeight;
  }
  return out;
}
