// Esquemas zod compartidos por la app y la API.
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD)");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido").max(200),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(200),
  name: z.string().trim().min(1, "Escribe tu nombre").max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido").max(200),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profilePatchSchema = z
  .object({
    heightCm: z.number().min(100).max(250).nullable(),
    startWeightKg: z.number().min(30).max(250).nullable(),
    goalWeightKg: z.number().min(30).max(250).nullable(),
    programStartDate: isoDate,
    theme: z.enum(["system", "light", "dark"]),
    name: z.string().trim().min(1).max(80),
  })
  .partial();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export const startSessionSchema = z.object({
  routineId: z.string().uuid(),
  date: isoDate.optional(),
});

export const setInputSchema = z.object({
  clientId: z.string().uuid(),
  exerciseId: z.string().min(1).max(40),
  kind: z.enum(["warmup", "test", "work"]),
  setIndex: z.number().int().min(0).max(50),
  weightKg: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  durationSec: z.number().int().min(0).max(36000).nullable().optional(),
  rir: z.number().int().min(0).max(5).nullable().optional(),
  targetMin: z.number().int().min(0).max(1000).nullable().optional(),
  targetMax: z.number().int().min(0).max(1000).nullable().optional(),
  restSec: z.number().int().min(0).max(3600).nullable().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
});
export type SetInput = z.infer<typeof setInputSchema>;

export const setsBatchSchema = z.union([
  z.object({ sets: z.array(setInputSchema).min(1).max(200) }),
  setInputSchema.transform((s) => ({ sets: [s] })),
]);

export const calibrationSchema = z.object({
  exerciseId: z.string().min(1).max(40),
  weightKg: z.number().min(0).max(1000),
  reps: z.number().int().min(1).max(50),
  rir: z.number().int().min(0).max(5),
});
export type CalibrationInput = z.infer<typeof calibrationSchema>;

export const checkinSchema = z.object({
  measuredOn: isoDate,
  weightKg: z.number().min(30, "El peso debe estar entre 30 y 250 kg").max(250, "El peso debe estar entre 30 y 250 kg"),
  bodyFatPct: z.number().min(3, "La grasa debe estar entre 3 y 60 %").max(60, "La grasa debe estar entre 3 y 60 %").nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});
export type CheckinInput = z.infer<typeof checkinSchema>;

export const measurementSchema = z.object({
  measuredOn: isoDate,
  chestCm: z.number().min(30).max(250).nullable().optional(),
  armCm: z.number().min(10).max(100).nullable().optional(),
  waistCm: z.number().min(30).max(250).nullable().optional(),
});
export type MeasurementInput = z.infer<typeof measurementSchema>;
