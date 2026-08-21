#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-6ec58af7-91e9-4c25-870}"
ZONE="${ZONE:-europe-west1-b}"
VM_NAME="${VM_NAME:-ued-prod-01}"
SECRET_NAME="${SECRET_NAME:-ued-production-env}"

test -f .env || { echo '.env is required locally to preserve the configured administrator identity.' >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo 'Commit the deployment source before deploying.' >&2; exit 1; }

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
ARCHIVE="$TEMP_DIR/up-eye-dawn.tgz"
ENV_FILE="$TEMP_DIR/app.env"

git archive --format=tar.gz --output="$ARCHIVE" HEAD
node scripts/gcp/create-production-env.mjs "$ENV_FILE"

gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud secrets create "$SECRET_NAME" --project="$PROJECT_ID" --replication-policy=automatic
gcloud secrets versions add "$SECRET_NAME" --project="$PROJECT_ID" --data-file="$ENV_FILE" >/dev/null

gcloud compute scp "$ARCHIVE" "$ENV_FILE" "$VM_NAME:/tmp/" --zone="$ZONE" --project="$PROJECT_ID" --tunnel-through-iap
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --tunnel-through-iap --command="sudo bash -s" <<'REMOTE'
set -euo pipefail
release="/opt/up-eye-dawn/releases/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 0755 "$release"
tar -xzf /tmp/up-eye-dawn.tgz -C "$release"
rm -rf /opt/up-eye-dawn/current
ln -s "$release" /opt/up-eye-dawn/current
install -m 0600 /tmp/app.env /etc/up-eye-dawn/app.env
rm -f /tmp/up-eye-dawn.tgz /tmp/app.env
systemctl daemon-reload
systemctl enable --now up-eye-dawn.service
systemctl restart up-eye-dawn.service
/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f /opt/up-eye-dawn/current/infra/production/compose.yaml ps
curl --fail --silent http://127.0.0.1:8088/healthz
REMOTE
