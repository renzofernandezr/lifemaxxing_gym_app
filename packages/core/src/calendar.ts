// Calendario del programa: semana, fase y rutina del día (zona horaria America/Lima por defecto).
import { DEFAULT_PROGRAM_START, DEFAULT_TIMEZONE, PHASES, PROGRAM_WEEKS } from "./program";
import type { Phase, RoutineKey } from "./types";

const DAY_MS = 86_400_000;
export const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
export const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Fecha local 'YYYY-MM-DD' de un instante en una zona horaria. */
export function localDate(at: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Días UTC desde la época para una fecha 'YYYY-MM-DD'. */
export function dayNumber(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) throw new Error(`Fecha inválida: ${isoDate}`);
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
}

export function addDays(isoDate: string, days: number): string {
  return new Date((dayNumber(isoDate) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = lunes … 6 = domingo. */
export function weekday(isoDate: string): number {
  // 1970-01-01 fue jueves (3 con lunes = 0)
  return (((dayNumber(isoDate) + 3) % 7) + 7) % 7;
}

/** Lunes de la semana de la fecha. */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, -weekday(isoDate));
}

/** Rutina de un día de la semana: semana impar A-B-A, par B-A-B; lun/mié/vie pesas, sáb C. */
export function routineForDay(week: number, dow: number): RoutineKey | null {
  const odd = ((week % 2) + 2) % 2 === 1;
  switch (dow) {
    case 0: return odd ? "A" : "B";
    case 2: return odd ? "B" : "A";
    case 4: return odd ? "A" : "B";
    case 5: return "C";
    default: return null;
  }
}

export interface ProgramPosition {
  date: string;
  /** Semana del programa (1–24). Antes del inicio es ≤ 0; después del final, > 24. */
  week: number;
  /** 0 = lunes … 6 = domingo. */
  dayOfWeek: number;
  dayName: string;
  phase: Phase;
  templatePhase: number;
  routineKey: RoutineKey | null;
  isLiftDay: boolean;
  beforeStart: boolean;
  finished: boolean;
}

export function phaseForWeek(week: number): Phase {
  if (week <= PHASES[0].weekTo) return PHASES[0];
  return PHASES.find((p) => week >= p.weekFrom && week <= p.weekTo) ?? PHASES[PHASES.length - 1];
}

/**
 * Posición del programa para una fecha.
 * @param date fecha 'YYYY-MM-DD' (ya local) o un instante (se convierte a fecha local en `timeZone`).
 * @param startDate lunes de la semana 1.
 */
export function programPosition(
  date: string | Date = new Date(),
  startDate: string = DEFAULT_PROGRAM_START,
  timeZone: string = DEFAULT_TIMEZONE,
): ProgramPosition {
  const iso = typeof date === "string" ? date.slice(0, 10) : localDate(date, timeZone);
  // La semana 1 empieza el lunes de la fecha de inicio (aunque se haya guardado otro día).
  const diff = dayNumber(iso) - dayNumber(mondayOf(startDate));
  const week = Math.floor(diff / 7) + 1;
  const dow = weekday(iso);
  const phase = phaseForWeek(week);
  const routineKey = routineForDay(week, dow);
  return {
    date: iso,
    week,
    dayOfWeek: dow,
    dayName: DAY_NAMES[dow],
    phase,
    templatePhase: phase.templatePhase,
    routineKey,
    isLiftDay: routineKey === "A" || routineKey === "B",
    beforeStart: week < 1,
    finished: week > PROGRAM_WEEKS,
  };
}

/** Próximo día con sesión (incluye hoy). */
export function nextSession(
  date: string = localDate(),
  startDate: string = DEFAULT_PROGRAM_START,
): ProgramPosition & { daysAhead: number } {
  for (let add = 0; add < 8; add++) {
    const p = programPosition(addDays(date, add), startDate);
    if (p.routineKey) return { ...p, daysAhead: add };
  }
  // Inalcanzable: toda semana tiene sesiones.
  return { ...programPosition(date, startDate), daysAhead: 0 };
}

/** Sesiones planificadas entre el inicio y una fecha (inclusive), sin pasar de la semana 24. */
export function plannedSessionsUntil(date: string, startDate: string = DEFAULT_PROGRAM_START): number {
  const start = dayNumber(mondayOf(startDate));
  const end = Math.min(dayNumber(date), start + PROGRAM_WEEKS * 7 - 1);
  let n = 0;
  for (let d = start; d <= end; d++) {
    const iso = new Date(d * DAY_MS).toISOString().slice(0, 10);
    if (programPosition(iso, startDate).routineKey) n++;
  }
  return n;
}
