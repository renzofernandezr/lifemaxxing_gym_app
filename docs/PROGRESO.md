# Progreso

Leer esto primero si el contexto se reinicia. Ver también `docs/DECISIONES.md`.

Entorno: `eval "$(fnm env)"; fnm use 22` antes de `pnpm` (la Mac tiene Node 26 por defecto).

| Hito | Estado | Notas |
|---|---|---|
| M0 · Monorepo | ✅ | pnpm workspaces, Expo SDK 58 en `apps/mobile`, rama `feat/app-rn`. |
| M1 · `packages/core` | ✅ | Lógica + 39 tests (todos los vectores de §6). |
| M2 · Railway + migraciones | ⏳ | |
| M3 · API | ⏳ | |
| M4 · Deploy dev/production | ⏳ | |
| M5 · App: auth, navegación, tema, Plan | ⏳ | |
| M6 · App: Entrenar | ⏳ | |
| M7 · App: Progreso | ⏳ | |
| M8 · Producción + smoke + reporte + PR | ⏳ | |
| M9 · EAS (opcional) | ⏳ | |

**Próxima acción:** M2 — crear proyecto Railway `lifemaxxing-gym` con entornos `production` y `dev`, cada uno con Postgres.
