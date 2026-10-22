import {
  e1rm,
  fk,
  isRecord,
  type CalibrationDTO,
  type DoneSet,
  type HistoryItem,
  type ResolvedExercise,
  type RoutineDTO,
  type SessionSummary,
  type SummaryExercise,
  type WorkoutSessionDTO,
  type WorkoutSetDTO,
} from "@lifemaxxing/core";
import type { Db } from "../db/pool";
import { ApiError, notFound } from "../errors";
import { quantity, resolveFor, routineById } from "./program";
import { loadHistory, suggestionFor } from "./suggestions";

export interface SessionRow {
  id: string;
  user_id: string;
  routine_id: string;
  program_week: number;
  phase_id: number;
  status: WorkoutSessionDTO["status"];
  started_at: Date;
  finished_at: Date | null;
  notes: string | null;
  summary: SessionSummary | null;
}

export interface SetRow {
  id: string;
  client_id: string;
  session_id: string;
  exercise_id: string;
  kind: WorkoutSetDTO["kind"];
  set_index: number;
  weight_kg: number;
  reps: number | null;
  duration_sec: number | null;
  rir: number | null;
  target_min: number | null;
  target_max: number | null;
  rest_sec: number | null;
  completed_at: Date;
}

interface CalRow {
  id: string;
  exercise_id: string;
  test_weight_kg: number;
  test_reps: number;
  rir: number;
  e1rm_kg: number;
  created_at: Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSessionRow(db: Db, userId: string, id: string): Promise<SessionRow> {
  if (!UUID.test(id)) throw notFound("Sesión");
  const { rows } = await db.query<SessionRow>("select * from workout_sessions where id = $1 and user_id = $2", [id, userId]);
  if (!rows[0]) throw notFound("Sesión");
  return rows[0];
}

export function assertInProgress(s: SessionRow) {
  if (s.status !== "in_progress") throw new ApiError(409, "session_closed", "Esta sesión ya terminó");
}

export const toSetDTO = (r: SetRow): WorkoutSetDTO => ({
  id: r.id,
  clientId: r.client_id,
  exerciseId: r.exercise_id,
  kind: r.kind,
  setIndex: r.set_index,
  weightKg: r.weight_kg,
  reps: r.reps,
  durationSec: r.duration_sec,
  rir: r.rir,
  targetMin: r.target_min,
  targetMax: r.target_max,
  restSec: r.rest_sec,
  completedAt: r.completed_at.toISOString(),
});

export const toCalDTO = (r: CalRow): CalibrationDTO => ({
  id: r.id,
  exerciseId: r.exercise_id,
  testWeightKg: r.test_weight_kg,
  testReps: r.test_reps,
  rir: r.rir,
  e1rmKg: r.e1rm_kg,
  createdAt: r.created_at.toISOString(),
});

export async function sessionDTO(db: Db, s: SessionRow): Promise<WorkoutSessionDTO> {
  const routine = await routineById(db, s.routine_id);
  const [sets, cals] = await Promise.all([
    db.query<SetRow>("select * from workout_sets where session_id = $1 order by completed_at, set_index", [s.id]),
    db.query<CalRow>("select * from exercise_calibrations where session_id = $1 order by created_at", [s.id]),
  ]);
  return {
    id: s.id,
    routineId: s.routine_id,
    routineKey: routine.key,
    routineName: routine.name,
    templatePhase: routine.templatePhase,
    programWeek: s.program_week,
    phaseId: s.phase_id,
    status: s.status,
    startedAt: s.started_at.toISOString(),
    finishedAt: s.finished_at ? s.finished_at.toISOString() : null,
    notes: s.notes,
    sets: sets.rows.map(toSetDTO),
    calibrations: cals.rows.map(toCalDTO),
  };
}

const LINKS = new Set(["de", "del", "al", "a", "con", "en"]);
/** Nombre corto para destacados: dos palabras con significado ("Press inclinado", "Negativas de dominada"). */
export function shortName(name: string): string {
  const out: string[] = [];
  let meaningful = 0;
  for (const w of name.split(" ")) {
    out.push(w);
    if (!LINKS.has(w.toLowerCase())) meaningful++;
    if (meaningful >= 2) break;
  }
  return out.join(" ");
}

function nextText(ex: ResolvedExercise, next: number[], best: DoneSet | null): string {
  if (ex.scheme === "cardio") return `Próxima: ${Math.min(60, (best?.reps ?? 40) + 5)} min`;
  if (!ex.exercise.incrementKg) return "Próxima: busca una rep más por serie";
  if (!next.length) return "";
  const eq = ex.exercise.equipment;
  if (eq === "peso_corporal" || eq === "rueda") {
    // Peso corporal: si no toca lastre, se progresa en reps; si toca, "PC + 2.5 kg".
    return next.every((w) => w <= 0) ? "Próxima: busca una rep más por serie" : `Próxima: PC + ${fk(Math.max(...next))} kg`;
  }
  if (ex.scheme === "rpt") return `Próxima: ${next.map(fk).join(" · ")} kg`;
  if (ex.scheme === "kino") {
    const first = next[0];
    const last = next[next.length - 1];
    return first === last ? `Próxima: ${fk(first)} kg` : `Próxima: ${fk(first)} → ${fk(last)} kg`;
  }
  return `Próxima: ${fk(next[0])} kg`;
}

/** Calcula el resumen de una sesión (al terminar). */
export async function buildSummary(db: Db, s: SessionRow, routine: RoutineDTO, finishedAt: Date): Promise<SessionSummary> {
  const [setsQ, calsQ] = await Promise.all([
    db.query<SetRow>("select * from workout_sets where session_id = $1 order by set_index, completed_at", [s.id]),
    db.query<CalRow>("select * from exercise_calibrations where session_id = $1 order by created_at desc", [s.id]),
  ]);
  const work = setsQ.rows.filter((r) => r.kind === "work");
  const ids = routine.exercises.flatMap((re) => (re.altExerciseId ? [re.exerciseId, re.altExerciseId] : [re.exerciseId]));
  const history = await loadHistory(db, s.user_id, ids, s.id);

  let volumeKg = 0;
  const exercises: SummaryExercise[] = routine.exercises.map((re) => {
    const performedId =
      work.some((w) => w.exercise_id === re.exerciseId) || !re.altExerciseId || !work.some((w) => w.exercise_id === re.altExerciseId)
        ? re.exerciseId
        : re.altExerciseId;
    const ex = resolveFor(re, performedId)!;
    const rows = work.filter((w) => w.exercise_id === performedId);
    const timed = ex.scheme === "cardio" || ex.sets[0]?.unit === "sec" || ex.sets[0]?.unit === "min";
    const sets: DoneSet[] = rows.map((r) => ({ weightKg: r.weight_kg, reps: quantity(r, ex.exercise) }));
    if (!timed) for (const d of sets) volumeKg += d.weightKg * d.reps;
    const best = sets.length
      ? sets.reduce((a, b) => (timed ? (b.reps > a.reps ? b : a) : e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a))
      : null;
    const calRow = calsQ.rows.find((c) => c.exercise_id === performedId);
    const prevBest = history.best.get(performedId);
    const record =
      !calRow && !timed && sets.length > 0 && isRecord(sets, prevBest ? [{ weightKg: prevBest.weight_kg, reps: prevBest.reps }] : []);
    const asLast = rows.map((r) => ({ ...r, started_at: s.started_at, finished_at: finishedAt }));
    const sug = rows.length ? suggestionFor(ex, { last: new Map([[performedId, asLast]]), best: new Map(), cal: new Map() }) : null;
    const next = sug?.weights ?? [];
    return {
      exerciseId: performedId,
      name: ex.exercise.name,
      scheme: ex.scheme,
      sets,
      best,
      isRecord: record,
      calibration: calRow ? { weightKg: calRow.test_weight_kg, reps: calRow.test_reps, rir: calRow.rir, e1rmKg: calRow.e1rm_kg } : null,
      next,
      reachedTop: sug?.reachedTop ?? false,
      nextText: rows.length ? nextText(ex, next, best) : "",
      skipped: rows.length === 0,
    };
  });

  const done = exercises.filter((e) => !e.skipped);
  const highlights =
    routine.key === "C"
      ? [
          done.find((e) => e.scheme === "cardio")?.best ? `Cardio ${done.find((e) => e.scheme === "cardio")!.best!.reps} min` : null,
          done.some((e) => e.scheme !== "cardio") ? "abs" : null,
        ].filter(Boolean).join(" · ")
      : done
          .filter((e) => e.scheme !== "cardio" && e.sets.length)
          .slice(0, 2)
          .map((e) => {
            const heavy = e.sets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
            return heavy.weightKg > 0 ? `${shortName(e.name)} ${fk(heavy.weightKg)} × ${heavy.reps}` : `${shortName(e.name)} × ${heavy.reps}`;
          })
          .join(" · ");

  return {
    sessionId: s.id,
    routineKey: routine.key,
    routineName: routine.name,
    programWeek: s.program_week,
    startedAt: s.started_at.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMin: Math.max(1, Math.round((finishedAt.getTime() - s.started_at.getTime()) / 60_000)),
    setsCount: work.length,
    volumeKg: Math.round(volumeKg * 10) / 10,
    recordsCount: exercises.filter((e) => e.isRecord).length,
    highlights,
    exercises,
  };
}

export function historyItem(s: SessionRow, routine: RoutineDTO): HistoryItem {
  const sum = s.summary;
  return {
    id: s.id,
    routineKey: routine.key,
    routineName: routine.name,
    programWeek: s.program_week,
    startedAt: s.started_at.toISOString(),
    finishedAt: s.finished_at ? s.finished_at.toISOString() : null,
    durationMin: sum?.durationMin ?? 0,
    setsCount: sum?.setsCount ?? 0,
    volumeKg: sum?.volumeKg ?? 0,
    recordsCount: sum?.recordsCount ?? 0,
    highlights: sum?.highlights ?? "",
  };
}
