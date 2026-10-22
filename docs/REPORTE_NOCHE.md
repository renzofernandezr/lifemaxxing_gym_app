# Reporte de la noche · 21-oct-2026

## Actualización (21-oct, noche): servidor en Render

Railway siguió caído, así que el servidor se montó en **Render, en plan gratis y solo con production**:

- **production:** https://lifemaxxing-gym.onrender.com (API y web en el mismo origen), desde `feat/app-rn`. Después de cada push se despliega con `scripts/render-setup.sh deploy`: el auto-deploy no se dispara sin conectar GitHub en Render.
- **Migraciones:** las 3 se aplicaron sin errores en Postgres 18 en el primer deploy. En el segundo no hubo nada pendiente (idempotentes).
- **Smoke test:** OK. Recorrió health, login, today, sesión, 2 series (con reintento idempotente), finish, check-in, overview y la web; al final borró sus datos. Login web con cookie (Secure, httpOnly) y CSRF probados.
- **Usuario de Renzo:** creado. Su contraseña está **solo** en `.secrets/credenciales.txt` (ignorado por git). Cámbiala después del primer login.
- **Sin `dev`:** Render gratis da una sola Postgres por workspace. Por eso los tests de integración de la API siguen sin correr.
- **Límites:** la web se duerme tras 15 min sin uso (~1 min en despertar). La Postgres no tiene backups y **caduca el 21-nov-2026**; si no se pasa a pago, Render la borra con los datos tras 14 días de gracia.
- **Cómo se configuró:** `scripts/render-setup.sh` (CLI de Render). Detalle en `CLAUDE.md` y `docs/DECISIONES.md`.

Lo que sigue más abajo es el reporte original de la noche, cuando todavía se esperaba Railway.

## En una línea

La app (iPhone + web), la API y la base de datos quedaron escritas, probadas sin base de datos y en la rama `feat/app-rn`. **No hay nada desplegado en Railway**: durante toda la noche Railway tuvo un incidente que primero pausó los builds y después tumbó su API ("Major Outage"). No se pudo crear el proyecto `lifemaxxing-gym`. Dejé un script que hace M2 y M4 cuando Railway vuelva.

## Estado por hito

| Hito | Estado | Qué quedó |
|---|---|---|
| M0 · Monorepo | ✅ | pnpm workspaces, Node 22 (fnm), Expo en `apps/mobile` (SDK 57: ver la nota de Expo Go más abajo). |
| M1 · `packages/core` | ✅ | Lógica del prototipo en TypeScript: Epley, cargas RPT/Kino, calibración, doble progresión, discos, calendario A/B/C con zona horaria de Lima, macros, check-in. **42 tests en verde**, incluidos todos los vectores del plan. |
| M2 · Railway + migraciones | 🟡 bloqueado | Migraciones `0001_init`, `0002_seed_program` (generada desde `core`), `0003_session_summary`; runner con advisory lock y una transacción por archivo; `pnpm db:migrate`, `db:migrate:dev`, `db:new`. **Falta** crear el proyecto y las DB en Railway y migrar `dev` dos veces. |
| M3 · API | 🟡 | Hono: registro limitado a `ALLOWED_EMAILS`, login con cookie httpOnly (web) o token Bearer (iPhone), sesiones con hash sha256 y expiración deslizante, límite de 5 intentos, CSRF por `Origin`, y todos los endpoints de §7.2. Tests de integración escritos (auth, rate limit, sesión expirada, entreno completo, idempotencia, check-ins, aislamiento entre usuarios). Typecheck limpio y bundle probado. **Los tests contra Postgres no se han corrido nunca** (no hay DB). |
| M4 · Deploy dev y production | 🟡 bloqueado | `Dockerfile` multi-stage (node:22-slim), `railway.toml` con healthcheck en `/api/health`, `scripts/smoke.sh` y `scripts/railway-setup.sh`. Falta Railway. |
| M5 · App: auth, navegación, tema, Plan | ✅ en web · 🟡 iPhone | Login/registro, guard de sesión, barra inferior con botón central Entrenar/Reanudar, pestañas en la cabecera en escritorio, tema claro/oscuro/sistema guardado en el perfil, Ajustes y Plan completo (ruta, rutinas de las 2 plantillas, calculadora de cargas sin conexión, nutrición, reglas). |
| M6 · App: Entrenar | ✅ en web (demo) · 🟡 con DB | Previa del día, interruptor de calibración, serie de prueba con 1RM y cargas en vivo, calentamientos, tarjeta grande + tabla de series con ✓, cambios de peso que se propagan (pirámide, Kino, rest-pause), alternativas de ejercicio, descanso como barra flotante y anillo a pantalla completa, pitidos, vibración, notificación local, pantalla siempre encendida, cola offline con reintentos, "Reanudar", resumen con récords y próximo peso. **11 tests** de la lógica. |
| M7 · App: Progreso | ✅ en web (demo) · 🟡 con DB | Resumen (semana L–D, racha, KPIs, check-in), peso y grasa (1M/3M/Todo, meta, ritmo −0.6 kg/sem), medidas, fuerza y estándares Kinobody, mapa de constancia de 26 semanas, historial paginado. Estados vacíos diseñados. Datos simulados **solo** con `?demo=1` en web. |
| M8 · Producción + smoke + reporte + PR | 🟡 | Este reporte, capturas en `docs/capturas/` (build de producción local, modo demo) y el PR. Sin producción no hubo smoke test. |
| M9 · EAS | ❌ omitido | `eas whoami` → "Not logged in". Dejé `apps/mobile/eas.json` con el perfil `preview` (distribución interna). |

## URLs

- **dev:** no existe todavía.
- **production:** no existe todavía.

Cuando corras el script, quedarán en `apps/mobile/.env.development` y `apps/mobile/.env.production` (son URLs públicas, van al repo).

## Contraseña

No se generó ninguna: el usuario de producción se crea contra la API desplegada. El script la generará al azar y la guardará **solo** en `.secrets/credenciales.txt` (ignorado por git). Cámbiala después del primer login.

## Qué se verificó (y qué no)

Verificado:

- `pnpm typecheck`: limpio en `core`, `api` y `mobile`.
- Tests: `core` 42/42 y la lógica de Entrenar de la app 11/11. `expo-doctor`: 20/20.
- `pnpm test` en la raíz **falla en la API** con "Falta DEV_DATABASE_URL": sus tests necesitan la DB `dev` de Railway.
- La build web de producción servida por la API (mismo origen, fallback SPA, 404 en assets inexistentes, `index.html` sin caché) y recorrida en Chrome headless a 390 px y 1280 px, en claro y oscuro: login, Progreso (todas las sub-pestañas), Plan y un entreno completo (empezar → series → descanso → anillo → terminar → resumen → Progreso) sin errores de consola.
- El bundle de iOS compila (`expo export -p ios`).
- Una revisión de código independiente encontró 14 problemas (2 críticos: la cola offline podía perder series y una respuesta perdida de `finish` podía acabar borrando el entreno). Están todos corregidos, con tests donde aplica.

No verificado:

- Nada contra Postgres real: migraciones, SQL de la API, tests de integración y smoke test. Es lo primero que hay que correr; puede aparecer algún error de SQL.
- La app en un iPhone (no hay Xcode ni simulador en la Mac, y sin API desplegada no hay contra qué loguearse).

## Cómo seguir cuando Railway vuelva

Mira primero https://status.railway.com. Luego, en la raíz del repo:

```bash
eval "$(fnm env)"; fnm use          # Node 22
scripts/railway-setup.sh project    # proyecto lifemaxxing-gym, Postgres, servicio app y entorno dev (duplica production)
scripts/railway-setup.sh vars       # DATABASE_URL=${{Postgres.DATABASE_URL}}, NODE_ENV, ALLOWED_EMAILS, SESSION_TTL_DAYS
scripts/railway-setup.sh devdb      # DEV_DATABASE_URL en .env, migraciones ×2 y tests de la API
scripts/railway-setup.sh deploy dev
scripts/railway-setup.sh deploy production
scripts/railway-setup.sh users      # usuarios con contraseña aleatoria → .secrets/credenciales.txt
scripts/railway-setup.sh smoke      # health → login → today → sesión → 2 series → finish → check-in → overview (y limpia)
```

El script nunca se ha ejecutado: córrelo paso a paso y mira la salida. Se niega a seguir si el directorio está enlazado a otro proyecto y no imprime secretos. Las flags salen de `railway --help` de la CLI 5.71.0, pero el formato del JSON que devuelven algunos comandos lo supuse.

Después, commitea `apps/mobile/.env.development` y `.env.production` (URLs públicas) y haz push.

## Cómo probar

**Web, hoy mismo y sin base de datos (modo demo):**

```bash
pnpm install
pnpm --filter mobile web            # luego abre http://localhost:8081/progreso?demo=1
```

El modo demo simula 8 semanas de datos y permite hacer un entreno completo en memoria. Se activa solo con `?demo=1`; `?demo=0` lo apaga.

**Web con datos reales (cuando exista la DB dev):** `pnpm dev` levanta la API en `http://localhost:3000` contra la DB `dev` de Railway y Expo en `:8081` (CORS y cookies ya configurados para localhost). En producción la web vive en el mismo dominio que la API.

**iPhone con Expo Go:**

1. Instala Expo Go de la App Store (hoy soporta SDK 57, la versión del proyecto). Sin API todavía, arranca Metro en modo demo: `pnpm --filter mobile demo`.
2. Pon la URL de la API en `apps/mobile/.env.development`: el dominio de `dev`, o `http://<IP-de-tu-Mac>:3000` si corres `pnpm dev` (la API escucha en `0.0.0.0`).
3. `cd apps/mobile && npx expo start` y escanea el QR con la cámara.

Todo lo que usa la app (notificaciones locales, audio, haptics, keep-awake, secure-store, SVG) funciona en Expo Go.

**iPhone instalable (M9):**

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init                     # crea el proyecto en EAS y guarda su id en app.json
npx eas-cli build -p ios --profile preview
```

Antes, deja `apps/mobile/.env.production` con la URL de producción (el build de release la usa). Te pedirá la cuenta de Apple y registrar el UDID del iPhone; hazlo tú.

## Bloqueos

1. **Railway (todo M2/M4).** Incidente desde las 07:24 UTC (02:24 en Lima): primero "Builds are temporarily paused"; más tarde escaló a "Dashboard and API unavailable, builds paused" (Major Outage). A las 11:33 UTC Railway informó que su API volvió pero los builds siguen pausados. `railway init` respondió "Deploys have been paused temporarily" en los 3 intentos (hacia las 02:40, las 02:50 y las 07:15 en Lima). No se creó ningún proyecto ni se tocó ningún otro.
2. **EAS:** sin sesión (`eas whoami` → "Not logged in").
3. **iOS local:** la Mac no tiene Xcode (`xcrun simctl` no existe).

## Decisiones

Todas, con su porqué, en [`docs/DECISIONES.md`](DECISIONES.md). Las más relevantes:

- Node 22 con fnm (la Mac trae Node 26, sin corepack); pnpm 12 lee la configuración de `pnpm-workspace.yaml`, así que `nodeLinker: hoisted` va ahí.
- El seed del programa se genera desde `packages/core/src/program.ts`: una sola fuente para la DB y para el Plan sin conexión.
- Migración extra `0003`: el resumen de cada sesión se guarda en `summary jsonb`.
- Empezar un entreno requiere red; las series se guardan en el teléfono y se sincronizan en lote; "Terminar" exige la cola vacía.
- La fecha de inicio del programa cuenta desde su lunes.

## Siguientes pasos

1. Correr `scripts/railway-setup.sh` cuando Railway se recupere y arreglar lo que salga en los tests de la API contra Postgres.
2. Entrar en producción con la contraseña de `.secrets/credenciales.txt` y cambiarla.
3. Probar un Workout A real en el iPhone con Expo Go (calibración incluida) y revisar los descansos con la pantalla bloqueada.
4. Build con EAS para tenerla instalada.
5. Pendientes menores: dominio propio; fotos mensuales (§ seguimiento de la rutina); exportar datos.
