#!/usr/bin/env bash
# Render (plan gratis, solo production): Postgres + servicio web Docker en Virginia, desde la rama feat/app-rn.
# Requiere `render login` y el workspace activo (`render workspace set`). Pasos:
#
#   scripts/render-setup.sh db       # crea la Postgres gratis lifemaxxing-gym-db (si no existe)
#   scripts/render-setup.sh app      # crea el servicio web lifemaxxing-gym con DATABASE_URL interna (si no existe)
#   scripts/render-setup.sh deploy   # despliega el último commit de feat/app-rn (hay que pushear antes)
#   scripts/render-setup.sh wait     # espera el último deploy, prueba /api/health y escribe apps/mobile/.env.production
#   scripts/render-setup.sh users    # usuario de production (contraseña aleatoria en .secrets/credenciales.txt)
#   scripts/render-setup.sh smoke    # smoke test contra production (limpia sus datos al terminar)
#
# Reglas: solo toca recursos llamados lifemaxxing-gym*, nunca imprime secretos.
set -euo pipefail

DB_NAME="lifemaxxing-gym-db"
APP_NAME="lifemaxxing-gym"
REGION="virginia"
REPO="https://github.com/renzofernandezr/lifemaxxing_gym_app"
BRANCH="feat/app-rn"
EMAIL="renzofernandezg.rf@gmail.com"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CREDS=".secrets/credenciales.txt"
ENV_PROD="apps/mobile/.env.production"

say() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

db_id() { render pg list -o json | jq -r --arg n "$DB_NAME" '.data[] | select(.name == $n) | .id' | head -1; }
app_id() { render services -o json | jq -r --arg n "$APP_NAME" '.[] | .service // empty | select(.name == $n) | .id' | head -1; }
app_url() { grep -h EXPO_PUBLIC_API_URL "$ENV_PROD" | cut -d= -f2-; }

cmd_db() {
  say "Postgres $DB_NAME"
  local id
  id="$(db_id)"
  if [[ -n "$id" ]]; then
    echo "  · ya existe ($id)"
  else
    render pg create --confirm --name "$DB_NAME" --plan free --region "$REGION" \
      --database-name lifemaxxing --database-user lifemaxxing -o json >/dev/null
    id="$(db_id)"
    echo "  ✓ creada ($id)"
  fi
  until [[ "$(render pg get "$id" -o json | jq -r .data.status)" == available ]]; do sleep 15; done
  echo "  ✓ disponible · caduca $(render pg get "$id" -o json | jq -r '.data.expiresAt // "nunca"')"
}

cmd_app() {
  say "Servicio web $APP_NAME"
  local id db url
  id="$(app_id)"
  [[ -z "$id" ]] || { echo "  · ya existe ($id)"; return; }
  db="$(db_id)"
  [[ -n "$db" ]] || die "Primero: scripts/render-setup.sh db"
  url="$(render pg get "$db" --include-sensitive-connection-info -o json | jq -r .data.connectionInfo.internalConnectionString)"
  [[ "$url" == postgres*://* ]] || die "No encuentro la URL interna de $DB_NAME"
  render services create --name "$APP_NAME" --type web_service --repo "$REPO" --branch "$BRANCH" \
    --runtime docker --plan free --region "$REGION" --health-check-path /api/health \
    --build-filter-ignored-path 'docs/**' --build-filter-ignored-path '**/*.md' \
    --env-var "DATABASE_URL=$url" --env-var NODE_ENV=production \
    --env-var "ALLOWED_EMAILS=$EMAIL" --env-var SESSION_TTL_DAYS=30 \
    -o json | jq -r '"  ✓ creado (\(.id)) → \(.serviceDetails.url)"'
}

# El auto-deploy no se dispara: el repo está conectado como URL pública, sin la app de GitHub de Render.
cmd_deploy() {
  local id
  id="$(app_id)"
  [[ -n "$id" ]] || die "No existe el servicio $APP_NAME"
  say "Deploy de $APP_NAME ($BRANCH)"
  render deploys create "$id" --wait --confirm -o text | tail -1
}

cmd_wait() {
  local id status base
  id="$(app_id)"
  [[ -n "$id" ]] || die "No existe el servicio $APP_NAME"
  say "Último deploy de $APP_NAME"
  while :; do
    status="$(render deploys list "$id" -o json | jq -r '.[0].status')"
    case "$status" in
      live) echo "  ✓ live"; break ;;
      *failed* | canceled | deactivated) die "deploy: $status (render logs -r $id)" ;;
    esac
    sleep 20
  done
  base="$(render services -o json | jq -r --arg i "$id" '.[] | .service // empty | select(.id == $i) | .serviceDetails.url')"
  # La instancia gratis tarda ~1 min en despertar.
  for _ in $(seq 1 12); do
    if curl -fsS --max-time 90 "$base/api/health" | jq -e '.ok and .db' >/dev/null 2>&1; then
      echo "  ✓ $base/api/health → { ok: true, db: true }"
      printf 'EXPO_PUBLIC_API_URL=%s\n' "$base" > "$ENV_PROD"
      echo "  ✓ $ENV_PROD"
      return
    fi
    sleep 10
  done
  die "El healthcheck no respondió"
}

cmd_users() {
  local base pass code
  base="$(app_url)"
  say "Usuario en production ($base)"
  mkdir -p .secrets
  pass="$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")"
  code="$(curl -sS --max-time 90 -o /dev/null -w '%{http_code}' -X POST "$base/api/auth/register" \
    -H 'Content-Type: application/json' -H 'X-Client: mobile' \
    --data "$(jq -nc --arg e "$EMAIL" --arg p "$pass" '{email:$e,password:$p,name:"Renzo"}')")"
  if [[ "$code" == 201 ]]; then
    { echo "[production] $base"; echo "usuario: $EMAIL"; echo "contraseña: $pass"; echo; } >> "$CREDS"
    chmod 600 "$CREDS"
    echo "  ✓ usuario creado (contraseña en $CREDS)"
  elif [[ "$code" == 409 ]]; then
    echo "  · el usuario ya existía (no se cambia la contraseña)"
  else
    die "registro respondió $code"
  fi
}

cmd_smoke() {
  local pass
  pass="$(awk 'index($0, "[production]") == 1 {f = 1} f && /^contraseña:/ {print $2; exit}' "$CREDS" 2>/dev/null)"
  [[ -n "$pass" ]] || die "No hay contraseña de production en $CREDS"
  say "Smoke test production"
  SMOKE_EMAIL="$EMAIL" SMOKE_PASSWORD="$pass" scripts/smoke.sh "$(app_url)"
}

case "${1:-}" in
  db) cmd_db ;;
  app) cmd_app ;;
  deploy) cmd_deploy; cmd_wait ;;
  wait) cmd_wait ;;
  users) cmd_users ;;
  smoke) cmd_smoke ;;
  all) cmd_db; cmd_app; cmd_wait; cmd_users; cmd_smoke ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
