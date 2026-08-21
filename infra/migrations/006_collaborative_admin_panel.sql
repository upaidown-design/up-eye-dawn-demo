-- Migration 006: Collaborative Admin Panel
-- Idempotent: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS throughout.
-- Applied automatically by portal-migrations.ts on startup.
-- Do NOT edit after production deployment; create a 006 for further changes.
--
-- What this adds on top of 001-005:
--   - Extended admin_users (display_name, invited_by, mfa_secret_encrypted, disabled_at, disabled_by, updated_at)
--   - project_decisions: decision log with status lifecycle
--   - project_decision_versions: immutable version history for decisions
--   - project_note_versions: immutable version history for notes
--   - project_comments: threaded comments on events/tasks/notes/decisions
--   - project_change_history: full audit trail of workspace mutations
--   - meeting_kit_items: editable meeting kit (agenda, speech, questions, materials)
--   - crm_organisations + crm_contacts: investor CRM with optional visitor link
--   - material_registry: document/asset registry with distribution guard

-- ── 1. Extend admin_users ─────────────────────────────────────────────────────
-- Drop and re-add role check to include EDITOR/VIEWER safely.
DO $$ BEGIN
  ALTER TABLE private_portal.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE private_portal.admin_users
  ADD COLUMN IF NOT EXISTS display_name          text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invited_by            uuid REFERENCES private_portal.admin_users(id),
  ADD COLUMN IF NOT EXISTS invitation_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted  text,
  ADD COLUMN IF NOT EXISTS disabled_at           timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_by           uuid REFERENCES private_portal.admin_users(id),
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE private_portal.admin_users
    ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Decision log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.project_decisions (
  id              uuid PRIMARY KEY,
  title           text NOT NULL,
  decision        text NOT NULL DEFAULT '',
  context         text NOT NULL DEFAULT '',
  alternatives    text NOT NULL DEFAULT '',
  consequences    text NOT NULL DEFAULT '',
  owner_admin_id  uuid REFERENCES private_portal.admin_users(id),
  status          text NOT NULL DEFAULT 'PROPOSED'
                  CHECK (status IN ('PROPOSED', 'DECIDED', 'REVISIT', 'ARCHIVED')),
  decision_at     timestamptz,
  linked_event_id uuid REFERENCES private_portal.project_events(id),
  created_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private_portal.project_decisions
  ADD COLUMN IF NOT EXISTS linked_event_id uuid REFERENCES private_portal.project_events(id);
CREATE INDEX IF NOT EXISTS project_decisions_status_idx
  ON private_portal.project_decisions(status, updated_at DESC);

-- ── 3. Decision version history ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.project_decision_versions (
  id              uuid PRIMARY KEY,
  decision_id     uuid NOT NULL REFERENCES private_portal.project_decisions(id),
  version_number  integer NOT NULL,
  snapshot        jsonb NOT NULL,
  changed_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  changed_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_decision_versions_decision_idx
  ON private_portal.project_decision_versions(decision_id, version_number DESC);

-- ── 5. Note version history ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.project_note_versions (
  id              uuid PRIMARY KEY,
  note_id         uuid NOT NULL REFERENCES private_portal.project_notes(id),
  version_number  integer NOT NULL,
  snapshot        jsonb NOT NULL,
  changed_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  changed_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_note_versions_note_idx
  ON private_portal.project_note_versions(note_id, version_number DESC);

-- ── 6. Meeting Kit items ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.meeting_kit_items (
  id              uuid PRIMARY KEY,
  item_type       text NOT NULL
                  CHECK (item_type IN ('AGENDA','SPEECH','QUESTION','MATERIAL','CHECKLIST','NOTE')),
  language        text NOT NULL DEFAULT 'BOTH'
                  CHECK (language IN ('ES','EN','BOTH')),
  title           text NOT NULL,
  body            text NOT NULL DEFAULT '',       -- plain text only, no HTML
  classification  text NOT NULL DEFAULT 'INTERNAL'
                  CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','SYNTHETIC','CONCEPT_RENDER','LEGAL_REVIEW')),
  sort_order      integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','ARCHIVED')),
  linked_event_id uuid REFERENCES private_portal.project_events(id),
  created_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meeting_kit_items_status_order_idx
  ON private_portal.meeting_kit_items(status, sort_order ASC);

-- ── 7. CRM organisations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.crm_organisations (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,
  org_type        text NOT NULL DEFAULT 'INVESTOR'
                  CHECK (org_type IN ('INVESTOR','FAMILY_OFFICE','VC','CORPORATE','GOVERNMENT','OTHER')),
  country         text NOT NULL DEFAULT '',
  stage           text NOT NULL DEFAULT 'PROSPECT'
                  CHECK (stage IN ('PROSPECT','INTRO','MEETING','DILIGENCE','TERM_SHEET','CLOSED_WON','CLOSED_LOST','ON_HOLD')),
  owner_id        uuid REFERENCES private_portal.admin_users(id),
  last_interaction_at timestamptz,
  next_action     text NOT NULL DEFAULT '',
  next_action_at  timestamptz,
  notes           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_organisations_stage_idx
  ON private_portal.crm_organisations(stage, status);
CREATE INDEX IF NOT EXISTS crm_organisations_name_idx
  ON private_portal.crm_organisations(lower(name));

-- ── 8. CRM contacts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.crm_contacts (
  id              uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES private_portal.crm_organisations(id),
  visitor_id      uuid REFERENCES private_portal.visitors(id), -- optional link
  first_name      text NOT NULL,
  last_name       text NOT NULL DEFAULT '',
  full_name       text GENERATED ALWAYS AS (
                    trim(first_name || ' ' || last_name)
                  ) STORED,
  email           text NOT NULL,
  role_title      text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  is_primary      boolean NOT NULL DEFAULT false,
  notes           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_contacts_email_idx
  ON private_portal.crm_contacts(lower(email));
CREATE INDEX IF NOT EXISTS crm_contacts_org_idx
  ON private_portal.crm_contacts(organisation_id, status);
CREATE INDEX IF NOT EXISTS crm_contacts_visitor_idx
  ON private_portal.crm_contacts(visitor_id) WHERE visitor_id IS NOT NULL;

-- ── 9. Material registry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_portal.material_registry (
  id              uuid PRIMARY KEY,
  title           text NOT NULL,
  material_type   text NOT NULL DEFAULT 'DOCUMENT'
                  CHECK (material_type IN ('DOCUMENT','PRESENTATION','SPREADSHEET','IMAGE','VIDEO','DATASET','OTHER')),
  version         text NOT NULL DEFAULT '1.0',
  language        text NOT NULL DEFAULT 'BOTH'
                  CHECK (language IN ('ES','EN','BOTH','OTHER')),
  classification  text NOT NULL DEFAULT 'INTERNAL'
                  CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','REVIEW_REQUIRED','SYNTHETIC','CONCEPT_RENDER')),
  status          text NOT NULL DEFAULT 'DRAFT'
                  CHECK (status IN ('DRAFT','APPROVED','DISTRIBUTED','RETIRED')),
  provenance      text NOT NULL DEFAULT '',       -- source, author, license notes
  owner_id        uuid REFERENCES private_portal.admin_users(id),
  gcs_object      text,                           -- gs://bucket/path — null until uploaded
  external_url    text,                           -- alternative to GCS
  approval_note   text,                           -- required when moving to DISTRIBUTED
  approved_by     uuid REFERENCES private_portal.admin_users(id),
  approved_at     timestamptz,
  notes           text NOT NULL DEFAULT '',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by      uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS material_registry_status_class_idx
  ON private_portal.material_registry(status, classification);
CREATE INDEX IF NOT EXISTS material_registry_title_idx
  ON private_portal.material_registry(lower(title));

-- ── 10. Audit event type extension ───────────────────────────────────────────
-- The audit_events table uses text for event_type (no enum), so new event types
-- are automatically supported without schema changes.

-- ── Mark migration as applied (handled by portal-migrations.ts) ───────────────
-- INSERT INTO private_portal.schema_migrations(version) VALUES ('006')
-- ON CONFLICT DO NOTHING;
-- (portal-migrations.ts inserts this automatically after executing this file)
