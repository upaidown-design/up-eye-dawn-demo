# UP AI DOWN private mail service

This directory prepares a dedicated mailbox service; it does **not** claim that a production mail server is already commissioned. The application VM must not host the mail stack because mail protocols, reverse-proxy ports, memory, security posture and recovery requirements are independent.

## Selected architecture

- Stalwart `v0.16.0`: mailbox storage, SMTP submission, IMAP and JMAP.
- Roundcube `1.7.3-apache`: conventional private webmail at `https://mail.upaidown.com`.
- Caddy `2.10.2-alpine`: HTTPS for webmail and the JMAP endpoint.
- The administrator portal reads mailbox state through a server-side JMAP service account. A JMAP token is never exposed to React.
- Authenticated outbound relay on TCP 587/465. Google Cloud blocks general external destination TCP 25; inbound TCP 25 remains the MX delivery port.

The Compose file is a reviewed deployment reference, not a one-command production shortcut. Stalwart's generated configuration must be locked down before exposing any protocol.

## Required release sequence

1. Create a separate static-IP VM sized for mail and encrypted persistent storage.
2. Verify `upaidown.com` in Google Cloud and assign PTR `mail.upaidown.com` to the static IP.
3. Configure an authenticated outbound relay on port 587 or 465. Confirm bounce handling and envelope-from alignment.
4. Install Stalwart, create the domain and mailboxes, disable public management routes, require TLS and strong passwords, and create a least-privilege JMAP service account for the application.
5. Publish and verify MX, A/AAAA, SPF, DKIM, DMARC, MTA-STS and TLS-RPT. Start DMARC in monitoring mode before increasing enforcement.
6. Install TLS certificates for SMTP/IMAP as well as HTTPS. The Caddy certificate alone does not secure ports 465/587/993.
7. Configure encrypted off-host backups and run restore drills. Back up mailbox data, Stalwart configuration and the Roundcube database; do not back up plaintext secrets.
8. Run open-relay, authentication throttling, TLS, deliverability, inbound/outbound, spam, malware, backup/restore and monitoring tests.
9. Only then set these application variables: `MAIL_WEBMAIL_URL`, `MAIL_JMAP_URL`, `MAIL_JMAP_ACCOUNT`, `MAIL_JMAP_TOKEN`, plus the existing `SMTP_*` sender/archive values.

## Proposed DNS names

| Name | Purpose | Exposure |
|---|---|---|
| `mail.upaidown.com` | MX hostname, IMAP/SMTP and Roundcube | Public, TLS only |
| `jmap.upaidown.com` | Application mailbox API | Public TLS endpoint with token auth; management blocked |
| `mta-sts.upaidown.com` | MTA-STS policy | Public HTTPS |

Do not configure all four purchased domains as independent mail systems. Use `upaidown.com` as the canonical sending domain first; aliases can be added after SPF/DKIM/DMARC alignment is proven.

## First mailbox set

Suggested functional addresses are `admin@`, `investors@`, `nda@`, `privacy@`, `legal@` and `support@` on `upaidown.com`. Create named human accounts separately and use aliases/shared mailboxes for functions. Never share the administrator mailbox password among founders.

## Application boundary

The portal's Mail Center is a CRM/follow-up and evidence layer. Roundcube remains the full composer and complete mailbox client. Once the four `MAIL_JMAP_*` settings are installed, an OWNER or ADMIN can synchronize the most recent 100 messages through JMAP and read normalized text conversations inside the panel. Attachments and active HTML are deliberately not imported. Synchronization remains fail-closed before server commissioning.
