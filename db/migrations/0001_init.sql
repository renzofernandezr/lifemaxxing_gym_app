-- 0001_init: auth, programa y registros del usuario
-- citext vive en public: así los schemas de test (search_path=test_x,public) lo comparten.
create extension if not exists citext with schema public;

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
