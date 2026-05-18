#!/usr/bin/env bash
# Spustí API server (port 3000) + Vite web (port 5173) paralelne
# Použitie: ./dev.sh

set -e

export DATABASE_URL="${DATABASE_URL:-postgresql://junior@localhost:5432/msbeton}"

echo "▶ API  → http://localhost:3000"
echo "▶ Web  → http://localhost:5173"
echo "(Ctrl+C ukončí oba)"
echo ""

trap 'kill 0' INT TERM

PORT=3000 DATABASE_URL="$DATABASE_URL" \
  pnpm --filter @workspace/api-server dev &

PORT=5173 BASE_PATH=/ \
  pnpm --filter @workspace/web dev &

wait
