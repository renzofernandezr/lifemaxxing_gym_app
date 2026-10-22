import { readFileSync } from "node:fs";
import pg from "pg";
import { describe, expect, it, inject } from "vitest";
import { seedSql, SEED_PATH } from "../scripts/gen-seed";
import { migrate } from "../src/db/migrate";

describe("migraciones", () => {
  it("son idempotentes: la segunda corrida no aplica nada", async () => {
    const c = new pg.Client({ connectionString: inject("dbUrl"), options: `-c search_path=${inject("testSchema")},public` });
    await c.connect();
    try {
      const r = await migrate(c);
      expect(r.applied).toEqual([]);
      expect(r.skipped).toContain("0001_init");
      const { rows } = await c.query("select count(*)::int n from exercises");
      expect(rows[0].n).toBe(29);
      const sets = await c.query("select count(*)::int n from routine_sets");
      expect(sets.rows[0].n).toBeGreaterThan(80);
    } finally {
      await c.end();
    }
  });

  it("el seed versionado está al día con packages/core", () => {
    expect(readFileSync(SEED_PATH, "utf8")).toBe(seedSql());
  });
});

describe("textos del resumen", () => {
  it("shortName conserva las preposiciones", async () => {
    const { shortName } = await import("../src/services/workouts");
    expect(shortName("Press inclinado con barra")).toBe("Press inclinado");
    expect(shortName("Negativas de dominada supina")).toBe("Negativas de dominada");
    expect(shortName("Jalón al pecho supino")).toBe("Jalón al pecho");
  });
});
