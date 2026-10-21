# Decisiones

Registro de decisiones tomadas durante la construcción (fecha · decisión · por qué).

| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-10-21 | Node 22 LTS vía `fnm` (`.nvmrc` = 22); pnpm 12.14.0 vía corepack de Node 22. | La Mac tiene Node 26, que ya no trae corepack; el plan pide Node 22 y el Dockerfile usa `node:22`. |
| 2026-10-21 | `nodeLinker: hoisted` en `pnpm-workspace.yaml` además de `.npmrc`. | pnpm ≥ 11 ignora la configuración de `.npmrc`; sin esto instalaba con enlaces aislados. |
| 2026-10-21 | Expo SDK 58 (plantilla `default`): las rutas viven en `apps/mobile/src/app/`. `web.output` = `single`. | Es la estructura de la plantilla actual. `single` genera una SPA estática que la API sirve con fallback a `index.html`. |
| 2026-10-21 | TypeScript ~6.0.3 en todo el monorepo (la versión que fija la plantilla de Expo). | Evita dos compiladores distintos; TS 7 aún no lo soporta Expo. |
| 2026-10-21 | Los datos del programa (ejercicios, fases, rutinas) viven en `packages/core/src/program.ts` y el seed `0002_seed_program.sql` se genera desde ahí (`pnpm --filter api gen:seed`). | Una sola fuente de verdad para la DB y para la vista Plan sin conexión. |
| 2026-10-21 | `macros()`: redondeo al entero más cercano y, en el empate exacto (x.5), hacia abajo. | El vector del plan `macros(2600)` → C 292 exige que 292.5 baje; así además no se pasa de las kcal. |
| 2026-10-21 | `stepOf()` usa el `increment_kg` del ejercicio si es > 0; si no, 2 kg en mancuernas y 2.5 kg en el resto. | Así lo pide el plan; coincide con el prototipo en todos los ejercicios calibrables. |
| 2026-10-21 | `isRecord()` sin historial devuelve `false` (la primera sesión es la "base", no un récord). | En el prototipo la sesión de calibración tampoco cuenta como récord. |
| 2026-10-21 | Rampa Kino con más de 4 series (box squat 5 × 6): se extiende la rampa hacia atrás con −0.12 por serie. | El prototipo solo define 4 factores (.64/.76/.88/1). |
| 2026-10-21 | Cambio de peso a mitad de un RPT recalcula **todas** las series siguientes (no solo la próxima). | El plan dice "las siguientes se recalculan". |
