# UP AI DOWN private mail service

## Implemented architecture

The commissioned path reuses the isolated server's existing Postfix, Dovecot, OpenDKIM, Roundcube and Fail2Ban services. This avoids a second mail stack competing for ports or changing the unrelated applications already running on that host. The reproducible, idempotent provisioning script is `existing-server/provision-upaidown-mail.sh`.

- Canonical domain: `upaidown.com`.
- Shared operational mailbox: `investors@upaidown.com`.
- Functional aliases: `admin@`, `nda@`, `privacy@`, `legal@`, `support@`, `dmarc@`, `postmaster@` and `webmaster@`.
- Webmail: `https://webmail.upaidown.com`.
- Application access: authenticated SMTP submission plus read-only IMAP synchronization performed by the API. Mailbox secrets never reach React.
- The former Stalwart Compose files remain a reference design only and must not be deployed alongside the commissioned stack.

## Production status

The private mail service is commissioned on the isolated server at `82.223.44.126`. Postfix handles MX delivery and authenticated submission, Dovecot exposes TLS-only IMAP, OpenDKIM signs outbound messages, Roundcube provides webmail, and Nginx serves webmail plus the MTA-STS policy. The Google Cloud application connects through server-side SMTP and read-only IMAP settings stored in Secret Manager. The historical Stalwart Compose design remains undeployed reference material.

Certificates for `mail.upaidown.com`, `webmail.upaidown.com` and `mta-sts.upaidown.com` are managed by Certbot. Both renewal paths have passed staging dry runs. DMARC and MTA-STS intentionally begin in monitoring/testing modes; enforcement should only be raised after reviewing aggregate reports and delivery behavior.

## Commissioning controls

1. DNS publishes the three service addresses, MX, SPF, DKIM, DMARC, MTA-STS and TLS-RPT. The existing website records remain unchanged.
2. PTR resolves to `server.aiworking.pro`, which resolves forward to the same IP. The branded canonical client hostname remains `mail.upaidown.com`.
3. SMTP submission and IMAP require authenticated TLS; SMTP port 25 remains available for inbound MX delivery and open-relay tests fail closed.
4. TLS covers SMTP, IMAP, webmail and MTA-STS. Certificate renewal has passed staging dry runs for both certificate lineages.
5. Daily local backups and checksums are active. The application VM retrieves the latest archive through a forced-command, key-only SSH identity, encrypts it with AES-256/PBKDF2 using a key held in Secret Manager, uploads it to a private versioned GCS bucket and performs a non-destructive restore drill on every run.
6. The application Secret Manager version contains `SMTP_*`, `MAIL_WEBMAIL_URL` and `MAIL_IMAP_*`; the React frontend never receives mailbox credentials.
7. Production smoke tests verify authenticated submission, DKIM signing and read-only IMAP visibility. On 2026-08-24 Gmail accepted the controlled external test over TLS 1.3 with final SMTP status `250 2.0.0`; inbox/spam placement still requires mailbox-side observation.

## Off-site backup

`upaidown-mail-offsite-backup.timer` runs daily on `ued-prod-01`. The source server key is restricted to `/usr/local/sbin/export-upaidown-mail-backup`; it cannot open an interactive shell. Objects are stored under `gs://project-6ec58af7-91e9-4c25-870-ued-backups/mail/YYYY/MM/DD/`. The bucket enforces public-access prevention, uniform access, versioning, a 30-day retention period and lifecycle cleanup. The encryption key is `ued-mail-backup-encryption-key` in Secret Manager and is not stored in the repository.

## Production DNS names

| Name | Purpose | Exposure |
|---|---|---|
| `mail.upaidown.com` | MX hostname and canonical IMAP/SMTP endpoint | Public, TLS only |
| `webmail.upaidown.com` | Roundcube webmail | Public HTTPS; mailbox authentication required |
| `mta-sts.upaidown.com` | MTA-STS policy | Public HTTPS |

Do not configure all four purchased domains as independent mail systems. Use `upaidown.com` as the canonical sending domain first; aliases can be added after SPF/DKIM/DMARC alignment is proven.

## Production mailbox set

`investors@upaidown.com` is the physical shared mailbox. `admin@`, `nda@`, `privacy@`, `legal@`, `support@`, `dmarc@`, `postmaster@` and `webmaster@` are functional aliases delivered to it. Named human accounts should be added separately rather than sharing the operational mailbox password among founders.

## Application boundary

The portal's Mail Center is a CRM/follow-up and evidence layer. Roundcube remains the full composer and complete mailbox client. With `MAIL_IMAP_*` settings installed, an OWNER or ADMIN can synchronize the most recent 100 INBOX messages and read normalized text conversations inside the panel. JMAP remains supported as an alternative. Attachments and active HTML are deliberately not imported. Synchronization remains fail-closed before server commissioning.
