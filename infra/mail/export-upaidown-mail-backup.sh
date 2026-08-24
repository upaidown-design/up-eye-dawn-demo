#!/usr/bin/env bash
set -euo pipefail

backup_root="/root/backups/mail-daily"
latest="$(find "${backup_root}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | tail -n 1)"
test -n "${latest}"
cd "${backup_root}/${latest}"
sha256sum --check --status SHA256SUMS
exec cat mail-and-config.tar.gz
