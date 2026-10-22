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

/**
 * Paso de los botones − y +: desde un valor fuera de la grilla (p. ej. 9 kg en mancuernas de 2 en 2)
 * va al múltiplo más cercano en esa dirección; desde uno en la grilla, un paso entero.
 */
export function stepFrom(weightKg: number, step: number, dir: -1 | 1): number {
  if (step <= 0) return clean(Math.max(0, weightKg));
  const q = weightKg / step;
  const onGrid = Math.abs(q - Math.round(q)) < 1e-6;
  const next = onGrid ? Math.round(q) + dir : dir > 0 ? Math.ceil(q) : Math.floor(q);
  return clean(Math.max(0, next * step));
}

/** Peso mínimo de una serie: 0 en peso corporal (sin lastre), un paso en el resto. */
export function minLoad(ex: { equipment: Equipment; incrementKg?: number | null }): number {
  return ex.equipment === "peso_corporal" || ex.equipment === "rueda" ? 0 : stepOf(ex);
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
  const floor = minLoad(ex.exercise);
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
      out[k] = Math.max(floor, Math.min(clean(out[k + 1] - st), round(top * ramp[k], st)));
    }
    return out;
  }
  const first = round(weightForReps(e1rmKg, sets[0].repsMax + 1), st);
  if (ex.scheme !== "rpt") return sets.map(() => first);
  const out: number[] = [first];
  for (let k = 1; k < n; k++) {
    const prev = out[k - 1];
    // Nunca más pesada que la anterior (con peso corporal el piso es 0, no un paso).
    out.push(Math.min(prev, Math.max(floor, ex.dropKg ? clean(prev - ex.dropKg) : round(prev * 0.9, st))));
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

/** Reps por encima del tope con las que se suben dos incrementos de una vez. */
const BIG_JUMP_REPS = 3;

/**
 * Doble progresión, también hacia abajo.
 * - RPT, por serie: tope del rango → +1 incremento (3 o más reps sobre el tope → +2);
 *   por debajo del mínimo → −1 incremento; dentro del rango → mismo peso.
 * - Kino, rest-pause y rectas: si todas las series llegaron al tope → +1 incremento en todas (+2 si todas pasaron
 *   el tope por 3 o más). Si no: en Kino y rectas baja 1 incremento cada serie que quedó por debajo del mínimo;
 *   en rest-pause baja todo si la activación quedó por debajo (es un solo peso).
 * Una serie con 0 reps es una serie que no se hizo: no sube ni baja. La salida tiene el largo de `lastSets`.
 */
export function suggestNext(ex: ResolvedExercise, lastSets: DoneSet[]): number[] {
  const inc = ex.exercise.incrementKg;
  const floor = minLoad(ex.exercise);
  const up = (w: number, n: number) => clean(w + n * inc);
  const down = (w: number) => (w <= floor ? w : clean(Math.max(floor, w - inc)));
  const below = (l: DoneSet, i: number) => !!ex.sets[i] && l.reps > 0 && l.reps < ex.sets[i].repsMin;
  if (!inc) return lastSets.map((l) => l.weightKg);
  if (ex.scheme === "rpt") {
    return lastSets.map((l, i) => {
      const t = ex.sets[i];
      if (!t) return l.weightKg;
      if (l.reps >= t.repsMax + BIG_JUMP_REPS) return up(l.weightKg, 2);
      if (l.reps >= t.repsMax) return up(l.weightKg, 1);
      return below(l, i) ? down(l.weightKg) : l.weightKg;
    });
  }
  const all = lastSets.length > 0 && lastSets.every((l, i) => !ex.sets[i] || l.reps >= ex.sets[i].repsMax);
  if (all) {
    const big = lastSets.every((l, i) => !ex.sets[i] || l.reps >= ex.sets[i].repsMax + BIG_JUMP_REPS);
    return lastSets.map((l) => up(l.weightKg, big ? 2 : 1));
  }
  if (ex.scheme === "rest_pause") return lastSets.map((l) => (lastSets[0] && below(lastSets[0], 0) ? down(l.weightKg) : l.weightKg));
  return lastSets.map((l, i) => (below(l, i) ? down(l.weightKg) : l.weightKg));
}

export interface Autoregulation {
  /** Pesos de todas las series de trabajo del ejercicio (las hechas no cambian). */
  weights: number[];
  /** +1 si se subió alguna serie siguiente, −1 si se bajó, 0 si nada cambió. */
  dir: -1 | 0 | 1;
}

/**
 * Ajuste del mismo día: compara la serie `k` recién hecha con su rango de reps y corrige las series siguientes
 * del ejercicio. Por encima del tope suben y por debajo del mínimo bajan, en proporción al 1RM que mostró esa
 * serie (Epley) y como mínimo un paso del equipo. En pirámide ninguna serie supera a la anterior.
 * Solo para pirámide, Kino y rectas con peso (rest-pause usa un único peso; el cardio y el tiempo no aplican).
 */
export function autoregulate(
  ex: ResolvedExercise,
  planned: number[],
  k: number,
  done: DoneSet,
  isDone: (j: number) => boolean = () => false,
): Autoregulation {
  const out = planned.slice();
  const t = ex.sets[k];
  const same = { weights: out, dir: 0 as const };
  if (!t || t.unit === "sec" || t.unit === "min") return same;
  if (ex.scheme !== "rpt" && ex.scheme !== "kino" && ex.scheme !== "straight") return same;
  if (done.reps <= 0 || done.weightKg <= 0 || (done.reps >= t.repsMin && done.reps <= t.repsMax)) return same;
  out[k] = done.weightKg;
  const dir = done.reps > t.repsMax ? 1 : -1;
  const ref = dir > 0 ? t.repsMax : t.repsMin;
  const factor = (1 + done.reps / 30) / (1 + ref / 30);
  const st = stepOf(ex.exercise);
  const floor = minLoad(ex.exercise);
  let changed = false;
  for (let j = k + 1; j < out.length; j++) {
    if (isDone(j) || out[j] <= 0) continue;
    let w = round(out[j] * factor, st);
    if (w === out[j]) w = clean(out[j] + dir * st);
    w = Math.max(floor, w);
    if (ex.scheme === "rpt") w = Math.min(w, out[j - 1]);
    if (w !== out[j]) {
      out[j] = w;
      changed = true;
    }
  }
  return { weights: out, dir: changed ? dir : 0 };
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
  const floor = minLoad(ex.exercise);
  if (scheme === "rpt") {
    for (let k = changedIndex + 1; k < out.length; k++) {
      out[k] = Math.min(out[k - 1], Math.max(floor, ex.dropKg ? clean(out[k - 1] - ex.dropKg) : round(out[k - 1] * 0.9, st)));
    }
  } else if (scheme === "kino") {
    const d = newWeight - old;
    for (let k = changedIndex + 1; k < out.length; k++) out[k] = Math.max(0, round(out[k] + d, st));
  } else if (scheme === "rest_pause") {
    for (let k = changedIndex + 1; k < out.length; k++) out[k] = newWeight;
  }
  return out;
}
