# UP AI DOWN private operations portal — implementation status

Status date: 2026-08-21  
Classification: INTERNAL / ADMIN CONFIDENTIAL

## Implemented

- Individual administrator accounts with `OWNER`, `ADMIN`, `EDITOR` and `VIEWER` roles.
- Owner-issued, single-use team invitations. Invitation tokens are stored only as HMAC hashes.
- Strong-password validation and mandatory individual TOTP enrollment for invited team members.
- Owner MFA enrollment with an encrypted per-user TOTP secret.
- Owner-issued one-time recovery links that rotate both password and MFA and invalidate prior sessions.
- Administrator sessions bound to source-network fingerprint and browser user-agent hash, with idle and absolute expiry, CSRF protection and audit events.
- Project control room with agenda, tasks, notes, decisions, comments and recent change history.
- Editable bilingual meeting kit for agenda, speech, questions, checklist and reference material.
- Investor CRM for organisations and contacts.
- Material registry with version, language, classification, provenance and controlled distribution status.
- Investor invitations, verified-email registration, NDA workflow, manual approval, visitor/session control and evidence ledger.
- EU/EEA and United States NDA document profiles remain versioned independently.
- Google Identity Platform provides investor email-ownership verification.
- Conditional SMTP evidence delivery and archive-copy support.

## Access rules

- `OWNER`: team accounts, roles, recovery, investor controls and project workspace.
- `ADMIN`: investor controls and project workspace; cannot manage owner-only team lifecycle.
- `EDITOR`: project workspace, CRM, meeting kit and materials; cannot administer team or investor security actions.
- `VIEWER`: read-only portal access.
- Team invitation and recovery tokens are placed in URL fragments so they are not sent in the initial HTTP request or server access log. The client removes the fragment from browser history immediately.

## External-release gates still requiring real approval or provider data

The application deliberately reports `productionReady=false` until all gates are satisfied:

1. Counsel approves the final EU/EEA NDA, US NDA and privacy notice text.
2. An approved transactional SMTP provider is configured with sender authentication and an archive mailbox.
3. Administrator MFA is set to mandatory and every active administrator has enrolled.
4. Workflow-test mode is replaced by the approved external portal mode.

No code path silently converts draft legal text into an approved agreement.

## Operational routes

- `/demo/admin/login` — private administrator sign-in.
- `/demo/admin` — control room.
- `/demo/admin/agenda`, `/tasks`, `/notes`, `/decisions` — project execution and memory.
- `/demo/admin/crm` — investor CRM.
- `/demo/admin/materials` — controlled material registry.
- `/demo/admin/meeting-kit` — editable meeting preparation.
- `/demo/admin/team` — individual accounts, MFA and recovery.
- `/demo/admin/invitations`, `/visitors`, `/nda`, `/security` — investor access and evidence controls.

## Verification baseline

- API and web TypeScript production builds pass.
- Unit tests cover session cryptography, IP handling, HMAC invitation policy, TOTP, encrypted MFA secrets, workspace validation, decision lifecycle and strong team credentials.
- The product-truth check passes with fundraising terms still unset and historical claims quarantined.
