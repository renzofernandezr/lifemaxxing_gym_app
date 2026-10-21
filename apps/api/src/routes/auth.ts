import { loginSchema, registerSchema, type LoginResponse } from "@lifemaxxing/core";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { dummyHash, hashPassword, verifyPassword } from "../auth/crypto";
import { assertSameOrigin, requireAuth, SESSION_COOKIE } from "../auth/middleware";
import { createSession, deleteSession } from "../auth/sessions";
import { body, clientIp, type AppEnv, type Ctx } from "../context";
import { tx } from "../db/pool";
import { ApiError } from "../errors";
import { getMe } from "../services/user";

const MAX_FAILED = 5;
const WINDOW_MIN = 15;
const DEFAULT_PROFILE = { heightCm: 186, startWeightKg: 105.6, programStartDate: "2026-10-19" };

const isMobile = (c: Ctx) => c.req.header("x-client")?.toLowerCase() === "mobile";

async function issueSession(c: Ctx, userId: string): Promise<string | undefined> {
  const { db, config } = c.get("deps");
  const token = await createSession(db, userId, config.sessionTtlDays, c.req.header("user-agent") ?? null);
  if (isMobile(c)) return token;
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "Lax",
    path: "/",
    maxAge: config.sessionTtlDays * 86_400,
  });
  return undefined;
}

export const authRoutes = new Hono<AppEnv>()
  .post("/register", async (c) => {
    const { db, config } = c.get("deps");
    if (!isMobile(c)) assertSameOrigin(c, { required: false });
    const input = await body(c, registerSchema);
    if (!config.allowedEmails.includes(input.email)) {
      throw new ApiError(403, "email_not_allowed", "Este correo no está habilitado para registrarse");
    }
    const passwordHash = await hashPassword(input.password);
    const userId = await tx(db, async (t) => {
      const ins = await t.query<{ id: string }>(
        "insert into users (email, password_hash, name) values ($1, $2, $3) on conflict (email) do nothing returning id",
        [input.email, passwordHash, input.name],
      );
      if (!ins.rows[0]) throw new ApiError(409, "email_taken", "Ya existe una cuenta con este correo");
      const id = ins.rows[0].id;
      await t.query(
        "insert into profiles (user_id, height_cm, start_weight_kg, program_start_date) values ($1, $2, $3, $4)",
        [id, DEFAULT_PROFILE.heightCm, DEFAULT_PROFILE.startWeightKg, DEFAULT_PROFILE.programStartDate],
      );
      return id;
    });
    const token = await issueSession(c, userId);
    const res: LoginResponse = { ...(await getMe(db, userId)), ...(token ? { token } : {}) };
    return c.json(res, 201);
  })
  .post("/login", async (c) => {
    const { db } = c.get("deps");
    if (!isMobile(c)) assertSameOrigin(c, { required: false });
    const input = await body(c, loginSchema);
    const ip = clientIp(c);
    const { rows: lim } = await db.query<{ by_email: number; by_ip: number }>(
      `select count(*) filter (where email = $1) as by_email,
              count(*) filter (where $2::inet is not null and ip = $2::inet) as by_ip
         from login_attempts
        where success = false and created_at > now() - make_interval(mins => $3)
          and (email = $1 or ($2::inet is not null and ip = $2::inet))`,
      [input.email, ip, WINDOW_MIN],
    );
    if ((lim[0]?.by_email ?? 0) >= MAX_FAILED || (lim[0]?.by_ip ?? 0) >= MAX_FAILED) {
      throw new ApiError(429, "too_many_attempts", "Demasiados intentos. Espera unos minutos");
    }
    const { rows } = await db.query<{ id: string; password_hash: string }>(
      "select id, password_hash from users where email = $1",
      [input.email],
    );
    const user = rows[0];
    const ok = user ? await verifyPassword(user.password_hash, input.password) : (await verifyPassword(await dummyHash(), input.password), false);
    await db.query("insert into login_attempts (email, ip, success) values ($1, $2, $3)", [input.email, ip, ok]);
    if (!user || !ok) throw new ApiError(401, "invalid_credentials", "Correo o contraseña incorrectos");
    const token = await issueSession(c, user.id);
    const res: LoginResponse = { ...(await getMe(db, user.id)), ...(token ? { token } : {}) };
    return c.json(res);
  })
  .post("/logout", requireAuth, async (c) => {
    await deleteSession(c.get("deps").db, c.get("user").sessionId);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireAuth, async (c) => c.json(await getMe(c.get("deps").db, c.get("user").id)));
