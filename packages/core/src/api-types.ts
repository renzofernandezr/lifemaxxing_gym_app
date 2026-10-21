// Contrato de respuestas de la API (lo usan la API y la app).
import type { CheckinFeedback } from "./body";
import type { ProgramPosition } from "./calendar";
import type { DoneSet, Exercise, RoutineExerciseTemplate, RoutineKey, SetKind } from "./types";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export type Theme = "system" | "light" | "dark";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ProfileDTO {
  heightCm: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  programStartDate: string;
  timezone: string;
  theme: Theme;
}

export interface MeResponse {
  user: UserDTO;
  profile: ProfileDTO;
}

export interface LoginResponse extends MeResponse {
  /** Solo para clientes nativos (cabecera X-Client: mobile). */
  token?: string;
}

export interface RoutineExerciseDTO extends RoutineExerciseTemplate {
  id: string;
  exercise: Exercise;
  alt: Exercise | null;
}

export interface RoutineDTO {
  id: string;
  templatePhase: number;
  key: RoutineKey;
  name: string;
  focus: string;
  exercises: RoutineExerciseDTO[];
}

export type SuggestionStatus = "progress" | "calibrated" | "needs_calibration" | "none";

export interface LoadSuggestion {
  exerciseId: string;
  status: SuggestionStatus;
  /** Series de trabajo de la última sesión terminada con este ejercicio (por set_index). */
  lastSets: DoneSet[];
  lastDate: string | null;
  /** Peso sugerido por serie (null si no hay datos para sugerir). */
  weights: number[] | null;
  /** Reps objetivo sugeridas por serie. */
  reps: number[] | null;
  reachedTop: boolean;
  e1rmKg: number | null;
  bestE1rmKg: number | null;
  bestSet: DoneSet | null;
}

export interface TodayResponse {
  position: ProgramPosition;
  next: ProgramPosition & { daysAhead: number };
  /** Rutina sugerida: la de hoy o la próxima. */
  suggestedKey: RoutineKey;
  routines: RoutineDTO[];
  suggestions: Record<string, LoadSuggestion>;
  activeSession: { id: string; routineId: string; routineKey: RoutineKey; startedAt: string } | null;
  /** Fechas (AAAA-MM-DD) de esta semana con sesión terminada. */
  weekDone: { date: string; routineKey: RoutineKey }[];
}

export interface RoutinesResponse {
  phase: number;
  templatePhase: number;
  routines: RoutineDTO[];
}

export interface WorkoutSetDTO {
  id: string;
  clientId: string;
  exerciseId: string;
  kind: SetKind;
  setIndex: number;
  weightKg: number;
  reps: number | null;
  durationSec: number | null;
  rir: number | null;
  targetMin: number | null;
  targetMax: number | null;
  restSec: number | null;
  completedAt: string;
}

export interface WorkoutSessionDTO {
  id: string;
  routineId: string;
  routineKey: RoutineKey;
  routineName: string;
  templatePhase: number;
  programWeek: number;
  phaseId: number;
  status: "in_progress" | "finished" | "discarded";
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  sets: WorkoutSetDTO[];
  calibrations: CalibrationDTO[];
}

export interface CalibrationDTO {
  id: string;
  exerciseId: string;
  testWeightKg: number;
  testReps: number;
  rir: number;
  e1rmKg: number;
  createdAt: string;
}

export interface CalibrationResponse {
  calibration: CalibrationDTO;
  e1rmKg: number;
  loads: number[];
  reliable: boolean;
}

export interface SummaryExercise {
  exerciseId: string;
  name: string;
  scheme: RoutineExerciseTemplate["scheme"];
  sets: DoneSet[];
  best: DoneSet | null;
  isRecord: boolean;
  calibration: { weightKg: number; reps: number; rir: number; e1rmKg: number } | null;
  next: number[];
  reachedTop: boolean;
  nextText: string;
  skipped: boolean;
}

export interface SessionSummary {
  sessionId: string;
  routineKey: RoutineKey;
  routineName: string;
  programWeek: number;
  startedAt: string;
  finishedAt: string;
  durationMin: number;
  setsCount: number;
  volumeKg: number;
  recordsCount: number;
  highlights: string;
  exercises: SummaryExercise[];
}

export interface HistoryItem {
  id: string;
  routineKey: RoutineKey;
  routineName: string;
  programWeek: number;
  startedAt: string;
  finishedAt: string | null;
  durationMin: number;
  setsCount: number;
  volumeKg: number;
  recordsCount: number;
  highlights: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  /** Cursor para la siguiente página (ISO de started_at) o null. */
  nextBefore: string | null;
}

export interface CheckinDTO {
  id: string;
  measuredOn: string;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
}

export interface CheckinPostResponse {
  checkin: CheckinDTO;
  feedback: CheckinFeedback;
}

export interface MeasurementDTO {
  id: string;
  measuredOn: string;
  chestCm: number | null;
  armCm: number | null;
  waistCm: number | null;
}

export interface OverviewResponse {
  position: ProgramPosition;
  weight: { currentKg: number; startKg: number; deltaKg: number; ratePerWeekKg: number | null; goalKg: number | null } | null;
  bodyFat: { currentPct: number; startPct: number | null; deltaPts: number | null; fatKg: number } | null;
  lean: { currentKg: number; deltaKg: number | null; shareOfLossPct: number | null } | null;
  sessions: { done: number; planned: number; pct: number };
  streak: { weeks: number; thisWeekDone: number; thisWeekPlanned: number };
  lastCheckin: CheckinDTO | null;
  checkinsCount: number;
}

export interface LiftPoint {
  date: string;
  sessionId: string;
  /** Serie pesada de la sesión (la de mayor peso). */
  weightKg: number;
  reps: number;
  e1rmKg: number;
}

export interface LiftSeries {
  exerciseId: string;
  name: string;
  points: LiftPoint[];
}

export interface LiftsResponse {
  lifts: LiftSeries[];
  bodyWeightKg: number | null;
  /** Mejor número de dominadas a peso corporal registrado (null si no hay). */
  pullups: number | null;
}

export interface ActivityDay {
  date: string;
  routineKey: RoutineKey;
  volumeKg: number;
  sessions: number;
}

export interface ActivityResponse {
  from: string;
  to: string;
  programStartDate: string;
  days: ActivityDay[];
}

export interface HealthResponse {
  ok: boolean;
  db: boolean;
}
