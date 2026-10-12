-- What the running platform reports about itself: backups and their restore tests (written
-- by ops/backup/backup.sh), and the alerts the API sent (so several copies do not repeat one).
CREATE TABLE ops_events (
  id     bigserial PRIMARY KEY,
  kind   text NOT NULL,          -- backup, restore_test, alert
  ok     boolean NOT NULL,
  detail jsonb,
  at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_events_kind_at ON ops_events (kind, at DESC);
