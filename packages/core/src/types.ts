export type Equipment = "barra" | "mancuernas" | "polea" | "maquina" | "peso_corporal" | "rueda" | "cardio";
export type Scheme = "rpt" | "kino" | "rest_pause" | "straight" | "cardio";
export type SetUnit = "reps" | "reps_per_side" | "sec" | "min";
export type RoutineKey = "A" | "B" | "C";
export type SetKind = "warmup" | "test" | "work";

export interface Exercise {
  id: string;
  name: string;
  equipment: Equipment;
  muscleGroups: string[];
  cue: string;
  incrementKg: number;
}

export interface SetTemplate {
  setIndex: number;
  repsMin: number;
  repsMax: number;
  unit: SetUnit;
  restSec: number;
  label?: string | null;
}

/** [porcentaje de la serie pesada, reps] */
export type WarmupStep = [number, number];

export interface RoutineExerciseTemplate {
  position: number;
  exerciseId: string;
  altExerciseId?: string | null;
  scheme: Scheme;
  dropKg?: number | null;
  warmup?: WarmupStep[] | null;
  calibratable: boolean;
  isAddition: boolean;
  note?: string | null;
  sets: SetTemplate[];
}

export interface RoutineTemplate {
  templatePhase: number;
  key: RoutineKey;
  name: string;
  focus: string;
  exercises: RoutineExerciseTemplate[];
}

export interface Phase {
  id: number;
  name: string;
  weekFrom: number;
  weekTo: number;
  templatePhase: number;
}

/** Ejercicio de una rutina con los datos del catálogo resueltos. Es lo que usa la lógica de cargas. */
export interface ResolvedExercise extends RoutineExerciseTemplate {
  exercise: Exercise;
}

/** Serie hecha: peso (kg) y reps (o segundos/minutos según la unidad). */
export interface DoneSet {
  weightKg: number;
  reps: number;
}
