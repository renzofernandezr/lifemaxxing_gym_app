#!/usr/bin/env bash
# Automatiza los hitos M2 y M4 del plan en Railway (proyecto lifemaxxing-gym, entornos production y dev).
# Escrito durante el incidente de Railway del 21-oct-2026: NO se pudo ejecutar todavía. Revísalo y córrelo por pasos:
#
#   scripts/railway-setup.sh project     # crea/enlaza el proyecto, Postgres, servicio app y entorno dev
#   scripts/railway-setup.sh vars        # variables del servicio app en ambos entornos
#   scripts/railway-setup.sh devdb       # DEV_DATABASE_URL en .env + migraciones ×2 + tests de la API
#   scripts/railway-setup.sh deploy dev  # deploy, dominio y healthcheck (luego: deploy production)
#   scripts/railway-setup.sh users       # usuarios (contraseñas aleatorias en .secrets/credenciales.txt)
#   scripts/railway-setup.sh smoke       # smoke test contra dev y production
#
# Reglas: nunca toca proyectos distintos de lifemaxxing-gym, nunca imprime secretos, no aplica nada a mano en production.
set -euo pipefail

PROJECT="lifemaxxing-gym"
EMAIL="renzofernandezg.rf@gmail.com"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .secrets
CREDS=".secrets/credenciales.txt"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# Aborta si el directorio está enlazado a otro proyecto.
guard() {
  local name
  name="$(railway status --json 2>/dev/null | jq -r '.name // .project.name // empty')"
  [[ "$name" == "$PROJECT" ]] || die "El directorio no está enlazado a $PROJECT (está: '${name:-nada}'). No sigo."
}

has_service() { railway service list --environment "$1" --json 2>/dev/null | jq -e --arg s "$2" '[.. | objects | select(has("name")) | .name] | index($s)' >/dev/null; }

cmd_project() {
  say "Proyecto"
  if ! railway status --json >/dev/null 2>&1; then
    local id
    id="$(railway list --json | jq -r --arg p "$PROJECT" '[.. | objects | select(.name? == $p) | .id][0] // empty')"
    if [[ -n "$id" ]]; then
      railway link --project "$id" --environment production --json >/dev/null
    else
      local ws
      ws="$(railway whoami --json | jq -r 'if (.workspaces | length) == 1 then .workspaces[0].id else empty end')"
      [[ -n "$ws" ]] || die "Hay varios workspaces: pasa RAILWAY_WORKSPACE=<id>"
      railway init --name "$PROJECT" --workspace "${RAILWAY_WORKSPACE:-$ws}" --json
    fi
  fi
  guard
  railway environment link production --json >/dev/null
  has_service production Postgres || railway add --database postgres --json
  has_service production app || railway add --service app --json
  if ! railway environment list --json | jq -e '[.. | objects | .name? // empty] | index("dev")' >/dev/null; then
    say "Entorno dev (duplica production: su propio Postgres y su propio app)"
    railway environment new dev --duplicate production --json
  fi
  has_service dev Postgres || die "dev no tiene Postgres: agrégalo con 'railway environment link dev && railway add --database postgres'"
  has_service dev app || die "dev no tiene el servicio app"
  railway environment link production --json >/dev/null
}

cmd_vars() {
  guard
  for env in dev production; do
    say "Variables de app en $env"
    railway variable set \
      'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
      NODE_ENV=production \
      "ALLOWED_EMAILS=$EMAIL" \
      SESSION_TTL_DAYS=30 \
      --service app --environment "$env" --skip-deploys --json >/dev/null
  done
}

cmd_devdb() {
  guard
  say "DEV_DATABASE_URL en .env (URL pública del Postgres de dev; no se imprime)"
  local url
  url="$(railway variable list --service Postgres --environment dev --json | jq -r '.DATABASE_PUBLIC_URL // empty')"
  [[ -n "$url" ]] || die "No encuentro DATABASE_PUBLIC_URL en el Postgres de dev (¿proxy TCP público activado?)"
  touch .env
  grep -v '^DEV_DATABASE_URL=' .env > .env.tmp || true
  printf 'DEV_DATABASE_URL=%s\n' "$url" >> .env.tmp
  mv .env.tmp .env
  chmod 600 .env
  say "Migraciones en dev (dos veces: debe ser idempotente)"
  pnpm db:migrate:dev
  pnpm db:migrate:dev
  say "Tests de la API (schema temporal en la DB dev)"
  pnpm --filter api test
}

domain_of() {
  railway domain list --service app --environment "$1" --json 2>/dev/null | jq -r '[.. | strings | select(test("\\.up\\.railway\\.app$"))][0] // empty'
}

cmd_deploy() {
  local env="${1:?Uso: deploy dev|production}"
  guard
  say "Deploy de app en $env (Railway construye el Dockerfile)"
  railway up --service app --environment "$env" --ci
  local d
  d="$(domain_of "$env")"
  if [[ -z "$d" ]]; then
    railway domain --service app --environment "$env" --port 3000 --json >/dev/null || railway domain --service app --environment "$env" --json >/dev/null
    d="$(domain_of "$env")"
  fi
  [[ -n "$d" ]] || die "No pude obtener el dominio de $env"
  say "Healthcheck https://$d/api/health"
  for _ in $(seq 1 30); do
    if curl -fsS "https://$d/api/health" | jq -e '.ok and .db' >/dev/null 2>&1; then
      echo "  ✓ { ok: true, db: true }"
      local f="apps/mobile/.env.$([[ $env == dev ]] && echo development || echo production)"
      printf 'EXPO_PUBLIC_API_URL=https://%s\n' "$d" > "$f"
      echo "  ✓ $f"
      echo "$env: https://$d"
      return
    fi
    sleep 10
  done
  die "El healthcheck de $env no respondió"
}

register() {
  local base="$1" label="$2" pass
  pass="$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$base/api/auth/register" \
    -H 'Content-Type: application/json' -H 'X-Client: mobile' \
    --data "$(jq -nc --arg e "$EMAIL" --arg p "$pass" '{email:$e,password:$p,name:"Renzo"}')")"
  if [[ "$code" == 201 ]]; then
    { echo "[$label] $base"; echo "usuario: $EMAIL"; echo "contraseña: $pass"; echo; } >> "$CREDS"
    chmod 600 "$CREDS"
    echo "  ✓ usuario creado en $label (contraseña en $CREDS)"
  elif [[ "$code" == 409 ]]; then
    echo "  · ya existía el usuario en $label (no se cambia la contraseña)"
  else
    die "registro en $label respondió $code"
  fi
}

cmd_users() {
  local dev prod
  dev="$(grep -h EXPO_PUBLIC_API_URL apps/mobile/.env.development | cut -d= -f2-)"
  prod="$(grep -h EXPO_PUBLIC_API_URL apps/mobile/.env.production | cut -d= -f2-)"
  say "Usuarios"
  register "$dev" "dev"
  register "$prod" "production"
}

cmd_smoke() {
  for env in development production; do
    local base pass label
    base="$(grep -h EXPO_PUBLIC_API_URL "apps/mobile/.env.$env" | cut -d= -f2-)"
    label="$([[ $env == development ]] && echo dev || echo production)"
    pass="$(awk -v l="[$label]" 'index($0, l) == 1 {f = 1} f && /^contraseña:/ {print $2; exit}' "$CREDS")"
    [[ -n "$pass" ]] || die "No hay contraseña de $label en $CREDS"
    say "Smoke test $label"
    SMOKE_EMAIL="$EMAIL" SMOKE_PASSWORD="$pass" scripts/smoke.sh "$base"
  done
}

case "${1:-}" in
  project) cmd_project ;;
  vars) cmd_vars ;;
  devdb) cmd_devdb ;;
  deploy) cmd_deploy "${2:-}" ;;
  users) cmd_users ;;
  smoke) cmd_smoke ;;
  all)
    cmd_project; cmd_vars; cmd_devdb; cmd_deploy dev; cmd_deploy production; cmd_users; cmd_smoke ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
