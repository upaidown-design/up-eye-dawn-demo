#!/usr/bin/env bash
set -euo pipefail
umask 077

bucket="gs://project-6ec58af7-91e9-4c25-870-ued-backups"
secret="ued-database-backup-encryption-key"
state_dir="/var/lib/upaidown-database-offsite-backup"
source_container="production_postgres_1"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
day_path="$(date -u +%Y/%m/%d)"
restore_database="ued_restore_${stamp,,}"
work="$(mktemp -d "${state_dir}/run.XXXXXX")"
cleanup() {
  docker exec -e RESTORE_DATABASE="${restore_database}" "${source_container}" sh -ec 'dropdb --if-exists -U "$POSTGRES_USER" "$RESTORE_DATABASE"' >/dev/null 2>&1 || true
  docker exec "${source_container}" sh -ec 'test ! -e /tmp/upaidown-restore.dump || unlink /tmp/upaidown-restore.dump' >/dev/null 2>&1 || true
  find "${work}" -type f -delete 2>/dev/null || true
  rmdir "${work}" 2>/dev/null || true
}
trap cleanup EXIT

install -d -m 0700 "${state_dir}"
docker exec "${source_container}" sh -ec 'pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" "$POSTGRES_DB"' > "${work}/portal.dump"
pg_size="$(stat -c %s "${work}/portal.dump")"
test "${pg_size}" -gt 1024

gcloud secrets versions access latest --secret="${secret}" > "${work}/encryption-key"
openssl enc -aes-256-cbc -pbkdf2 -iter 250000 -salt \
  -in "${work}/portal.dump" \
  -out "${work}/upaidown-database-${stamp}.dump.enc" \
  -pass "file:${work}/encryption-key"
sha256sum "${work}/upaidown-database-${stamp}.dump.enc" > "${work}/upaidown-database-${stamp}.sha256"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in "${work}/upaidown-database-${stamp}.dump.enc" \
  -out "${work}/restored.dump" \
  -pass "file:${work}/encryption-key"
cmp --silent "${work}/portal.dump" "${work}/restored.dump"

docker exec -e RESTORE_DATABASE="${restore_database}" "${source_container}" sh -ec 'createdb -U "$POSTGRES_USER" "$RESTORE_DATABASE"'
docker cp "${work}/restored.dump" "${source_container}:/tmp/upaidown-restore.dump"
docker exec -e RESTORE_DATABASE="${restore_database}" "${source_container}" sh -ec 'pg_restore -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" --no-owner --no-acl /tmp/upaidown-restore.dump'
table_count="$(docker exec -e RESTORE_DATABASE="${restore_database}" "${source_container}" sh -ec 'psql -U "$POSTGRES_USER" -d "$RESTORE_DATABASE" -Atc "select count(*) from information_schema.tables where table_schema='\''private_portal'\''"')"
test "${table_count}" -gt 10
docker exec -e RESTORE_DATABASE="${restore_database}" "${source_container}" sh -ec 'dropdb -U "$POSTGRES_USER" "$RESTORE_DATABASE"; unlink /tmp/upaidown-restore.dump'

gcloud storage cp \
  "${work}/upaidown-database-${stamp}.dump.enc" \
  "${work}/upaidown-database-${stamp}.sha256" \
  "${bucket}/database/${day_path}/"
logger -t upaidown-database-offsite-backup "Encrypted database backup uploaded and isolated restore passed: ${stamp}; tables=${table_count}"
