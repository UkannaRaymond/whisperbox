#!/usr/bin/env bash
# Builds and starts the full docker-compose stack (app + postgres +
# redis), running migrations first via the `migrate` one-off service
# (see docker-compose.yml). Idempotent — safe to re-run.
#
# Usage: scripts/docker-deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "==> No .env found — copying .env.example. Fill in real secrets before deploying to production." >&2
  cp .env.example .env
fi

echo "==> Building images"
docker compose build

echo "==> Starting postgres + redis"
docker compose up -d postgres redis

echo "==> Running database migrations"
docker compose run --rm migrate

echo "==> Starting app"
docker compose up -d app

echo "==> Deployed. Tailing logs (Ctrl+C to stop watching, app keeps running):"
docker compose logs -f app
