import { fk, stepFrom, stepOf, type ResolvedExercise } from "@lifemaxxing/core";
import type { PlannedItem } from "./logic";

/** Valores que el usuario está editando para la serie actual (compartidos por la tarjeta y la tabla). */
export interface Draft {
  key: string;
  w: string;
  r: string;
}

export const draftFor = (it: PlannedItem): Draft => ({ key: it.key, w: fk(it.done?.w ?? it.w), r: String(it.done?.r ?? it.r) });

export const parseNum = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function weightStep(ex: ResolvedExercise): number {
  return stepOf(ex.exercise);
}

export function repsStep(it: PlannedItem): number {
  return it.unit === "sec" ? 5 : 1;
}

/** − y + caen siempre en la grilla del equipo (mancuernas de 2 en 2, barra de 2.5 en 2.5…). */
export const stepValue = (s: string, step: number, dir: -1 | 1) => fk(stepFrom(parseNum(s), step, dir));
