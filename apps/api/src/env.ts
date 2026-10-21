// Configuración leída del entorno.
export interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string | undefined;
  allowedEmails: string[];
  sessionTtlDays: number;
  /** Orígenes extra permitidos con cookie (CORS + CSRF), p. ej. Expo web local en :8081. */
  allowedOrigins: string[];
  webDist: string | undefined;
  isProd: boolean;
}

const list = (v: string | undefined) =>
  (v ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProd = nodeEnv === "production";
  return {
    nodeEnv,
    isProd,
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL || env.DEV_DATABASE_URL,
    allowedEmails: list(env.ALLOWED_EMAILS ?? "renzofernandezg.rf@gmail.com"),
    sessionTtlDays: Number(env.SESSION_TTL_DAYS ?? 30),
    allowedOrigins: list(env.ALLOWED_ORIGINS ?? (isProd ? "" : "http://localhost:8081,http://localhost:19006")),
    webDist: env.WEB_DIST,
  };
}
