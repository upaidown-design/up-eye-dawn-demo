# Mail, webmail and editable NDA architecture

Status: implementation-ready, production commissioning pending.

## What is now implemented

The administrator application has two new controlled workspaces:

- **NDA library**: creates independent drafts, clones variants for different situations, edits paragraph content, records mandatory change notes, tracks hashes and revisions, submits documents to legal review, records owner/counsel approval, and retires obsolete versions.
- **Mail center**: records investor email follow-ups, owner, priority, status, due date and internal context; shows NDA/invitation delivery evidence; links to private webmail; and synchronizes readable text conversations through JMAP when configured.

The previously existing acceptance ledger remains separate as **NDA evidence**. A signed or approved document is immutable. A new situation or material change requires a new version/clone. Existing `nda_acceptances.document_snapshot`, hash and PDF are never rewritten.

Seed JSON files initialize an empty database only. They no longer overwrite an edited database document during API startup.

## NDA lifecycle

`DRAFT_FOR_WORKFLOW_TESTING → LEGAL_REVIEW → APPROVED → RETIRED`

Legal review can return to draft. Only an OWNER can record approval, and the operation requires explicit confirmation and a counsel reference. This is an operational control, not a substitute for legal review. Documents in draft or legal review cannot be used by the external portal when external mode is enabled.

Purposes currently supported: general investor, mutual, one-way, technical diligence, financial diligence, strategic partner, pilot customer and custom. Jurisdiction is stored independently, because “US” and “EU/EEA” are profiles rather than interchangeable paragraphs.

## Mail architecture decision

Use a dedicated mail VM with Stalwart for SMTP/IMAP/JMAP and Roundcube for webmail. Keep it separate from the current application VM. Google Cloud permits inbound SMTP but blocks general external destination TCP 25, so outbound delivery must use an authenticated relay over 587/465. Mailboxes and their history remain on the private server.

The web application never receives mailbox credentials. The API holds a least-privilege JMAP service token and exposes normalized thread metadata and plain-text bodies required for follow-up. Active HTML and attachments are not imported. Full composition and attachment handling remain in Roundcube. Synchronization is enabled automatically only after all server-side JMAP settings are present.

## Remaining production gates

- Choose/provision the mail VM and outbound relay; no purchase has been made automatically.
- Set static IP and PTR, then publish verified MX/SPF/DKIM/DMARC/MTA-STS/TLS-RPT records.
- Secure SMTP/IMAP certificates, mailbox/admin authentication and rate limits.
- Create off-host encrypted backups and prove restoration.
- Obtain counsel-approved NDA variants and privacy/retention policy.
- Run deliverability, open-relay, TLS, JMAP authorization and end-to-end NDA delivery tests.

Official implementation references: [Google Cloud sending mail](https://docs.cloud.google.com/compute/docs/tutorials/sending-mail), [Google Cloud PTR records](https://docs.cloud.google.com/compute/docs/instances/create-ptr-record), [Stalwart Docker installation](https://www.stalwart.email/docs/install/platform/docker/), [Stalwart DNS](https://www.stalwart.email/docs/install/dns/), [Stalwart JMAP/HTTP](https://www.stalwart.email/docs/http/), and [Roundcube Docker](https://github.com/roundcube/roundcubemail-docker).
