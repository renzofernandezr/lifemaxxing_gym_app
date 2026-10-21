// Utilidades de la vista Progreso: fechas en español (Perú), signos y perfil.
import { DAY_NAMES, DEFAULT_PROGRAM_START, DEFAULT_TIMEZONE, fk, localDate, weekday } from "@lifemaxxing/core";
import { useState } from "react";
import { useAuth } from "../../lib/auth";

/** Abreviaturas de mes usadas en Perú ("set" de setiembre). */
export const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"] as const;

/** "19 oct" */
export function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

/** "lunes 19 oct" */
export function longDate(iso: string): string {
  return `${DAY_NAMES[weekday(iso.slice(0, 10))]} ${shortDate(iso)}`;
}

/** Número con signo y signo menos tipográfico: +1.2 · −0.4 · 0. */
export function signed(x: number, digits = 1): string {
  const v = Number(x.toFixed(digits));
  if (v > 0) return `+${fk(v)}`;
  if (v < 0) return `−${fk(-v)}`;
  return "0";
}

/** Perfil con valores por defecto (fecha de inicio, zona horaria) y la fecha local de hoy. */
export function useProfileDates() {
  const { me } = useAuth();
  const tz = me?.profile.timezone ?? DEFAULT_TIMEZONE;
  const start = me?.profile.programStartDate ?? DEFAULT_PROGRAM_START;
  return { me, tz, start, today: localDate(new Date(), tz) };
}

/** Lee un número escrito por el usuario (acepta coma decimal). NaN si está vacío o es inválido. */
export function parseNum(s: string): number {
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}

/** Contador que sube cada vez que `open` pasa a true: úsalo como `key` para limpiar un formulario al abrir una hoja. */
export function useOpenRound(open: boolean): number {
  const [round, setRound] = useState(0);
  const [prev, setPrev] = useState(open);
  if (open !== prev) {
    setPrev(open);
    if (open) setRound((r) => r + 1);
  }
  return round;
}
