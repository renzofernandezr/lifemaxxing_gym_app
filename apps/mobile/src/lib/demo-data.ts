// Datos simulados del modo demo (solo web con ?demo=1). Responden con la misma forma que la API real.
// Son deterministas: todo se calcula a partir de la fecha de hoy en Lima, con el inicio del programa 7 semanas atrás
// (la demo siempre está en la semana 8, la última de la Fase 1). Los check-ins, medidas y entrenos que se registren viven solo en memoria.
import {
  addDays,
  bodyComp,
  calibrate,
  calibrationSchema,
  checkinFeedback,
  checkinSchema,
  clean,
  dayNumber,
  DEFAULT_TIMEZONE,
  e1rm,
  EXERCISE_BY_ID,
  KEY_LIFTS,
  STRENGTH_IDS,
  fk,
  isRecord,
  localDate,
  measurementSchema,
  mondayOf,
  nextSession,
  PHASES,
  plannedSessionsUntil,
  profilePatchSchema,
  programPosition,
  resolveExercise,
  round,
  ROUTINES,
  setsBatchSchema,
  startSessionSchema,
  stepOf,
  suggestNext,
  type ActivityResponse,
  type CalibrationDTO,
  type CalibrationResponse,
  type CheckinDTO,
  type CheckinPostResponse,
  type DoneSet,
  type HistoryItem,
  type HistoryResponse,
  type LiftSeries,
  type LiftsResponse,
  type LoadSuggestion,
  type MeasurementDTO,
  type MeResponse,
  type OverviewResponse,
  type ProfileDTO,
  type ResolvedExercise,
  type RoutineDTO,
  type RoutineExerciseDTO,
  type RoutineKey,
  type RoutinesResponse,
  type SessionSummary,
  type SetTemplate,
  type SummaryExercise,
  type TodayResponse,
  type UserDTO,
  type WorkoutSessionDTO,
  type WorkoutSetDTO,
} from "@lifemaxxing/core";
import { ApiError } from "./api";
import { demoMode, type DemoMode } from "./demo";

const TZ = DEFAULT_TIMEZONE;
const KEYS: RoutineKey[] = ["A", "B", "C"];
const LIFT_WEEKLY_GOAL = 3;
/** Ejercicios que pueden marcar récord en la demo (solo los básicos, para que sean pocos). */
const RECORD_LIFTS = new Set(["inc", "ohp", "jal", "inc_db", "dip_w", "jal_pr"]);

/** Peso del 1.er check-in en adelante (semanas S0…S8 del prototipo). */
const WEIGHTS = [105.6, 104.9, 104.3, 103.8, 103.4, 102.7, 102.3, 101.8, 101.2];
const BODY_FAT = [28.0, 27.7, 27.4, 27.2, 26.8, 26.5, 26.2, 25.9, 25.5];

/** Peso inicial de la serie pesada y cada cuántas sesiones sube (doble progresión). */
const BASE: Record<string, { w: number; cadence: number }> = {
  inc: { w: 50, cadence: 2 },
  ohp: { w: 30, cadence: 2 },
  tri: { w: 22.5, cadence: 3 },
  lat: { w: 8, cadence: 4 },
  knee: { w: 0, cadence: 3 },
  neg: { w: 0, cadence: 3 },
  jal: { w: 57.5, cadence: 2 },
  ham: { w: 12, cadence: 3 },
  bul: { w: 12, cadence: 3 },
  rdl: { w: 20, cadence: 3 },
  fp: { w: 25, cadence: 3 },
  car: { w: 0, cadence: 2 },
  hlr: { w: 0, cadence: 3 },
  s2s: { w: 0, cadence: 3 },
  whl: { w: 0, cadence: 3 },
  brg: { w: 0, cadence: 4 },
  inc_db: { w: 24, cadence: 2 },
  dip_w: { w: 5, cadence: 2 },
  tri_oh: { w: 12, cadence: 3 },
  uprow: { w: 10, cadence: 3 },
  jal_pr: { w: 60, cadence: 2 },
  curl_inc: { w: 12, cadence: 3 },
  box: { w: 70, cadence: 2 },
  sl_rdl: { w: 14, cadence: 3 },
  rdf: { w: 6, cadence: 4 },
  bench: { w: 70, cadence: 2 },
  hip_thrust: { w: 60, cadence: 2 },
};

/** Nombres cortos para los "highlights" del historial. */
const SHORT: Record<string, string> = {
  inc: "Inclinado",
  ohp: "Militar",
  jal: "Jalón supino",
  bul: "Búlgara",
  inc_db: "Inclinado mancuernas",
  dip_w: "Fondos",
  jal_pr: "Jalón prono",
  box: "Box squat",
};

/** Días que "faltó" (semana, día 0 = lunes), como en el prototipo. */
const isMissed = (week: number, dow: number) => (week === 3 && dow === 4) || (week === 6 && dow === 5);

const uuid = (kind: number, n: number) => `${kind.toString(16).padStart(8, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const r1 = (x: number) => Math.round(x * 10) / 10;

// ── Mundo simulado ──────────────────────────────────────
interface DemoSession {
  date: string;
  dto: WorkoutSessionDTO;
  summary: SessionSummary;
}

interface World {
  mode: DemoMode;
  today: string;
  user: UserDTO;
  profile: ProfileDTO;
  sessions: DemoSession[];
  checkins: CheckinDTO[];
  measurements: MeasurementDTO[];
  seq: number;
  /** Entreno en curso (solo en memoria). */
  active: { dto: WorkoutSessionDTO; routine: RoutineDTO } | null;
}

let world: World | null = null;

function getWorld(): World {
  const today = localDate(new Date(), TZ);
  const m = demoMode() ?? "historial";
  if (!world || world.today !== today || world.mode !== m) world = m === "nuevo" ? buildNew(today) : build(today);
  return world;
}

const routineCache = new Map<number, RoutineDTO[]>();
function routinesFor(templatePhase: number): RoutineDTO[] {
  const hit = routineCache.get(templatePhase);
  if (hit) return hit;
  const list = ROUTINES.filter((r) => r.templatePhase === templatePhase).map((r): RoutineDTO => {
    const ki = KEYS.indexOf(r.key);
    return {
      id: uuid(1, templatePhase * 10 + ki),
      templatePhase,
      key: r.key,
      name: r.name,
      focus: r.focus,
      exercises: r.exercises.map(
        (e): RoutineExerciseDTO => ({
          ...resolveExercise(e),
          id: uuid(2, templatePhase * 1000 + ki * 100 + e.position),
          alt: e.altExerciseId ? (EXERCISE_BY_ID[e.altExerciseId] ?? null) : null,
        }),
      ),
    };
  });
  routineCache.set(templatePhase, list);
  return list;
}

/** Series de trabajo de la sesión número `i` (0, 1, 2…) de un ejercicio: doble progresión limpia. */
function setsFor(ex: ResolvedExercise, i: number): DoneSet[] {
  const b = BASE[ex.exerciseId] ?? { w: 0, cadence: 3 };
  const cyc = Math.max(1, b.cadence);
  const level = Math.floor(i / cyc);
  const phase = i % cyc;
  const sets = ex.sets;
  if (ex.scheme === "cardio") return [{ weightKg: 0, reps: Math.min(60, 40 + 5 * level) }];
  const inc = ex.exercise.incrementKg;
  if (b.w <= 0 || inc <= 0) {
    return sets.map((s) => ({ weightKg: 0, reps: Math.min(s.repsMax, s.repsMin + level + (phase === cyc - 1 ? 1 : 0)) }));
  }
  const repsFor = (s: SetTemplate) => (s.repsMin === s.repsMax ? s.repsMax : phase === cyc - 1 ? s.repsMax : Math.min(s.repsMax - 1, s.repsMin + phase));
  const heavy = b.w + inc * level;
  const st = stepOf(ex.exercise);
  let ws: number[];
  if (ex.scheme === "rpt") {
    ws = [heavy];
    for (let k = 1; k < sets.length; k++) ws.push(Math.max(st, ex.dropKg ? clean(ws[k - 1] - ex.dropKg) : round(ws[k - 1] * 0.9, st)));
  } else if (ex.scheme === "kino") {
    ws = sets.map((_, k) => Math.max(st, clean(heavy - st * (sets.length - 1 - k))));
  } else {
    ws = sets.map(() => heavy);
  }
  return sets.map((s, k) => ({ weightKg: ws[k], reps: repsFor(s) }));
}

const isTimed = (ex: ResolvedExercise) => ex.scheme === "cardio" || ex.sets[0]?.unit === "sec" || ex.sets[0]?.unit === "min";

function nextText(ex: ResolvedExercise, next: number[], best: DoneSet | null): string {
  if (ex.scheme === "cardio") return `Próxima: ${Math.min(60, (best?.reps ?? 40) + 5)} min`;
  if (!ex.exercise.incrementKg || (next.length && next.every((w) => w <= 0))) return "Próxima: busca una rep más por serie";
  if (!next.length) return "";
  if (ex.scheme === "rpt") return `Próxima: ${next.map(fk).join(" · ")} kg`;
  if (ex.scheme === "kino") return `Próxima: ${fk(next[0])} → ${fk(next[next.length - 1])} kg`;
  return `Próxima: ${fk(next[0])} kg`;
}

function bestOf(sets: DoneSet[], timed: boolean): DoneSet | null {
  if (!sets.length) return null;
  return sets.reduce((a, b) => (timed ? (b.reps > a.reps ? b : a) : e1rm(b.weightKg, b.reps) > e1rm(a.weightKg, a.reps) ? b : a));
}

function build(today: string): World {
  // Hoy cae en la semana 8: la última de la Fase 1 (énfasis hombros), con 7 semanas de historial.
  const start = addDays(mondayOf(today), -49);
  const profile: ProfileDTO = { heightCm: 186, startWeightKg: 105.6, goalWeightKg: 88, programStartDate: start, timezone: TZ, theme: "system" };
  const user: UserDTO = { id: uuid(9, 1), email: "demo@lifemaxxing.app", name: "Renzo", createdAt: `${addDays(start, -1)}T15:00:00.000Z` };

  const sessions: DemoSession[] = [];
  const occ = new Map<string, number>();
  const maxHeavy = new Map<string, number>();
  let setN = 0;
  for (let d = start; d < today; d = addDays(d, 1)) {
    const p = programPosition(d, start, TZ);
    if (!p.routineKey || isMissed(p.week, p.dayOfWeek)) continue;
    const routine = routinesFor(p.templatePhase).find((r) => r.key === p.routineKey)!;
    const n = sessions.length + 1;
    const startMs = Date.parse(`${d}T12:00:00.000Z`) + (n % 3) * 10 * 60_000; // 07:00–07:20 en Lima
    const cardioMin = { v: 0 };
    let volumeKg = 0;
    const sets: WorkoutSetDTO[] = [];
    const exercises: SummaryExercise[] = routine.exercises.map((re) => {
      const i = occ.get(re.exerciseId) ?? 0;
      occ.set(re.exerciseId, i + 1);
      const done = setsFor(re, i);
      const timed = isTimed(re);
      if (!timed) volumeKg += done.reduce((v, s) => v + s.weightKg * s.reps, 0);
      if (re.scheme === "cardio") cardioMin.v = done[0].reps;
      const heavy = Math.max(...done.map((s) => s.weightKg));
      const prevMax = maxHeavy.get(re.exerciseId);
      const isRecord = RECORD_LIFTS.has(re.exerciseId) && p.week >= 5 && prevMax != null && heavy > prevMax;
      maxHeavy.set(re.exerciseId, Math.max(prevMax ?? 0, heavy));
      const next = suggestNext(re, done);
      const best = bestOf(done, timed);
      done.forEach((s, k) => {
        const t = re.sets[k];
        const byTime = t.unit === "sec" || t.unit === "min";
        setN++;
        sets.push({
          id: uuid(6, setN),
          clientId: uuid(7, setN),
          exerciseId: re.exerciseId,
          kind: "work",
          setIndex: t.setIndex,
          weightKg: s.weightKg,
          reps: byTime ? null : s.reps,
          durationSec: byTime ? (t.unit === "min" ? s.reps * 60 : s.reps) : null,
          rir: null,
          targetMin: t.repsMin,
          targetMax: t.repsMax,
          restSec: t.restSec,
          completedAt: new Date(startMs + (sets.length + 1) * 150_000).toISOString(),
        });
      });
      return {
        exerciseId: re.exerciseId,
        name: re.exercise.name,
        scheme: re.scheme,
        sets: done,
        best,
        isRecord,
        calibration: null,
        next,
        reachedTop: next.some((w, k) => w > done[k].weightKg),
        nextText: nextText(re, next, best),
        skipped: false,
      };
    });
    const durationMin = routine.key === "C" ? cardioMin.v + 18 : 52 + ((n * 7) % 16);
    const startedAt = new Date(startMs).toISOString();
    const finishedAt = new Date(startMs + durationMin * 60_000).toISOString();
    const heavyText = (e: SummaryExercise) => {
      const h = e.sets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
      return `${SHORT[e.exerciseId]} ${fk(h.weightKg)} × ${h.reps}`;
    };
    const highlights =
      routine.key === "C"
        ? `Cardio ${cardioMin.v} min · abs completos`
        : exercises
            .filter((e) => SHORT[e.exerciseId])
            .slice(0, 2)
            .map(heavyText)
            .join(" · ");
    const summary: SessionSummary = {
      sessionId: uuid(3, n),
      routineKey: routine.key,
      routineName: routine.name,
      programWeek: p.week,
      startedAt,
      finishedAt,
      durationMin,
      setsCount: sets.length,
      volumeKg: r1(volumeKg),
      recordsCount: exercises.filter((e) => e.isRecord).length,
      highlights,
      exercises,
    };
    const dto: WorkoutSessionDTO = {
      id: summary.sessionId,
      routineId: routine.id,
      routineKey: routine.key,
      routineName: routine.name,
      templatePhase: routine.templatePhase,
      programWeek: p.week,
      phaseId: p.phase.id,
      status: "finished",
      startedAt,
      finishedAt,
      notes: null,
      sets,
      calibrations: [],
    };
    sessions.push({ date: d, dto, summary });
  }

  const checkins: CheckinDTO[] = WEIGHTS.map((w, k) => ({
    id: uuid(4, k + 1),
    measuredOn: addDays(start, 7 * k),
    weightKg: w,
    bodyFatPct: BODY_FAT[k],
    note: null,
  })).filter((x) => x.measuredOn <= today);

  const measurements: MeasurementDTO[] = [
    { id: uuid(5, 1), measuredOn: start, chestCm: 112, armCm: 38.5, waistCm: 104 },
    { id: uuid(5, 2), measuredOn: addDays(start, 28), chestCm: 111.2, armCm: 38.6, waistCm: 101.5 },
    { id: uuid(5, 3), measuredOn: addDays(start, 56), chestCm: 110.5, armCm: 38.8, waistCm: 99 },
  ].filter((x) => x.measuredOn <= today);

  return { mode: "historial", today, user, profile, sessions, checkins, measurements, seq: 100, active: null };
}

/** Usuario nuevo: semana 1 de la Fase 1, sin entrenos, check-ins ni 1RM. */
function buildNew(today: string): World {
  const start = mondayOf(today);
  const profile: ProfileDTO = { heightCm: 186, startWeightKg: 105.6, goalWeightKg: 88, programStartDate: start, timezone: TZ, theme: "system" };
  const user: UserDTO = { id: uuid(9, 2), email: "demo@lifemaxxing.app", name: "Renzo", createdAt: `${start}T15:00:00.000Z` };
  return { mode: "nuevo", today, user, profile, sessions: [], checkins: [], measurements: [], seq: 100, active: null };
}

// ── Respuestas ──────────────────────────────────────────
const me = (w: World): MeResponse => ({ user: { ...w.user }, profile: { ...w.profile } });

function overview(w: World): OverviewResponse {
  const { profile, checkins, sessions, today } = w;
  const first = checkins[0];
  const last = checkins[checkins.length - 1];
  let weight: OverviewResponse["weight"] = null;
  if (last) {
    const startKg = profile.startWeightKg ?? first.weightKg;
    const baseDate = profile.startWeightKg != null ? profile.programStartDate : first.measuredOn;
    const weeks = (dayNumber(last.measuredOn) - dayNumber(baseDate)) / 7;
    const deltaKg = clean(last.weightKg - startKg);
    weight = {
      currentKg: last.weightKg,
      startKg,
      deltaKg,
      ratePerWeekKg: weeks >= 1 ? Math.round((deltaKg / weeks) * 100) / 100 : null,
      goalKg: profile.goalWeightKg,
    };
  }
  const withFat = checkins.filter((x) => x.bodyFatPct != null);
  let bodyFat: OverviewResponse["bodyFat"] = null;
  let lean: OverviewResponse["lean"] = null;
  if (withFat.length) {
    const f0 = withFat[0];
    const f1 = withFat[withFat.length - 1];
    const c0 = bodyComp(f0.weightKg, f0.bodyFatPct!);
    const c1 = bodyComp(f1.weightKg, f1.bodyFatPct!);
    const many = withFat.length > 1;
    bodyFat = {
      currentPct: f1.bodyFatPct!,
      startPct: f0.bodyFatPct,
      deltaPts: many ? r1(f1.bodyFatPct! - f0.bodyFatPct!) : null,
      fatKg: r1(c1.fatKg),
    };
    const dw = f1.weightKg - f0.weightKg;
    const dl = c1.leanKg - c0.leanKg;
    lean = {
      currentKg: r1(c1.leanKg),
      deltaKg: many ? r1(dl) : null,
      shareOfLossPct: many && dw < 0 ? Math.round((Math.max(0, -dl) / -dw) * 100) : null,
    };
  }
  const sinceStart = sessions.filter((s) => s.date >= profile.programStartDate);
  const planned = plannedSessionsUntil(today, profile.programStartDate);
  const perWeek = new Map<string, number>();
  for (const s of sessions) {
    if (s.summary.routineKey === "C") continue;
    const m = mondayOf(s.date);
    perWeek.set(m, (perWeek.get(m) ?? 0) + 1);
  }
  const thisMonday = mondayOf(today);
  const thisWeekDone = perWeek.get(thisMonday) ?? 0;
  let streak = thisWeekDone >= LIFT_WEEKLY_GOAL ? 1 : 0;
  for (let m = addDays(thisMonday, -7); (perWeek.get(m) ?? 0) >= LIFT_WEEKLY_GOAL; m = addDays(m, -7)) streak++;
  return {
    position: programPosition(today, profile.programStartDate, profile.timezone),
    weight,
    bodyFat,
    lean,
    sessions: { done: sinceStart.length, planned, pct: planned ? Math.round((sinceStart.length / planned) * 100) : 0 },
    streak: { weeks: streak, thisWeekDone, thisWeekPlanned: LIFT_WEEKLY_GOAL },
    lastCheckin: last ?? null,
    checkinsCount: checkins.length,
  };
}

function lifts(w: World): LiftsResponse {
  const series = new Map<string, LiftSeries>();
  for (const id of STRENGTH_IDS) series.set(id, { exerciseId: id, name: EXERCISE_BY_ID[id]?.name ?? id, points: [] });
  for (const s of w.sessions) {
    for (const e of s.summary.exercises) {
      const ser = series.get(e.exerciseId);
      const valid = e.sets.filter((x) => x.reps > 0);
      if (!ser || !valid.length) continue;
      const heavy = valid.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
      ser.points.push({
        date: s.date,
        sessionId: s.dto.id,
        weightKg: heavy.weightKg,
        reps: heavy.reps,
        e1rmKg: Math.max(...valid.map((x) => clean(e1rm(x.weightKg, x.reps)))),
      });
    }
  }
  const last = w.checkins[w.checkins.length - 1];
  return {
    lifts: [...series.values()].filter((s) => KEY_LIFTS.includes(s.exerciseId) || s.points.length),
    bodyWeightKg: last?.weightKg ?? w.profile.startWeightKg,
    pullups: 3,
  };
}

function activity(w: World, qs: URLSearchParams): ActivityResponse {
  const weeks = Math.max(1, Math.min(104, Number(qs.get("weeks") ?? 26) || 26));
  const to = w.today;
  const from = addDays(mondayOf(to), -(weeks - 1) * 7);
  return {
    from,
    to,
    programStartDate: w.profile.programStartDate,
    days: w.sessions
      .filter((s) => s.date >= from && s.date <= to)
      .map((s) => ({ date: s.date, routineKey: s.summary.routineKey, volumeKg: s.summary.volumeKg, sessions: 1 })),
  };
}

const historyItem = (s: DemoSession): HistoryItem => ({
  id: s.dto.id,
  routineKey: s.summary.routineKey,
  routineName: s.summary.routineName,
  programWeek: s.summary.programWeek,
  startedAt: s.summary.startedAt,
  finishedAt: s.summary.finishedAt,
  durationMin: s.summary.durationMin,
  setsCount: s.summary.setsCount,
  volumeKg: s.summary.volumeKg,
  recordsCount: s.summary.recordsCount,
  highlights: s.summary.highlights,
});

function history(w: World, qs: URLSearchParams): HistoryResponse {
  const limit = Math.max(1, Math.min(100, Number(qs.get("limit") ?? 20) || 20));
  const before = qs.get("before");
  const beforeIso = before && !Number.isNaN(Date.parse(before)) ? new Date(before).toISOString() : null;
  const desc = [...w.sessions].reverse().filter((s) => !beforeIso || s.dto.startedAt < beforeIso);
  const page = desc.slice(0, limit);
  return { items: page.map(historyItem), nextBefore: desc.length > limit ? page[page.length - 1].dto.startedAt : null };
}

/** Alinea las últimas series con las del template (por posición); las que faltan heredan el peso vecino con 0 reps. */
function aligned(ex: ResolvedExercise, last: DoneSet[]): DoneSet[] {
  return ex.sets.map((_, i) => last[i] ?? { weightKg: last[last.length - 1]?.weightKg ?? 0, reps: 0 });
}

function suggestionFor(w: World, ex: ResolvedExercise, synthesize: boolean): LoadSuggestion {
  let lastSets: DoneSet[] | null = null;
  let lastDate: string | null = null;
  let best: DoneSet | null = null;
  for (const s of w.sessions) {
    const e = s.summary.exercises.find((x) => x.exerciseId === ex.exerciseId && x.sets.length);
    if (!e) continue;
    lastSets = e.sets;
    lastDate = s.summary.startedAt;
    for (const x of e.sets) if (x.weightKg > 0 && x.reps > 0 && (!best || e1rm(x.weightKg, x.reps) > e1rm(best.weightKg, best.reps))) best = x;
  }
  if (!lastSets && synthesize && w.mode === "historial" && BASE[ex.exerciseId]) {
    // Sin historial en la demo (p. ej. la rutina B de la fase 2): una "última vez" plausible hace una semana.
    lastSets = setsFor(ex, 1);
    lastDate = `${addDays(w.today, -7)}T12:00:00.000Z`;
    best = bestOf(lastSets.filter((x) => x.weightKg > 0), false);
  }
  const bestE = best ? clean(e1rm(best.weightKg, best.reps)) : null;
  if (!lastSets) {
    return {
      exerciseId: ex.exerciseId,
      status: ex.calibratable ? "needs_calibration" : "none",
      lastSets: [],
      lastDate: null,
      weights: null,
      reps: null,
      reachedTop: false,
      e1rmKg: null,
      bestE1rmKg: null,
      bestSet: null,
    };
  }
  const al = aligned(ex, lastSets);
  const weights = suggestNext(ex, al);
  const reps = ex.sets.map((s, i) => {
    if (ex.scheme === "cardio" || s.unit === "sec") return Math.max(s.repsMin, Math.min(al[i].reps || s.repsMin, s.repsMax));
    return weights[i] === al[i].weightKg && al[i].reps > 0 ? Math.min(al[i].reps + 1, s.repsMax) : s.repsMin;
  });
  return {
    exerciseId: ex.exerciseId,
    status: "progress",
    lastSets,
    lastDate,
    weights,
    reps,
    reachedTop: weights.some((x, i) => x > al[i].weightKg),
    e1rmKg: bestE,
    bestE1rmKg: bestE,
    bestSet: best,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function today(w: World, qs: URLSearchParams): TodayResponse {
  const q = qs.get("date");
  if (q && !ISO.test(q)) throw new ApiError(400, "bad_request", "Fecha inválida (AAAA-MM-DD)");
  const date = q ?? w.today;
  const start = w.profile.programStartDate;
  const position = programPosition(date, start, w.profile.timezone);
  const next = nextSession(date, start);
  const routines = routinesFor(position.templatePhase);
  const suggestions: Record<string, LoadSuggestion> = {};
  for (const r of routines) {
    for (const re of r.exercises) {
      suggestions[re.id] = suggestionFor(w, re, true);
      if (re.alt) suggestions[`${re.id}:alt`] = suggestionFor(w, { ...re, exerciseId: re.alt.id, exercise: re.alt }, false);
    }
  }
  const monday = mondayOf(date);
  const sunday = addDays(monday, 6);
  return {
    position,
    next,
    suggestedKey: position.routineKey ?? next.routineKey ?? "A",
    routines,
    suggestions,
    activeSession: w.active ? { id: w.active.dto.id, routineId: w.active.routine.id, routineKey: w.active.routine.key, startedAt: w.active.dto.startedAt } : null,
    weekDone: w.sessions.filter((s) => s.date >= monday && s.date <= sunday).map((s) => ({ date: s.date, routineKey: s.summary.routineKey })),
  };
}

function routines(w: World, qs: URLSearchParams): RoutinesResponse {
  const q = qs.get("phase");
  const phaseId = q ? Number(q) : programPosition(w.today, w.profile.programStartDate, w.profile.timezone).phase.id;
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) throw new ApiError(400, "bad_request", "Fase inválida (1, 2 o 3)");
  return { phase: phase.id, templatePhase: phase.templatePhase, routines: routinesFor(phase.templatePhase) };
}

// ── Mutaciones (solo en memoria) ────────────────────────
function parse<T>(schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, body: unknown): T {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new ApiError(400, "validation", r.error.issues[0]?.message ?? "Datos inválidos");
  return r.data;
}

function saveCheckin(w: World, body: unknown): CheckinPostResponse {
  const input = parse(checkinSchema, body);
  const prev = [...w.checkins].reverse().find((x) => x.measuredOn < input.measuredOn) ?? null;
  const existing = w.checkins.find((x) => x.measuredOn === input.measuredOn);
  const checkin: CheckinDTO = {
    id: existing?.id ?? uuid(4, ++w.seq),
    measuredOn: input.measuredOn,
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct ?? null,
    note: input.note ?? null,
  };
  w.checkins = [...w.checkins.filter((x) => x.measuredOn !== input.measuredOn), checkin].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  return {
    checkin,
    feedback: checkinFeedback(prev ? { weightKg: prev.weightKg, bodyFatPct: prev.bodyFatPct } : null, { weightKg: checkin.weightKg, bodyFatPct: checkin.bodyFatPct }),
  };
}

function saveMeasurement(w: World, body: unknown): { measurement: MeasurementDTO } {
  const input = parse(measurementSchema, body);
  const existing = w.measurements.find((x) => x.measuredOn === input.measuredOn);
  const measurement: MeasurementDTO = {
    id: existing?.id ?? uuid(5, ++w.seq),
    measuredOn: input.measuredOn,
    chestCm: input.chestCm ?? null,
    armCm: input.armCm ?? null,
    waistCm: input.waistCm ?? null,
  };
  w.measurements = [...w.measurements.filter((x) => x.measuredOn !== input.measuredOn), measurement].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  return { measurement };
}

function patchProfile(w: World, body: unknown): MeResponse {
  const input = parse(profilePatchSchema, body);
  const { name, ...rest } = input;
  w.profile = { ...w.profile, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) };
  if (name !== undefined) w.user = { ...w.user, name };
  return me(w);
}

// ── Entreno en memoria ──────────────────────────────────
function allRoutines(): RoutineDTO[] {
  return [...routinesFor(1), ...routinesFor(2)];
}

function startSession(w: World, body: unknown): WorkoutSessionDTO {
  const input = parse(startSessionSchema, body);
  const routine = allRoutines().find((r) => r.id === input.routineId);
  if (!routine) throw notFound("Rutina");
  if (w.active) throw new ApiError(409, "session_active", "Ya tienes un entrenamiento en curso", { activeSessionId: w.active.dto.id });
  const pos = programPosition(input.date ?? w.today, w.profile.programStartDate, w.profile.timezone);
  const dto: WorkoutSessionDTO = {
    id: uuid(6, ++w.seq),
    routineId: routine.id,
    routineKey: routine.key,
    routineName: routine.name,
    templatePhase: routine.templatePhase,
    programWeek: Math.max(1, Math.min(24, pos.week)),
    phaseId: pos.phase.id,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    notes: null,
    sets: [],
    calibrations: [],
  };
  w.active = { dto, routine };
  return structuredClone(dto);
}

function activeFor(w: World, id: string) {
  if (!w.active || w.active.dto.id !== id) {
    if (w.sessions.some((s) => s.dto.id === id)) throw new ApiError(409, "session_closed", "Esta sesión ya terminó");
    throw notFound("Sesión");
  }
  return w.active;
}

function saveSets(a: NonNullable<World["active"]>, body: unknown): { sets: WorkoutSetDTO[] } {
  const { sets } = parse(setsBatchSchema, body);
  const out: WorkoutSetDTO[] = [];
  for (const x of sets) {
    if (!EXERCISE_BY_ID[x.exerciseId]) throw new ApiError(400, "unknown_exercise", "Ejercicio desconocido");
    const prev = a.dto.sets.find((y) => y.clientId === x.clientId);
    const dto: WorkoutSetDTO = {
      id: prev?.id ?? x.clientId,
      clientId: x.clientId,
      exerciseId: x.exerciseId,
      kind: x.kind,
      setIndex: x.setIndex,
      weightKg: x.weightKg,
      reps: x.reps ?? null,
      durationSec: x.durationSec ?? null,
      rir: x.rir ?? null,
      targetMin: x.targetMin ?? null,
      targetMax: x.targetMax ?? null,
      restSec: x.restSec ?? null,
      completedAt: x.completedAt ?? new Date().toISOString(),
    };
    a.dto.sets = [...a.dto.sets.filter((y) => y.clientId !== x.clientId), dto];
    out.push(dto);
  }
  return { sets: out };
}

function resolveIn(routine: RoutineDTO, exerciseId: string): ResolvedExercise | null {
  for (const re of routine.exercises) {
    if (re.exerciseId === exerciseId) return re;
    if (re.altExerciseId === exerciseId && re.alt) return { ...re, exerciseId: re.alt.id, exercise: re.alt };
  }
  return null;
}

function saveCalibration(w: World, a: NonNullable<World["active"]>, body: unknown): CalibrationResponse {
  const input = parse(calibrationSchema, body);
  const ex = resolveIn(a.routine, input.exerciseId);
  if (!ex) throw new ApiError(400, "not_in_routine", "Ese ejercicio no está en la rutina de esta sesión");
  const r = calibrate(ex, { weightKg: input.weightKg, reps: input.reps, rir: input.rir });
  const calibration: CalibrationDTO = {
    id: uuid(7, ++w.seq),
    exerciseId: input.exerciseId,
    testWeightKg: input.weightKg,
    testReps: input.reps,
    rir: input.rir,
    e1rmKg: r.e1rmKg,
    createdAt: new Date().toISOString(),
  };
  a.dto.calibrations.push(calibration);
  return { calibration, e1rmKg: r.e1rmKg, loads: r.loads, reliable: r.reliable };
}

function finishSession(w: World, a: NonNullable<World["active"]>): SessionSummary {
  const work = a.dto.sets.filter((x) => x.kind === "work").sort((x, y) => x.setIndex - y.setIndex);
  if (!work.length) throw new ApiError(400, "empty_session", "No registraste ninguna serie. Descarta la sesión si no entrenaste");
  const finishedAt = new Date();
  let volumeKg = 0;
  const exercises: SummaryExercise[] = a.routine.exercises.map((re) => {
    const performedId = !work.some((x) => x.exerciseId === re.exerciseId) && re.altExerciseId && work.some((x) => x.exerciseId === re.altExerciseId) ? re.altExerciseId : re.exerciseId;
    const ex = resolveIn(a.routine, performedId)!;
    const timed = isTimed(ex);
    const rows = work.filter((x) => x.exerciseId === performedId);
    const sets: DoneSet[] = rows.map((x) => ({
      weightKg: x.weightKg,
      reps: x.reps ?? (x.durationSec != null ? (ex.sets[0]?.unit === "min" ? Math.round(x.durationSec / 60) : x.durationSec) : 0),
    }));
    if (!timed) for (const d of sets) volumeKg += d.weightKg * d.reps;
    const best = bestOf(sets, timed);
    const cal = [...a.dto.calibrations].reverse().find((c) => c.exerciseId === performedId);
    const prev = w.sessions.flatMap((s) => s.summary.exercises.filter((e) => e.exerciseId === performedId).flatMap((e) => e.sets));
    const record = !cal && !timed && sets.length > 0 && isRecord(sets, prev);
    const al = ex.sets.map((s) => {
      const r = rows.find((x) => x.setIndex === s.setIndex);
      return r ? { weightKg: r.weightKg, reps: sets[rows.indexOf(r)].reps } : null;
    });
    const filled = al.map((x, i) => x ?? { weightKg: (al.slice(0, i).reverse().find(Boolean) ?? al.find(Boolean))?.weightKg ?? 0, reps: 0 });
    const next = rows.length ? suggestNext(ex, filled) : [];
    return {
      exerciseId: performedId,
      name: ex.exercise.name,
      scheme: ex.scheme,
      sets,
      best,
      isRecord: record,
      calibration: cal ? { weightKg: cal.testWeightKg, reps: cal.testReps, rir: cal.rir, e1rmKg: cal.e1rmKg } : null,
      next,
      reachedTop: next.some((x, i) => x > filled[i].weightKg),
      nextText: rows.length ? nextText(ex, next, best) : "",
      skipped: rows.length === 0,
    };
  });
  const done = exercises.filter((e) => !e.skipped && e.scheme !== "cardio");
  const highlights =
    a.routine.key === "C"
      ? `Cardio ${exercises.find((e) => e.scheme === "cardio")?.best?.reps ?? 0} min · abs`
      : done
          .slice(0, 2)
          .map((e) => {
            const heavy = e.sets.reduce((x, y) => (y.weightKg > x.weightKg ? y : x));
            return `${SHORT[e.exerciseId] ?? e.name} ${heavy.weightKg > 0 ? `${fk(heavy.weightKg)} × ${heavy.reps}` : `× ${heavy.reps}`}`;
          })
          .join(" · ");
  const summary: SessionSummary = {
    sessionId: a.dto.id,
    routineKey: a.routine.key,
    routineName: a.routine.name,
    programWeek: a.dto.programWeek,
    startedAt: a.dto.startedAt,
    finishedAt: finishedAt.toISOString(),
    durationMin: Math.max(1, Math.round((finishedAt.getTime() - Date.parse(a.dto.startedAt)) / 60_000)),
    setsCount: work.length,
    volumeKg: Math.round(volumeKg * 10) / 10,
    recordsCount: exercises.filter((e) => e.isRecord).length,
    highlights,
    exercises,
  };
  const dto: WorkoutSessionDTO = { ...a.dto, status: "finished", finishedAt: summary.finishedAt };
  w.sessions = [...w.sessions, { date: w.today, dto, summary }];
  w.active = null;
  return summary;
}

function discardSession(w: World, id: string) {
  if (w.active?.dto.id === id) w.active = null;
  else if (w.sessions.some((s) => s.dto.id === id)) w.sessions = w.sessions.filter((s) => s.dto.id !== id);
  else throw notFound("Sesión");
  return { ok: true };
}

const notFound = (what: string) => new ApiError(404, "not_found", `${what} no encontrado`);

/** Enrutador del modo demo: misma forma de respuesta que la API real. */
export function handleDemo(method: string, path: string, body?: unknown): unknown {
  const w = getWorld();
  const [pathname, query = ""] = path.split("?");
  const qs = new URLSearchParams(query);
  const m = method.toUpperCase();
  const p = pathname.replace(/\/+$/, "");
  const session = /^\/api\/sessions\/([^/]+)$/.exec(p);
  const sessionAction = /^\/api\/sessions\/([^/]+)\/(sets|calibrations|finish|discard)(\/.*)?$/.exec(p);
  const byId = /^\/api\/(checkins|measurements)\/([^/]+)$/.exec(p);

  if (m === "GET") {
    switch (p) {
      case "/api/health":
        return { ok: true, db: true };
      case "/api/auth/me":
      case "/api/profile":
        return me(w);
      case "/api/program/today":
        return today(w, qs);
      case "/api/program/routines":
        return routines(w, qs);
      case "/api/stats/overview":
        return overview(w);
      case "/api/stats/lifts":
        return lifts(w);
      case "/api/stats/activity":
        return activity(w, qs);
      case "/api/checkins":
        return { checkins: w.checkins.map((x) => ({ ...x })) };
      case "/api/measurements":
        return { measurements: w.measurements.map((x) => ({ ...x })) };
      case "/api/sessions/active":
        return { session: w.active ? structuredClone(w.active.dto) : null };
      case "/api/sessions":
        return history(w, qs);
    }
    if (session) {
      if (w.active?.dto.id === session[1]) return { session: structuredClone(w.active.dto), summary: null };
      const s = w.sessions.find((x) => x.dto.id === session[1]);
      if (!s) throw notFound("Sesión");
      return { session: s.dto, summary: s.summary };
    }
  }

  if (m === "POST") {
    switch (p) {
      case "/api/auth/login":
      case "/api/auth/register":
        return me(w);
      case "/api/auth/logout":
        return { ok: true };
      case "/api/checkins":
        return saveCheckin(w, body);
      case "/api/measurements":
        return saveMeasurement(w, body);
      case "/api/sessions":
        return startSession(w, body);
    }
    if (sessionAction) {
      const [, id, action] = sessionAction;
      if (action === "discard") return discardSession(w, id);
      const a = activeFor(w, id);
      if (action === "sets") return saveSets(a, body);
      if (action === "calibrations") return saveCalibration(w, a, body);
      return finishSession(w, a);
    }
  }

  if (m === "PATCH" && p === "/api/profile") return patchProfile(w, body);

  if (m === "DELETE") {
    if (byId) {
      const [, kind, id] = byId;
      if (kind === "checkins") {
        if (!w.checkins.some((x) => x.id === id)) throw notFound("Check-in");
        w.checkins = w.checkins.filter((x) => x.id !== id);
      } else {
        if (!w.measurements.some((x) => x.id === id)) throw notFound("Medida");
        w.measurements = w.measurements.filter((x) => x.id !== id);
      }
      return { ok: true };
    }
    if (sessionAction && sessionAction[2] === "sets" && sessionAction[3]) {
      const a = activeFor(w, sessionAction[1]);
      const clientId = sessionAction[3].slice(1);
      a.dto.sets = a.dto.sets.filter((x) => x.clientId !== clientId);
      return { ok: true };
    }
  }

  throw new ApiError(404, "not_found", `Ruta no disponible en modo demo: ${m} ${p}`);
}
