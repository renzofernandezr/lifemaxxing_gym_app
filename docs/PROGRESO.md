# Progreso

Leer esto primero si el contexto se reinicia. Ver también `docs/DECISIONES.md`.

Entorno: `eval "$(fnm env)"; fnm use 22` antes de `pnpm` (la Mac tiene Node 26 por defecto).

| Hito | Estado | Notas |
|---|---|---|
| M0 · Monorepo | ✅ | pnpm workspaces, Expo SDK 58 en `apps/mobile`, rama `feat/app-rn`. |
| M1 · `packages/core` | ✅ | Lógica + 39 tests (todos los vectores de §6). |
| M2 · Railway + migraciones | 🟡 | Migraciones (0001–0003), runner con advisory lock y seed generado: hechos. **Bloqueado:** incidente de Railway desde 07:24 UTC ("Builds are temporarily paused"): `railway init` responde "Deploys have been paused temporarily" (2 intentos). Reintentar cuando status.railway.com esté verde. |
| M3 · API | 🟡 | Auth, endpoints y tests de integración escritos; typecheck OK y bundle probado sin DB. Faltan los tests contra la DB `dev` (depende de M2). |
| M4 · Deploy dev/production | 🟡 | `Dockerfile`, `.dockerignore`, `railway.toml` (healthcheck) y `scripts/smoke.sh` listos. Falta Railway. |
| M5 · App: auth, navegación, tema, Plan | 🟡 | Hecho en código (login/registro, guard, pestañas con botón central, tema, Ajustes, Plan completo). Falta probar login real contra la API. |
| M6 · App: Entrenar | 🟡 | Previa, calibración, series con ✓, descansos (barra + anillo, notificación local, pitidos), cola offline, resumen. 11 tests de lógica. Falta prueba end-to-end con la API. |
| M7 · App: Progreso | ⏳ | En curso (subagente): gráficas SVG, check-in, fuerza, constancia, historial y modo demo. |
| M8 · Producción + smoke + reporte + PR | ⏳ | |
| M9 · EAS (opcional) | ⏳ | |

**Próxima acción:** cuando Railway se recupere: M2 (`railway init --name lifemaxxing-gym --workspace <id>`, Postgres, entorno `dev` duplicado, `.env` con `DEV_DATABASE_URL`, `pnpm db:migrate:dev` ×2), luego `pnpm --filter api test` y M4.
