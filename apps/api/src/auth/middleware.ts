import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AppEnv, Ctx } from "../context";
import { ApiError } from "../errors";
import { findSession } from "./sessions";

export const SESSION_COOKIE = "sid";
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function requestHost(c: Ctx): string {
  return (c.req.header("x-forwarded-host") ?? c.req.header("host") ?? new URL(c.req.url).host).split(",")[0].trim().toLowerCase();
}

function requestOrigin(c: Ctx): string | null {
  const origin = c.req.header("origin");
  if (origin && origin !== "null") return origin.toLowerCase();
  const ref = c.req.header("referer");
  if (ref) {
    try {
      return new URL(ref).origin.toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
}

/** CSRF para peticiones con cookie: el Origin (o Referer) debe ser el propio dominio o uno permitido. */
export function assertSameOrigin(c: Ctx, { required }: { required: boolean }) {
  const origin = requestOrigin(c);
  if (!origin) {
    if (required) throw new ApiError(403, "csrf", "Origen no permitido");
    return;
  }
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new ApiError(403, "csrf", "Origen no permitido");
  }
  const { allowedOrigins } = c.get("deps").config;
  if (host !== requestHost(c) && !allowedOrigins.includes(origin)) {
    throw new ApiError(403, "csrf", "Origen no permitido");
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const { db, config } = c.get("deps");
  const header = c.req.header("authorization");
  let token: string | undefined;
  let via: "cookie" | "bearer";
  if (header?.toLowerCase().startsWith("bearer ")) {
    token = header.slice(7).trim();
    via = "bearer";
  } else {
    token = getCookie(c, SESSION_COOKIE);
    via = "cookie";
  }
  if (!token) throw new ApiError(401, "unauthorized", "Inicia sesión para continuar");
  if (via === "cookie" && !SAFE.has(c.req.method)) assertSameOrigin(c, { required: true });
  const user = await findSession(db, token, config.sessionTtlDays);
  if (!user) throw new ApiError(401, "session_expired", "Tu sesión expiró. Vuelve a iniciar sesión");
  c.set("user", user);
  c.set("authVia", via);
  await next();
});
