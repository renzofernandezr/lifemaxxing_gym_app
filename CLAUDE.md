# Lifemaxxing Gym · instrucciones para Claude Code

## Reglas

- Plan completo de construcción: `docs/PLAN_APP_RN.md`. Síguelo hito por hito.
- Antes de hacer nada en una sesión nueva, lee `docs/PROGRESO.md` y `docs/DECISIONES.md` (si existen) y continúa desde el último hito pendiente.
- Referencia de diseño y lógica: `index.html` (prototipo). No lo borres.
- Dominio (rutina, progresión, calibración, nutrición): `docs/rutina-fase1.md`.
- Rama de trabajo: `feat/app-rn`. Commits pequeños, conventional commits en español, push al cerrar cada hito. Nunca `git push --force`.
- Nunca commitees secretos. Solo `.env.example`. Las credenciales generadas van en `.secrets/` (ignorada por git).
- Sin Docker ni Postgres local: las bases viven en Railway. Desarrollo y tests usan el entorno `dev` (tests en un schema temporal); `production` solo se toca vía deploy.
- No toques proyectos de Railway distintos de `lifemaxxing-gym`.
- UI en español (Perú), código en inglés, unidades en kg, zona horaria `America/Lima`.
- Antes de cerrar un hito: `pnpm typecheck && pnpm test`.
- Si algo falla 3 veces, anótalo como bloqueo en `docs/PROGRESO.md` y sigue con lo siguiente.
- Cada decisión nueva va como fila en `docs/DECISIONES.md` (fecha · decisión · por qué).

## Estado al 2026-10-21

- PR #1 abierto desde `feat/app-rn`: https://github.com/renzofernandezr/lifemaxxing_gym_app/pull/1
- La app (M5–M7) está completa y probada con el modo demo en web y en el iPhone con Expo Go. `packages/core` (M1) tiene 43 tests y `apps/mobile` tiene 11; todos pasan.
- **Bloqueo**: Railway está caído desde el 21-oct ("Deploys have been paused temporarily").
  - Pendientes por eso: las migraciones (M2), los tests de integración de la API (M3), el deploy (M4) y el smoke test.
  - El código está listo, igual que `scripts/railway-setup.sh`, que aún no se ha ejecutado.
  - `pnpm test` falla en `apps/api` con "Falta DEV_DATABASE_URL". Es lo esperado mientras no haya base de datos dev.
- **TestFlight**: el perfil EAS `demo` está listo y funciona sin servidor. Falta que Renzo lance el build (ver abajo).

## Configurar en otra PC

1. `git clone https://github.com/renzofernandezr/lifemaxxing_gym_app && cd lifemaxxing_gym_app && git checkout feat/app-rn`
2. Instalar Node 22 con fnm (`.nvmrc` = 22; `engines` exige `>=22 <23`):
   - Una sola vez: `fnm install 22`.
   - En cada terminal: `eval "$(fnm env)"; fnm use 22`.
   - Node 26 ya no trae corepack, por eso hace falta el 22.
3. Instalar dependencias: `corepack enable && pnpm install`.
   - pnpm 12.14.0 sale de `packageManager`.
   - `nodeLinker: hoisted` está en `pnpm-workspace.yaml`, porque pnpm ≥ 11 ignora `.npmrc`.
4. Iniciar sesión:
   - `gh auth login`
   - `npx eas-cli@latest login`, con la cuenta Expo `renzofernandezg`.
   - `railway login`, solo cuando Railway vuelva.
5. No hay secretos que copiar. `.secrets/` todavía no existe (lo crea `railway-setup.sh`), y `.env` solo tendrá `DEV_DATABASE_URL` cuando exista la base dev. Plantilla: `.env.example`.
6. En Windows, los scripts `demo`, `demo:nuevo` y `scripts/*.sh` usan sintaxis de bash. Correrlos desde Git Bash o WSL.

## Probar hoy (modo demo, sin servidor)

- **iPhone con Expo Go** (versión de la App Store, SDK 57). El teléfono y la PC deben estar en la misma Wi-Fi; luego se escanea el QR con la cámara. Dos modos:
  - `pnpm --filter mobile demo`: 8 semanas de historial; arranca en la semana 8, la última de la Fase 1.
  - `pnpm --filter mobile demo:nuevo`: usuario nuevo en la semana 1, sin 1RM. Las primeras sesiones A y B traen las series de prueba para medirlo.
- **Web**: `pnpm --filter mobile web` y abrir `http://localhost:8081/progreso?demo=1` (o `?demo=nuevo`).
- **Cómo funciona por dentro**:
  - `src/lib/demo.ts` lee `EXPO_PUBLIC_DEMO` (`1`/`historial` o `nuevo`; en web, también `?demo=`).
  - `src/lib/demo-data.ts` simula la API.
  - El "mundo" de la demo se guarda en AsyncStorage con la clave `lmx-demo-world-v1`. Si la app se cierra a mitad del entreno no se pierde nada: al volver aparece "Reanudar / Descartar".
- La UI no muestra ningún texto de "modo demo" (pedido de Renzo).
- El proyecto se queda en Expo SDK 57 a propósito: el Expo Go de la tienda todavía no soporta el 58. Cuando lo soporte, ver la fila correspondiente en `docs/DECISIONES.md`.
- **Renzo arranca Expo/Metro él mismo.** No dejes Metro corriendo: si hay que reiniciarlo, apaga el tuyo y dale el comando.

## TestFlight (sin servidor)

- **Datos de la app**:
  - Proyecto EAS: `22fdf9a2-a1c1-45a3-b7f2-aec14b9ba6ca`, owner `renzofernandezg`.
  - Bundle: `com.renzofernandez.lifemaxxinggym`.
  - Nombre: "Life Maxxing". Si ese nombre ya está tomado en App Store Connect, usar "Life Maxxing Gym".
- **Comando** (lo corre Renzo, porque es interactivo: pide el Apple ID y la verificación en 2 pasos):
  ```
  cd apps/mobile && npx eas-cli@latest build -p ios --profile demo --auto-submit
  ```
- **Pasos**:
  1. Responder "sí" cuando pregunte por certificados, perfil y bundle id.
  2. Esperar el build (15–25 min) y luego el procesamiento de Apple (5–15 min).
  3. En App Store Connect, ir a TestFlight → Internal Testing, crear un grupo y agregarse.
  4. Instalar desde la app TestFlight.
- **Perfiles de `apps/mobile/eas.json`**:
  - `demo`: `EXPO_PUBLIC_DEMO=1`, `autoIncrement` y versión remota.
  - `preview` y `production`: usan la API real, así que necesitan Railway.
- En TestFlight los datos viven solo en el iPhone. Si se borra la app se pierden, y no pasan solos a la API cuando exista.
- **Lo que ya está resuelto para que Apple no rechace el build**:
  - Ícono de iOS sin canal alfa: `assets/images/icon-ios.png`.
  - `expo-audio` sin micrófono ni audio en segundo plano.
  - `ITSAppUsesNonExemptEncryption=false`.
  - Si `eas init` o `eas build` vuelven a agregar `android.permissions` (por ejemplo `RECORD_AUDIO`) a `app.json`, hay que quitarlos.
- **Opción ofrecida y no aceptada todavía**: cambiar el perfil `demo` a `EXPO_PUBLIC_DEMO=nuevo` para entrenar de verdad desde la semana 1. Hacerlo solo si Renzo lo pide.

## Servidor (pendiente)

- Railway sigue siendo el plan. Cuando https://status.railway.com esté en verde, correr en orden:
  ```
  scripts/railway-setup.sh project
  scripts/railway-setup.sh vars
  scripts/railway-setup.sh devdb
  scripts/railway-setup.sh deploy dev
  scripts/railway-setup.sh deploy production
  scripts/railway-setup.sh users
  scripts/railway-setup.sh smoke
  ```
  Después, commitear `apps/mobile/.env.production` y actualizar `docs/REPORTE_NOCHE.md` y el PR.
- Renzo preguntó por alternativas a Railway, pero por ahora no quiere Fly ni Neon. No cambies de proveedor sin que lo pida.

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
- **Progreso y Plan**: el título y las sub-pestañas quedan fijos y solo hace scroll el contenido. Sin margen grande al final.
- **Fuerza**: muestra todos los ejercicios agrupados, cada uno con su mejora y una mini gráfica.
- **Cabecera**: sin botón de tema; el tema se cambia en Ajustes.
- **Ajustes**: lista agrupada (nombre, altura, peso meta, inicio del programa; tema; cerrar sesión), sin "Peso inicial". El nombre y el correo van bien separados. "Guardar cambios" solo aparece si hay cambios.
- **Hápticos**: toque suave en los botones y vibración larga (~3 s en iOS) al terminar el descanso.
- **1RM**: si no hay 1RM, la primera sesión A y la primera B traen series de prueba para medirlo.
- El detalle y el motivo de cada cambio están en `docs/DECISIONES.md`.

## Cómo trabaja Renzo

- Escribe en español y prueba en su iPhone con Expo Go. Manda capturas para pedir ajustes de diseño.
- "Sube los cambios" significa commit y push a `feat/app-rn`.
