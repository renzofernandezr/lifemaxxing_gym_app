# Base de datos

Postgres en Railway (entornos `dev` y `production`). No hay base local: la Mac se conecta a la DB `dev` por su URL pública.

## Migraciones

- Archivos SQL puros en `db/migrations/NNNN_nombre.sql`, aplicados en orden alfabético.
- El runner (`apps/api/src/db/migrate.ts`) crea `schema_migrations`, toma `pg_advisory_lock(727272)` y aplica cada archivo pendiente en su propia transacción. Si uno falla hace rollback y sale con código ≠ 0.
- En producción las migraciones corren al arrancar el contenedor (`node dist/db/migrate.js && node dist/server.js`). **Nunca** se aplican a mano en `production`.

```bash
pnpm db:migrate:dev      # aplica las pendientes en la DB dev (DEV_DATABASE_URL de .env)
pnpm db:migrate          # aplica las pendientes en DATABASE_URL
pnpm db:new <nombre>     # crea el siguiente archivo numerado vacío
```

Nunca edites una migración ya aplicada en producción: crea una nueva.

## Seed del programa

`0002_seed_program.sql` se **genera** desde `packages/core/src/program.ts` (fuente única de ejercicios, fases y rutinas):

```bash
pnpm --filter api gen:seed
```

Es idempotente (`insert … on conflict do nothing`). Un test verifica que el archivo versionado coincide con lo que genera `core`. Si cambias el programa ya aplicado en producción, no edites 0002: crea una migración nueva con los `update`/`insert` necesarios.

## Tests

Los tests de la API corren contra la DB `dev`, cada corrida en su propio schema `test_<timestamp>` (con `search_path=test_x,public`) que se borra al terminar. `citext` vive en `public` para que todos los schemas lo compartan.
