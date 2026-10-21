# Lifemaxxing Gym

Bitácora de gimnasio personal (Greek God 2.0 adaptado): app para iPhone y web con Expo, API en Node (Hono) y Postgres en Railway.

```
packages/core   lógica de entrenamiento, calendario, nutrición y esquemas (TypeScript puro + tests)
apps/api        API Hono: auth con sesiones en Postgres, endpoints, migraciones; sirve también la web
apps/mobile     app Expo (Expo Router) → iOS y web
db/migrations   SQL puro (0001 init, 0002 seed generado desde core, …)
index.html      prototipo original (referencia de diseño y lógica)
```

## Requisitos

- Node 22 (`.nvmrc`). Con fnm: `fnm use` (la Mac tiene Node 26 por defecto).
- pnpm vía corepack: `corepack enable`.
- `.env` en la raíz (ver `.env.example`) con `DEV_DATABASE_URL` = URL pública del Postgres del entorno `dev` de Railway.

## Comandos

```bash
pnpm install
pnpm dev               # API local (contra la DB dev de Railway) + Expo
pnpm test              # core + API (schema temporal en la DB dev) + lógica de la app
pnpm typecheck
pnpm db:migrate:dev    # migraciones en la DB dev
pnpm --filter mobile web   # solo la web de Expo
```

Más detalle: `docs/PLAN_APP_RN.md` (plan), `docs/PROGRESO.md`, `docs/DECISIONES.md`, `db/README.md`.
