import {
  clean,
  e1rm,
  loadsFromE1rm,
  suggestNext,
  type DoneSet,
  type LoadSuggestion,
  type ResolvedExercise,
  type RoutineDTO,
} from "@lifemaxxing/core";
import type { Db } from "../db/pool";
import { quantity } from "./program";

interface LastRow {
  exercise_id: string;
  set_index: number;
  weight_kg: number;
  reps: number | null;
  duration_sec: number | null;
  started_at: Date;
  finished_at: Date;
}

interface CalRow {
  exercise_id: string;
  e1rm_kg: number;
  created_at: Date;
}

interface HistoryData {
  last: Map<string, LastRow[]>;
  best: Map<string, { weight_kg: number; reps: number }>;
  cal: Map<string, CalRow>;
}

/** Últimas series de trabajo, mejor serie y última calibración por ejercicio. */
export async function loadHistory(db: Db, userId: string, exerciseIds: string[], beforeSessionId?: string): Promise<HistoryData> {
  const ids = [...new Set(exerciseIds)];
  const exclude = beforeSessionId ?? "00000000-0000-0000-0000-000000000000";
  const [last, best, cal] = await Promise.all([
    db.query<LastRow>(
      `select exercise_id, set_index, weight_kg, reps, duration_sec, started_at, finished_at from (
         select ws.exercise_id, ws.set_index, ws.weight_kg, ws.reps, ws.duration_sec, s.started_at, s.finished_at,
                dense_rank() over (partition by ws.exercise_id order by s.started_at desc, s.id) as rk
           from workout_sets ws join workout_sessions s on s.id = ws.session_id
          where s.user_id = $1 and s.status = 'finished' and ws.kind = 'work'
            and ws.exercise_id = any($2) and s.id <> $3
       ) t where rk = 1 order by exercise_id, set_index`,
      [userId, ids, exclude],
    ),
    db.query<{ exercise_id: string; weight_kg: number; reps: number }>(
      `select distinct on (ws.exercise_id) ws.exercise_id, ws.weight_kg, ws.reps
         from workout_sets ws join workout_sessions s on s.id = ws.session_id
        where s.user_id = $1 and s.status = 'finished' and ws.kind = 'work' and ws.reps > 0 and ws.weight_kg > 0
          and ws.exercise_id = any($2) and s.id <> $3
        order by ws.exercise_id,
                 case when ws.reps <= 1 then ws.weight_kg else ws.weight_kg * (1 + ws.reps / 30.0) end desc`,
      [userId, ids, exclude],
    ),
    db.query<CalRow>(
      // Las calibraciones de sesiones descartadas no cuentan (p. ej. una prueba mal tipeada).
      `select distinct on (c.exercise_id) c.exercise_id, c.e1rm_kg, c.created_at
         from exercise_calibrations c left join workout_sessions s on s.id = c.session_id
        where c.user_id = $1 and c.exercise_id = any($2) and s.status is distinct from 'discarded'
        order by c.exercise_id, c.created_at desc`,
      [userId, ids],
    ),
  ]);
  const lastMap = new Map<string, LastRow[]>();
  for (const r of last.rows) {
    const arr = lastMap.get(r.exercise_id) ?? [];
    arr.push(r);
    lastMap.set(r.exercise_id, arr);
  }
  return {
    last: lastMap,
    best: new Map(best.rows.map((r) => [r.exercise_id, r])),
    cal: new Map(cal.rows.map((r) => [r.exercise_id, r])),
  };
}

/** Alinea las últimas series con las del template (por set_index). Las que faltan heredan el peso vecino con 0 reps. */
function aligned(ex: ResolvedExercise, rows: LastRow[]): DoneSet[] | null {
  const found = ex.sets.map((s) => rows.find((r) => r.set_index === s.setIndex) ?? null);
  if (found.every((x) => x === null)) return null;
  const out: (DoneSet | null)[] = found.map((r) => (r ? { weightKg: r.weight_kg, reps: quantity(r, ex.exercise) } : null));
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) {
      const near = out.slice(0, i).reverse().find(Boolean) ?? out.slice(i + 1).find(Boolean);
      out[i] = { weightKg: near!.weightKg, reps: 0 };
    }
  }
  return out as DoneSet[];
}

export function suggestionFor(ex: ResolvedExercise, h: HistoryData): LoadSuggestion {
  const id = ex.exerciseId;
  const rows = h.last.get(id) ?? [];
  const cal = h.cal.get(id);
  const best = h.best.get(id);
  const lastSets = aligned(ex, rows);
  const lastFinished = rows[0]?.finished_at;
  const base: LoadSuggestion = {
    exerciseId: id,
    status: "none",
    lastSets: rows.map((r) => ({ weightKg: r.weight_kg, reps: quantity(r, ex.exercise) })),
    lastDate: rows[0] ? rows[0].started_at.toISOString() : null,
    weights: null,
    reps: null,
    reachedTop: false,
    e1rmKg: cal ? cal.e1rm_kg : best ? clean(e1rm(best.weight_kg, best.reps)) : null,
    bestE1rmKg: best ? clean(e1rm(best.weight_kg, best.reps)) : null,
    bestSet: best ? { weightKg: best.weight_kg, reps: best.reps } : null,
  };
  const calIsNewer = cal && (!lastFinished || cal.created_at > lastFinished);
  if (lastSets && !calIsNewer) {
    const weights = suggestNext(ex, lastSets);
    const reps = ex.sets.map((s, i) => {
      if (ex.scheme === "cardio" || s.unit === "sec") return Math.max(s.repsMin, Math.min(lastSets[i].reps || s.repsMin, s.repsMax));
      return weights[i] === lastSets[i].weightKg && lastSets[i].reps > 0 ? Math.min(lastSets[i].reps + 1, s.repsMax) : s.repsMin;
    });
    return { ...base, status: "progress", weights, reps, reachedTop: weights.some((w, i) => w > lastSets[i].weightKg) };
  }
  if (cal) {
    return { ...base, status: "calibrated", weights: loadsFromE1rm(ex, cal.e1rm_kg), reps: ex.sets.map((s) => s.repsMin) };
  }
  if (ex.calibratable) return { ...base, status: "needs_calibration" };
  return base;
}

/** Sugerencias para todas las rutinas: clave = id del routine_exercise (y `${id}:alt` para la alternativa). */
export async function suggestionsForRoutines(db: Db, userId: string, routines: RoutineDTO[]): Promise<Record<string, LoadSuggestion>> {
  const entries: [string, ResolvedExercise][] = [];
  for (const r of routines) {
    for (const re of r.exercises) {
      entries.push([re.id, re]);
      if (re.alt) entries.push([`${re.id}:alt`, { ...re, exerciseId: re.alt.id, exercise: re.alt }]);
    }
  }
  const h = await loadHistory(db, userId, entries.map(([, e]) => e.exerciseId));
  return Object.fromEntries(entries.map(([k, e]) => [k, suggestionFor(e, h)]));
}

