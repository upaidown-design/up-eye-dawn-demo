ALTER TABLE private_portal.nda_documents
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'GENERAL_INVESTOR',
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'SEEDED',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES private_portal.admin_users(id),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$ BEGIN
  ALTER TABLE private_portal.nda_documents
    ADD CONSTRAINT nda_documents_purpose_check CHECK (purpose IN (
      'GENERAL_INVESTOR','MUTUAL','ONE_WAY','TECHNICAL_DILIGENCE',
      'FINANCIAL_DILIGENCE','STRATEGIC_PARTNER','PILOT_CUSTOMER','CUSTOM'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE private_portal.nda_documents
    ADD CONSTRAINT nda_documents_source_kind_check CHECK (source_kind IN ('SEEDED','EDITOR','CLONED','LEGAL_COUNSEL'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS private_portal.nda_document_revisions (
  id uuid PRIMARY KEY,
  nda_document_id uuid NOT NULL REFERENCES private_portal.nda_documents(id),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  title text NOT NULL,
  legal_status text NOT NULL,
  jurisdiction text NOT NULL,
  governing_law text NOT NULL,
  signature_profile text NOT NULL,
  purpose text NOT NULL,
  content jsonb NOT NULL,
  content_sha256 text NOT NULL,
  change_note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nda_document_id, revision_number)
);

CREATE TABLE IF NOT EXISTS private_portal.mail_threads (
  id uuid PRIMARY KEY,
  subject text NOT NULL,
  contact_email text NOT NULL DEFAULT '',
  organisation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','IN_PROGRESS','WAITING_REPLY','FOLLOW_UP_DUE','CLOSED','ARCHIVED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  assigned_to uuid REFERENCES private_portal.admin_users(id),
  next_follow_up_at timestamptz,
  last_message_at timestamptz,
  remote_thread_id text,
  source text NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('SYSTEM','JMAP','MANUAL')),
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES private_portal.admin_users(id),
  updated_by uuid REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private_portal.mail_thread_messages (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES private_portal.mail_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND','SYSTEM')),
  provider_message_id text,
  email_delivery_id uuid REFERENCES private_portal.email_deliveries(id),
  from_address text NOT NULL DEFAULT '',
  to_addresses text[] NOT NULL DEFAULT '{}'::text[],
  cc_addresses text[] NOT NULL DEFAULT '{}'::text[],
  subject text NOT NULL DEFAULT '',
  text_excerpt text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS private_portal.mail_thread_notes (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES private_portal.mail_threads(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nda_document_revisions_doc_idx ON private_portal.nda_document_revisions(nda_document_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS mail_threads_status_followup_idx ON private_portal.mail_threads(status, next_follow_up_at);
CREATE INDEX IF NOT EXISTS mail_threads_contact_idx ON private_portal.mail_threads(lower(contact_email));
CREATE INDEX IF NOT EXISTS mail_messages_thread_time_idx ON private_portal.mail_thread_messages(thread_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS mail_notes_thread_time_idx ON private_portal.mail_thread_notes(thread_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS mail_threads_remote_uidx ON private_portal.mail_threads(remote_thread_id) WHERE remote_thread_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mail_messages_provider_uidx ON private_portal.mail_thread_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
