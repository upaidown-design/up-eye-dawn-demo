ALTER TABLE private_portal.nda_documents
  ADD COLUMN IF NOT EXISTS jurisdiction text NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN IF NOT EXISTS governing_law text NOT NULL DEFAULT 'TO_BE_SELECTED_BY_COUNSEL',
  ADD COLUMN IF NOT EXISTS signature_profile text NOT NULL DEFAULT 'SIMPLE_ELECTRONIC_SIGNATURE_WORKFLOW';

ALTER TABLE private_portal.visitors
  ADD COLUMN IF NOT EXISTS registered_address text NOT NULL DEFAULT '';

ALTER TABLE private_portal.nda_acceptances
  ADD COLUMN IF NOT EXISTS registered_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature_method text NOT NULL DEFAULT 'TYPED_NAME',
  ADD COLUMN IF NOT EXISTS signature_intent_confirmed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS nda_documents_jurisdiction_status_idx
  ON private_portal.nda_documents(jurisdiction, legal_status);
