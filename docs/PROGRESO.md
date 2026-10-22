# Progreso

Leer esto primero si el contexto se reinicia. Ver también `docs/DECISIONES.md`.

Entorno: Node 22 antes de `pnpm`. Con fnm: `eval "$(fnm env)"; fnm use 22`. Con nvm: `nvm use` (lee `.nvmrc`).

| Hito | Estado | Notas |
|---|---|---|
| M0 · Monorepo | ✅ | pnpm workspaces, Expo SDK 57 en `apps/mobile` (bajado desde 58 para usar el Expo Go de la App Store), rama `feat/app-rn`. |
| M1 · `packages/core` | ✅ | Lógica + 43 tests (todos los vectores de §6). |
| M2 · Base de datos + migraciones | ✅ Render | Railway seguía caído; se pasó a Render (plan gratis). Postgres 18 `lifemaxxing-gym-db` en Virginia. Las 3 migraciones se aplicaron en el primer deploy; en el segundo no hubo nada pendiente (idempotente). Sin entorno `dev` (Render gratis da una sola Postgres). **Caduca el 21-nov-2026.** |
| M3 · API | 🟡 | Funciona contra Postgres real (smoke test OK en production). Los tests de integración siguen sin correr: necesitan una DB `dev` que no existe. |
| M4 · Deploy | ✅ production · ❌ dev | `lifemaxxing-gym` (web Docker gratis) en https://lifemaxxing-gym.onrender.com, rama `feat/app-rn`. El deploy es manual tras cada push (`scripts/render-setup.sh deploy`): el auto-deploy no se dispara sin conectar GitHub en Render. `scripts/render-setup.sh` (db, app, deploy, wait, users, smoke). Los archivos de Railway se conservan. |
| M5 · App: auth, navegación, tema, Plan | ✅ web · 🟡 iPhone | Probado en Chrome headless (390/1280, claro/oscuro). Bundle iOS compila. |
| M6 · App: Entrenar | ✅ web (demo) · 🟡 DB | Entreno completo probado de punta a punta con el modo demo. 11 tests de lógica. |
| M7 · App: Progreso | ✅ web (demo) · 🟡 DB | Todas las sub-pestañas, estados vacíos, modo demo. |
| M8 · Reporte + PR | ✅ | `docs/REPORTE_NOCHE.md`, `docs/capturas/` (build local), PR abierto. Smoke test OK contra production en Render; login web con cookie y CSRF probados. |
| M9 · EAS | 🟡 | Sesión iniciada (`renzofernandezg`), proyecto EAS creado. Perfil `demo` para TestFlight sin servidor listo; falta que Renzo lance el build (comando en `CLAUDE.md`). |

**TestFlight:** `cd apps/mobile && npx eas-cli@latest build -p ios --profile demo --auto-submit` (lo corre Renzo).

**Servidor:** production en Render, https://lifemaxxing-gym.onrender.com (web y API). Contraseña de Renzo en `.secrets/credenciales.txt`, solo en la PC de `~/Repositories`.

**Próxima acción:** antes del 21-nov-2026 decidir qué hacer con la Postgres gratis: pasarla a pago o exportar los datos y recrearla. Si no, Render la borra tras 14 días de gracia (~5-dic). Pendiente también: los tests de integración de la API, que necesitan una DB `dev`.
