import type { Exercise, ResolvedExercise, RoutineDTO, RoutineExerciseDTO, RoutineKey, Scheme, SetUnit } from "@lifemaxxing/core";
import type { Db } from "../db/pool";
import { notFound } from "../errors";

interface Row {
  r_id: string;
  template_phase: number;
  key: RoutineKey;
  r_name: string;
  focus: string;
  re_id: string;
  position: number;
  exercise_id: string;
  alt_exercise_id: string | null;
  scheme: Scheme;
  drop_kg: number | null;
  warmup: [number, number][] | null;
  calibratable: boolean;
  is_addition: boolean;
  note: string | null;
  set_index: number;
  reps_min: number;
  reps_max: number;
  unit: SetUnit;
  rest_sec: number;
  label: string | null;
}

interface ExerciseRow {
  id: string;
  name: string;
  equipment: Exercise["equipment"];
  muscle_groups: string[];
  cue: string;
  increment_kg: number;
}

interface ProgramCache {
  exercises: Map<string, Exercise>;
  routines: RoutineDTO[];
}

// El programa es estático: se carga una vez por pool (cada schema de test tiene su pool).
const cache = new WeakMap<Db, Promise<ProgramCache>>();

async function load(db: Db): Promise<ProgramCache> {
  const ex = await db.query<ExerciseRow>("select * from exercises");
  const exercises = new Map<string, Exercise>(
    ex.rows.map((r) => [r.id, { id: r.id, name: r.name, equipment: r.equipment, muscleGroups: r.muscle_groups, cue: r.cue, incrementKg: r.increment_kg }]),
  );
  const { rows } = await db.query<Row>(
    `select r.id r_id, r.template_phase, r.key, r.name r_name, r.focus,
            re.id re_id, re.position, re.exercise_id, re.alt_exercise_id, re.scheme, re.drop_kg, re.warmup,
            re.calibratable, re.is_addition, re.note,
            rs.set_index, rs.reps_min, rs.reps_max, rs.unit, rs.rest_sec, rs.label
       from routines r
       join routine_exercises re on re.routine_id = r.id
       join routine_sets rs on rs.routine_exercise_id = re.id
      order by r.template_phase, r.key, re.position, rs.set_index`,
  );
  const routines = new Map<string, RoutineDTO>();
  const res = new Map<string, RoutineExerciseDTO>();
  for (const r of rows) {
    let routine = routines.get(r.r_id);
    if (!routine) {
      routine = { id: r.r_id, templatePhase: r.template_phase, key: r.key, name: r.r_name, focus: r.focus, exercises: [] };
      routines.set(r.r_id, routine);
    }
    let re = res.get(r.re_id);
    if (!re) {
      const exercise = exercises.get(r.exercise_id);
      if (!exercise) throw new Error(`Ejercicio ${r.exercise_id} sin catálogo`);
      re = {
        id: r.re_id,
        position: r.position,
        exerciseId: r.exercise_id,
        altExerciseId: r.alt_exercise_id,
        scheme: r.scheme,
        dropKg: r.drop_kg,
        warmup: r.warmup,
        calibratable: r.calibratable,
        isAddition: r.is_addition,
        note: r.note,
        sets: [],
        exercise,
        alt: r.alt_exercise_id ? exercises.get(r.alt_exercise_id) ?? null : null,
      };
      res.set(r.re_id, re);
      routine.exercises.push(re);
    }
    re.sets.push({ setIndex: r.set_index, repsMin: r.reps_min, repsMax: r.reps_max, unit: r.unit, restSec: r.rest_sec, label: r.label });
  }
  return { exercises, routines: [...routines.values()] };
}

function program(db: Db): Promise<ProgramCache> {
  let p = cache.get(db);
  if (!p) {
    p = load(db).catch((err) => {
      cache.delete(db);
      throw err;
    });
    cache.set(db, p);
  }
  return p;
}

export async function routinesForTemplate(db: Db, templatePhase: number): Promise<RoutineDTO[]> {
  return (await program(db)).routines.filter((r) => r.templatePhase === templatePhase);
}

export async function routineById(db: Db, id: string): Promise<RoutineDTO> {
  const r = (await program(db)).routines.find((x) => x.id === id);
  if (!r) throw notFound("Rutina");
  return r;
}

export async function exerciseCatalog(db: Db): Promise<Map<string, Exercise>> {
  return (await program(db)).exercises;
}

/** El ejercicio de la rutina, o su alternativa si `exerciseId` es la alternativa. */
export function resolveFor(re: RoutineExerciseDTO, exerciseId: string): ResolvedExercise | null {
  if (re.exerciseId === exerciseId) return re;
  if (re.altExerciseId === exerciseId && re.alt) return { ...re, exerciseId: re.alt.id, exercise: re.alt };
  return null;
}

/** Cantidad hecha de una serie: reps, o minutos/segundos si es por tiempo. */
export function quantity(s: { reps: number | null; duration_sec: number | null }, ex: Exercise): number {
  if (s.reps != null) return s.reps;
  if (s.duration_sec == null) return 0;
  return ex.equipment === "cardio" ? Math.round(s.duration_sec / 60) : s.duration_sec;
}
