# NDA US/EU legal readiness — 2026-08-24

Status: `LEGAL_REVIEW`  
Release effect: external investor registration remains fail-closed.  
Purpose: implementation and counsel hand-off; this document is not legal advice and does not approve either NDA.

## Controlled drafts

- `NDA-EU-LEGAL-REVIEW-2026-08-24`: English source plus a controlled Spanish translation, EU/EEA profile.
- `NDA-US-LEGAL-REVIEW-2026-08-24`: English source plus a controlled Spanish translation, United States profile.
- Both versions preserve an explicit legal-review warning and deliberately leave governing law, forum, confidentiality term, remedies and final company particulars unresolved.
- The NDA editor stores both language versions inside the same versioned content object. A revision changes the content hash. Approved or signed versions are immutable and must be cloned.

## Electronic-signature implementation basis

- EU/EEA: eIDAS Article 25 provides that an electronic signature is not denied legal effect or admissibility solely because it is electronic or not qualified. The portal describes its method only as a simple electronic-signature workflow; it does not claim an advanced or qualified signature. Official source: [EUR-Lex, Regulation (EU) No 910/2014, Article 25](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A02014R0910-20240520).
- United States: the E-SIGN Act provides that a signature, contract or record in interstate or foreign commerce is not denied effect solely because it is electronic, while preserving other substantive legal requirements and not forcing a party to accept electronic records. Official source: [GovInfo, Public Law 106-229](https://www.govinfo.gov/app/details/PLAW-106publ229).
- New York: ESRA recognizes electronic signatures and records while stressing authenticity, integrity, security, confidentiality and record retention. Official sources: [New York ITS ESRA guidance](https://its.ny.gov/electronic-signatures-and-records-act-esra) and [9 NYCRR Part 540 guidance](https://its.ny.gov/electronic-signatures-and-records-act-esra-regulation).

The implemented evidence package records the exact rendered language, canonical document hash, version, invitation, identity, organization, registered address, typed signature, affirmative intent, UTC timestamp, browser evidence, encrypted source IP, independent IP fingerprint, masked IP, evidence hash and immutable PDF copy. The Spanish UI generates a Spanish PDF; the English UI generates an English PDF.

## EU/EEA privacy hand-off

GDPR Article 13 requires controller/contact information, purposes and legal basis, and additional transparency information when data is collected from the person. Article 12 requires concise, transparent, intelligible and accessible language. Official sources: [EUR-Lex GDPR Article 13](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679) and [EUR-Lex GDPR consolidated text](https://eur-lex.europa.eu/eli/reg/2016/679/oj).

The portal displays a bilingual privacy/access notice and records affirmative acknowledgement, but counsel/privacy review must still select and approve:

1. Exact controller legal name, registered address and privacy contact.
2. Article 6 legal basis for each purpose; legitimate-interest assessment if Article 6(1)(f) is selected.
3. Recipients/processors, international transfers and safeguards.
4. Retention periods for invitations, sessions, audit records, encrypted IP data, NDA evidence and mail archives.
5. Applicable rights, complaint authority and identity-verification process for requests.
6. Whether a DPO or EU representative is required.
7. The relationship between erasure/objection rights and preservation of contractual evidence or legal claims.

## Counsel decision checklist

Counsel must review the exact SHA-256 version shown in the admin library and provide a recorded approval reference before an owner changes status to `APPROVED`.

- Confirm the disclosing legal entity and authority to contract.
- Select governing law, exclusive/non-exclusive forum and service-of-process language.
- Select confidentiality and survival terms.
- Approve compelled-disclosure, residuals, return/destruction, backups and archival-copy language.
- Decide whether the NDA is unilateral or mutual for each invitation purpose.
- Approve remedies, injunctive relief, limitation/no-warranty language and any securities-law disclaimer.
- Confirm signatory capacity, minors/consumer exclusions and any transaction types outside the chosen e-signature method.
- Review the English/Spanish relationship: controlling language, certified translation need and conflict clause.
- Approve privacy notice, retention schedule and processor/transfer disclosures.
- Confirm that the simple typed-name workflow is proportionate to the transaction risk; require a stronger signature method if not.

Until every applicable item is approved, production must keep `EXTERNAL_PORTAL_ENABLED=false`, `PRIVACY_LEGAL_STATUS=DRAFT` and the NDA documents in `LEGAL_REVIEW`.
