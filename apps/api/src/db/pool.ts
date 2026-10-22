import pg from "pg";

// numeric → number, int8 (count) → number, date → 'YYYY-MM-DD' tal cual.
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
pg.types.setTypeParser(1082, (v) => v);

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export interface PoolOptions {
  /** Schema propio (tests): search_path = schema, public. */
  schema?: string;
  max?: number;
}

export function createPool(connectionString: string, opts: PoolOptions = {}): Db {
  return new pg.Pool({
    connectionString,
    max: opts.max ?? 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "lifemaxxing-api",
    ...(opts.schema ? { options: `-c search_path=${opts.schema},public` } : {}),
  });
}

/** Ejecuta `fn` dentro de una transacción. */
export async function tx<T>(db: Db, fn: (c: Tx) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (err) {
    await c.query("rollback").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}
