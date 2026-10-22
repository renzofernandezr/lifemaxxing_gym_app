// Baja las fotos de técnica (inicio y final de cada movimiento) de free-exercise-db (dominio público, The Unlicense)
// a assets/exercises/ y genera src/components/exercise-media.ts con los require() estáticos que pide Metro.
// Uso: node apps/mobile/scripts/get-exercise-images.mjs   (en macOS las achica a 600 px con `sips`)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets/exercises");
const MEDIA_TS = join(ROOT, "src/components/exercise-media.ts");
const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/** Ejercicio de la app → ejercicio de free-exercise-db (el más parecido; sin foto: cardio y rodillas lado a lado). */
const MAP = {
  inc: "Barbell_Incline_Bench_Press_-_Medium_Grip",
  ohp: "Standing_Military_Press",
  tri: "Triceps_Pushdown_-_Rope_Attachment",
  lat: "Side_Lateral_Raise",
  knee: "Knee_Hip_Raise_On_Parallel_Bars",
  neg: "Chin-Up",
  jal: "Underhand_Cable_Pulldowns",
  ham: "Incline_Hammer_Curls",
  sq: "Barbell_Squat",
  bul: "Split_Squat_with_Dumbbells",
  rdl: "Stiff-Legged_Dumbbell_Deadlift",
  sapd: "Straight-Arm_Pulldown",
  fp: "Face_Pull",
  hlr: "Hanging_Leg_Raise",
  whl: "Ab_Roller",
  brg: "Butt_Lift_Bridge",
  inc_db: "Incline_Dumbbell_Press",
  dip_w: "Dips_-_Chest_Version",
  tri_oh: "Standing_One-Arm_Dumbbell_Triceps_Extension",
  uprow: "Standing_Dumbbell_Upright_Row",
  jal_pr: "Wide-Grip_Lat_Pulldown",
  curl_inc: "Incline_Dumbbell_Curl",
  box: "Box_Squat",
  sl_rdl: "Kettlebell_One-Legged_Deadlift",
  rdf: "Seated_Bent-Over_Rear_Delt_Raise",
  chin_w: "Chin-Up",
  bench: "Barbell_Bench_Press_-_Medium_Grip",
  pull_w: "Pullups",
  hip_thrust: "Barbell_Hip_Thrust",
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hasSips = process.platform === "darwin";

mkdirSync(OUT, { recursive: true });
const files = new Map();
for (const src of new Set(Object.values(MAP))) {
  const name = slug(src);
  files.set(src, name);
  for (const frame of [0, 1]) {
    const dest = join(OUT, `${name}-${frame}.jpg`);
    if (existsSync(dest)) continue;
    const res = await fetch(`${BASE}/${src}/${frame}.jpg`);
    if (!res.ok) throw new Error(`${src}/${frame}.jpg: HTTP ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    if (hasSips) execFileSync("sips", ["-Z", "600", "-s", "formatOptions", "70", dest, "--out", dest], { stdio: "ignore" });
    console.log(`  ✓ ${name}-${frame}.jpg`);
  }
}

const lines = [
  "// GENERADO por apps/mobile/scripts/get-exercise-images.mjs. No editar a mano.",
  "// Fotos de free-exercise-db (dominio público): inicio y final de cada movimiento, para la animación de Técnica.",
  "import type { ImageSourcePropType } from \"react-native\";",
  "",
  "export const EXERCISE_FRAMES: Record<string, [ImageSourcePropType, ImageSourcePropType]> = {",
  ...Object.entries(MAP).map(([id, src]) => {
    const n = files.get(src);
    return `  ${id}: [require("../../assets/exercises/${n}-0.jpg"), require("../../assets/exercises/${n}-1.jpg")],`;
  }),
  "};",
  "",
];
writeFileSync(MEDIA_TS, lines.join("\n"));
console.log(`Escrito ${MEDIA_TS}`);
