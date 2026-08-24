CREATE TABLE IF NOT EXISTS private_portal.project_events (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  location text NOT NULL DEFAULT '',
  event_type text NOT NULL CHECK (event_type IN ('MEETING', 'VISIT', 'DEADLINE', 'PRESENTATION', 'TRAVEL', 'OTHER')),
  status text NOT NULL CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ARCHIVED')),
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  owner_name text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS private_portal.project_tasks (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  due_at timestamptz,
  status text NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'ARCHIVED')),
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  linked_event_id uuid REFERENCES private_portal.project_events(id),
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private_portal.project_notes (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL CHECK (category IN ('GENERAL', 'MEETING', 'INVESTOR', 'PRODUCT', 'LEGAL', 'FINANCE', 'TECHNICAL')),
  pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  updated_by uuid NOT NULL REFERENCES private_portal.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_events_schedule_idx
  ON private_portal.project_events(status, starts_at);
CREATE INDEX IF NOT EXISTS project_tasks_status_due_idx
  ON private_portal.project_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS project_notes_active_idx
  ON private_portal.project_notes(status, pinned DESC, updated_at DESC);
