#!/bin/bash
# Spustí API server + web dev server paralelne
# Použitie: ./dev.sh
# Zastaviť: Ctrl+C

REPO="$(cd "$(dirname "$0")" && pwd)"
API_LOG=/tmp/msbeton-api.log
WEB_LOG=/tmp/msbeton-web.log

cleanup() {
  echo ""
  echo "Zastavujem servery..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

cd "$REPO"

echo "▶ Spúšťam API server (port 3000)..."
PORT=3000 DATABASE_URL="postgresql://junior@localhost:5432/msbeton" \
  pnpm --filter @workspace/api-server dev > "$API_LOG" 2>&1 &
API_PID=$!

echo "▶ Spúšťam Web dev server (port 5173)..."
PORT=5173 BASE_PATH=/ \
  pnpm --filter @workspace/web dev > "$WEB_LOG" 2>&1 &
WEB_PID=$!

echo ""
echo "  API:  http://localhost:3000/api/healthz  (log: $API_LOG)"
echo "  Web:  http://localhost:5173              (log: $WEB_LOG)"
echo ""
echo "Ctrl+C zastaví oba servery."
echo ""

# Stream logov do terminálu
tail -f "$API_LOG" "$WEB_LOG" &
TAIL_PID=$!

wait "$API_PID" "$WEB_PID"
kill "$TAIL_PID" 2>/dev/null
