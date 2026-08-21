ALTER TABLE private_portal.admin_sessions
  ADD COLUMN IF NOT EXISTS user_agent_hash text;

ALTER TABLE private_portal.registration_contexts
  ADD COLUMN IF NOT EXISTS ip_fingerprint text,
  ADD COLUMN IF NOT EXISTS user_agent_hash text,
  ADD COLUMN IF NOT EXISTS verified_email text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_provider_uid text;

CREATE INDEX IF NOT EXISTS admin_sessions_client_idx
  ON private_portal.admin_sessions(ip_fingerprint, user_agent_hash);

CREATE INDEX IF NOT EXISTS registration_context_client_idx
  ON private_portal.registration_contexts(ip_fingerprint, user_agent_hash);
