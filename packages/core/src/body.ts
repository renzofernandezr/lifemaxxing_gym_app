// Nutrición y composición corporal (docs/rutina-fase1.md).

export interface Macros {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** Porcentaje de las kcal de cada macro (suman 100). */
  pct: { protein: number; fat: number; carbs: number };
}

/**
 * Redondeo al entero más cercano; en el empate exacto (x.5) baja, para no pasarse de las kcal objetivo.
 * Ver docs/DECISIONES.md (macros(2600) → C 292).
 */
const roundHalfDown = (x: number) => Math.ceil(x - 0.5 - 1e-9);

/** Proteína fija (g), grasa como % de las kcal y el resto en carbohidratos. */
export function macros(kcal: number, proteinG = 195, fatPct = 0.25): Macros {
  const fatKcal = kcal * fatPct;
  const proteinKcal = proteinG * 4;
  const carbsKcal = Math.max(0, kcal - fatKcal - proteinKcal);
  const protein = (proteinKcal / kcal) * 100;
  const fat = fatPct * 100;
  return {
    kcal,
    proteinG,
    fatG: roundHalfDown(fatKcal / 9),
    carbsG: roundHalfDown(carbsKcal / 4),
    pct: { protein, fat, carbs: Math.max(0, 100 - protein - fat) },
  };
}

export const NUTRITION = {
  liftDayKcal: 2900,
  restDayKcal: 2600,
  proteinG: 195,
  fatPct: 0.25,
  targetRateKgPerWeek: -0.6,
} as const;

export interface BodyComp {
  leanKg: number;
  fatKg: number;
}

export function bodyComp(weightKg: number, fatPct: number): BodyComp {
  const fatKg = (weightKg * fatPct) / 100;
  return { leanKg: weightKg - fatKg, fatKg };
}

export interface Checkin {
  weightKg: number;
  bodyFatPct?: number | null;
}

export type FeedbackTone = "good" | "warn" | "info";

export interface CheckinFeedback {
  deltaWeightKg: number;
  deltaFatPts: number | null;
  deltaLeanKg: number | null;
  tone: FeedbackTone;
  message: string;
}

const sign = (x: number, digits = 1) => `${x > 0 ? "+" : ""}${Number(x.toFixed(digits))}`;

/** Mensajes del prototipo al registrar un check-in semanal. */
export function checkinFeedback(prev: Checkin | null | undefined, curr: Checkin): CheckinFeedback {
  if (!prev) {
    return {
      deltaWeightKg: 0, deltaFatPts: null, deltaLeanKg: null, tone: "info",
      message: "Primer check-in guardado. La próxima semana verás tu ritmo.",
    };
  }
  const dw = curr.weightKg - prev.weightKg;
  const hasFat = prev.bodyFatPct != null && curr.bodyFatPct != null;
  const dg = hasFat ? (curr.bodyFatPct as number) - (prev.bodyFatPct as number) : null;
  const dl = hasFat
    ? bodyComp(curr.weightKg, curr.bodyFatPct as number).leanKg - bodyComp(prev.weightKg, prev.bodyFatPct as number).leanKg
    : null;

  let tone: FeedbackTone = "good";
  let advice: string;
  if (dw < 0 && dl != null && -dl > -dw * 0.35) {
    tone = "warn";
    advice = "Bajó bastante masa magra esta semana; puede ser agua. Si se repite, sube la proteína o recorta menos calorías.";
  } else if (dw > -0.4 && dw <= 0) {
    tone = "warn";
    advice = "Ritmo lento. Si se repite otra semana, baja 10 % las calorías.";
  } else if (dw < -1) {
    tone = "warn";
    advice = "Bajaste rápido. Si la fuerza cae, sube 10 % las calorías.";
  } else if (dw > 0) {
    tone = "warn";
    advice = "Subiste esta semana. Revisa el fin de semana y las porciones.";
  } else {
    advice = "Buen ritmo, sigue igual.";
  }
  const head = `${sign(dw)} kg${dg != null ? ` y ${sign(dg)} pts de grasa` : ""}.`;
  return { deltaWeightKg: dw, deltaFatPts: dg, deltaLeanKg: dl, tone, message: `${head} ${advice}` };
}

/** Estándares Kinobody relativos al peso corporal (× 5 reps). */
export const STANDARDS = {
  inc: { name: "Press inclinado × 5", marks: [[1, "Good 1.0"], [1.2, "Great"], [1.4, "Godlike"]] as [number, string][], max: 1.4 },
  ohp: { name: "Press militar × 5", marks: [[0.7, "Good 0.7"], [0.85, "Great"], [1, "Godlike"]] as [number, string][], max: 1 },
} as const;
