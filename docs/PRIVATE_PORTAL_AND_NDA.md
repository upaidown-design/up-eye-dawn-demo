# Private meeting portal and NDA access

> Superseded by the consolidated [PRIVATE_INVESTOR_PORTAL.md](./PRIVATE_INVESTOR_PORTAL.md). This file is retained only as the first local prototype record.

## Routes

- `/demo/admin/login` — administrator login.
- `/demo/admin` — private meeting room with agenda, visit checklist, presentation order, speech, questions, invitation management and NDA ledger.
- `/demo/access/:token` — recipient registration and NDA acknowledgement.
- `/demo/access` — safe failure screen when no valid invitation is present.

Investor, fleet, analytics, Mission Control, report and development routes require either an active administrator session or a valid NDA visitor session. Public preflight and transparency pages remain available.

## Access decision

A visitor is granted access only when all of the following are true:

1. the NDA acceptance has not been revoked;
2. the opaque, HTTP-only visitor-session cookie exists and matches a stored token hash;
3. the visitor session has not expired;
4. the current IP fingerprint matches the IP fingerprint recorded for that session.

An IP address alone never grants access. If the IP changes, the session is deleted and the person must open a valid invitation and complete the NDA flow again. This fulfils the requested re-registration policy without allowing every person behind a shared office IP to inherit somebody else's access.

The source IP is encrypted at rest with AES-256-GCM. A separate HMAC fingerprint is retained for matching. The administrator ledger shows a masked address. Nginx forwards `X-Real-IP` and `X-Forwarded-For`, and Fastify trusts only the controlled proxy path in the deployed topology.

## NDA evidence

Each acceptance stores:

- invitation and NDA version;
- full name, email, organisation, role and country;
- typed signature and explicit NDA/privacy confirmations;
- UTC timestamp, user agent and encrypted/fingerprinted IP;
- SHA-256 document/recipient evidence hash;
- email delivery status and revocation state.

A PDF is generated from the exact version and recipient data, sent through SMTP, and can be downloaded again while the session is valid. Local Compose includes Mailpit at `http://127.0.0.1:8025` for delivery verification.

## Legal and privacy gate

`data/admin/nda-v1.json` is deliberately classified `DRAFT_FOR_WORKFLOW_TESTING`. It is not approved legal text. Before external use, counsel must provide or approve:

- complete legal entity and authorised-signatory details;
- unilateral or mutual structure;
- confidentiality term, permitted recipients and return/destruction rules;
- governing law, venue and compulsory-disclosure language;
- retention period and privacy notice/legal basis;
- the required level of electronic signature and evidence.

Only then should `NDA_LEGAL_STATUS=APPROVED` be set. IP addresses and online identifiers may be personal data under GDPR; collection, retention, access and deletion procedures must be approved and disclosed. An electronic signature cannot be denied legal effect solely because it is electronic under eIDAS, but the appropriate signature level and evidentiary process remain a legal decision.

Official legal references: [GDPR — Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj) and [eIDAS — Regulation (EU) No 910/2014](https://eur-lex.europa.eu/eli/reg/2014/910/oj).

## Production configuration

Real secrets live in the ignored `.env`; `.env.example` contains the contract. Production must use unique secrets, HTTPS, `COOKIE_SECURE=true`, an approved SMTP provider, an archive address, backup/retention policy, database access controls and a trusted reverse proxy. Default invitation tokens and local credentials must be rotated before deployment.
