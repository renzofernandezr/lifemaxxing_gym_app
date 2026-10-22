import { describe, expect, it } from "vitest";
import { ALLOWED, client, mobileUser, ORIGIN, PASSWORD, testApp, testDb } from "./helpers";

const app = testApp();

describe("salud", () => {
  it("GET /api/health → { ok, db }", async () => {
    const r = await client(app).req("GET", "/api/health");
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, db: true });
  });
  it("ruta desconocida → 404 con forma de error", async () => {
    const r = await client(app).req("GET", "/api/nada");
    expect(r.status).toBe(404);
    expect(r.json.error.code).toBe("not_found");
  });
});

describe("registro", () => {
  it("bloquea correos que no están en ALLOWED_EMAILS", async () => {
    const r = await client(app).req("POST", "/api/auth/register", { email: "intruso@example.com", password: PASSWORD, name: "X" });
    expect(r.status).toBe(403);
    expect(r.json.error.code).toBe("email_not_allowed");
  });
  it("exige 10 caracteres o más", async () => {
    const r = await client(app).req("POST", "/api/auth/register", { email: ALLOWED[0], password: "corta", name: "X" });
    expect(r.status).toBe(400);
    expect(r.json.error.message).toContain("10 caracteres");
  });
  it("crea usuario y perfil por defecto, y no permite duplicados", async () => {
    const r = await client(app).req("POST", "/api/auth/register", { email: ALLOWED[0].toUpperCase(), password: PASSWORD, name: "Renzo" });
    expect(r.status).toBe(201);
    expect(r.json.user.email).toBe(ALLOWED[0]);
    expect(r.json.profile).toMatchObject({ heightCm: 186, startWeightKg: 105.6, programStartDate: "2026-10-19", timezone: "America/Lima", theme: "system" });
    expect(r.headers.get("set-cookie")).toMatch(/sid=/);
    expect(r.json.token).toBeUndefined();
    const { rows } = await testDb().query("select password_hash from users where email = $1", [ALLOWED[0]]);
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
    const dup = await client(app).req("POST", "/api/auth/register", { email: ALLOWED[0], password: PASSWORD, name: "Renzo" });
    expect(dup.status).toBe(409);
  });
});

describe("login", () => {
  it("web: cookie httpOnly y /me con cookie", async () => {
    const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[0], password: PASSWORD });
    expect(r.status).toBe(200);
    const sc = r.headers.get("set-cookie")!;
    expect(sc).toMatch(/sid=[\w-]+/);
    expect(sc).toMatch(/HttpOnly/i);
    expect(sc).toMatch(/SameSite=Lax/i);
    expect(sc).toMatch(/Path=\//);
    expect(r.json.token).toBeUndefined();
    const cookie = sc.split(";")[0];
    const me = await client(app, { cookie }).req("GET", "/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.json.user.name).toBe("Renzo");
  });
  it("móvil: token en el body y /me con Bearer", async () => {
    const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[0], password: PASSWORD }, { "x-client": "mobile" });
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(r.json.token).toMatch(/^[\w-]{43}$/);
    const me = await client(app, { token: r.json.token }).req("GET", "/api/auth/me");
    expect(me.status).toBe(200);
    // El token nunca se guarda en claro
    const { rows } = await testDb().query("select count(*)::int n from sessions where token_hash = convert_to($1, 'UTF8')", [r.json.token]);
    expect(rows[0].n).toBe(0);
  });
  it("credenciales incorrectas → mensaje genérico", async () => {
    const a = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[0], password: "mala-contraseña" });
    const b = await client(app).req("POST", "/api/auth/login", { email: "noexiste@example.com", password: PASSWORD });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.json.error.message).toBe("Correo o contraseña incorrectos");
    expect(b.json.error.message).toBe(a.json.error.message);
  });
  it("sin sesión → 401", async () => {
    const r = await client(app).req("GET", "/api/auth/me");
    expect(r.status).toBe(401);
  });
  it("logout borra la sesión", async () => {
    const u = await mobileUser(app, ALLOWED[0]);
    expect((await u.req("POST", "/api/auth/logout")).status).toBe(200);
    expect((await u.req("GET", "/api/auth/me")).status).toBe(401);
  });
});

describe("límite de intentos", () => {
  it("5 fallos por email en 15 min → 429 aunque la contraseña sea correcta", async () => {
    await mobileUser(app, ALLOWED[2]);
    for (let i = 0; i < 5; i++) {
      const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[2], password: "incorrecta" });
      expect(r.status).toBe(401);
    }
    const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[2], password: PASSWORD });
    expect(r.status).toBe(429);
    expect(r.json.error.message).toBe("Demasiados intentos. Espera unos minutos");
  });
  it("5 fallos desde la misma IP → 429 para cualquier correo", async () => {
    const c = client(app, {}, "10.9.9.9");
    for (let i = 0; i < 5; i++) await c.req("POST", "/api/auth/login", { email: `x${i}@example.com`, password: "incorrecta" });
    const r = await c.req("POST", "/api/auth/login", { email: ALLOWED[1], password: PASSWORD });
    expect(r.status).toBe(429);
  });
});

describe("expiración deslizante", () => {
  it("la web recibe la cookie renovada cuando se extiende la sesión", async () => {
    const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[0], password: PASSWORD });
    const cookie = r.headers.get("set-cookie")!.split(";")[0];
    const fresh = await client(app, { cookie }).req("GET", "/api/auth/me");
    expect(fresh.headers.get("set-cookie")).toBeNull();
    await testDb().query("update sessions set last_seen_at = now() - interval '2 hours' where user_id = (select id from users where email = $1)", [ALLOWED[0]]);
    const later = await client(app, { cookie }).req("GET", "/api/auth/me");
    expect(later.status).toBe(200);
    expect(later.headers.get("set-cookie")).toMatch(/sid=/);
  });
});

describe("sesión expirada", () => {
  it("→ 401 session_expired", async () => {
    const u = await mobileUser(app, ALLOWED[1], "Otro");
    expect((await u.req("GET", "/api/auth/me")).status).toBe(200);
    await testDb().query(
      "update sessions set expires_at = now() - interval '1 minute' where user_id = (select id from users where email = $1)",
      [ALLOWED[1]],
    );
    const r = await u.req("GET", "/api/auth/me");
    expect(r.status).toBe(401);
    expect(r.json.error.code).toBe("session_expired");
  });
});

describe("CSRF con cookie", () => {
  it("exige Origin del propio dominio en métodos que modifican", async () => {
    const reg = await client(app).req("POST", "/api/auth/register", { email: ALLOWED[3], password: PASSWORD, name: "Csrf" });
    const cookie = reg.headers.get("set-cookie")!.split(";")[0];
    const body = { measuredOn: "2026-10-19", weightKg: 100 };
    const noOrigin = await client(app, { cookie }).req("POST", "/api/checkins", body, { origin: "" });
    expect(noOrigin.status).toBe(403);
    const evil = await client(app, { cookie }).req("POST", "/api/checkins", body, { origin: "https://malo.example" });
    expect(evil.status).toBe(403);
    const ok = await client(app, { cookie }).req("POST", "/api/checkins", body, { origin: ORIGIN });
    expect(ok.status).toBe(201);
    // GET no lo exige
    expect((await client(app, { cookie }).req("GET", "/api/checkins", undefined, { origin: "" })).status).toBe(200);
  });
  it("login desde otro origen → 403", async () => {
    const r = await client(app).req("POST", "/api/auth/login", { email: ALLOWED[3], password: PASSWORD }, { origin: "https://malo.example" });
    expect(r.status).toBe(403);
  });
});
