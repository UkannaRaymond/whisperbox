#!/usr/bin/env bash
# Deploy script for platforms that run a single build/deploy command
# against this repo directly (Railway, Render, Fly.io, a bare VM) rather
# than driving docker-compose.yml. For a docker-compose deployment, the
# `migrate` service in docker-compose.yml already handles the migration
# step — you don't need this script there.
#
# Usage: scripts/deploy.sh
# Required env: DATABASE_URL (see .env.example for the full list this
# app needs at runtime — config/env.ts validates all of them at boot,
# so a misconfigured deploy fails here or immediately on server start,
# not silently later).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Generating Prisma client"
pnpm exec prisma generate

echo "==> Applying database migrations"
pnpm exec prisma migrate deploy

echo "==> Building production bundle"
pnpm run build

echo "==> Deploy build complete. Start with: pnpm run start"
