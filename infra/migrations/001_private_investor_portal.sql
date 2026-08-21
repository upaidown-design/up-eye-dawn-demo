CREATE SCHEMA IF NOT EXISTS private_portal;

CREATE TABLE IF NOT EXISTS private_portal.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private_portal.admin_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'VIEWER')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_secret_encrypted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique
  ON private_portal.admin_users (lower(email));

CREATE TABLE IF NOT EXISTS private_portal.nda_documents (
  id uuid PRIMARY KEY,
  version text NOT NULL UNIQUE,
  title text NOT NULL,
  effective_from timestamptz,
  effective_to timestamptz,
  legal_status text NOT NULL CHECK (legal_status IN ('DRAFT_FOR_WORKFLOW_TESTING', 'LEGAL_REVIEW', 'APPROVED', 'RETIRED')),
  content jsonb NOT NULL,
  content_sha256 text NOT NULL,
  reaccept_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES private_portal.admin_users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS private_portal.invitations (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  token_key_version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  organisation_name text NOT NULL DEFAULT '',
  intended_recipient_email text,
  allowed_email_domain text,
  policy text NOT NULL CHECK (policy IN ('SINGLE_VISITOR', 'MULTI_VISITOR')),
  nda_document_id uuid NOT NULL REFERENCES private_portal.nda_documents(id),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED')),
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  valid_from timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_registrations integer CHECK (max_registrations IS NULL OR max_registrations > 0),
  registration_count integer NOT NULL DEFAULT 0 CHECK (registration_count >= 0),
  manual_approval_required boolean NOT NULL DEFAULT false,
  scopes text[] NOT NULL DEFAULT ARRAY['INVESTOR']::text[],
  revoked_at timestamptz,
  revoked_by uuid REFERENCES private_portal.admin_users(id),
  revocation_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS private_portal.visitors (
  id uuid PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES private_portal.invitations(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  organisation text NOT NULL,
  role text NOT NULL DEFAULT '',
  country text NOT NULL,
  status text NOT NULL CHECK (status IN ('REGISTERED', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'REVOKED')),
  scopes text[] NOT NULL DEFAULT ARRAY['INVESTOR']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES private_portal.admin_users(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES private_portal.admin_users(id),
  revocation_reason text,
  last_access_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS visitor_identity_per_invitation_unique
  ON private_portal.visitors (invitation_id, lower(email));

CREATE TABLE IF NOT EXISTS private_portal.nda_acceptances (
  id uuid PRIMARY KEY,
  nda_document_id uuid NOT NULL REFERENCES private_portal.nda_documents(id),
  nda_version text NOT NULL,
  nda_content_hash text NOT NULL,
  invitation_id uuid NOT NULL REFERENCES private_portal.invitations(id),
  visitor_id uuid NOT NULL REFERENCES private_portal.visitors(id),
  full_name text NOT NULL,
  email text NOT NULL,
  organisation text NOT NULL,
  role text NOT NULL DEFAULT '',
  country text NOT NULL,
  typed_signature text NOT NULL,
  nda_confirmed boolean NOT NULL,
  privacy_confirmed boolean NOT NULL,
  accepted_at_utc timestamptz NOT NULL,
  user_agent text NOT NULL,
  encrypted_ip text NOT NULL,
  ip_key_version integer NOT NULL DEFAULT 1,
  ip_fingerprint text NOT NULL,
  masked_ip text NOT NULL,
  evidence_hash text NOT NULL UNIQUE,
  document_snapshot jsonb NOT NULL,
  pdf_bytes bytea,
  pdf_sha256 text,
  email_delivery_status text NOT NULL DEFAULT 'PENDING',
  revoked_at timestamptz,
  revoked_by uuid REFERENCES private_portal.admin_users(id),
  revocation_reason text
);

CREATE TABLE IF NOT EXISTS private_portal.visitor_sessions (
  id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL REFERENCES private_portal.visitors(id),
  invitation_id uuid NOT NULL REFERENCES private_portal.invitations(id),
  nda_acceptance_id uuid NOT NULL REFERENCES private_portal.nda_acceptances(id),
  session_token_hash text NOT NULL UNIQUE,
  token_key_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ip_fingerprint text NOT NULL,
  user_agent_hash text,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'INVALIDATED')),
  invalidated_at timestamptz,
  invalidation_reason text
);

CREATE TABLE IF NOT EXISTS private_portal.registration_contexts (
  id uuid PRIMARY KEY,
  context_token_hash text NOT NULL UNIQUE,
  invitation_id uuid NOT NULL REFERENCES private_portal.invitations(id),
  visitor_id uuid REFERENCES private_portal.visitors(id),
  purpose text NOT NULL CHECK (purpose IN ('REGISTRATION', 'REVERIFY', 'PENDING_APPROVAL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE TABLE IF NOT EXISTS private_portal.admin_sessions (
  id uuid PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES private_portal.admin_users(id),
  session_token_hash text NOT NULL UNIQUE,
  csrf_token_hash text NOT NULL,
  token_key_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ip_fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'INVALIDATED')),
  invalidated_at timestamptz,
  invalidation_reason text
);

CREATE TABLE IF NOT EXISTS private_portal.audit_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('INFO', 'NOTICE', 'WARNING', 'SECURITY')),
  actor_type text NOT NULL CHECK (actor_type IN ('SYSTEM', 'ADMIN', 'VISITOR', 'ANONYMOUS')),
  actor_id uuid,
  visitor_id uuid REFERENCES private_portal.visitors(id),
  admin_id uuid REFERENCES private_portal.admin_users(id),
  invitation_id uuid REFERENCES private_portal.invitations(id),
  session_id uuid,
  timestamp_utc timestamptz NOT NULL DEFAULT now(),
  ip_fingerprint text,
  masked_ip text,
  user_agent text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS private_portal.email_deliveries (
  id uuid PRIMARY KEY,
  kind text NOT NULL,
  recipient text NOT NULL,
  visitor_id uuid REFERENCES private_portal.visitors(id),
  invitation_id uuid REFERENCES private_portal.invitations(id),
  nda_acceptance_id uuid REFERENCES private_portal.nda_acceptances(id),
  status text NOT NULL,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS invitations_status_expiry_idx ON private_portal.invitations(status, expires_at);
CREATE INDEX IF NOT EXISTS invitations_org_idx ON private_portal.invitations(lower(organisation_name));
CREATE INDEX IF NOT EXISTS visitors_email_idx ON private_portal.visitors(lower(email));
CREATE INDEX IF NOT EXISTS visitors_org_idx ON private_portal.visitors(lower(organisation));
CREATE INDEX IF NOT EXISTS visitors_status_idx ON private_portal.visitors(status);
CREATE INDEX IF NOT EXISTS visitors_invitation_idx ON private_portal.visitors(invitation_id);
CREATE INDEX IF NOT EXISTS acceptances_visitor_idx ON private_portal.nda_acceptances(visitor_id, accepted_at_utc DESC);
CREATE INDEX IF NOT EXISTS acceptances_invitation_idx ON private_portal.nda_acceptances(invitation_id);
CREATE INDEX IF NOT EXISTS visitor_sessions_visitor_status_idx ON private_portal.visitor_sessions(visitor_id, status);
CREATE INDEX IF NOT EXISTS visitor_sessions_expiry_idx ON private_portal.visitor_sessions(status, expires_at, idle_expires_at);
CREATE INDEX IF NOT EXISTS visitor_sessions_ip_idx ON private_portal.visitor_sessions(ip_fingerprint);
CREATE INDEX IF NOT EXISTS registration_context_expiry_idx ON private_portal.registration_contexts(expires_at);
CREATE INDEX IF NOT EXISTS audit_events_time_idx ON private_portal.audit_events(timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS audit_events_visitor_idx ON private_portal.audit_events(visitor_id, timestamp_utc DESC);
