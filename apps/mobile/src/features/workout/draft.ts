import { fk, stepOf, type ResolvedExercise } from "@lifemaxxing/core";
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

export const stepValue = (s: string, step: number, dir: -1 | 1) => fk(Math.max(0, Math.round((parseNum(s) + step * dir) * 100) / 100));
