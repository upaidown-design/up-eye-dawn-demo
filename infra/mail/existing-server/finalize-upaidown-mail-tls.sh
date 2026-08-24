#!/usr/bin/env bash
set -euo pipefail

EXPECTED_IP="82.223.44.126"
CERT_NAME="mail.upaidown.com"
CERT_ROOT="/etc/letsencrypt/live/${CERT_NAME}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/root/backups/mail-upaidown-tls-${STAMP}"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root." >&2
  exit 1
fi

for name in mail.upaidown.com webmail.upaidown.com mta-sts.upaidown.com; do
  resolved="$(getent ahostsv4 "${name}" | awk 'NR==1{print $1}')"
  if [[ "${resolved}" != "${EXPECTED_IP}" ]]; then
    echo "Refusing TLS issuance: ${name} resolves to ${resolved:-nothing}, expected ${EXPECTED_IP}." >&2
    exit 1
  fi
done

install -d -m 0700 "${BACKUP_DIR}"
tar -C / -czf "${BACKUP_DIR}/before-tls.tar.gz" \
  etc/postfix etc/dovecot etc/nginx/sites-available etc/nginx/sites-enabled etc/letsencrypt/renewal-hooks 2>/dev/null || true
sha256sum "${BACKUP_DIR}/before-tls.tar.gz" > "${BACKUP_DIR}/SHA256SUMS"
chmod 0600 "${BACKUP_DIR}/before-tls.tar.gz" "${BACKUP_DIR}/SHA256SUMS"

certbot certonly --nginx --non-interactive --agree-tos \
  --email upaidown@gmail.com --cert-name "${CERT_NAME}" \
  -d mail.upaidown.com -d webmail.upaidown.com
certbot certonly --nginx --non-interactive --agree-tos \
  --email upaidown@gmail.com --cert-name mta-sts.upaidown.com \
  -d mta-sts.upaidown.com

chmod 0755 /var/www/mta-sts /var/www/mta-sts/.well-known
chmod 0644 /var/www/mta-sts/.well-known/mta-sts.txt

cat > /etc/nginx/sites-available/webmail-upaidown <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name webmail.upaidown.com mail.upaidown.com;
    return 301 https://webmail.upaidown.com$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name webmail.upaidown.com mail.upaidown.com;
    ssl_certificate /etc/letsencrypt/live/mail.upaidown.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.upaidown.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    root /var/www/webmail/public_html;
    index index.php index.html;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    client_max_body_size 25M;
    location / { try_files $uri $uri/ /index.php?$args; }
    location ~ [^/]\.php(/|$) {
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.5-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_intercept_errors on;
    }
    location ~ /\. { deny all; }
    location ~ ^/(config|temp|logs|db|SQL|bin)/ { deny all; }
    access_log /var/log/nginx/webmail-upaidown.access.log;
    error_log /var/log/nginx/webmail-upaidown.error.log;
}
NGINX

cat > /etc/nginx/sites-available/mta-sts-upaidown <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name mta-sts.upaidown.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name mta-sts.upaidown.com;
    ssl_certificate /etc/letsencrypt/live/mta-sts.upaidown.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mta-sts.upaidown.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    root /var/www/mta-sts;
    default_type text/plain;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    location = /.well-known/mta-sts.txt { try_files $uri =404; }
    location / { return 404; }
}
NGINX

install -d -m 0700 /etc/postfix/tls
cat "${CERT_ROOT}/privkey.pem" "${CERT_ROOT}/fullchain.pem" > /etc/postfix/tls/upaidown.pem
chmod 0600 /etc/postfix/tls/upaidown.pem
printf '%s\t%s\n' "mail.upaidown.com" "/etc/postfix/tls/upaidown.pem" > /etc/postfix/tls_sni
postmap -F hash:/etc/postfix/tls_sni
postconf -e 'tls_server_sni_maps = hash:/etc/postfix/tls_sni'

cat > /etc/dovecot/conf.d/99-upaidown-sni.conf <<'DOVECOT'
local_name mail.upaidown.com {
  ssl_server_cert_file = /etc/letsencrypt/live/mail.upaidown.com/fullchain.pem
  ssl_server_key_file = /etc/letsencrypt/live/mail.upaidown.com/privkey.pem
}
DOVECOT

install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/upaidown-mail-services <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
cert_root=/etc/letsencrypt/live/mail.upaidown.com
if [[ -s "${cert_root}/privkey.pem" && -s "${cert_root}/fullchain.pem" ]]; then
  cat "${cert_root}/privkey.pem" "${cert_root}/fullchain.pem" > /etc/postfix/tls/upaidown.pem
  chmod 0600 /etc/postfix/tls/upaidown.pem
  postmap -F hash:/etc/postfix/tls_sni
  postfix reload
  systemctl reload dovecot
fi
nginx -t && systemctl reload nginx
HOOK
chmod 0700 /etc/letsencrypt/renewal-hooks/deploy/upaidown-mail-services

postfix check
doveconf -n >/dev/null
nginx -t
postfix reload
systemctl reload dovecot
systemctl reload nginx

echo "TLS commissioned for SMTP, IMAP, webmail and MTA-STS."
echo "Rollback archive: ${BACKUP_DIR}/before-tls.tar.gz"
