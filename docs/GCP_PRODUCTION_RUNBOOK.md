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

## Security model

- Only ports 80/443 are public.
- SSH is restricted to Google IAP.
- The VM uses OS Login, Shielded VM controls and a dedicated service account.
- Real secrets are never committed. The generated environment is stored in Secret Manager and copied to the VM with mode `0600`.
- PostgreSQL is reachable only inside the Docker network.
- HTTPS certificates and redirects are managed by Caddy after DNS propagation.
- The VM disk has a daily `03:00 UTC` snapshot schedule with 14-day retention in `europe-west1`.
- The current NDA and privacy documents remain `DRAFT`; `EXTERNAL_PORTAL_ENABLED` stays `false` until counsel approval, MFA and production SMTP are configured.

## Required release gates

1. Replace the NDA workflow draft with counsel-approved text.
2. Approve privacy, retention and controller details.
3. Configure administrator TOTP and require MFA.
4. Configure an approved transactional SMTP provider and archive mailbox.
5. Create production invitations individually; never ship a default invitation token.
6. Test registration, IP-change re-verification, NDA PDF delivery, revocation and audit export.

## Operations

```bash
gcloud compute ssh ued-prod-01 --zone=europe-west1-b --tunnel-through-iap
sudo systemctl status up-eye-dawn
sudo ued-compose --env-file /etc/up-eye-dawn/app.env -f /opt/up-eye-dawn/current/infra/production/compose.yaml ps
sudo ued-compose --env-file /etc/up-eye-dawn/app.env -f /opt/up-eye-dawn/current/infra/production/compose.yaml logs --tail=200
```

Budget notifications warn about spend but do not stop resources automatically.

DonDominio currently reports three registrant-contact validations in progress. Complete those validations from the registrant mailbox before their registrar deadlines to prevent a domain suspension.
