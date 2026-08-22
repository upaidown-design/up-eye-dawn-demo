-- Workflow integrity constraints added after the end-to-end portal audit.

DO $$ BEGIN
  ALTER TABLE private_portal.project_events
    ADD CONSTRAINT project_events_valid_interval
    CHECK (ends_at IS NULL OR ends_at > starts_at);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS project_note_versions_number_uidx
  ON private_portal.project_note_versions(note_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS project_decision_versions_number_uidx
  ON private_portal.project_decision_versions(decision_id, version_number);
