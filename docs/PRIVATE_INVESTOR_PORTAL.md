# UP-EYE-DAWN Private Investor Portal

Status: `PRIVATE_PORTAL_READY_FOR_LOCAL_TESTING`  
External release: blocked  
NDA: `DRAFT_FOR_WORKFLOW_TESTING`  
Privacy notice: `DRAFT`

## Purpose and boundary

This subsystem controls access to confidential investor material. An invitation begins registration but never grants access. Identity, NDA evidence and browser session are separate records:

```text
INVITATION != VISITOR != NDA ACCEPTANCE != SESSION
```

Every person who receives a shared link must create an individual record, acknowledge the selected NDA version and receive an independent opaque session. A shared IP is not identity. A changed IP is treated as a risk event and invalidates the bound session.

The workflow records electronic acknowledgement evidence. It is not described as a qualified electronic signature, advanced electronic signature, legally binding NDA, or GDPR-compliant process without legal approval.

## Routes

Public:

- `/demo/preflight`
- `/demo/about-demo`
- `/demo/transparency`
- `/demo/access`
- `/demo/access/:token`
- `/demo/admin/login`

Visitor-controlled:

- `/demo/investor`
- `/demo/investor-financials`
- `/demo/mission-control`
- `/demo/fleet`
- `/demo/missions`
- `/demo/analytics`
- `/demo/reports`

Administrator only:

- `/demo/admin`
- `/demo/admin/invitations`
- `/demo/admin/visitors`
- `/demo/admin/nda`
- `/demo/admin/meeting`
- `/demo/admin/security`
- `/demo/dev/*`, including `/demo/dev/round-decision`

## Architecture

Nginx is the only published application endpoint. It provides the static route guard through an internal `auth_request`, forwards a controlled source-IP chain, adds CSP/frame/referrer/permissions headers and sends private pages with `Cache-Control: no-store`. Fastify is the authorization authority. React guards improve navigation but are not trusted for enforcement.

PostgreSQL schema `private_portal` persists:

- `admin_users`, `admin_sessions`;
- `invitations`, `registration_contexts`;
- `visitors`, `visitor_sessions`;
- `nda_documents`, `nda_acceptances`;
- `audit_events`, `email_deliveries`;
- `schema_migrations`.

The versioned migration is `infra/migrations/001_private_investor_portal.sql`. Application startup runs pending migrations transactionally. The access subsystem no longer uses demo memory.

## Invitation flow

An invitation token is 256 random bits and opaque. Only `HMAC-SHA-256(token, INVITATION_TOKEN_HMAC_SECRET)` is stored. The token contains no email, organisation, ID, permission or policy.

`GET /demo/access/:token` only loads the SPA. JavaScript makes a same-origin `POST /api/v1/access/invitations/prepare`. Successful preparation creates a short-lived, server-side registration context and replaces browser history with `/demo/access`; the invitation token does not remain in the NDA URL or later screenshots.

Invitation policies:

- `SINGLE_VISITOR`: one new identity, then consumed.
- `MULTI_VISITOR`: each recipient registers independently up to the configured limit.
- optional exact recipient email;
- optional exact email domain;
- configured validity and expiry;
- optional manual approval;
- selected NDA version and server-side scopes.

The invitation plaintext is shown only in the creation response. It cannot be recovered from the database.

## Visitor and NDA flow

Input is trimmed and email is lowercased. Organisation text is not semantically rewritten. Registration creates or reuses the identity for the same invitation and normalized email. Re-verification does not increment `registration_count`.

Each acceptance is append-only and stores:

- NDA ID/version and exact document SHA-256;
- immutable document, privacy and recipient snapshot;
- typed acknowledgement plus two independent confirmations;
- UTC timestamp and deterministic evidence SHA-256;
- encrypted IP, HMAC IP fingerprint and masked IP;
- user agent;
- generated PDF bytes and PDF SHA-256;
- email delivery state and optional revocation record.

The PDF is generated from the stored acceptance snapshot and never includes a full IP. It contains the masked network evidence, document hash, version, recipient, timestamp and evidence identifier. Downloads re-check an active visitor or administrator session.

Manual approval follows `REGISTER -> NDA ACCEPTED -> PENDING_APPROVAL`. The pending browser context polls status without receiving confidential content. Approval marks the visitor active; the next status check rotates/creates the visitor session.

## Session security

Visitor and administrator cookies are separate. Production names use `__Host-ued-visitor` and `__Host-ued-admin`; localhost uses non-prefixed equivalents because `__Host-` requires HTTPS. Cookies are opaque, `HttpOnly`, `SameSite=Strict`, `Path=/`, and `Secure` in production. Token plaintext is never stored in PostgreSQL, localStorage or sessionStorage.

Sessions have configurable idle and absolute timeouts:

- `VISITOR_SESSION_IDLE_MINUTES`
- `VISITOR_SESSION_MAX_HOURS`
- `ADMIN_SESSION_IDLE_MINUTES`
- `ADMIN_SESSION_MAX_HOURS`

Authentication, approval, re-verification and privilege change create a new session and invalidate the previous active session. Revocation is checked on every private request and terminates access immediately.

Administrator mutations require an unpredictable per-session synchronizer token in `X-CSRF-Token`, an allowed `Origin`, JSON content type and an administrator role. Login has a strong rate limit and neutral errors. Passwords use the existing configured scrypt password hash; production administrator MFA is gated through TOTP and `ADMIN_MFA_REQUIRED=true`.

The session design follows the [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). The CSRF implementation follows the stateful synchronizer-token and custom-header guidance in the [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## IP and proxy policy

Fastify accepts forwarded addresses only from loopback/private proxy ranges, and the API container is not published to the host or Internet. Nginx overwrites `X-Real-IP` and `X-Forwarded-For`; it does not append an Internet-supplied chain.

Canonical source IP processing produces three independent values:

1. AES-256-GCM ciphertext with nonce, auth tag and key version;
2. HMAC-SHA-256 fingerprint using `IP_FINGERPRINT_SECRET`;
3. masked representation for normal administration.

IPv4, IPv6 and IPv4-mapped IPv6 are canonicalized before comparison. Encryption, invitation HMAC, IP fingerprint and session HMAC use separate keys. IP/network mismatch creates `NETWORK_CHANGED`, invalidates the old session and requires a new acknowledgement/session. IP by itself never grants access.

IP addresses, cookie identifiers and similar online identifiers may relate to an identifiable person under GDPR recital 30. The controller, purpose, lawful basis, retention, recipients, rights and contact text still require counsel approval. Primary text: [Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

## Audit and privacy

The audit ledger records security and access milestones, not every click. Events are classified `INFO`, `NOTICE`, `WARNING` or `SECURITY`. It never stores raw passwords, invitation tokens, session cookies, CSRF tokens, encryption keys or SMTP credentials. Application logger redaction covers cookies, authorization and CSRF headers.

Normal exports contain masked IP only and defend against spreadsheet formula injection. Full IP decryption is not exposed in the administrative UI.

Retention values are configuration placeholders. No NDA evidence is automatically deleted. The interaction between privacy deletion rights and preservation of contractual evidence is `LEGAL_REVIEW_REQUIRED`.

## Threat model

| Threat | Mitigation | Residual risk |
|---|---|---|
| Shared invitation | Individual visitor, acceptance and session; policy/limit/domain controls | A recipient can still invite authorised colleagues under a multi policy |
| Stolen cookie | Opaque HttpOnly token, server-side state, network binding, timeout, revocation | Same-network theft remains possible; MFA for visitors is future scope |
| Same-IP users | Cookie and visitor identity required; IP never grants | Shared devices may expose an existing browser session |
| Token enumeration | 256-bit opaque tokens, HMAC storage, neutral errors, rate limits | Compromised email can expose a valid invitation |
| Mail link scanner | GET does not consume; explicit POST prepares context | Full browser automation could still prepare a harmless context |
| XSS | CSP, no third-party analytics, React escaping, HttpOnly session | CSP still allows inline styles for MapLibre compatibility |
| CSRF | SameSite Strict, Origin validation, synchronizer token/custom header | XSS could act within an administrator session |
| Admin brute force | Rate limit, neutral response, audit, TOTP production gate | Distributed attempts need upstream WAF monitoring in production |
| Database leak | Token HMAC, IP encryption, key separation, masked UI | Identity and NDA evidence remain sensitive data |
| Email compromise | Invitation is not access; individual registration/NDA required | Attacker controlling recipient email can complete identity fields |
| Proxy spoofing | API not published; trusted proxy ranges; Nginx overwrites headers | Deployment topology must preserve this boundary |

## Operations runbook

### Before sharing an invitation

1. Confirm the meeting owner, recipient policy, expiry, limit and scope.
2. Confirm the NDA version and current legal/privacy status.
3. Use a specific email or allowed domain where appropriate.
4. Create the invitation and copy the secure link once.
5. Send it through an approved channel; never paste it into public analytics or notes.

### During a meeting

1. Monitor pending approvals and individual registrations.
2. Approve only identities expected for the meeting.
3. Check active sessions and security events.
4. Use `/demo/admin/meeting` for agenda, visit, presentation and speech.

### After a meeting

1. Revoke invitations to prevent new registrations.
2. Revoke individual visitors or sessions where access should end.
3. Export the masked ledger if operationally required and record the export.
4. Verify email/PDF evidence and backups according to the approved policy.

### Network re-verification

A network mismatch invalidates the active session. The browser receives a re-verification context and shows `/demo/access/reverify`. The visitor submits identity and acknowledgement again; the invitation registration count does not increase for the existing identity.

### Changing NDA

Create a new `nda_documents` row; never overwrite prior evidence. Set `reaccept_required` according to the legal decision and assign the new version to relevant invitations. Existing snapshots remain immutable.

## Commands

```bash
pnpm portal:migrate
pnpm portal:seed-dev
pnpm portal:test
pnpm portal:security-check
```

Mailpit is local-only at `http://127.0.0.1:8025`.

## Backup, restore and data requests

Before external use, implement encrypted PostgreSQL backups, restore drills, restricted database roles and an approved retention schedule. A visitor export/deletion procedure must distinguish removable technical/session data from NDA evidence that counsel requires preserving. Do not automate contractual-evidence deletion until this is approved.

## Production checklist

- [ ] NDA approved by counsel
- [ ] Privacy notice approved
- [ ] Company legal identity inserted
- [ ] Authorised signatory confirmed
- [ ] Retention policy approved
- [ ] HTTPS termination verified
- [ ] HSTS enabled only on the final HTTPS domain
- [ ] `COOKIE_SECURE=true`
- [ ] Unique production secrets installed
- [ ] Default credentials and invitation removed
- [ ] Owner/Admin TOTP enrolled and `ADMIN_MFA_REQUIRED=true`
- [ ] Approved SMTP and archive policy configured
- [ ] PostgreSQL backups and restore test complete
- [ ] Database access controls reviewed
- [ ] Trusted-proxy topology verified
- [ ] Security, visitor, admin, mail, PDF and Playwright suites passed

External startup fails closed when the legal/privacy/MFA/Secure-cookie gate is incomplete. Localhost deliberately does not send HSTS.
