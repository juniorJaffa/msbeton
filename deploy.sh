#!/bin/bash
set -e
cd /var/www/msbeton

echo "==> Git pull..."
git fetch origin main
git reset --hard origin/main

echo "==> Inštalácia závislostí..."
pnpm install --frozen-lockfile

echo "==> Build API servera..."
pnpm --filter @workspace/api-server run build

echo "==> Build frontendu..."
PORT=3001 BASE_PATH=/ pnpm --filter @workspace/web run build
# Skopírovanie videa z public/ do dist/ (LFS súbor, vite ho nekopíruje)
mkdir -p artifacts/web/dist/public/videos
cp artifacts/web/public/videos/hero-video.mp4 artifacts/web/dist/public/videos/hero-video.mp4

echo "==> DB migrácia..."
set -a
source /var/www/msbeton/artifacts/api-server/.env
set +a
pnpm --filter @workspace/db run push

echo "==> Reštart API servera..."
pm2 restart msbeton-api

echo "==> Aktualizácia Nginx konfigurácie..."
cp /var/www/msbeton/nginx/msbeton.conf /etc/nginx/sites-available/msbeton
nginx -t && systemctl reload nginx

echo "==> Deploy hotový!"
pm2 status
