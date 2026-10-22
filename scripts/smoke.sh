#!/usr/bin/env bash
# Smoke test contra una URL desplegada:
#   health → login → program/today → crear sesión → 2 series → finish → check-in → stats/overview
# y al final borra los datos de prueba (discard de la sesión y DELETE del check-in).
#
# Uso: SMOKE_EMAIL=... SMOKE_PASSWORD=... scripts/smoke.sh https://<dominio>
# (la contraseña se puede leer de .secrets/, nunca se imprime)
set -euo pipefail

BASE="${1:?Uso: scripts/smoke.sh https://<dominio>}"
BASE="${BASE%/}"
EMAIL="${SMOKE_EMAIL:?Falta SMOKE_EMAIL}"
PASSWORD="${SMOKE_PASSWORD:?Falta SMOKE_PASSWORD}"
TODAY="$(TZ=America/Lima date +%F)"
SESSION_ID=""
CHECKIN_ID=""
HAD_CHECKIN=""

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; exit 1; }

# Llamada como cliente móvil (Bearer), sin cookies.
call() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" -H "Accept: application/json" -H "X-Client: mobile" -w '\n%{http_code}')
  [[ -n "${TOKEN:-}" ]] && args+=(-H "Authorization: Bearer $TOKEN")
  [[ -n "$body" ]] && args+=(-H "Content-Type: application/json" --data "$body")
  curl "${args[@]}" "$BASE$path"
}
status() { tail -n1 <<<"$1"; }
json() { sed '$d' <<<"$1"; }

cleanup() {
  [[ -n "$SESSION_ID" ]] && call POST "/api/sessions/$SESSION_ID/discard" >/dev/null 2>&1 && echo "  · sesión de prueba descartada"
  [[ -n "$CHECKIN_ID" && -z "$HAD_CHECKIN" ]] && call DELETE "/api/checkins/$CHECKIN_ID" >/dev/null 2>&1 && echo "  · check-in de prueba borrado"
  true
}
trap cleanup EXIT

echo "Smoke test → $BASE"

r=$(call GET /api/health)
[[ "$(status "$r")" == 200 && "$(json "$r" | jq -r '.ok and .db')" == true ]] || fail "health: $(json "$r")"
ok "health { ok: true, db: true }"

r=$(call POST /api/auth/login "$(jq -nc --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e,password:$p}')")
[[ "$(status "$r")" == 200 ]] || fail "login: $(json "$r" | jq -c .error)"
TOKEN="$(json "$r" | jq -r .token)"
ok "login (Bearer)"

# Si quedó una sesión en curso de otra corrida, descartarla.
r=$(call GET /api/sessions/active)
prev="$(json "$r" | jq -r '.session.id // empty')"
[[ -n "$prev" ]] && call POST "/api/sessions/$prev/discard" >/dev/null && echo "  · sesión previa en curso descartada"

r=$(call GET "/api/program/today?date=$TODAY")
[[ "$(status "$r")" == 200 ]] || fail "program/today"
ROUTINE_ID="$(json "$r" | jq -r '.routines[] | select(.key=="A") | .id')"
EX="$(json "$r" | jq -r '.routines[] | select(.key=="A") | .exercises[0].exerciseId')"
ok "program/today (semana $(json "$r" | jq -r .position.week), toca $(json "$r" | jq -r '.position.routineKey // "descanso"'))"

r=$(call POST /api/sessions "$(jq -nc --arg r "$ROUTINE_ID" --arg d "$TODAY" '{routineId:$r,date:$d}')")
[[ "$(status "$r")" == 201 ]] || fail "crear sesión: $(json "$r" | jq -c .error)"
SESSION_ID="$(json "$r" | jq -r .id)"
ok "sesión creada"

c1=$(uuidgen | tr 'A-Z' 'a-z'); c2=$(uuidgen | tr 'A-Z' 'a-z')
body=$(jq -nc --arg ex "$EX" --arg c1 "$c1" --arg c2 "$c2" \
  '{sets:[{clientId:$c1,exerciseId:$ex,kind:"work",setIndex:1,weightKg:40,reps:5},{clientId:$c2,exerciseId:$ex,kind:"work",setIndex:2,weightKg:35,reps:7}]}')
r=$(call POST "/api/sessions/$SESSION_ID/sets" "$body")
[[ "$(status "$r")" == 200 && "$(json "$r" | jq '.sets | length')" == 2 ]] || fail "series: $(json "$r")"
r=$(call POST "/api/sessions/$SESSION_ID/sets" "$body")
[[ "$(json "$r" | jq '.sets | length')" == 2 ]] || fail "reintento idempotente"
ok "2 series (y reintento idempotente)"

r=$(call POST "/api/sessions/$SESSION_ID/finish")
[[ "$(status "$r")" == 200 ]] || fail "finish: $(json "$r" | jq -c .error)"
ok "finish: $(json "$r" | jq -r '"\(.setsCount) series · \(.volumeKg) kg de volumen"')"

r=$(call GET /api/checkins)
HAD_CHECKIN="$(json "$r" | jq -r --arg d "$TODAY" '.checkins[] | select(.measuredOn==$d) | .id')"
if [[ -n "$HAD_CHECKIN" ]]; then
  ok "check-in: ya hay uno de hoy, no se toca"
else
  r=$(call POST /api/checkins "$(jq -nc --arg d "$TODAY" '{measuredOn:$d,weightKg:99.9,bodyFatPct:25}')")
  [[ "$(status "$r")" == 201 ]] || fail "check-in: $(json "$r" | jq -c .error)"
  CHECKIN_ID="$(json "$r" | jq -r .checkin.id)"
  ok "check-in"
fi

r=$(call GET /api/stats/overview)
[[ "$(status "$r")" == 200 ]] || fail "stats/overview"
ok "stats/overview (entrenos: $(json "$r" | jq -r '"\(.sessions.done)/\(.sessions.planned)"'))"

r=$(curl -sS -o /dev/null -w '%{http_code} %{content_type}' "$BASE/progreso")
[[ "$r" == 200\ text/html* ]] || fail "web /progreso → $r"
ok "web sirve la SPA (/progreso → index.html)"

echo "Todo OK"
