// Genera el SQL del programa desde packages/core/src/program.ts.
//   pnpm --filter api gen:seed                        → db/migrations/0002_seed_program.sql (seed inicial; seed.test lo verifica)
//   pnpm --filter api gen:sync 0004_programa_22oct     → db/migrations/0004_programa_22oct.sql
// El seed solo inserta (on conflict do nothing): una base que ya lo aplicó no ve los cambios del programa.
// Para eso está la sincronización: una migración nueva que actualiza ejercicios, rutinas y series en su lugar
// (mismos ids, así una sesión en curso no se rompe) y borra las series o ejercicios que sobren.
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

type Mode = "seed" | "sync";

function programSql(mode: Mode, header: string[]): string {
  const sync = mode === "sync";
  const onConflict = (key: string, cols: string[]) =>
    sync ? `on conflict (${key}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")};` : `on conflict (${key}) do nothing;`;
  const out: string[] = [
    ...header,
    "",
    "insert into exercises (id, name, equipment, muscle_groups, cue, increment_kg) values",
    EXERCISES.map((e) => `  (${[q(e.id), q(e.name), q(e.equipment), arr(e.muscleGroups), q(e.cue), q(e.incrementKg)].join(", ")})`).join(",\n"),
    onConflict("id", ["name", "equipment", "muscle_groups", "cue", "increment_kg"]),
    "",
    "insert into program_phases (id, name, week_from, week_to, template_phase) values",
    PHASES.map((p) => `  (${[p.id, q(p.name), p.weekFrom, p.weekTo, p.templatePhase].join(", ")})`).join(",\n"),
    onConflict("id", ["name", "week_from", "week_to", "template_phase"]),
    "",
    "insert into routines (template_phase, key, name, focus) values",
    ROUTINES.map((r) => `  (${[r.templatePhase, q(r.key), q(r.name), q(r.focus)].join(", ")})`).join(",\n"),
    onConflict("template_phase, key", ["name", "focus"]),
    "",
  ];
  for (const r of ROUTINES) {
    const routine = `r.template_phase = ${r.templatePhase} and r.key = ${q(r.key)}`;
    out.push(`-- Plantilla ${r.templatePhase} · ${r.key} · ${r.name}`);
    for (const e of r.exercises) {
      const warm = e.warmup ? `'${JSON.stringify(e.warmup)}'::jsonb` : "null";
      out.push(
        "insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)",
        `select r.id, ${[e.position, q(e.exerciseId), q(e.altExerciseId ?? null), q(e.scheme), q(e.dropKg ?? null), warm, q(e.calibratable), q(e.isAddition), q(e.note ?? null)].join(", ")}`,
        `from routines r where ${routine}`,
        onConflict("routine_id, position", ["exercise_id", "alt_exercise_id", "scheme", "drop_kg", "warmup", "calibratable", "is_addition", "note"]),
      );
      out.push(
        "insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)",
        "select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values",
        e.sets.map((s) => `  (${[s.setIndex, s.repsMin, s.repsMax, q(s.unit), s.restSec, q(s.label ?? null)].join(", ")})`).join(",\n"),
        ") as v(set_index, reps_min, reps_max, unit, rest_sec, label)",
        `join routines r on ${routine}`,
        `join routine_exercises re on re.routine_id = r.id and re.position = ${e.position}`,
        onConflict("routine_exercise_id, set_index", ["reps_min", "reps_max", "unit", "rest_sec", "label"]),
      );
      if (sync) {
        out.push(
          `delete from routine_sets rs using routine_exercises re, routines r`,
          ` where rs.routine_exercise_id = re.id and re.routine_id = r.id and ${routine} and re.position = ${e.position} and rs.set_index > ${e.sets.length};`,
        );
      }
    }
    if (sync) {
      out.push(
        `delete from routine_exercises re using routines r where re.routine_id = r.id and ${routine} and re.position > ${r.exercises.length};`,
      );
    }
    out.push("");
  }
  return out.join("\n");
}

export function seedSql(): string {
  return programSql("seed", [
    "-- 0002_seed_program: ejercicios, fases y rutinas del programa.",
    "-- GENERADO por apps/api/scripts/gen-seed.ts desde packages/core/src/program.ts. No editar a mano.",
    "-- Idempotente: insert ... on conflict do nothing.",
  ]);
}

export function syncSql(version: string): string {
  return programSql("sync", [
    `-- ${version}: sincroniza el programa con packages/core/src/program.ts.`,
    "-- GENERADO por apps/api/scripts/gen-seed.ts --sync. No editar a mano: para otro cambio del programa, genera una migración nueva.",
    "-- Actualiza en su lugar (mismos ids) ejercicios, fases, rutinas y series, y borra las series o ejercicios que sobren.",
  ]);
}

const MIGRATIONS = new URL("../../../db/migrations/", import.meta.url);
export const SEED_PATH = fileURLToPath(new URL("0002_seed_program.sql", MIGRATIONS));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf("--sync");
  if (i >= 0) {
    const version = process.argv[i + 1];
    if (!version || !/^\d{4}_[\w-]+$/.test(version)) {
      console.error("Uso: pnpm --filter api gen:sync NNNN_nombre");
      process.exit(1);
    }
    const path = fileURLToPath(new URL(`${version}.sql`, MIGRATIONS));
    writeFileSync(path, syncSql(version));
    console.log(`Escrito ${path}`);
  } else {
    writeFileSync(SEED_PATH, seedSql());
    console.log(`Escrito ${SEED_PATH}`);
  }
}
