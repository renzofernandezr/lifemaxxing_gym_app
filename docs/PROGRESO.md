# Progreso

Leer esto primero si el contexto se reinicia. Ver también `docs/DECISIONES.md`.

Entorno: `eval "$(fnm env)"; fnm use 22` antes de `pnpm` (la Mac tiene Node 26 por defecto).

| Hito | Estado | Notas |
|---|---|---|
| M0 · Monorepo | ✅ | pnpm workspaces, Expo SDK 58 en `apps/mobile`, rama `feat/app-rn`. |
| M1 · `packages/core` | ✅ | Lógica + 42 tests (todos los vectores de §6). |
| M2 · Railway + migraciones | 🟡 bloqueado | Migraciones, runner y seed hechos. Railway caído toda la noche: 3 intentos de `railway init` fallidos ("Deploys have been paused temporarily"). |
| M3 · API | 🟡 | Código y tests de integración escritos; typecheck OK. Tests contra Postgres sin correr (sin DB). |
| M4 · Deploy dev/production | 🟡 bloqueado | `Dockerfile`, `railway.toml`, `scripts/smoke.sh`, `scripts/railway-setup.sh` (sin ejecutar). |
| M5 · App: auth, navegación, tema, Plan | ✅ web · 🟡 iPhone | Probado en Chrome headless (390/1280, claro/oscuro). Bundle iOS compila. |
| M6 · App: Entrenar | ✅ web (demo) · 🟡 DB | Entreno completo probado de punta a punta con el modo demo. 11 tests de lógica. |
| M7 · App: Progreso | ✅ web (demo) · 🟡 DB | Todas las sub-pestañas, estados vacíos, modo demo. |
| M8 · Reporte + PR | 🟡 | `docs/REPORTE_NOCHE.md`, `docs/capturas/` (build local), PR abierto. Sin producción ni smoke test. |
| M9 · EAS | ❌ | `eas whoami` → Not logged in. `eas.json` listo. |

**Próxima acción:** cuando status.railway.com esté verde, `scripts/railway-setup.sh project`, `vars`, `devdb` (migraciones ×2 + tests de la API), `deploy dev`, `deploy production`, `users`, `smoke`. Luego commitear `apps/mobile/.env.*` y actualizar el reporte y el PR.
