#!/usr/bin/env bash
set -euo pipefail
root=/opt/up-eye-dawn
app="$root/current"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
release="$root/field-cinema/releases/$stamp"
backup="$root/field-cinema/backups/$stamp"
install -d -m 0755 "$release"
install -d -m 0700 "$backup"
cp "$app/infra/production/compose.yaml" "$backup/compose.yaml"
cp "$app/infra/production/nginx.conf" "$backup/nginx.conf"
readlink "$root/field-cinema/current" > "$backup/previous-link" || true
tar -xzf /tmp/upaidown-field-cinema-gcp.tgz -C "$release"
test -s "$release/index.html"
test -s "$release/models/rover.glb"
chmod -R a+rX "$release"
python3 - "$app" "$backup" <<'PY'
from pathlib import Path
import sys
app,backup=map(Path,sys.argv[1:])
p=app/'infra/production/compose.yaml'
s=p.read_text();mount='      - /opt/up-eye-dawn/field-cinema:/srv/field-cinema:ro'
needle='      - ./nginx.conf:/etc/nginx/nginx.conf:ro'
assert s.count(needle)==1
if mount not in s:s=s.replace(needle,needle+'\n'+mount)
(backup/'compose.next.yaml').write_text(s)
p=app/'infra/production/nginx.conf';s=p.read_text()
if 'location ^~ /field-cinema/' not in s:
 needle='    location = /healthz {'
 assert s.count(needle)==1
 block='''    location = /field-cinema { return 308 /field-cinema/; }
    location ^~ /field-cinema/ {
      alias /srv/field-cinema/current/;
      index index.html;
    }

'''
 s=s.replace(needle,block+needle)
(backup/'nginx.next.conf').write_text(s)
PY
# Validate against the existing gateway before changing its configuration.
docker cp "$backup/nginx.next.conf" production_gateway_1:/tmp/field-cinema-nginx.conf
docker exec production_gateway_1 nginx -t -c /tmp/field-cinema-nginx.conf
rollback() {
 code=$?
 if [ "$code" -ne 0 ]; then
  cp "$backup/compose.yaml" "$app/infra/production/compose.yaml"
  cp "$backup/nginx.conf" "$app/infra/production/nginx.conf"
  previous=$(cat "$backup/previous-link")
  if [ -n "$previous" ]; then ln -sfn "$previous" "$root/field-cinema/current"; fi
  cd "$app"
  /usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps --force-recreate gateway || true
  echo "Deployment failed; gateway configuration restored from $backup" >&2
 fi
 exit "$code"
}
trap rollback EXIT
cp "$backup/compose.next.yaml" "$app/infra/production/compose.yaml"
cp "$backup/nginx.next.conf" "$app/infra/production/nginx.conf"
ln -s "releases/$stamp" "$root/field-cinema/current.next"
mv -Tf "$root/field-cinema/current.next" "$root/field-cinema/current"
cd "$app"
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml config >/dev/null
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --no-deps --force-recreate gateway
for attempt in $(seq 1 20); do
 if docker exec production_gateway_1 wget -qO /tmp/field-cinema-check.html http://127.0.0.1:8088/field-cinema/ && docker exec production_gateway_1 grep -q 'Field Cinema' /tmp/field-cinema-check.html; then break; fi
 sleep 2
done
docker exec production_gateway_1 wget -qO- http://127.0.0.1:8088/healthz
docker exec production_gateway_1 grep -q 'Field Cinema' /tmp/field-cinema-check.html
docker exec production_gateway_1 wget -qO /dev/null http://127.0.0.1:8088/field-cinema/models/rover.glb
echo "Published $release; backup $backup"
