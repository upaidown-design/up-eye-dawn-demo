#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
project=project-6ec58af7-91e9-4c25-870
zone=europe-west1-b
vm=ued-prod-01
cd "$repo/apps/field-cinema"
pnpm test
pnpm build
python3 - "$PWD/dist" <<'PY'
import sys,tarfile
with tarfile.open('/tmp/upaidown-field-cinema-gcp.tgz','w:gz') as archive:
 archive.add(sys.argv[1],arcname='.')
PY
gcloud compute scp /tmp/upaidown-field-cinema-gcp.tgz "$repo/scripts/gcp/deploy-field-cinema-remote.sh" "$vm:/tmp/" --zone="$zone" --project="$project" --tunnel-through-iap
gcloud compute ssh "$vm" --zone="$zone" --project="$project" --tunnel-through-iap --command='sudo bash /tmp/deploy-field-cinema-remote.sh'
curl --fail --silent --show-error https://upaidown.com/field-cinema/ >/dev/null
printf '%s\n' 'Published: https://upaidown.com/field-cinema/'
