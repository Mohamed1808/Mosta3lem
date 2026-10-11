-- Mosta3lem: first schema.
--
-- One table per kind of record. For now each row keeps the whole record as JSON (doc),
-- exactly as the engine shapes it, so the engine and its tests carry over unchanged.
-- seq keeps the order records were added in, which lists such as the activity log rely on.
-- Later migrations pull fields out into proper columns, one area at a time.

CREATE TABLE users          (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE entities       (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE providers      (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE agents         (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE cases          (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE offers         (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE batches        (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ratings        (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE client_ratings (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE disputes       (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE invoices       (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications  (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit          (id text PRIMARY KEY, seq bigserial, doc jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());

-- Platform-wide values: settings (config), scores, reference counters, the demo clock.
CREATE TABLE platform_state (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());

-- Signed-in devices. Only a SHA-256 hash of each token is stored.
CREATE TABLE sessions (
  token_hash   text PRIMARY KEY,
  user_id      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  user_agent   text
);
CREATE INDEX sessions_user_id ON sessions (user_id);

CREATE INDEX cases_status ON cases ((doc->>'status'));
CREATE INDEX notifications_user ON notifications ((doc->>'userId'));
