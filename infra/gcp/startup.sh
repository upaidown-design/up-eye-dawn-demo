#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl docker.io jq

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin || apt-get install -y docker-compose
fi

cat >/usr/local/bin/ued-compose <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
if docker compose version >/dev/null 2>&1; then
  exec docker compose "$@"
fi
exec docker-compose "$@"
WRAPPER
chmod 0755 /usr/local/bin/ued-compose

systemctl enable --now docker
install -d -m 0755 /opt/up-eye-dawn/releases /opt/up-eye-dawn/current
install -d -m 0700 /etc/up-eye-dawn

cat >/etc/systemd/system/up-eye-dawn.service <<'UNIT'
[Unit]
Description=UP-EYE-DAWN production stack
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/up-eye-dawn/current
ExecStart=/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml up -d --build --remove-orphans
ExecStop=/usr/local/bin/ued-compose --env-file /etc/up-eye-dawn/app.env -f infra/production/compose.yaml down
TimeoutStartSec=1800
TimeoutStopSec=180

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
