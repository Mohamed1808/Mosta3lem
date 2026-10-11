-- Stored files: case photos, provider documents and their renewals.
-- The content itself is in the file store (see src/files.js), encrypted; this table only
-- describes each file. Records in the engine point to a file as "file:<id>".
CREATE TABLE files (
  id          text PRIMARY KEY,
  mime        text NOT NULL,
  size_bytes  integer NOT NULL,
  sha256      text NOT NULL,
  storage_key text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  deleted_at  timestamptz
);
CREATE INDEX files_created ON files (created_at)
