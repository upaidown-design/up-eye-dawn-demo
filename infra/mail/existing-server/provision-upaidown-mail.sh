#!/usr/bin/env bash
set -euo pipefail

DOMAIN="upaidown.com"
MAILBOX="investors@${DOMAIN}"
MAIL_ROOT="/var/mail/vhosts/${DOMAIN}/investors"
SECRET_DIR="/root/.secrets"
SECRET_FILE="${SECRET_DIR}/upaidown-mail.env"
BACKUP_ROOT="/root/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/mail-upaidown-change-${STAMP}"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root." >&2
  exit 1
fi

install -d -m 0700 "${BACKUP_DIR}"
tar -C / -czf "${BACKUP_DIR}/before-change.tar.gz" \
  etc/postfix etc/dovecot etc/opendkim etc/nginx/sites-available \
  etc/nginx/sites-enabled etc/fail2ban var/www/webmail/config var/mail/vhosts
sha256sum "${BACKUP_DIR}/before-change.tar.gz" > "${BACKUP_DIR}/SHA256SUMS"
chmod 0600 "${BACKUP_DIR}/before-change.tar.gz" "${BACKUP_DIR}/SHA256SUMS"

install -d -m 0700 "${SECRET_DIR}"
if [[ ! -s "${SECRET_FILE}" ]]; then
  umask 077
  printf 'MAILBOX_PASSWORD=%s\n' "$(openssl rand -base64 36 | tr -d '\n')" > "${SECRET_FILE}"
fi
chmod 0600 "${SECRET_FILE}"
# shellcheck disable=SC1090
source "${SECRET_FILE}"
if [[ ${#MAILBOX_PASSWORD} -lt 24 ]]; then
  echo "Generated mailbox password is unexpectedly short." >&2
  exit 1
fi

password_hash="$(doveadm pw -s SHA512-CRYPT -p "${MAILBOX_PASSWORD}")"
sed -i '\|^investors@upaidown\.com:|d' /etc/dovecot/users
printf '%s:%s\n' "${MAILBOX}" "${password_hash}" >> /etc/dovecot/users
chown root:dovecot /etc/dovecot/users
chmod 0640 /etc/dovecot/users

sed -i '\|^investors@upaidown\.com[[:space:]]|d' /etc/postfix/vmailbox
printf '%-34s %s\n' "${MAILBOX}" "${DOMAIN}/investors/" >> /etc/postfix/vmailbox

for alias in admin nda privacy legal support dmarc postmaster webmaster; do
  sed -i "\\|^${alias}@upaidown\\.com[[:space:]]|d" /etc/postfix/virtual
  printf '%-34s %s\n' "${alias}@${DOMAIN}" "${MAILBOX}" >> /etc/postfix/virtual
done
postmap /etc/postfix/vmailbox
postmap /etc/postfix/virtual

domains="$(postconf -h virtual_mailbox_domains)"
if [[ ",${domains// /}," != *",${DOMAIN},"* ]]; then
  postconf -e "virtual_mailbox_domains = ${domains}, ${DOMAIN}"
fi

install -d -o vmail -g vmail -m 0700 "/var/mail/vhosts/${DOMAIN}" "${MAIL_ROOT}"

key_dir="/etc/opendkim/keys/${DOMAIN}"
install -d -o opendkim -g opendkim -m 0700 "${key_dir}"
if [[ ! -s "${key_dir}/default.private" ]]; then
  opendkim-genkey -b 2048 -d "${DOMAIN}" -D "${key_dir}" -s default
fi
chown -R opendkim:opendkim "${key_dir}"
chmod 0600 "${key_dir}/default.private"
chmod 0644 "${key_dir}/default.txt"

grep -qF "default._domainkey.${DOMAIN} ${DOMAIN}:default:${key_dir}/default.private" /etc/opendkim/key.table || \
  printf '%s\n' "default._domainkey.${DOMAIN} ${DOMAIN}:default:${key_dir}/default.private" >> /etc/opendkim/key.table
grep -qF "*@${DOMAIN} default._domainkey.${DOMAIN}" /etc/opendkim/signing.table || \
  printf '%s\n' "*@${DOMAIN} default._domainkey.${DOMAIN}" >> /etc/opendkim/signing.table
grep -qxF "${DOMAIN}" /etc/opendkim/trusted.hosts || printf '%s\n' "${DOMAIN}" >> /etc/opendkim/trusted.hosts

cat > /etc/nginx/sites-available/webmail-upaidown <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name webmail.upaidown.com mail.upaidown.com;

    root /var/www/webmail/public_html;
    index index.php index.html;
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
ln -sfn /etc/nginx/sites-available/webmail-upaidown /etc/nginx/sites-enabled/webmail-upaidown

install -d -m 0755 /var/www/mta-sts /var/www/mta-sts/.well-known
cat > /var/www/mta-sts/.well-known/mta-sts.txt <<'POLICY'
version: STSv1
mode: testing
mx: mail.upaidown.com
max_age: 86400
POLICY
chmod 0644 /var/www/mta-sts/.well-known/mta-sts.txt
cat > /etc/nginx/sites-available/mta-sts-upaidown <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name mta-sts.upaidown.com;
    root /var/www/mta-sts;
    default_type text/plain;
    location = /.well-known/mta-sts.txt { try_files $uri =404; }
    location / { return 404; }
}
NGINX
ln -sfn /etc/nginx/sites-available/mta-sts-upaidown /etc/nginx/sites-enabled/mta-sts-upaidown

cat > /etc/fail2ban/jail.d/upaidown-mail.local <<'JAIL'
[postfix-sasl]
enabled = true
port = smtp,submission,465
filter = postfix[mode=auth]
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps,submission,465,sieve
filter = dovecot
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
JAIL

cat > /usr/local/sbin/backup-upaidown-mail <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
destination="/root/backups/mail-daily/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 0700 "${destination}"
tar -C / -czf "${destination}/mail-and-config.tar.gz" \
  var/mail/vhosts etc/postfix etc/dovecot etc/opendkim etc/nginx/sites-available \
  etc/nginx/sites-enabled etc/fail2ban/jail.d var/www/webmail/config
sha256sum "${destination}/mail-and-config.tar.gz" > "${destination}/SHA256SUMS"
chmod 0600 "${destination}/mail-and-config.tar.gz" "${destination}/SHA256SUMS"
find /root/backups/mail-daily -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf -- {} +
BACKUP
chmod 0700 /usr/local/sbin/backup-upaidown-mail
cat > /etc/cron.d/upaidown-mail-backup <<'CRON'
17 3 * * * root /usr/local/sbin/backup-upaidown-mail >/var/log/upaidown-mail-backup.log 2>&1
CRON
chmod 0644 /etc/cron.d/upaidown-mail-backup

postfix check
doveconf -n >/dev/null
opendkim -n -x /etc/opendkim.conf
nginx -t
fail2ban-client -t

systemctl reload postfix
systemctl reload dovecot
systemctl restart opendkim
systemctl reload nginx
systemctl restart fail2ban

dns_file="/root/upaidown-mail-dns.txt"
{
  echo "A mail.upaidown.com 82.223.44.126"
  echo "A webmail.upaidown.com 82.223.44.126"
  echo "A mta-sts.upaidown.com 82.223.44.126"
  echo "MX upaidown.com 10 mail.upaidown.com."
  echo "TXT upaidown.com v=spf1 ip4:82.223.44.126 include:spf.dondominio.com ~all"
  echo "TXT _dmarc.upaidown.com v=DMARC1; p=none; rua=mailto:dmarc@upaidown.com; adkim=s; aspf=s; pct=100"
  echo "TXT _smtp._tls.upaidown.com v=TLSRPTv1; rua=mailto:dmarc@upaidown.com"
  printf 'TXT default._domainkey.upaidown.com '
  tr -d '\n\t\r ' < "${key_dir}/default.txt" | sed -E 's/.*\("(.*)"\).*/\1/; s/""//g'
  echo
} > "${dns_file}"
chmod 0600 "${dns_file}"

echo "UP AI DOWN mailbox service prepared."
echo "Mailbox: ${MAILBOX}"
echo "Secret: ${SECRET_FILE} (root-only; password not printed)"
echo "DNS plan: ${dns_file}"
echo "Rollback archive: ${BACKUP_DIR}/before-change.tar.gz"
