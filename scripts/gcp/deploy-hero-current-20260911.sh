set -eu
app=/opt/up-eye-dawn/current
backup=/opt/up-eye-dawn/backups/hero-20260911
mkdir -p "$backup"
cp "$app/apps/web/src/public-home.tsx" "$backup/public-home.tsx"
cp "$app/apps/web/src/public-home.css" "$backup/public-home.css"
docker image inspect production_gateway --format '{{.Id}}' > "$backup/previous-gateway"
cp /tmp/public-home.tsx "$app/apps/web/src/public-home.tsx"
cp /tmp/public-home.css "$app/apps/web/src/public-home.css"
cp /tmp/hero-current-20260911.jpg "$app/apps/web/public/assets/cinema/hero-current-20260911.jpg"
cd "$app"
docker build -f infra/docker/gateway.Dockerfile -t production_gateway:hero-current-20260911 . > /tmp/upaidown-hero-build.log 2>&1
rollback(){
 code=$?
 if [ "$code" -ne 0 ]; then
 docker tag "$(cat "$backup/previous-gateway")" production_gateway
 cp "$backup/public-home.tsx" "$app/apps/web/src/public-home.tsx"
 cp "$backup/public-home.css" "$app/apps/web/src/public-home.css"
 /usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway || true
 fi
 exit "$code"
}
trap rollback EXIT
docker tag production_gateway:hero-current-20260911 production_gateway
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway
for i in $(seq 1 20);do
 if docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/healthz;then break;fi
 sleep 1
done
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/demo/assets/cinema/hero-current-20260911.jpg
docker exec production_gateway_1 nginx -t
echo 'Current Cinema hero published'
