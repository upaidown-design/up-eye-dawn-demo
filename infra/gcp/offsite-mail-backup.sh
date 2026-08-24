#!/usr/bin/env bash
set -euo pipefail
umask 077

bucket="gs://project-6ec58af7-91e9-4c25-870-ued-backups"
secret="ued-mail-backup-encryption-key"
state_dir="/var/lib/upaidown-mail-offsite-backup"
key_file="${state_dir}/id_ed25519"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
day_path="$(date -u +%Y/%m/%d)"
work="$(mktemp -d "${state_dir}/run.XXXXXX")"
trap 'rm -rf -- "${work}"' EXIT

install -d -m 0700 "${state_dir}"
ssh -i "${key_file}" -p 2244 \
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o UpdateHostKeys=no -o UserKnownHostsFile=/root/.ssh/known_hosts \
  root@82.223.44.126 > "${work}/mail-and-config.tar.gz"

tar -tzf "${work}/mail-and-config.tar.gz" >/dev/null
gcloud secrets versions access latest --secret="${secret}" > "${work}/encryption-key"
openssl enc -aes-256-cbc -pbkdf2 -iter 250000 -salt \
  -in "${work}/mail-and-config.tar.gz" \
  -out "${work}/upaidown-mail-${stamp}.tar.gz.enc" \
  -pass "file:${work}/encryption-key"
sha256sum "${work}/upaidown-mail-${stamp}.tar.gz.enc" > "${work}/upaidown-mail-${stamp}.sha256"

# A non-destructive restore drill is part of every run.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in "${work}/upaidown-mail-${stamp}.tar.gz.enc" \
  -out "${work}/restored.tar.gz" \
  -pass "file:${work}/encryption-key"
cmp --silent "${work}/mail-and-config.tar.gz" "${work}/restored.tar.gz"
tar -tzf "${work}/restored.tar.gz" > "${work}/restore-contents"
grep -q '^etc/postfix/' "${work}/restore-contents"
grep -q '^etc/dovecot/' "${work}/restore-contents"
grep -q '^var/mail/vhosts/' "${work}/restore-contents"

gcloud storage cp \
  "${work}/upaidown-mail-${stamp}.tar.gz.enc" \
  "${work}/upaidown-mail-${stamp}.sha256" \
  "${bucket}/mail/${day_path}/"
logger -t upaidown-mail-offsite-backup "Encrypted backup uploaded and restore drill passed: ${stamp}"
