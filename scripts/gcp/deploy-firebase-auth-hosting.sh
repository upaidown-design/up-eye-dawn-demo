#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-6ec58af7-91e9-4c25-870}"
SITE_ID="${FIREBASE_HOSTING_SITE_ID:-$PROJECT_ID}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIR="$ROOT/infra/firebase-auth-hosting"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

ACCESS_TOKEN="$(gcloud auth print-access-token)"
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
QUOTA_HEADER="x-goog-user-project: $PROJECT_ID"
API="https://firebasehosting.googleapis.com/v1beta1/sites/$SITE_ID"

gzip -c "$SOURCE_DIR/index.html" > "$TEMP_DIR/index.html.gz"
gzip -c "$ROOT/apps/web/public/favicon.svg" > "$TEMP_DIR/favicon.svg.gz"
INDEX_HASH="$(shasum -a 256 "$TEMP_DIR/index.html.gz" | awk '{print $1}')"
FAVICON_HASH="$(shasum -a 256 "$TEMP_DIR/favicon.svg.gz" | awk '{print $1}')"

VERSION_NAME="$(curl -fsS -X POST \
  -H "$AUTH_HEADER" -H "$QUOTA_HEADER" -H 'Content-Type: application/json' \
  "$API/versions" \
  --data-binary '{"config":{"headers":[{"glob":"**","headers":{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}}]}}' \
  | jq -r '.name')"

POPULATE="$(jq -n --arg index "$INDEX_HASH" --arg favicon "$FAVICON_HASH" \
  '{files:{"/index.html":$index,"/favicon.svg":$favicon,"/favicon.ico":$favicon}}' \
  | curl -fsS -X POST -H "$AUTH_HEADER" -H "$QUOTA_HEADER" \
      -H 'Content-Type: application/json' \
      "$API/versions/${VERSION_NAME##*/}:populateFiles" --data-binary @-)"
UPLOAD_URL="$(jq -r '.uploadUrl' <<<"$POPULATE")"

for HASH in $(jq -r '.uploadRequiredHashes[]?' <<<"$POPULATE"); do
  if [[ "$HASH" == "$INDEX_HASH" ]]; then FILE="$TEMP_DIR/index.html.gz"; else FILE="$TEMP_DIR/favicon.svg.gz"; fi
  curl -fsS -X POST -H "$AUTH_HEADER" -H "$QUOTA_HEADER" \
    -H 'Content-Type: application/octet-stream' --data-binary "@$FILE" \
    "$UPLOAD_URL/$HASH" >/dev/null
done

curl -fsS -X PATCH -H "$AUTH_HEADER" -H "$QUOTA_HEADER" \
  -H 'Content-Type: application/json' \
  "$API/versions/${VERSION_NAME##*/}?update_mask=status" \
  --data-binary '{"status":"FINALIZED"}' >/dev/null
curl -fsS -X POST -H "$AUTH_HEADER" -H "$QUOTA_HEADER" \
  "$API/releases?versionName=$VERSION_NAME" >/dev/null

curl -fsS "https://$SITE_ID.firebaseapp.com/__/firebase/init.json" >/dev/null
curl -fsS "https://$SITE_ID.firebaseapp.com/favicon.svg" >/dev/null
curl -fsS "https://$SITE_ID.firebaseapp.com/favicon.ico" >/dev/null
printf 'Firebase authentication hosting deployed: %s\n' "$VERSION_NAME"
