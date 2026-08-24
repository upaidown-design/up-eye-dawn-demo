# UP-EYE-DAWN Google Cloud production runbook

Status: production runtime, DNS and HTTPS are active at reserved IPv4 `34.77.12.150`. External NDA release remains legally blocked while the bundled NDA and privacy notice are drafts.

## Target

- Google Cloud project: `project-6ec58af7-91e9-4c25-870`
- Region: `europe-west1`
- Zone: `europe-west1-b`
- Primary domain: `upaidown.com`
- Demo domain: `demo.upaidown.com`
- Redirect domains: `upaidown.app`, `upaidown.pro`, `upaidown.es`
- Reserved public IPv4: `34.77.12.150`
- Runtime: hardened Compute Engine VM, Docker Compose, Caddy-managed TLS, Nginx gateway, Fastify API and PostgreSQL/PostGIS

## Provision and deploy

```bash
gcloud config configurations activate up-eye-dawn
./scripts/gcp/provision-vm.sh
./scripts/gcp/deploy-vm.sh
```

The provisioning script prints the reserved public IPv4 address. DonDominio is configured as follows:

| Host | Type | Value |
|---|---|---|
| `origin` for each domain | `A` | `34.77.12.150` |
| `@` for each domain | `ANAME` | corresponding `origin` hostname |
| `www` for each domain | `CNAME` | corresponding `origin` hostname |
| `demo` on `upaidown.com` | `A` | `34.77.12.150` |

The rollout TTL is 10 minutes, the minimum exposed by DonDominio. Unrelated TXT, SPF, mail, webmail, FTP and database records were preserved.

## Transactional mail

The commissioned mail server is isolated at `82.223.44.126`; it provides Postfix, Dovecot, OpenDKIM, Fail2Ban and Roundcube. The application uses authenticated STARTTLS submission and read-only IMAP. The visitor is the direct recipient; the archive is sent as BCC and is therefore not disclosed. Webmail is available at `https://webmail.upaidown.com`.

To rotate the application mailbox credential without putting the password in shell history:

```bash
read -s SMTP_PASSWORD_VALUE
printf %s "$SMTP_PASSWORD_VALUE" | pnpm gcp:smtp:configure -- \
  --password-stdin \
  --host mail.upaidown.com \
  --user investors@upaidown.com \
  --archive investors@upaidown.com \
  --reply-to privacy@upaidown.com \
  --apply-vm
unset SMTP_PASSWORD_VALUE
```

This creates a new `ued-production-env` version in Secret Manager, configures authenticated STARTTLS on port 587 and IMAP over TLS on port 993, copies the complete environment to the VM with mode `0600`, and restarts the application service. It never prints the password.

MX, SPF, DKIM, DMARC, MTA-STS and TLS-RPT are published. Gmail accepted the controlled external transport test on 2026-08-24; placement still requires inbox-side observation. DMARC and MTA-STS remain in monitoring/testing modes until reports support enforcement.

## Security model

- Only ports 80/443 are public.
- SSH is restricted to Google IAP.
- The VM uses OS Login, Shielded VM controls and a dedicated service account.
- Real secrets are never committed. The generated environment is stored in Secret Manager and copied to the VM with mode `0600`.
- Deployments preserve the existing administrator identity and credentials from Secret Manager; a local `.env` file is optional.
- PostgreSQL is reachable only inside the Docker network.
- HTTPS certificates and redirects are managed by Caddy after DNS propagation.
- The VM disk has a daily `03:00 UTC` snapshot schedule with 14-day retention in `europe-west1`.
- `upaidown-mail-offsite-backup.timer` and `upaidown-database-offsite-backup.timer` create separate encrypted GCS backups daily. Each run performs a non-destructive restore: mail is decrypted and structurally verified; PostgreSQL is restored into a temporary isolated database, checked and removed.
- The NDA jurisdiction drafts and privacy notice remain unapproved; `EXTERNAL_PORTAL_ENABLED` stays `false` until counsel approval, verified email ownership, MFA and production SMTP are configured.

## Required release gates

1. Replace the NDA workflow draft with counsel-approved text.
2. Approve privacy, retention and controller details.
3. Configure administrator TOTP and require MFA.
4. Server-verify the configured Google Identity Platform/Firebase email-link authentication.
5. Confirm mailbox-side receipt/placement and keep monitoring DMARC/TLS reports.
6. Create production invitations individually; never ship a default invitation token.
7. Test registration, shared-link use in a second browser, IP-change re-verification, NDA PDF delivery, revocation and audit export.

## Operations

```bash
gcloud compute ssh ued-prod-01 --zone=europe-west1-b --tunnel-through-iap
sudo systemctl status up-eye-dawn
sudo systemctl status upaidown-mail-offsite-backup.timer upaidown-database-offsite-backup.timer
sudo ued-compose --env-file /etc/up-eye-dawn/app.env -f /opt/up-eye-dawn/current/infra/production/compose.yaml ps
sudo ued-compose --env-file /etc/up-eye-dawn/app.env -f /opt/up-eye-dawn/current/infra/production/compose.yaml logs --tail=200
```

Budget notifications warn about spend but do not stop resources automatically.

DonDominio currently reports three registrant-contact validations in progress. Complete those validations from the registrant mailbox before their registrar deadlines to prevent a domain suspension.
