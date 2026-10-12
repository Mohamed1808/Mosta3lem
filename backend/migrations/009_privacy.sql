-- Data protection (Law 151 of 2020): requests from people about their data, and breaches.
-- Same shape as the other record tables (the whole record in doc, seq for order, rev for
-- several API copies), with columns for the deadlines Legal works to. The person's name,
-- national ID and phone stay inside doc only, like customers' details in cases.

CREATE TABLE data_requests (
  id          text PRIMARY KEY,
  seq         bigserial,
  doc         jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  rev         bigint NOT NULL DEFAULT 0,
  kind        text        GENERATED ALWAYS AS (doc->>'kind') STORED,
  status      text        GENERATED ALWAYS AS (doc->>'status') STORED,
  received_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'receivedAt') = 'number' THEN to_timestamp((doc->>'receivedAt')::double precision / 1000) END) STORED,
  due_at      timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'dueAt') = 'number' THEN to_timestamp((doc->>'dueAt')::double precision / 1000) END) STORED,
  CONSTRAINT data_requests_kind CHECK (kind IN ('access', 'correction', 'deletion', 'objection')),
  CONSTRAINT data_requests_status CHECK (status IN ('open', 'in_review', 'done', 'refused'))
);
CREATE INDEX data_requests_rev ON data_requests (rev);
CREATE INDEX data_requests_open ON data_requests (due_at) WHERE status IN ('open', 'in_review');

CREATE TABLE breaches (
  id             text PRIMARY KEY,
  seq            bigserial,
  doc            jsonb NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  rev            bigint NOT NULL DEFAULT 0,
  status         text        GENERATED ALWAYS AS (doc->>'status') STORED,
  severity       text        GENERATED ALWAYS AS (doc->>'severity') STORED,
  discovered_at  timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'discoveredAt') = 'number' THEN to_timestamp((doc->>'discoveredAt')::double precision / 1000) END) STORED,
  due_at         timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'dueAt') = 'number' THEN to_timestamp((doc->>'dueAt')::double precision / 1000) END) STORED,
  reported_at    timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'reportedAt') = 'number' THEN to_timestamp((doc->>'reportedAt')::double precision / 1000) END) STORED,
  CONSTRAINT breaches_status CHECK (status IN ('open', 'reported', 'closed')),
  CONSTRAINT breaches_severity CHECK (severity IN ('low', 'medium', 'high'))
);
CREATE INDEX breaches_rev ON breaches (rev);
CREATE INDEX breaches_open ON breaches (due_at) WHERE status = 'open';
