# Lifemaxxing Gym · instrucciones para Claude Code

## Reglas

- Plan completo de construcción: `docs/PLAN_APP_RN.md`. Síguelo hito por hito.
- Antes de hacer nada en una sesión nueva, lee `docs/PROGRESO.md` y `docs/DECISIONES.md` (si existen) y continúa desde el último hito pendiente.
- Referencia de diseño y lógica: `index.html` (prototipo). No lo borres.
- Dominio (rutina, progresión, calibración, nutrición): `docs/rutina-fase1.md`.
- Rama de trabajo: `feat/app-rn`. Commits pequeños, conventional commits en español, push al cerrar cada hito. Nunca `git push --force`.
- Nunca commitees secretos. Solo `.env.example`. Las credenciales generadas van en `.secrets/` (ignorada por git).
- Sin Docker ni Postgres local: la base vive en Render (antes Railway). Hoy solo existe `production`, que solo se toca vía deploy. Si vuelve a haber `dev`, ahí van el desarrollo y los tests (en un schema temporal).
- En Render, toca solo los recursos `lifemaxxing-gym*`. En Railway, solo el proyecto `lifemaxxing-gym`.
- UI en español (Perú), código en inglés, unidades en kg, zona horaria `America/Lima`.
- Antes de cerrar un hito: `pnpm typecheck && pnpm test`.
- Si algo falla 3 veces, anótalo como bloqueo en `docs/PROGRESO.md` y sigue con lo siguiente.
- Cada decisión nueva va como fila en `docs/DECISIONES.md` (fecha · decisión · por qué).

## Estado al 2026-10-21

- PR #1 abierto desde `feat/app-rn`: https://github.com/renzofernandezr/lifemaxxing_gym_app/pull/1
- La app (M5–M7) está completa y probada con el modo demo en web y en el iPhone con Expo Go. `packages/core` (M1) tiene 43 tests y `apps/mobile` tiene 11; todos pasan.
- **Servidor en Render (plan gratis), solo production**: https://lifemaxxing-gym.onrender.com. Las migraciones, el usuario de Renzo y el smoke test están hechos. Detalle en "Servidor (Render)" más abajo.
  - No hay entorno `dev`, porque Render gratis da una sola Postgres. Por eso `pnpm test` falla en `apps/api` con "Falta DEV_DATABASE_URL", y es lo esperado.
- **TestFlight**: el perfil EAS `demo` está listo y funciona sin servidor. Falta que Renzo lance el build (ver abajo).

## Configurar en otra PC

1. `git clone https://github.com/renzofernandezr/lifemaxxing_gym_app && cd lifemaxxing_gym_app && git checkout feat/app-rn`
2. Instalar Node 22 con fnm o nvm (`.nvmrc` = 22; `engines` exige `>=22 <23`):
   - fnm: una sola vez `fnm install 22`; en cada terminal `eval "$(fnm env)"; fnm use 22`.
   - nvm (lo que usa la PC de `~/Repositories`): una sola vez `nvm install`; en cada terminal `nvm use`.
   - Node 26 ya no trae corepack, por eso hace falta el 22.
3. Instalar dependencias: `corepack enable && pnpm install`.
   - pnpm 12.14.0 sale de `packageManager`.
   - `nodeLinker: hoisted` está en `pnpm-workspace.yaml`, porque pnpm ≥ 11 ignora `.npmrc`.
4. Iniciar sesión:
   - `gh auth login`
   - `npx eas-cli@latest login`, con la cuenta Expo `renzofernandezg`.
   - Render: `brew install render`, luego `render login` (autorizar en el navegador) y `render workspace set tea-csp5vibgbbvc73fq0qpg` ("Renzo's Workspace").
5. Secretos: la contraseña de production está en `.secrets/credenciales.txt`, y solo existe en la PC de `~/Repositories`. Pásala a mano, nunca por git. No hay `.env`, porque no hay base dev. Plantilla: `.env.example`.
6. En Windows, los scripts `demo`, `demo:nuevo` y `scripts/*.sh` usan sintaxis de bash. Correrlos desde Git Bash o WSL.

## Probar hoy (modo demo, sin servidor)

- **iPhone con Expo Go** (versión de la App Store, SDK 57). El teléfono y la PC deben estar en la misma Wi-Fi; luego se escanea el QR con la cámara. Dos modos:
  - `pnpm --filter mobile demo`: 8 semanas de historial; arranca en la semana 8, la última de la Fase 1.
  - `pnpm --filter mobile demo:nuevo`: usuario nuevo en la semana 1, sin 1RM. Las primeras sesiones A y B traen las series de prueba para medirlo.
  - **Con datos reales**: `cd apps/mobile && npx expo start --lan`. `.env.development` apunta a la API de Render, que es production: son los datos reales de Renzo. La web local (`pnpm --filter mobile web`) no puede usar esa API por CORS y cookies, así que ahí solo funciona el modo demo.
- **Web**: `pnpm --filter mobile web` y abrir `http://localhost:8081/progreso?demo=1` (o `?demo=nuevo`).
- **Cómo funciona por dentro**:
  - `src/lib/demo.ts` lee `EXPO_PUBLIC_DEMO` (`1`/`historial` o `nuevo`; en web, también `?demo=`).
  - `src/lib/demo-data.ts` simula la API.
  - El "mundo" de la demo se guarda en AsyncStorage con la clave `lmx-demo-world-v1`. Si la app se cierra a mitad del entreno no se pierde nada: al volver aparece "Reanudar / Descartar".
- La UI no muestra ningún texto de "modo demo" (pedido de Renzo).
- El proyecto se queda en Expo SDK 57 a propósito: el Expo Go de la tienda todavía no soporta el 58. Cuando lo soporte, ver la fila correspondiente en `docs/DECISIONES.md`.
- **Renzo arranca Expo/Metro él mismo.** No dejes Metro corriendo: si hay que reiniciarlo, apaga el tuyo y dale el comando.

## TestFlight

- **Datos de la app**:
  - Proyecto EAS: `22fdf9a2-a1c1-45a3-b7f2-aec14b9ba6ca`, owner `renzofernandezg`.
  - Bundle: `com.renzofernandez.lifemaxxinggym`. App Store Connect: `ascAppId` 6825488682 (está en `eas.json`).
  - Nombre: "Life Maxxing".
- **Comando** (ya no pide nada: los certificados están en EAS y el `ascAppId` en `eas.json`):
  ```
  cd apps/mobile && npx eas-cli@latest build -p ios --profile production --auto-submit --non-interactive
  ```
  - El build tarda 15–25 min y el procesamiento de Apple otros 5–15. Luego se instala desde la app TestFlight, donde Renzo ya está en Internal Testing.
- **Perfiles de `apps/mobile/eas.json`**:
  - `production`: usa la API real de Render (`apps/mobile/.env.production`). Es el de TestFlight desde el build 2 (1.0.0).
  - `demo`: `EXPO_PUBLIC_DEMO=1`, datos solo en el iPhone. Fue el build 1.
  - `preview`: API real, distribución interna (ad hoc).
  - Todos usan `autoIncrement` con versión remota.
- Lo que se guardó en el build `demo` vive solo en el iPhone y no pasa a la API.
- **Lo que ya está resuelto para que Apple no rechace el build**:
  - Ícono de iOS sin canal alfa: `assets/images/icon-ios.png`.
  - `expo-audio` sin micrófono ni audio en segundo plano.
  - `ITSAppUsesNonExemptEncryption=false`.
  - Si `eas init` o `eas build` vuelven a agregar `android.permissions` (por ejemplo `RECORD_AUDIO`) a `app.json`, hay que quitarlos.
- **Opción ofrecida y no aceptada todavía**: cambiar el perfil `demo` a `EXPO_PUBLIC_DEMO=nuevo` para entrenar de verdad desde la semana 1. Hacerlo solo si Renzo lo pide.

## Servidor (Render)

- Desde el 21-oct se usa Render en lugar de Railway, por pedido de Renzo, todo en plan gratis. No cambies de proveedor ni de plan sin que lo pida; tampoco Fly ni Neon.
- **Recursos** (workspace "Renzo's Workspace", región Virginia, sin proyecto de Render):
  - Postgres `lifemaxxing-gym-db` (`dpg-dbcljh8m7kps73c4sum0-a`), free, Postgres 18. Sin IPs permitidas: solo acepta la red privada de Render.
  - Web `lifemaxxing-gym` (`srv-dbclk5q9lscs73eapu20`), free, Docker (`Dockerfile`), healthcheck `/api/health`, rama `feat/app-rn`.
  - Como el servidor se duerme, la app lo despierta al abrirse o al volver a primer plano (`wakeApi()`). Login, registro, empezar y terminar entreno esperan hasta 75 s (`SLOW_TIMEOUT_MS`); el resto de peticiones, 15 s.
  - **Auto-deploy en cada push a `feat/app-rn`**: la app de GitHub de Render está instalada en el repo desde el 21-oct. Ignora `docs/**` y `**/*.md`. `scripts/render-setup.sh deploy` queda solo para forzar un deploy.
  - Las migraciones corren al arrancar el contenedor.
  - El workspace también tiene `RoyalDB_api`, que no es de este proyecto. No lo toques.
- **Límites del plan gratis**:
  - La web se duerme tras 15 min sin tráfico y tarda ~1 min en despertar.
  - Las 750 h gratis al mes son de todo el workspace.
  - La Postgres no tiene backups y **caduca el 21-nov-2026**. Hay 14 días de gracia para pasarla a pago; si no, Render la borra con todos los datos. Avísale a Renzo antes de esa fecha.
- **Script**: `scripts/render-setup.sh db | app | deploy | wait | users | smoke`. No imprime secretos y solo toca recursos `lifemaxxing-gym*`.
  - La CLI no cambia variables de entorno de un servicio. Para eso: dashboard → `lifemaxxing-gym` → Environment.
- **Útil**:
  - `render deploys list srv-dbclk5q9lscs73eapu20 -o json`
  - `render logs -r srv-dbclk5q9lscs73eapu20 --limit 50 -o text`
- Railway: `railway.toml` y `scripts/railway-setup.sh` se conservan, por si se vuelve.

## Preferencias de diseño de Renzo (ya aplicadas, no revertir)

- **Nombre**: se muestra "Life Maxxing". El repo, el slug y el bundle id no cambian. El login es limpio: logo y nombre centrados, campos amplios y "Mostrar" contraseña.
- **Sesión en curso**: "una serie a la vez", sin scroll.
  - Nombre del ejercicio grande y "Serie N de M".
  - Tarjetas grandes de kg y reps con botones redondos y un botón ✓ "Hecho" grande.
  - El texto del tipo de serie (calentamiento, prueba…) va grande.
  - Ejercicios y Técnica se abren en hojas inferiores.
  - No hay botón "Saltar".
- **Descanso**:
  - Va dentro de la sesión como un paso más: serie → descanso → serie, con deslizamiento.
  - Sin capa encima y sin puntos extra en el indicador.
  - Anillo fino y plano, nada 3D ni grueso.
  - Fuera de la sesión aparece una barra flotante que lleva de vuelta.
- **Progreso y Plan**: el título y las sub-pestañas quedan fijos y solo hace scroll el contenido. Sin margen grande al final. Funciona igual en escritorio: también hay sub-pestañas, no todas las secciones apiladas.
- **Fuerza**: muestra todos los ejercicios agrupados, cada uno con su mejora y una mini gráfica.
- **Cabecera**: sin botón de tema; el tema se cambia en Ajustes.
- **Ajustes**: lista agrupada (nombre, altura, peso meta, inicio del programa; tema; cerrar sesión), sin "Peso inicial". El nombre y el correo van bien separados. "Guardar cambios" solo aparece si hay cambios.
  - En escritorio: encabezado como en Progreso y Plan, y dos columnas. A la izquierda, la cuenta (tarjeta con "Cerrar sesión") y Apariencia; a la derecha, el Perfil. Enter guarda y Esc cierra.
- **Ícono de iOS y Android**: el disco naranja sobre fondo blanco, con el agujero blanco y el anillo café. Lo genera `apps/mobile/scripts/gen-icons.mjs`; `icon-ios.png` va sin canal alfa. El splash y el favicon no cambian.
- **Hápticos**: toque suave en los botones y vibración larga (~3 s en iOS) al terminar el descanso.
- **1RM**: si no hay 1RM, la primera sesión A y la primera B traen series de prueba para medirlo.
- El detalle y el motivo de cada cambio están en `docs/DECISIONES.md`.

## Cómo trabaja Renzo

- Escribe en español y prueba en su iPhone con Expo Go. Manda capturas para pedir ajustes de diseño.
- "Sube los cambios" significa commit y push a `feat/app-rn`.
