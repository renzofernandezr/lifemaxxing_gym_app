import { randomUUID } from "node:crypto";
import { inject } from "vitest";
import { createApp } from "../src/app";
import { createPool, type Db } from "../src/db/pool";
import { loadConfig } from "../src/env";

export const ALLOWED = ["renzo.test@example.com", "otro.test@example.com", "limite.test@example.com", "csrf.test@example.com"];
export const PASSWORD = "contraseña-de-prueba-123";
export const HOST = "gym.test";
export const ORIGIN = `https://${HOST}`;

let pool: Db | null = null;
export function testDb(): Db {
  pool ??= createPool(inject("dbUrl"), { schema: inject("testSchema"), max: 4 });
  return pool;
}

export function testApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    ALLOWED_EMAILS: ALLOWED.join(","),
    SESSION_TTL_DAYS: "30",
    ALLOWED_ORIGINS: "",
  });
  return createApp({ db: testDb(), config });
}

type App = ReturnType<typeof testApp>;

export interface Client {
  /** Petición JSON. Con `auth` usa Bearer; con `cookie` envía la cookie y el Origin del propio dominio. */
  req: (method: string, path: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; json: any; headers: Headers }>;
  token?: string;
  cookie?: string;
}

let ipSeq = 10;
export const nextIp = () => `10.0.0.${ipSeq++}`;

export function client(app: App, auth: { token?: string; cookie?: string } = {}, ip = nextIp()): Client {
  return {
    ...auth,
    async req(method, path, body, headers = {}) {
      const h: Record<string, string> = { host: HOST, "x-forwarded-for": ip, ...headers };
      if (body !== undefined) h["content-type"] = "application/json";
      if (auth.token) h.authorization = `Bearer ${auth.token}`;
      if (auth.cookie) {
        h.cookie = auth.cookie;
        if (!("origin" in headers)) h.origin = ORIGIN;
      }
      for (const k of Object.keys(h)) if (h[k] === "") delete h[k];
      const res = await app.request(`http://${HOST}${path}`, {
        method,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
    },
  };
}

/** Registra (si hace falta) e inicia sesión como cliente móvil (Bearer). */
export async function mobileUser(app: App, email: string, name = "Prueba"): Promise<Client> {
  const anon = client(app);
  const reg = await anon.req("POST", "/api/auth/register", { email, password: PASSWORD, name }, { "x-client": "mobile" });
  if (reg.status === 201) return client(app, { token: reg.json.token });
  const login = await anon.req("POST", "/api/auth/login", { email, password: PASSWORD }, { "x-client": "mobile" });
  if (login.status !== 200) throw new Error(`login ${login.status}: ${JSON.stringify(login.json)}`);
  return client(app, { token: login.json.token });
}

export const uuid = () => randomUUID();
