#!/bin/sh
set -eu
app=/opt/up-eye-dawn/current
backup=/opt/up-eye-dawn/backups/editorial-20260911
cd "$app"
if [ -e "$backup/previous-gateway" ]; then echo 'Editorial backup already exists; refusing to replace it.'; exit 1; fi
mkdir -p "$backup"
cp apps/web/src/main.tsx "$backup/main.tsx"
cp apps/web/src/public-home.tsx "$backup/public-home.tsx"
cp apps/web/src/public-home.css "$backup/public-home.css"
cp apps/web/index.html "$backup/index.html"
docker image inspect production_gateway --format '{{.Id}}' > "$backup/previous-gateway"
if [ -f apps/web/src/internal-main.tsx ]; then cp apps/web/src/internal-main.tsx "$backup/internal-main.tsx"; fi
# Preserve the exact existing portal bootstrap, including its locale and responsive styles.
cp apps/web/src/main.tsx apps/web/src/internal-main.tsx
tar -xzf /tmp/upaidown-editorial-20260911.tar.gz -C "$app"
docker build -f infra/docker/gateway.Dockerfile -t production_gateway:editorial-20260911 . > /tmp/upaidown-editorial-build.log 2>&1
echo 'Editorial build ready; production image not switched.'
