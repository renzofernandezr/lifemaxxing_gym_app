import type { Context } from "hono";
import type { z } from "zod";
import type { AuthUser } from "./auth/sessions";
import type { Db } from "./db/pool";
import type { Config } from "./env";
import { ApiError } from "./errors";

export interface Deps {
  db: Db;
  config: Config;
}

export type AppEnv = {
  Variables: {
    deps: Deps;
    user: AuthUser;
    authVia: "cookie" | "bearer";
  };
};

export type Ctx = Context<AppEnv>;

/** Lee el body JSON y lo valida con zod. Error 400 con el primer mensaje en español. */
export async function body<S extends z.ZodType>(c: Ctx, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "El cuerpo de la petición no es JSON válido");
  }
  return validate(schema, raw);
}

export function validate<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const first = r.error.issues[0];
    const msg = first?.message && !/^(Invalid|Expected|Too)/.test(first.message) ? first.message : "Datos inválidos";
    throw new ApiError(400, "validation", msg, r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return r.data;
}

/** IP del cliente: Railway pone la IP real en X-Forwarded-For / X-Real-IP. */
export function clientIp(c: Ctx): string | null {
  const real = c.req.header("x-real-ip")?.trim();
  const fwd = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = real || fwd;
  if (ip && /^[0-9a-fA-F:.]+$/.test(ip)) return ip;
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress ?? null;
}
