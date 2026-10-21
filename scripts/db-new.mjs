// Crea el siguiente archivo de migración numerado: pnpm db:new <nombre>
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = (process.argv[2] ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
if (!name) {
  console.error("Uso: pnpm db:new <nombre>");
  process.exit(1);
}
const dir = join(import.meta.dirname, "..", "db", "migrations");
const last = readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort().at(-1);
const next = String((last ? parseInt(last.slice(0, 4), 10) : 0) + 1).padStart(4, "0");
const file = join(dir, `${next}_${name}.sql`);
writeFileSync(file, `-- ${next}_${name}\n`);
console.log(`Creada ${file}`);
