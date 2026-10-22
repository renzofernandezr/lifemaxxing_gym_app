// Textos compartidos por la app (es-PE).
import type { ResolvedExercise, Scheme, SetTemplate, SetUnit } from "./types";

/** Número con hasta 2 decimales, sin ceros sobrantes: 62.50 → "62.5". */
export function fk(x: number): string {
  return String(Number((Math.round(x * 100) / 100).toFixed(2)));
}

export const SCHEME_NAME: Record<Scheme, string> = {
  rpt: "Pirámide inversa",
  kino: "Kino rep",
  rest_pause: "Rest-pause",
  straight: "Series rectas",
  cardio: "Cardio",
};

export const EQUIPMENT_NAME: Record<string, string> = {
  barra: "barra",
  mancuernas: "mancuernas",
  polea: "polea",
  maquina: "máquina",
  peso_corporal: "peso corporal",
  rueda: "rueda",
  cardio: "cinta inclinada o bici",
};

export function unitLabel(unit: SetUnit, long = false): string {
  switch (unit) {
    case "min": return long ? "minutos" : "min";
    case "sec": return long ? "segundos" : "s";
    case "reps_per_side": return long ? "reps por lado" : "por lado";
    default: return "reps";
  }
}

export function rangeText(s: Pick<SetTemplate, "repsMin" | "repsMax">): string {
  return s.repsMin === s.repsMax ? String(s.repsMin) : `${s.repsMin}–${s.repsMax}`;
}

/** "3 × 4–5, 6–7, 8–10", "4 × 6–8", "1 × 12–15 + 3 × 4–6", "40–60 min". */
export function setsText(ex: Pick<ResolvedExercise, "scheme" | "sets">): string {
  const ss = ex.sets;
  if (!ss.length) return "";
  if (ex.scheme === "cardio") return `${rangeText(ss[0])} min`;
  if (ex.scheme === "rest_pause") return `1 × ${rangeText(ss[0])} + ${ss.length - 1} × ${rangeText(ss[1] ?? ss[0])}`;
  const r = ss.map(rangeText);
  const unit = ss[0].unit;
  const u = unit === "sec" ? " s" : unit === "reps_per_side" ? " por lado" : "";
  return r.every((x) => x === r[0]) ? `${ss.length} × ${r[0]}${u}` : `${ss.length} × ${r.join(", ")}`;
}

export function restText(ex: Pick<ResolvedExercise, "scheme" | "sets">): string {
  if (ex.scheme === "rest_pause") return "10–15 s";
  const s = ex.sets[0]?.restSec ?? 0;
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}:${String(r).padStart(2, "0")} min` : `${m} min`;
}

export function secondsText(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Texto del peso según el equipo: "62.5 kg", "14 kg por mano", "PC + 5 kg", "Peso corporal". */
export function weightText(ex: Pick<ResolvedExercise, "scheme" | "exercise">, w: number): string {
  if (ex.scheme === "cardio") return "—";
  const eq = ex.exercise.equipment;
  if (eq === "peso_corporal" || eq === "rueda") return w > 0 ? `PC + ${fk(w)} kg` : "Peso corporal";
  return `${fk(w)} kg${eq === "mancuernas" ? " por mano" : ""}`;
}

export function routineName(key: string): string {
  return key === "C" ? "Cardio + abs" : `Workout ${key}`;
}

/** Número con separador de miles es-PE (12,345). */
export function thousands(x: number): string {
  return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
