#!/bin/bash
set -e

echo "=== MS-BETON deploy ==="

# 1. Stiahni zmeny vrátane LFS súborov (video)
git pull origin main
git lfs pull

# 2. Inštalácia závislostí (len ak sa zmenili)
pnpm install --frozen-lockfile

# 3. Build frontendu
pnpm --filter @workspace/web run build

# 4. Build API servera
pnpm --filter @workspace/api-server run build

# 5. Skopíruj video do dist/ ak tam ešte nie je
VIDEO_SRC="artifacts/web/public/videos/hero-video.mp4"
VIDEO_DST="artifacts/web/dist/videos/hero-video.mp4"

if [ -f "$VIDEO_SRC" ] && [ ! -f "$VIDEO_DST" ]; then
  mkdir -p "$(dirname "$VIDEO_DST")"
  cp "$VIDEO_SRC" "$VIDEO_DST"
  echo "Video skopírované do dist/"
elif [ -f "$VIDEO_SRC" ] && [ "$VIDEO_SRC" -nt "$VIDEO_DST" ]; then
  cp "$VIDEO_SRC" "$VIDEO_DST"
  echo "Video aktualizované v dist/"
else
  echo "Video je aktuálne, preskakujem."
fi

# 6. Reštart API cez PM2
pm2 restart msbeton-api 2>/dev/null || pm2 start artifacts/api-server/dist/index.mjs --name msbeton-api

echo "=== Deploy dokončený ==="
