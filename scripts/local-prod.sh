#!/usr/bin/env bash
# Run the production stack locally on http://localhost:8080.
#   ./scripts/local-prod.sh up      build and start (first run generates .env.prod.local)
#   ./scripts/local-prod.sh down    stop (data is kept)
#   ./scripts/local-prod.sh logs    follow backend + worker logs
#   ./scripts/local-prod.sh ps      status
#   ./scripts/local-prod.sh reset   stop and DELETE the local production data
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL_ENV=.env.prod.local
[ -f .env ] || { echo "Create .env first (see .env.example): GOOGLE_CLIENT_ID, JWT_SECRET, an AI key"; exit 1; }

if [ ! -f "$LOCAL_ENV" ]; then
  echo "Generating $LOCAL_ENV (local-only secrets, git-ignored)"
  cat > "$LOCAL_ENV" <<VARS
DOMAIN=localhost
POSTGRES_PASSWORD=$(openssl rand -hex 16)
S3_ACCESS_KEY=$(openssl rand -hex 12)
S3_SECRET_KEY=$(openssl rand -hex 24)
VARS
fi

compose() {
  # .env holds your keys; $LOCAL_ENV adds the production-only values. Own project name and volumes,
  # so it never touches the dev stack (docker-compose.yml).
  docker compose -p unbound-local --env-file .env --env-file "$LOCAL_ENV" \
    -f docker-compose.prod.yml -f docker-compose.local.yml "$@"
}

case "${1:-up}" in
  up)
    compose up -d --build
    echo
    echo "Unbound is starting on http://localhost:${LOCAL_PORT:-8080}"
    echo "Google sign-in needs http://localhost:${LOCAL_PORT:-8080} in the OAuth client's authorised JavaScript origins."
    ;;
  down) compose down ;;
  logs) compose logs -f backend worker ;;
  ps) compose ps ;;
  reset)
    read -r -p "Delete all local production data (database, uploads)? [y/N] " ok
    [ "$ok" = "y" ] && compose down -v
    ;;
  *) echo "usage: $0 up|down|logs|ps|reset"; exit 1 ;;
esac
