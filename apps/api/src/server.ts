import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createPool } from "./db/pool";
import { loadConfig } from "./env";

const config = loadConfig();
if (!config.databaseUrl) {
  console.error("Falta DATABASE_URL (o DEV_DATABASE_URL en desarrollo)");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const webDist =
  config.webDist ??
  [resolve(here, "../web"), resolve(here, "../../mobile/dist")].find((d) => existsSync(resolve(d, "index.html")));

const db = createPool(config.databaseUrl);
const app = createApp({ db, config }, { webDist, log: true });

const server = serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) => {
  console.log(`API en http://localhost:${info.port} (${config.nodeEnv})${webDist ? ` · web: ${webDist}` : " · sin web"}`);
});

const shutdown = () => {
  server.close();
  db.end().finally(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
