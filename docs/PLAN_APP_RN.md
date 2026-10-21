# Plan de construcción · Lifemaxxing Gym (React Native + Web + Railway)

> Documento para que **Claude Code lo ejecute de forma autónoma durante la noche**.
> Objetivo: convertir el prototipo `index.html` de este repo en una app real que funcione en **iPhone y web**, con **auth propia sobre Postgres**, **migraciones SQL**, API desplegada en un **proyecto nuevo de Railway** y datos persistentes.
>
> Fuente de verdad del dominio: `index.html` (prototipo con toda la lógica y el diseño) y `docs/rutina-fase1.md` (rutina, progresión, calibración, nutrición).

---

## 0. Antes de dormir (lo hace Renzo, ~10 min)

Sin esto el agente se bloquea a las 2 a. m. esperando un login.

1. **El repo tiene el prototipo en GitHub.** `https://github.com/renzofernandezr/lifemaxxing_gym_app` debe contener `index.html`, `docs/rutina-fase1.md` y este archivo. Si está vacío, primero haz `git push` del commit inicial.
2. **Herramientas en la Mac:**
   ```bash
   node -v              # ≥ 20 (ideal 22 LTS)
   corepack enable      # habilita pnpm
   git --version && gh auth status        # git push debe funcionar sin pedir contraseña
   brew install railway && railway login  # sesión iniciada en el navegador
   railway whoami
   docker info          # Docker Desktop abierto (Postgres local para desarrollo y tests)
   xcrun simctl list devices | head   # opcional: simulador de iOS (Xcode)
   ```
   Opcional, solo si quieres el build de iPhone hecho en la noche: `npx eas-cli login` (cuenta de Expo).
3. **Que la Mac no se duerma:** conectada a la corriente y en otra terminal `caffeinate -dimsu`.
4. **Lanzar Claude Code** (ver §12 para el prompt exacto):
   ```bash
   mkdir -p ~/Repos && cd ~/Repos
   claude --dangerously-skip-permissions
   ```
   Corre sin pedir permisos, así que el agente puede ejecutar cualquier comando en tu usuario. Por eso las reglas de §1 le prohíben lo destructivo. Si prefieres más control, usa `claude --permission-mode acceptEdits` y agrega a tu allowlist `pnpm`, `npx`, `git`, `gh`, `railway`, `docker` y `psql`. El riesgo es que se detenga a pedir permiso para algún comando que no previste.

> Ruta asumida: `~/Repos/lifemaxxing_gym_app` = `/Users/renzofernandez/Repos/lifemaxxing_gym_app`.

---

## 1. Reglas de trabajo autónomo (para el agente)

- **No te detengas a preguntar.** Si algo es ambiguo, elige la opción más razonable, anótala en `docs/DECISIONES.md` (fecha, decisión, por qué) y sigue.
- **Solo te detienes** ante algo irreversible que pueda salir mal en cualquier dirección. Ejemplos: borrar un proyecto o base de Railway que tú no creaste, hacer force-push, o cobrar algo. En ese caso deja todo preparado y descríbelo en el reporte.
- **Prohibido:** `git push --force`, borrar ramas remotas, tocar otros proyectos de Railway, borrar archivos fuera de `~/Repos/lifemaxxing_gym_app`, y commitear secretos (`.env`, tokens, contraseñas). Solo `.env.example` va al repo.
- **Rama de trabajo:** `feat/app-rn`. Haz commits pequeños y frecuentes (conventional commits en español, por ejemplo `feat(api): login con sesiones`) y `git push` al terminar cada hito. Al final abre un PR a `main` con `gh pr create`. No hagas merge tú.
- **Bitácora de avance:** mantén `docs/PROGRESO.md` con el estado de cada hito (✅ / 🟡 / ❌) y la próxima acción. Si tu contexto se reinicia, **lee primero `docs/PROGRESO.md` y `docs/DECISIONES.md`** y continúa desde ahí.
- **Si algo falla 3 veces** (por ejemplo, el build de iOS), anótalo como bloqueo en el reporte y pasa al siguiente hito. No te quedes en un bucle.
- **Calidad mínima por hito:** typecheck sin errores, tests en verde y la app arrancando.
- **Idioma:** UI en español (Perú), código y nombres técnicos en inglés, unidades en kg y zona horaria `America/Lima`.

---

## 2. Arquitectura

```
lifemaxxing_gym_app/
├─ index.html                 # prototipo original (NO borrar: referencia de diseño y lógica)
├─ docs/                      # rutina, este plan, PROGRESO, DECISIONES, REPORTE_NOCHE
├─ db/
│  ├─ migrations/             # 0001_init.sql, 0002_seed_program.sql, ... (SQL puro, Postgres)
│  └─ README.md               # cómo correr y crear migraciones
├─ packages/
│  └─ core/                   # TypeScript puro: lógica de entrenamiento + tests (vitest)
├─ apps/
│  ├─ api/                    # Node + TypeScript (Hono), auth, endpoints, runner de migraciones; sirve también la web
│  └─ mobile/                 # Expo (React Native + Expo Router) → iOS, Android y web
├─ Dockerfile                 # build de producción: web export + API en una imagen
├─ docker-compose.yml         # Postgres local para desarrollo/tests
├─ pnpm-workspace.yaml
├─ .npmrc                     # node-linker=hoisted (requerido por Expo con pnpm)
└─ .env.example
```

**Decisiones de stack (no re-discutir):**

| Pieza | Elección | Motivo |
|---|---|---|
| App | **Expo** (última SDK estable) + **Expo Router** + TypeScript | Un código para iPhone y web (react-native-web) |
| Estado servidor | **TanStack Query** | Caché, reintentos, offline básico |
| Estado local | **Zustand** + persistencia (AsyncStorage) | Sesión de entreno en curso sobrevive a cierres |
| Gráficas | **react-native-svg** con componentes propios | Igual que el prototipo, funciona en web y nativo |
| Fuente | `@expo-google-fonts/montserrat` | Tipografía del diseño |
| API | **Hono** + `@hono/node-server` | Liviano, TypeScript, fácil de servir estáticos |
| DB | **Postgres** en Railway, driver `pg` | Migraciones SQL puras |
| Validación | **zod** compartido (en `packages/core`) | Mismos esquemas en app y API |
| Hash de contraseñas | `@node-rs/argon2` (argon2id) | Binarios precompilados, sin compilar en Railway |
| Tests | **vitest** (core y API), DB de test en Docker | Rápidos |
| Deploy | Railway: servicio `app` (API + web estática) + plugin **Postgres** | Mismo origen para web, así la cookie de sesión es simple |

**Mismo origen:** el servicio `app` sirve `/api/*` y la build web de Expo (`expo export -p web` → `apps/mobile/dist`) en `/`. Así la web usa cookie httpOnly sin CORS. El iPhone llama a la URL pública de Railway con token Bearer.

---

## 3. Hitos (en este orden)

| # | Hito | Hecho cuando |
|---|---|---|
| M0 | Clonar y preparar monorepo | `pnpm install` OK, rama `feat/app-rn` creada, `docs/PROGRESO.md` iniciado |
| M1 | `packages/core` con la lógica del prototipo + tests | Todos los vectores de §6 pasan |
| M2 | Migraciones SQL + runner + seed del programa | `pnpm db:migrate` aplica sobre DB vacía (local) dos veces sin error (idempotente) |
| M3 | API: auth + endpoints + tests de integración | Tests en verde contra Postgres de Docker |
| M4 | Railway: proyecto nuevo, Postgres, servicio `app` desplegado | `GET https://<dominio>/api/health` → `{ ok: true, db: true }` |
| M5 | App Expo: auth, navegación, tema, Plan | Login funciona en web local y en iOS (simulador o Expo Go) |
| M6 | App: modo Entrenar completo (calibración, series, descansos, resumen) | Se puede hacer un Workout A completo y queda guardado en la DB |
| M7 | App: Progreso (check-in, gráficas, fuerza, constancia, historial) | Datos reales desde la API, estados vacíos diseñados |
| M8 | Web en producción + smoke test + reporte | Web desplegada en Railway, `docs/REPORTE_NOCHE.md` escrito, PR abierto |
| M9 (opcional) | Build iOS ad hoc con EAS | Solo si `eas whoami` funciona; si no, dejarlo documentado |

---

## 4. M0 · Preparación

```bash
cd ~/Repos
git clone https://github.com/renzofernandezr/lifemaxxing_gym_app.git
cd lifemaxxing_gym_app
git checkout -b feat/app-rn
```

- `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
- `.npmrc`: `node-linker=hoisted`.
- `package.json` raíz con scripts:
  - `dev`: API y Expo en paralelo
  - `test`: tests de todo el repo
  - `typecheck`
  - `db:up`: Postgres local con docker compose
  - `db:migrate`
  - `build`
- `docker-compose.yml`: `postgres:16` en el puerto `5433` (evita choques), usuario, contraseña y base `gym`, más una base `gym_test` para tests.
- `.env.example`:
  ```
  DATABASE_URL=postgres://gym:gym@localhost:5433/gym
  TEST_DATABASE_URL=postgres://gym:gym@localhost:5433/gym_test
  PORT=3000
  NODE_ENV=development
  ALLOWED_EMAILS=renzofernandezg.rf@gmail.com
  SESSION_TTL_DAYS=30
  EXPO_PUBLIC_API_URL=http://localhost:3000
  ```
- Crear la app con `npx create-expo-app@latest apps/mobile --template default` (incluye Expo Router). Verificar que levanta con `pnpm --filter mobile web`.

---

## 5. M2 · Base de datos (migraciones SQL)

### 5.1 Runner de migraciones

- Archivos en `db/migrations/NNNN_nombre.sql`, aplicados en orden alfabético.
- Script `apps/api/src/db/migrate.ts`:
  - Crea la tabla `schema_migrations(version text primary key, applied_at timestamptz default now())` si no existe.
  - Toma un **advisory lock** (`select pg_advisory_lock(727272)`) para que dos deploys no migren a la vez.
  - Aplica cada archivo pendiente **dentro de una transacción**. Si falla, hace rollback y termina con código ≠ 0.
- Comandos:
  - `pnpm db:migrate`: aplica las migraciones pendientes.
  - `pnpm db:new <nombre>`: crea el siguiente archivo numerado vacío.
- En producción las migraciones corren antes de arrancar el servidor (ver §8).
- Nunca editar una migración ya aplicada en producción: se crea una nueva.

### 5.2 `0001_init.sql`

```sql
create extension if not exists citext;

-- ── Auth ─────────────────────────────────────────────
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  password_hash text   not null,
  name          text   not null,
  created_at    timestamptz not null default now()
);

create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   bytea not null unique,          -- sha256 del token; el token nunca se guarda
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index sessions_user_idx on sessions(user_id);

create table login_attempts (
  id         bigserial primary key,
  email      citext,
  ip         inet,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index login_attempts_recent_idx on login_attempts(email, created_at desc);

create table profiles (
  user_id            uuid primary key references users(id) on delete cascade,
  height_cm          numeric(5,1),
  start_weight_kg    numeric(5,2),
  goal_weight_kg     numeric(5,2),
  program_start_date date not null,            -- lunes de la semana 1
  timezone           text not null default 'America/Lima',
  theme              text not null default 'system' check (theme in ('system','light','dark')),
  updated_at         timestamptz not null default now()
);

-- ── Programa (plantillas) ────────────────────────────
create table exercises (
  id            text primary key,              -- 'inc', 'ohp', 'jal', ...
  name          text not null,
  equipment     text not null check (equipment in ('barra','mancuernas','polea','maquina','peso_corporal','rueda','cardio')),
  muscle_groups text[] not null default '{}',
  cue           text not null default '',
  increment_kg  numeric(4,2) not null default 2.5
);

create table program_phases (
  id             smallint primary key,         -- 1, 2, 3
  name           text not null,
  week_from      smallint not null,
  week_to        smallint not null,
  template_phase smallint not null             -- la fase 3 reutiliza la plantilla 1
);

create table routines (
  id             uuid primary key default gen_random_uuid(),
  template_phase smallint not null,
  key            char(1) not null check (key in ('A','B','C')),
  name           text not null,
  focus          text not null,
  unique (template_phase, key)
);

create table routine_exercises (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references routines(id) on delete cascade,
  position        smallint not null,
  exercise_id     text not null references exercises(id),
  alt_exercise_id text references exercises(id),   -- alternativa (p. ej. fondos → press de banca)
  scheme          text not null check (scheme in ('rpt','kino','rest_pause','straight','cardio')),
  drop_kg         numeric(4,2),                    -- bajada fija por serie en RPT (si null: −10 %)
  warmup          jsonb,                           -- [[0.5,6],[0.7,5],[0.8,3]] = % de la serie pesada × reps
  calibratable    boolean not null default false,
  is_addition     boolean not null default false,  -- añadido que no es del curso
  note            text,
  unique (routine_id, position)
);

create table routine_sets (
  routine_exercise_id uuid not null references routine_exercises(id) on delete cascade,
  set_index           smallint not null,
  reps_min            smallint not null,
  reps_max            smallint not null,
  unit                text not null default 'reps' check (unit in ('reps','reps_per_side','sec','min')),
  rest_sec            smallint not null,
  label               text,
  primary key (routine_exercise_id, set_index)
);

-- ── Registros del usuario ───────────────────────────
create table workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  routine_id   uuid not null references routines(id),
  program_week smallint not null,
  phase_id     smallint not null references program_phases(id),
  status       text not null default 'in_progress' check (status in ('in_progress','finished','discarded')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  notes        text
);
create index workout_sessions_user_idx on workout_sessions(user_id, started_at desc);
create unique index workout_sessions_one_active on workout_sessions(user_id) where status = 'in_progress';

create table workout_sets (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null unique,               -- generado en la app: reintentos idempotentes
  session_id   uuid not null references workout_sessions(id) on delete cascade,
  exercise_id  text not null references exercises(id),
  kind         text not null check (kind in ('warmup','test','work')),
  set_index    smallint not null,
  weight_kg    numeric(6,2) not null default 0,
  reps         smallint,
  duration_sec integer,
  rir          smallint check (rir between 0 and 5),
  target_min   smallint,
  target_max   smallint,
  rest_sec     smallint,
  completed_at timestamptz not null default now()
);
create index workout_sets_session_idx on workout_sets(session_id);
create index workout_sets_exercise_idx on workout_sets(exercise_id, completed_at desc);

create table exercise_calibrations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  exercise_id    text not null references exercises(id),
  session_id     uuid references workout_sessions(id) on delete set null,
  test_weight_kg numeric(6,2) not null,
  test_reps      smallint not null,
  rir            smallint not null,
  e1rm_kg        numeric(6,2) not null,
  created_at     timestamptz not null default now()
);
create index exercise_calibrations_idx on exercise_calibrations(user_id, exercise_id, created_at desc);

create table body_checkins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  measured_on  date not null,
  weight_kg    numeric(5,2) not null check (weight_kg between 30 and 250),
  body_fat_pct numeric(4,1) check (body_fat_pct between 3 and 60),
  note         text,
  unique (user_id, measured_on)
);

create table body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  measured_on date not null,
  chest_cm    numeric(5,1),
  arm_cm      numeric(5,1),
  waist_cm    numeric(5,1),
  unique (user_id, measured_on)
);
```

### 5.3 `0002_seed_program.sql`

Inserta los ejercicios, las fases y las rutinas. Usa `insert ... on conflict do nothing` para que el seed sea idempotente. Los datos salen de `index.html` (objeto `W`) y de esta tabla:

**Fases:** `(1, 'Fase 1 · Énfasis hombros', 1, 8, 1)`, `(2, 'Fase 2 · Énfasis pecho', 9, 16, 2)`, `(3, 'Fase 3 · Repite fase 1', 17, 24, 1)`.

**Plantilla 1. A · Pecho · hombros · tríceps · abs**

| pos | ejercicio (id · nombre · equipo · inc) | esquema | series (min–max · descanso s · etiqueta) | extra |
|---|---|---|---|---|
| 1 | `inc` · Press inclinado con barra · barra · 2.5 | rpt | 4–5·180·"la pesada", 6–7·180, 8–10·270 | warmup [[.5,6],[.7,5],[.8,3]], calibratable |
| 2 | `ohp` · Press militar de pie · barra · 2.5 | rpt | 6–8·180·"la pesada", 8–10·180, 8–10·120 | calibratable |
| 3 | `tri` · Extensión de tríceps con cuerda · polea · 2.5 | rpt | 6–8·120, 8–10·120, 10–12·120 | calibratable |
| 4 | `lat` · Elevaciones laterales · mancuernas · 1 | rest_pause | 12–15·12·"activación", 4–6·12, 4–6·12, 4–6·90 | |
| 5 | `knee` · Elevación de rodillas colgado · peso_corporal · 2.5 | straight | 8–12·60 ×3 | |

**Plantilla 1. B · Espalda · bíceps · piernas**

| pos | ejercicio | esquema | series | extra |
|---|---|---|---|---|
| 1 | `neg` · Negativas de dominada supina · peso_corporal · 0 | straight | 3–5·120, 3–5·120, 3–5·150 | is_addition |
| 2 | `jal` · Jalón al pecho supino · polea · 2.5 | rpt | 6–8·180, 8–10·180, 10–12·150 | warmup [[.5,6],[.75,3]], calibratable, alt `chin_w` |
| 3 | `ham` · Curl martillo inclinado · mancuernas · 2 | rpt | 6–8·120, 6–8·120, 8–10·150 | drop_kg 2, calibratable |
| 4 | `bul` · Sentadilla búlgara · mancuernas · 2 | kino | 6–8·120 ×4 | calibratable |
| 5 | `rdl` · Peso muerto rumano con mancuernas · mancuernas · 2 | kino | 10–12·90, ·90, ·90, ·120 | calibratable |
| 6 | `fp` · Face pulls · polea · 2.5 | kino | 12–15·75 ×4 | |

**C · Cardio + abs (ambas plantillas)**

`car` Cardio moderado (cardio, 40–60 min, 120 s), `hlr` Elevación de piernas colgado (4 × 8–12, 60 s), `s2s` Rodillas lado a lado (2 × 10–15 reps_per_side, 60 s), `whl` Rueda abdominal (2 × 10, 60 s), `brg` Puente de cadera isométrico (2 × 30 sec, 45 s).

**Plantilla 2. A · Pecho (adaptada del Cap. 9 del curso a kg)**

| pos | ejercicio | esquema | series | extra |
|---|---|---|---|---|
| 1 | `inc_db` · Press inclinado con mancuernas · mancuernas · 2 | rpt | 6–8·180, 8–10·180, 10–12·180 | drop_kg 4, calibratable |
| 2 | `dip_w` · Fondos lastrados · peso_corporal · 2.5 | rpt | 6–8·180, 8–10·180, 10–12·150 | alt `bench`, calibratable |
| 3 | `tri_oh` · Extensión de tríceps sobre la cabeza a un brazo · mancuernas · 2 | rpt | 8–10·120, 10–12·120, 12–15·120 | drop_kg 2 |
| 4 | `uprow` · Remo al mentón con mancuernas · mancuernas · 2 | kino | 10–15·90 ×4 | |
| 5 | `s2s` · Rodillas lado a lado | straight | 8–12·60 ×3 (reps_per_side) | |

**Plantilla 2. B · Espalda y piernas**

| pos | ejercicio | esquema | series | extra |
|---|---|---|---|---|
| 1 | `neg` · Negativas de dominada supina | straight | 3–5·120 ×3 | is_addition |
| 2 | `jal_pr` · Jalón al pecho prono · polea · 2.5 | rpt | 6–8·180, 8–10·180, 8–10·150 | alt `pull_w`, calibratable |
| 3 | `curl_inc` · Curl inclinado con mancuernas · mancuernas · 2 | rpt | 6–8·120 ×3 | drop_kg 2, calibratable |
| 4 | `box` · Box squat con barra · barra · 2.5 | kino | 6·120 ×5 | calibratable |
| 5 | `sl_rdl` · Peso muerto rumano a una pierna · mancuernas · 2 | kino | 8–12·120 ×3 | alt `hip_thrust`, calibratable |
| 6 | `rdf` · Pájaros sentado · mancuernas · 1 | rest_pause | 12–15·12, 4–6·12, 4–6·12, 4–6·90 | |

Ejercicios alternativos a crear también: `chin_w` (Dominada supina lastrada, peso_corporal, 1.25), `bench` (Press de banca con barra, barra, 2.5), `pull_w` (Dominada prona lastrada, peso_corporal, 1.25) y `hip_thrust` (Hip thrust con barra, barra, 2.5). Copia los textos de técnica (`cue`) del prototipo y escribe uno corto para los nuevos.

---

## 6. M1 · `packages/core` (lógica pura + tests)

Porta las funciones del prototipo (`index.html`, bloque `<script>`) a TypeScript, sin dependencias de UI:

| Función | Qué hace |
|---|---|
| `e1rm(w, reps)` | Epley `w·(1+r/30)`; **si `r ≤ 1` devuelve `w`** |
| `weightForReps(e1rm, reps)` | inversa de Epley |
| `round(w, step)` | redondeo a múltiplo del paso |
| `stepOf(equipment)` | mancuernas 2, resto 2.5 (o `increment_kg` del ejercicio) |
| `loadsFromE1rm(exercise, e1rm)` | RPT: serie 1 = `weightForReps(e, max₁+1)`; siguientes −10 % o `drop_kg`. Kino: la última serie = `weightForReps(e, maxₙ+1)` y rampa ascendente estricta hacia atrás (factores .64/.76/.88/1, cada serie al menos un paso menos que la siguiente). |
| `calibrate(test)` | `e1rm(w, reps + rir)` → cargas de todas las series |
| `suggestNext(exercise, lastSets)` | doble progresión: RPT por serie (tope → +inc); Kino/rest-pause/rectas: todas al tope → +inc en todas |
| `warmups(exercise, heavyWeight)` | según `warmup` o el default del Cap. 4 `[[.6,5],[.75,3],[.9,1]]` |
| `platesPerSide(total, bar=20)` | discos 25, 20, 15, 10, 5, 2.5, 1.25 + resto |
| `programPosition(date, startDate, tz)` | semana del programa (1–24), fase, y si toca A, B o C (semana impar A-B-A, par B-A-B; lun/mié/vie pesas, sáb C) |
| `macros(kcal, proteinG=195, fatPct=.25)` | proteína, grasa y carbohidratos en gramos |
| `bodyComp(weight, fatPct)` | masa magra y masa grasa |
| `checkinFeedback(prev, curr)` | mensajes del prototipo (ritmo lento, rápido, subida, mucha masa magra perdida) |
| `isRecord(sets, history)` | récord si el mejor e1RM de la sesión supera el histórico |

**Vectores de test obligatorios** (salen del prototipo, ya verificados):

- `e1rm(70, 1) = 70`; `e1rm(60, 6+1) ≈ 74`.
- Calibrar press inclinado con 60 kg × 6 y RIR 1 → e1RM 74 y series **62.5 / 57.5 / 52.5**.
- Calibrar búlgara con 12 kg × 8 y RIR 1 → rampa **6 / 8 / 10 / 12**.
- Curl martillo (drop_kg 2) con 14 kg × 8 y RIR 2 → **14 / 12 / 10**.
- `platesPerSide(62.5)` → `[20, 1.25]`.
- `programPosition('2026-10-19')` → semana 1, fase 1, **A**; `2026-10-21` → **B**; `2026-10-26` → semana 2, **B**; `2026-10-24` (sáb) → **C**; `2026-12-14` → semana 9, fase 2.
- `macros(2900)` → P 195 · G 81 · C 349; `macros(2600)` → G 72 · C 292.
- `suggestNext` RPT: última `[[60,5],[55,6],[50,9]]` con rangos 4–5/6–7/8–10 → `[62.5, 55, 50]`.

---

## 7. M3 · API

**Estructura:** `src/server.ts`, `src/routes/*.ts`, `src/auth/*.ts`, `src/db/pool.ts`, `src/db/migrate.ts`. Todas las respuestas en JSON y los errores con forma `{ error: { code, message } }` y mensajes en español.

### 7.1 Auth sobre Postgres

- **Registro** `POST /api/auth/register {email, password, name}`. Solo se permite si el email está en `ALLOWED_EMAILS` (la app es personal). Contraseña de 10 caracteres o más, hasheada con argon2id. Crea el `profile` con los valores por defecto: altura 186, peso inicial 105.6 y `program_start_date` 2026-10-19.
- **Login** `POST /api/auth/login {email, password}`.
  - Límite: 5 intentos fallidos por email o IP en 15 minutos (consultando `login_attempts`). Al superarlo responde 429 con el mensaje "Demasiados intentos. Espera unos minutos".
  - Si el login es correcto, genera un token aleatorio de 32 bytes en base64url y guarda en `sessions` su `sha256(token)` con expiración `SESSION_TTL_DAYS`.
  - **Web:** devuelve la cookie `sid` (httpOnly, Secure en producción, SameSite=Lax, Path=/).
  - **Nativo** (cabecera `X-Client: mobile`): devuelve `{ token }` en el body.
- **Autenticación de requests:** `Authorization: Bearer <token>` o la cookie `sid`. Se busca por hash, se verifica la expiración y se actualiza `last_seen_at` (expiración deslizante, a lo más una escritura por hora).
- **CSRF** (solo con cookie): en métodos que modifican datos, exigir que `Origin` sea el propio dominio.
- `POST /api/auth/logout` borra la sesión. `GET /api/auth/me` devuelve usuario y perfil.
- La contraseña nunca se registra en logs. Mensajes genéricos: "Correo o contraseña incorrectos".

### 7.2 Endpoints

| Método y ruta | Descripción |
|---|---|
| `GET /api/health` | `{ ok, db }` (hace `select 1`) |
| `GET/PATCH /api/profile` | altura, peso inicial/meta, fecha de inicio, tema |
| `GET /api/program/today?date=` | posición del programa y la rutina del día con ejercicios, series, alternativas y **sugerencias de carga** (última sesión + `suggestNext`, o "requiere calibración") |
| `GET /api/program/routines?phase=` | rutinas de la fase (para la vista Plan) |
| `POST /api/sessions` | inicia sesión de entreno (`routineId`); 409 si ya hay una en curso |
| `GET /api/sessions/active` | la sesión en curso con sus series |
| `POST /api/sessions/:id/sets` | upsert por `client_id` (idempotente); acepta un lote |
| `POST /api/sessions/:id/calibrations` | guarda la serie de prueba y devuelve el e1RM y las cargas |
| `POST /api/sessions/:id/finish` y `/discard` | cierra la sesión; `finish` devuelve el resumen (volumen, récords, próximo peso por ejercicio) |
| `GET /api/sessions?limit=&before=` | historial paginado |
| `GET/POST/DELETE /api/checkins` | peso y % de grasa (upsert por fecha) |
| `GET/POST /api/measurements` | pecho, brazo y cintura mensuales |
| `GET /api/stats/overview` | KPIs: peso, % de grasa, masa magra, Δ desde el inicio, entrenos hechos vs. planificados, racha en semanas |
| `GET /api/stats/lifts` | series temporales de la serie pesada y el e1RM de `inc`, `ohp`, `jal` (y alternativas) |
| `GET /api/stats/activity?weeks=26` | días entrenados con volumen (para el mapa de actividad) |

Tests de integración con vitest contra `TEST_DATABASE_URL`: registro bloqueado si el email no está permitido, login con cookie y con Bearer, rate limit, sesión expirada, flujo completo de un entreno, idempotencia de sets, check-in duplicado por fecha (debe hacer upsert) y que un usuario no pueda leer datos de otro.

---

## 8. M4 · Railway (proyecto nuevo)

Las flags de la CLI cambian entre versiones: revisa `railway --help` y `railway <cmd> --help` antes de usarlas.

1. Crear un **proyecto nuevo** llamado `lifemaxxing-gym` (no reutilizar proyectos existentes). Su entorno por defecto es `production`.
   ```bash
   railway init --name lifemaxxing-gym
   railway add --database postgres
   railway add --service app
   ```
2. Variables del servicio `app` (CLI reciente: `railway variable set KEY=valor --service app`; versiones antiguas: `railway variables --set "KEY=valor"`):
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (variable de referencia, red privada)
   - `NODE_ENV=production`
   - `ALLOWED_EMAILS=renzofernandezg.rf@gmail.com`
   - `SESSION_TTL_DAYS=30`
   - `PORT` lo pone Railway.
3. **Dockerfile** multi-stage en la raíz:
   - Instala con pnpm.
   - Build de `packages/core` y `apps/api`.
   - `expo export -p web` de `apps/mobile` con `EXPO_PUBLIC_API_URL=""` (mismo origen).
   - Imagen final `node:22-slim` con `dist` de la API y la web.
   - Arranque: `node dist/db/migrate.js && node dist/server.js`.
4. La API sirve la web estática con fallback a `index.html` para las rutas del router, sin pisar `/api/*`.
5. Desplegar con `railway up --service app --detach` y generar dominio con `railway domain --service app`.
6. Healthcheck de Railway en `/api/health`.
7. Guardar la URL pública en `docs/REPORTE_NOCHE.md` y como `EXPO_PUBLIC_API_URL` en `apps/mobile/.env.production` (es pública, no es secreto).
8. **Usuario de prueba:** crear el usuario de Renzo vía `POST /api/auth/register` con una contraseña generada aleatoriamente. Escribir esa contraseña **solo** en `~/Repos/lifemaxxing_gym_app/.secrets/credenciales.txt` (en `.gitignore`) e indicar en el reporte dónde está y que debe cambiarla.

---

## 9. M5–M7 · App Expo

### 9.1 Navegación (Expo Router)

```
app/
├─ (auth)/login.tsx, register.tsx
├─ (tabs)/_layout.tsx        # barra inferior: Progreso | ⦿ Entrenar | Plan
│  ├─ progreso/index.tsx     # sub-pestañas: Resumen · Peso y grasa · Fuerza · Constancia · Historial
│  ├─ entrenar/index.tsx     # previa del día
│  └─ plan/index.tsx         # sub-pestañas: Ruta · Rutinas (A/B/C) · Cargas · Nutrición · Reglas
├─ entrenar/sesion.tsx       # pantalla de sesión en curso (modal a pantalla completa)
├─ entrenar/resumen.tsx
└─ ajustes.tsx               # perfil, tema, cerrar sesión
```

- Guard de auth: sin sesión → `(auth)/login`.
- Token en `expo-secure-store` (nativo). En web se usa la cookie, sin guardar token.
- En escritorio (ancho ≥ 760) la web muestra las pestañas en la cabecera, como el prototipo.

### 9.2 Diseño (replicar el prototipo)

- **Tokens** en `apps/mobile/theme/tokens.ts`, copiados del `:root` del prototipo, en claro y oscuro:
  - Claro: `bg #F5F5F5`, `surface #FFFFFF`, `fg #212338`, `muted #5B6B6B`, `accent #FF6600`, `accentInk #C24E00`, `accentSoft #FDE9DB`, `line #E3E3E3`.
  - Oscuro: `bg #252C2E`, `surface #2F3739`, `fg #F3F5F5`, `accent #FF6A0A`, `accentSoft #55392A`, `line #4A5456`.
  - Colores de discos: 25 rojo, 20 azul, 15 amarillo, 10 verde, 5 blanco, 2.5 negro, 1.25 gris.
- Tema: `system | light | dark`, guardado en el perfil, con un botón luna/sol en la cabecera.
- Montserrat 400/500/600/700/800. Números con `fontVariant: ['tabular-nums']`.
- Cabecera clara en modo claro (sin barra oscura). El naranja se reserva para lo activo.

**Componentes inspirados en openGym.** Reimplementarlos, no copiar su código, porque es AGPL:

1. **Barra inferior con botón central** circular naranja "Entrenar". Con una sesión en curso cambia a "Reanudar".
2. **Descanso como barra flotante** sobre la barra inferior: cuenta grande, barra de progreso, "−15 s", "+30 s" y "Saltar". Al tocarla se expande al anillo a pantalla completa del prototipo.
3. **Tabla de series con check:** fila por serie con número, peso (− / +), reps (− / +) y ✓. Al marcar ✓ se registra y arranca el descanso. Arriba van chips de músculo, equipo y mejor marca, la línea "Última vez: …" y un chip de sugerencia ("Llegaste al tope: hoy 62.5 kg"). La tarjeta grande de la serie actual se mantiene encima.
4. **Tarjeta de peso:** número grande, Δ con flecha, línea punteada de meta, selector 1M / 3M / Todo y botón "+ Registrar" que abre una hoja inferior (peso y % de grasa).
5. **Tira semanal L–D** con puntos en los días entrenados y el día de hoy marcado, más la tarjeta "Hoy · Workout A" (en Entrenar y en Resumen).
6. **Racha:** "N semanas seguidas · 2/3 esta semana".
7. **Mapa de actividad** de 26 semanas, sombreado por volumen, con 5 niveles del token de acento.
8. **Toasts** ("Récord en press inclinado", "Check-in guardado").

### 9.3 Modo Entrenar (paridad con el prototipo)

- Previa del día: rutina sugerida por `programPosition`, selector A / B / C, lista de ejercicios e interruptor **"Primera sesión: calibrar cargas"**. Se activa solo para los ejercicios `calibratable` que aún no tienen calibración.
- **Serie de prueba:**
  - Peso y reps con steppers, más un selector de reps en reserva (0 / 1 / 2 / 3+).
  - Vista previa en vivo del e1RM y de las cargas, con aviso si las reps están fuera de 3–10.
  - Discos por lado si el ejercicio es con barra.
  - Botón "Calcular mis cargas".
- Calentamientos calculados (solo en el primer ejercicio, si no hubo prueba).
- Durante la serie:
  - **Pirámide inversa:** si cambias el peso de la serie 1, las siguientes se recalculan (−10 % o `drop_kg`).
  - **Kino rep:** el cambio se desplaza a toda la rampa.
  - **Rest-pause:** las mini-series heredan el peso.
- **Descansos** según `rest_sec`:
  - Pitido en los últimos 3 segundos y vibración al terminar (`expo-haptics`).
  - **Notificación local** programada con `expo-notifications` al empezar el descanso, para que avise aunque la app esté en segundo plano. Se cancela si saltas el descanso.
- Pantalla siempre encendida durante la sesión (`expo-keep-awake`).
- **Offline:**
  - Cada serie se guarda primero en el store local con `client_id` y se sincroniza en lote.
  - Si no hay red, se reintenta en cola.
  - Al reabrir la app, "Reanudar" recupera la sesión.
- Resumen: duración, series, volumen, récords, mejor serie por ejercicio, "próximo peso" según `suggestNext`, y los botones Guardar o Descartar.

### 9.4 Progreso y Plan

- Los mismos contenidos del prototipo, con datos reales de la API.
- **Estados vacíos diseñados** ("Aún no tienes check-ins: registra tu peso de hoy").
- **Nada de datos simulados en producción.** El modo demo se activa solo con `?demo=1` en web.
- Las gráficas son componentes SVG propios (línea + área + punto final + línea de referencia), portados de `lineChart()` del prototipo.
- La calculadora de cargas de Plan usa `packages/core` y funciona sin conexión.

---

## 10. M8 · Verificación final y reporte

1. `pnpm typecheck && pnpm test`, todo en verde.
2. Migraciones desde cero sobre una DB vacía local y luego sobre Railway (ya aplicadas en el deploy).
3. **Smoke test** en `scripts/smoke.sh` contra producción: `health` → login → `program/today` → crear sesión → 2 sets → finish → check-in → `stats/overview`. Luego borrar los datos de prueba con `discard` o con los endpoints DELETE.
4. Abrir la web de producción con Playwright (si está instalado):
   - Capturas de login, Resumen, Entrenar y Plan en 390 px y 1280 px, en modo claro y oscuro.
   - Guardarlas en `docs/capturas/`.
5. iOS:
   - Si hay simulador: `npx expo run:ios` o `npx expo start --ios` y una captura.
   - Si no: dejar instrucciones para Expo Go (`npx expo start` → QR).
6. `docs/REPORTE_NOCHE.md` con:
   - Qué quedó hecho por hito (✅ / 🟡 / ❌).
   - URL de producción y dónde está la contraseña (no la contraseña).
   - Cómo correr local (`pnpm db:up && pnpm db:migrate && pnpm dev`).
   - Cómo probar en el iPhone.
   - Bloqueos encontrados y decisiones tomadas (con enlace a `DECISIONES.md`).
   - Siguientes pasos.
7. `git push` de la rama y `gh pr create --base main --title "App React Native + API + Railway" --body-file docs/REPORTE_NOCHE.md`.

---

## 11. M9 (opcional) · iPhone instalable

Solo si `npx eas-cli whoami` responde con una cuenta:

- `eas build:configure`, con el perfil `preview` y distribución `internal`.
- `eas build -p ios --profile preview --non-interactive`.
- Si pide credenciales de Apple o registrar dispositivos (UDID), **no insistir**: dejar los pasos en el reporte para hacerlo con Renzo presente.

---

## 12. Prompt para lanzar a Claude Code

Pégalo tal cual en la sesión abierta en `~/Repos`:

```
Clona https://github.com/renzofernandezr/lifemaxxing_gym_app.git en ~/Repos/lifemaxxing_gym_app
(si ya existe, haz git pull). Entra a la carpeta, lee completo docs/PLAN_APP_RN.md y ejecútalo
de principio a fin, hito por hito, sin detenerte a preguntar. Sigue las reglas de la sección 1:
decide lo ambiguo y anótalo en docs/DECISIONES.md, mantén docs/PROGRESO.md al día, haz commits
y push en la rama feat/app-rn, no hagas force-push ni toques otros proyectos de Railway, y nunca
commitees secretos. Si tu contexto se reinicia, retoma leyendo docs/PROGRESO.md. Al terminar
deja docs/REPORTE_NOCHE.md y abre el PR a main.
```
