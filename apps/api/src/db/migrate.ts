// Runner de migraciones SQL: aplica db/migrations/NNNN_*.sql en orden, cada una en su transacción,
// con advisory lock para que dos deploys no migren a la vez.
//   pnpm db:migrate        → DATABASE_URL
//   pnpm db:migrate:dev    → DEV_DATABASE_URL (Postgres del entorno dev de Railway)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const LOCK_KEY = 727272;

export function findMigrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.MIGRATIONS_DIR,
    resolve(process.cwd(), "db/migrations"),
    resolve(here, "../../../../db/migrations"), // apps/api/src/db → raíz
    resolve(here, "../db/migrations"), // dist/ en la imagen de Docker
    resolve(here, "../../db/migrations"),
  ].filter((x): x is string => !!x);
  const dir = candidates.find((d) => existsSync(d));
  if (!dir) throw new Error(`No encuentro db/migrations (probé: ${candidates.join(", ")})`);
  return dir;
}

export interface MigrateResult {
  applied: string[];
  skipped: string[];
}

type Log = (msg: string) => void;

/** Aplica las migraciones pendientes usando un cliente ya conectado (respeta su search_path). */
export async function migrate(client: pg.ClientBase, dir = findMigrationsDir(), log: Log = () => {}): Promise<MigrateResult> {
  const files = readdirSync(dir).filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f)).sort();
  await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    await client.query(
      "create table if not exists schema_migrations (version text primary key, applied_at timestamptz default now())",
    );
    const { rows } = await client.query<{ version: string }>("select version from schema_migrations");
    const done = new Set(rows.map((r) => r.version));
    const result: MigrateResult = { applied: [], skipped: [] };
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) {
        result.skipped.push(version);
        continue;
      }
      const sql = readFileSync(join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (version) values ($1)", [version]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Falló la migración ${file}: ${(err as Error).message}`);
      }
      log(`  ✓ ${version}`);
      result.applied.push(version);
    }
    return result;
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}

async function main() {
  const useDev = process.argv.includes("--dev");
  const url = useDev ? process.env.DEV_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    console.error(`Falta ${useDev ? "DEV_DATABASE_URL" : "DATABASE_URL"}`);
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, application_name: "migrate" });
  await client.connect();
  try {
    console.log(`Migrando ${useDev ? "dev" : "DATABASE_URL"}…`);
    const r = await migrate(client, findMigrationsDir(), console.log);
    console.log(r.applied.length ? `Aplicadas: ${r.applied.length}` : `Nada pendiente (${r.skipped.length} ya aplicadas).`);
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]).replace(/\.ts$/, ".js") === fileURLToPath(import.meta.url).replace(/\.ts$/, ".js");
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
