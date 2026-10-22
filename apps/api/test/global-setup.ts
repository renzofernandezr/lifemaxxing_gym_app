// Cada corrida de tests usa su propio schema en la DB del entorno dev de Railway:
// crea test_<timestamp>, corre las migraciones ahí y al final hace drop schema ... cascade.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { migrate } from "../src/db/migrate";

declare module "vitest" {
  export interface ProvidedContext {
    testSchema: string;
    dbUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const envFile = resolve(import.meta.dirname, "../../../.env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.DEV_DATABASE_URL;
  if (!url) throw new Error("Falta DEV_DATABASE_URL (URL pública del Postgres dev de Railway) en .env");

  const schema = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`create schema ${schema}`);
  await admin.end();

  const client = new pg.Client({ connectionString: url, options: `-c search_path=${schema},public` });
  await client.connect();
  try {
    await migrate(client);
  } finally {
    await client.end();
  }
  project.provide("testSchema", schema);
  project.provide("dbUrl", url);

  return async () => {
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    await c.query(`drop schema if exists ${schema} cascade`);
    await c.end();
  };
}
