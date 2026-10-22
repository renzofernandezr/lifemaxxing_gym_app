# Bitácora

Qué se hizo en cada sesión de trabajo, con sus commits. El porqué de cada decisión está en `docs/DECISIONES.md`, y el estado por hito en `docs/PROGRESO.md`.

## 21–22 oct 2026 · Render, TestFlight con la API y primer entreno real

Sesión hecha desde la PC de `~/Repositories/lifemaxxing_gym_app`, con la rama `feat/app-rn`.

### 1. Entorno de esta PC

- Node 22.23.4 con **nvm** (ya estaba instalado; lee `.nvmrc`). En cada terminal: `nvm use`.
- `corepack enable` deja pnpm 12.14.0. `pnpm install` OK. Typecheck limpio; core pasa 43 tests y mobile 11.
- CLIs: `gh` (sesión `renzofernandezr`), `render` 2.30 (`brew install render`, `render login`, workspace "Renzo's Workspace") y `eas-cli` (sesión `renzofernandezg`).
- **No correr `npx expo lint`**: el proyecto no tiene ESLint configurado, y el comando intenta instalarlo y modifica `package.json` y `pnpm-lock.yaml`. Si pasa: `git checkout -- apps/mobile/package.json pnpm-lock.yaml && pnpm install --frozen-lockfile`.

### 2. Servidor: de Railway a Render (plan gratis)

- Railway seguía caído. Renzo pidió Render y eligió **todo gratis**.
- Recursos (región Virginia, sin proyecto de Render):
  - Postgres `lifemaxxing-gym-db`, free, Postgres 18. Solo acepta conexiones de la red privada de Render. **Caduca el 21-nov-2026**: tras 14 días de gracia (~5-dic), Render la borra si no se pasa a pago.
  - Web `lifemaxxing-gym`, free, Docker. URL: https://lifemaxxing-gym.onrender.com. Las migraciones corren al arrancar: la primera vez aplicó las 3 y la segunda no tuvo nada pendiente, así que son idempotentes.
  - En el workspace también está `RoyalDB_api`, que no es de este proyecto. No tocarlo. Comparte las 750 h gratis al mes.
- `scripts/render-setup.sh db | app | deploy | wait | users | smoke` recrea todo y no imprime secretos.
- Usuario de Renzo creado en production. Su contraseña está **solo** en `.secrets/credenciales.txt`, en esta PC.
- Smoke test completo en production: OK. Login web con cookie (`Secure`, `httpOnly`) y CSRF también probados.
- **Auto-deploy**: al principio no funcionaba, porque el servicio se creó con la URL pública del repo. Renzo instaló la app de GitHub "Render" solo en este repo, y desde entonces cada push a `feat/app-rn` despliega solo. `docs/**` y `**/*.md` no disparan deploy.
- No hay entorno `dev`, porque Render gratis da una sola Postgres. Por eso `pnpm test` falla en `apps/api` con "Falta DEV_DATABASE_URL", y es lo esperado.

Commits: `77a268e`, `0877315`, `885e50c`, `f46d7f4` (con este se comprobó el auto-deploy), `8b41407`.

### 3. Cambios en la app

| Qué | Dónde | Commit |
|---|---|---|
| Sub-pestañas también en escritorio (Progreso y Plan), con cabecera fija | `components/panes.tsx` | `4946554` |
| Ajustes en escritorio: encabezado grande y dos columnas (cuenta y apariencia \| perfil); Enter guarda y Esc cierra | `app/ajustes.tsx` | `7299761` |
| Ícono de iOS y Android con fondo blanco; `icon-ios.png` ahora sale del script, sin canal alfa | `scripts/gen-icons.mjs`, `app.json` | `b5fd736` |
| `.env.development` apunta a la API de Render (Expo Go sin demo usa los datos reales) | `apps/mobile/.env.development` | `bc8f65c` |
| Arranque en frío de Render: `wakeApi()` al abrir o volver a la app; login, registro, empezar y terminar esperan 75 s; aviso "Despertando el servidor…" | `lib/api.ts`, `lib/auth.tsx`, `features/workout/actions.ts`, `app/(auth)/login.tsx` | `a4796b1` |
| 1RM en una tarjeta naranja grande (`OneRmCard`), en vivo en la serie de prueba y en el descanso siguiente | `components/onerm.tsx`, `features/workout/Focus.tsx`, `components/rest.tsx`, `lib/rest.ts`, `store/workout.ts` | `426a50d` |
| Plan → Cargas compacta: selector Fase 1 / Fase 2, chips de ejercicios, steppers y, en pantallas angostas, tabla en filas de dos columnas | `features/plan/PlanScreen.tsx` | `81fe4e9` |
| Arreglo: en iOS el número grande del peso cortaba el decimal (42.5 se veía 42). Ahora el ancho lo da un texto invisible con el mismo valor | `features/workout/Focus.tsx` (`BigValue`) | `1620ef6` |

### 4. TestFlight (perfil `production`, API de Render)

- `eas.json` tiene `ascAppId` 6825488682, sacado del envío del build `demo`. El build y el envío ya no piden nada:
  `cd apps/mobile && npx eas-cli@latest build -p ios --profile production --auto-submit --non-interactive`
- Builds de la versión 1.0.0:
  - 1: `demo`, sin servidor.
  - 2: primer build con la API.
  - 3: tarjeta del 1RM.
  - 4: calculadora de cargas y peso sin decimal cortado.
- Se descargó el `.ipa` del build 2 para comprobar que lleva la URL de Render y el modo demo apagado. El `localhost:3000` que aparece adentro es de `expo-router` (`head/url.js`), no de la app.

### 5. Primer entreno real (21-oct, Workout B, semana 1)

- Antes hubo una sesión de prueba (empezada a las 20:47 Lima) con los valores precargados, marcados en segundos. Se descartó, y sus calibraciones no cuentan porque la API ignora las de sesiones descartadas.
- Entreno terminado de 21:50 a 22:32 (Lima): 9 series, 1,426 kg de volumen.
  - Negativas: 2 / 1 / 1.
  - Jalón supino: prueba 54 × 10 con 2 en reserva; series de trabajo 61 × 6, 55 × 8 y 50 × 9.
  - Curl martillo: prueba 10 × 5 con 0 en reserva; series de trabajo 10 × 7, 10 × 7 y 10 × 3.
  - Sentadilla búlgara: solo la serie de prueba (10 × 6 con 0 en reserva).
  - Peso muerto rumano y face pulls: no se hicieron.
- Estado que queda: el jalón y el curl ya tienen sesión terminada, así que manda la doble progresión. La búlgara figura como "calibrada" por su prueba. El peso muerto rumano todavía pedirá serie de prueba. No hay check-ins.

### 6. Dudas de Renzo en el gimnasio (y sus respuestas)

- **"¿Dónde está el cálculo del 1RM?"**: estaba en letra chica bajo los botones de reserva. Se hizo la tarjeta grande (`426a50d`).
- **"Hice 42 kg × 1 con 0 en reserva y me sale 42.5"**: el peso era 42.5 (40 + 2.5 con el botón "+"), pero el iPhone cortaba el ".5". Se arregló en `1620ef6`; falta confirmarlo en el teléfono con el build 4.
- **"¿Qué pasa si se cierra la app o pierdo el wifi?"**: ya funciona así. Cada serie se guarda en el teléfono (`lmx-workout` en AsyncStorage) y se sube al instante, con reintentos. Al reabrir aparece "Reanudar". Si el teléfono muere, la sesión sigue "en curso" en la base y se puede reanudar o descartar desde Entrenar. Solo "Empezar" y "Terminar" necesitan conexión.

### 7. Pendientes e ideas

- **Antes del 21-nov**: decidir qué hacer con la Postgres gratis (pasarla a pago o exportar los datos).
- **La app no permite cambiar la contraseña.** Es de 24 caracteres al azar; Renzo la pega en el iPhone con el portapapeles universal: `awk '/^contraseña:/ {print $2; exit}' .secrets/credenciales.txt | tr -d '\n' | pbcopy`.
- Confirmar en el iPhone, con el build 4, que se ve "42.5" completo y que la tarjeta del 1RM se ve bien.
- Probar el modo avión a mitad del entreno en el iPhone. Nunca se ha probado con la API real.
- Con 1 rep y 0 en reserva el 1RM es real, pero la tarjeta lo marca en rojo (fuera de 3–10 reps). Se podría tratar 1 × 0 como fiable.
- Tests de integración de la API: necesitan una base `dev`.

### 8. Cómo se verificaron los cambios de interfaz

- Se exporta la web con la API en el mismo origen: `cd apps/mobile && EXPO_PUBLIC_API_URL="" npx expo export -p web --output-dir <dir>`.
- Se sirve con un servidor estático con fallback SPA y se abre en modo demo (`?demo=1` o `?demo=nuevo`).
- Las capturas se sacan con `puppeteer-core` usando el Chrome instalado. Para 390 px hay que usar `setViewport`: `chrome --headless --screenshot` no baja de ~500 px de ancho y recorta.
- Esta Mac no tiene Xcode ni simulador de iOS: lo que es solo de iOS se confirma en el teléfono.
- No dejar Metro corriendo: Renzo lo arranca él.
