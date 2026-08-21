ALTER TABLE private_portal.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE private_portal.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER')),
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES private_portal.admin_users(id),
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_by uuid REFERENCES private_portal.admin_users(id);

CREATE TABLE IF NOT EXISTS private_portal.team_invitations (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'VIEWER')),
  mfa_secret_encrypted text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED')),
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by uuid REFERENCES private_portal.admin_users(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES private_portal.admin_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS active_team_invitation_email_idx
  ON private_portal.team_invitations(lower(email)) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS team_invitations_status_expiry_idx
  ON private_portal.team_invitations(status, expires_at);

CREATE TABLE IF NOT EXISTS private_portal.admin_mfa_enrollments (
  id uuid PRIMARY KEY,
  admin_user_id uuid NOT NULL UNIQUE REFERENCES private_portal.admin_users(id) ON DELETE CASCADE,
  secret_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS private_portal.admin_password_resets (
  id uuid PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES private_portal.admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  mfa_secret_encrypted text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED')),
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS active_admin_password_reset_idx
  ON private_portal.admin_password_resets(admin_user_id) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS private_portal.project_decisions (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  context text NOT NULL DEFAULT '',
  decision text NOT NULL,
  alternatives text NOT NULL DEFAULT '',
  consequences text NOT NULL DEFAULT '',
  owner_admin_id uuid REFERENCES private_portal.admin_users(id),
  status text NOT NULL CHECK (status IN ('PROPOSED', 'DECIDED', 'REVISIT', 'ARCHIVED')),
  decision_at timestamptz,
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_decisions_status_idx
  ON private_portal.project_decisions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS private_portal.project_comments (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('EVENT', 'TASK', 'NOTE', 'DECISION')),
  entity_id uuid NOT NULL,
  body text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')) DEFAULT 'ACTIVE',
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_comments_entity_idx
  ON private_portal.project_comments(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS private_portal.project_change_history (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS project_change_history_entity_idx
  ON private_portal.project_change_history(entity_type, entity_id, changed_at DESC);
