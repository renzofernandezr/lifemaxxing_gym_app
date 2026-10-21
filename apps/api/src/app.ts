import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv, Deps } from "./context";
import { ApiError } from "./errors";
import { authRoutes } from "./routes/auth";
import { checkinRoutes, measurementRoutes } from "./routes/body";
import { profileRoutes } from "./routes/profile";
import { programRoutes } from "./routes/program";
import { sessionRoutes } from "./routes/sessions";
import { statsRoutes } from "./routes/stats";

export interface AppOptions {
  /** Carpeta con la build web de Expo (index.html + _expo). */
  webDist?: string;
  /** Log de cada petición (método, ruta, estado). Nunca registra cuerpos. */
  log?: boolean;
}

export function createApp(deps: Deps, opts: AppOptions = {}) {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    c.set("deps", deps);
    await next();
  });
  if (opts.log) app.use("*", logger());
  app.use("*", secureHeaders({ crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false }));
  if (deps.config.allowedOrigins.length) {
    app.use("/api/*", cors({ origin: deps.config.allowedOrigins, credentials: true, allowHeaders: ["Content-Type", "Authorization", "X-Client"] }));
  }

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }, err.status);
    }
    console.error(err);
    return c.json({ error: { code: "internal", message: "Algo salió mal. Inténtalo de nuevo" } }, 500);
  });

  app.get("/api/health", async (c) => {
    try {
      await deps.db.query("select 1");
      return c.json({ ok: true, db: true });
    } catch {
      return c.json({ ok: false, db: false }, 503);
    }
  });

  app.route("/api/auth", authRoutes);
  app.route("/api/profile", profileRoutes);
  app.route("/api/program", programRoutes);
  app.route("/api/sessions", sessionRoutes);
  app.route("/api/checkins", checkinRoutes);
  app.route("/api/measurements", measurementRoutes);
  app.route("/api/stats", statsRoutes);

  app.all("/api/*", (c) => c.json({ error: { code: "not_found", message: "Ruta no encontrada" } }, 404));

  const dist = opts.webDist;
  if (dist && existsSync(join(dist, "index.html"))) {
    const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
    app.use("/_expo/*", async (c, next) => {
      await next();
      if (c.res.status === 200) c.header("Cache-Control", "public, max-age=31536000, immutable");
    });
    app.use("*", serveStatic({ root: dist }));
    // Fallback SPA: las rutas del router (sin extensión) devuelven index.html; un archivo que no existe, 404.
    app.get("*", (c) => {
      const path = c.req.path;
      if (path.startsWith("/_expo/") || path.startsWith("/assets/") || /\.[a-z0-9]{1,8}$/i.test(path)) {
        return c.text("No encontrado", 404);
      }
      c.header("Cache-Control", "no-cache");
      return c.html(indexHtml);
    });
  }
  return app;
}
