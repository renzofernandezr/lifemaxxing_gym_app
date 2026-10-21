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
| M5 · App: auth, navegación, tema, Plan | 🟡 | Hecho y probado en web (Chrome headless, modo demo, 390/1280 px, claro/oscuro). Falta login real contra la API (depende de Railway). |
| M6 · App: Entrenar | 🟡 | Probado de punta a punta en web con el modo demo (empezar → series → descanso → anillo → terminar → resumen → Progreso). Corregido un bug de la cola offline. Falta guardarlo en la DB real. |
| M7 · App: Progreso | 🟡 | Resumen, peso y grasa (1M/3M/Todo, meta, ritmo), fuerza y estándares, constancia (26 semanas), historial, check-in, estados vacíos, modo demo. Falta verlo con datos reales de la API. |
| M8 · Producción + smoke + reporte + PR | ⏳ | |
| M9 · EAS (opcional) | ⏳ | |

**Próxima acción:** cuando Railway se recupere: M2 (`railway init --name lifemaxxing-gym --workspace <id>`, Postgres, entorno `dev` duplicado, `.env` con `DEV_DATABASE_URL`, `pnpm db:migrate:dev` ×2), luego `pnpm --filter api test` y M4.
