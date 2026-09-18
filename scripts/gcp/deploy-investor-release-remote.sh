set -eu
root=/opt/up-eye-dawn
stamp=$(date -u +%Y%m%dT%H%M%SZ)
release="$root/field-cinema/releases/$stamp"
backup="$root/field-cinema/backups/$stamp"
mkdir -p "$release" "$backup"
readlink "$root/field-cinema/current" > "$backup/previous-link"
docker image inspect production_gateway --format '{{.Id}}' > "$backup/previous-gateway"
tar -xzf /tmp/upaidown-investor-release.tgz -C "$release"
test -s "$release/index.html"
test -s "$release/media/UPAIDOWN-mision-completa.mp4"
test -s "$release/media/previews/soil.mp4"
chmod -R a+rX "$release"
rollback(){
 code=$?
 if [ "$code" -ne 0 ]; then
  ln -sfn "$(cat "$backup/previous-link")" "$root/field-cinema/current"
  docker tag "$(cat "$backup/previous-gateway")" production_gateway
  cd "$root/current"
  /usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway || true
  echo "Restored previous release after failed deployment" >&2
 fi
 exit "$code"
}
trap rollback EXIT
ln -s "releases/$stamp" "$root/field-cinema/current.next"
mv -Tf "$root/field-cinema/current.next" "$root/field-cinema/current"
docker tag production_gateway:investor-20260911 production_gateway
cd "$root/current"
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps gateway
for i in $(seq 1 20); do
 if docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/healthz; then break; fi
 sleep 1
done
docker exec production_gateway_1 nginx -t
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/field-cinema/
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/field-cinema/media/previews/soil.mp4
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/demo/
echo "PUBLISHED=$release"
echo "BACKUP=$backup"
