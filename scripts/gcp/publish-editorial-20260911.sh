#!/bin/sh
set -eu
app=/opt/up-eye-dawn/current
backup=/opt/up-eye-dawn/backups/editorial-20260911
cd "$app"
rollback(){
 code=$?
 if [ "$code" -ne 0 ]; then
  docker tag "$(cat "$backup/previous-gateway")" production_gateway
  /usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway || true
 fi
 exit "$code"
}
trap rollback EXIT
docker tag production_gateway:editorial-20260911 production_gateway
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway
ready=0
for i in $(seq 1 20); do
 if docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/healthz; then ready=1; break; fi
 sleep 1
done
[ "$ready" = 1 ]
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/demo/assets/editorial-20260911/field-hero.webp
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/demo/assets/editorial-20260911/informe-M001.html
docker exec production_gateway_1 nginx -t
echo 'Editorial website published.'
