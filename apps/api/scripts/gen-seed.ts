// Genera db/migrations/0002_seed_program.sql desde packages/core/src/program.ts.
// Uso: pnpm --filter api gen:seed   (el test seed.test.ts verifica que el archivo esté al día)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EXERCISES, PHASES, ROUTINES } from "@lifemaxxing/core";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (xs: string[]) => `array[${xs.map(q).join(", ")}]::text[]`;

export function seedSql(): string {
  const out: string[] = [
    "-- 0002_seed_program: ejercicios, fases y rutinas del programa.",
    "-- GENERADO por apps/api/scripts/gen-seed.ts desde packages/core/src/program.ts. No editar a mano.",
    "-- Idempotente: insert ... on conflict do nothing.",
    "",
    "insert into exercises (id, name, equipment, muscle_groups, cue, increment_kg) values",
    EXERCISES.map((e) => `  (${[q(e.id), q(e.name), q(e.equipment), arr(e.muscleGroups), q(e.cue), q(e.incrementKg)].join(", ")})`).join(",\n"),
    "on conflict (id) do nothing;",
    "",
    "insert into program_phases (id, name, week_from, week_to, template_phase) values",
    PHASES.map((p) => `  (${[p.id, q(p.name), p.weekFrom, p.weekTo, p.templatePhase].join(", ")})`).join(",\n"),
    "on conflict (id) do nothing;",
    "",
    "insert into routines (template_phase, key, name, focus) values",
    ROUTINES.map((r) => `  (${[r.templatePhase, q(r.key), q(r.name), q(r.focus)].join(", ")})`).join(",\n"),
    "on conflict (template_phase, key) do nothing;",
    "",
  ];
  for (const r of ROUTINES) {
    out.push(`-- Plantilla ${r.templatePhase} · ${r.key} · ${r.name}`);
    for (const e of r.exercises) {
      const warm = e.warmup ? `'${JSON.stringify(e.warmup)}'::jsonb` : "null";
      out.push(
        "insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)",
        `select r.id, ${[e.position, q(e.exerciseId), q(e.altExerciseId ?? null), q(e.scheme), q(e.dropKg ?? null), warm, q(e.calibratable), q(e.isAddition), q(e.note ?? null)].join(", ")}`,
        `from routines r where r.template_phase = ${r.templatePhase} and r.key = ${q(r.key)}`,
        "on conflict (routine_id, position) do nothing;",
      );
      out.push(
        "insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)",
        "select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values",
        e.sets.map((s) => `  (${[s.setIndex, s.repsMin, s.repsMax, q(s.unit), s.restSec, q(s.label ?? null)].join(", ")})`).join(",\n"),
        ") as v(set_index, reps_min, reps_max, unit, rest_sec, label)",
        `join routines r on r.template_phase = ${r.templatePhase} and r.key = ${q(r.key)}`,
        `join routine_exercises re on re.routine_id = r.id and re.position = ${e.position}`,
        "on conflict (routine_exercise_id, set_index) do nothing;",
      );
    }
    out.push("");
  }
  return out.join("\n");
}

export const SEED_PATH = fileURLToPath(new URL("../../../db/migrations/0002_seed_program.sql", import.meta.url));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(SEED_PATH, seedSql());
  console.log(`Escrito ${SEED_PATH}`);
}
