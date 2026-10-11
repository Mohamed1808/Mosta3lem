-- Several copies of the API on one database. Every saved change gets the next number from
-- data_rev, so a copy can pick up exactly what the others changed since it last looked:
-- changed rows carry it in rev, removed rows leave a note in removed_records.
CREATE SEQUENCE data_rev;

ALTER TABLE users          ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE entities       ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE providers      ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE agents         ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE cases          ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE offers         ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE batches        ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE ratings        ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE client_ratings ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE disputes       ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE invoices       ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE notifications  ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE audit          ADD COLUMN rev bigint NOT NULL DEFAULT 0;
ALTER TABLE platform_state ADD COLUMN rev bigint NOT NULL DEFAULT 0;

CREATE INDEX users_rev          ON users (rev);
CREATE INDEX entities_rev       ON entities (rev);
CREATE INDEX providers_rev      ON providers (rev);
CREATE INDEX agents_rev         ON agents (rev);
CREATE INDEX cases_rev          ON cases (rev);
CREATE INDEX offers_rev         ON offers (rev);
CREATE INDEX batches_rev        ON batches (rev);
CREATE INDEX ratings_rev        ON ratings (rev);
CREATE INDEX client_ratings_rev ON client_ratings (rev);
CREATE INDEX disputes_rev       ON disputes (rev);
CREATE INDEX invoices_rev       ON invoices (rev);
CREATE INDEX notifications_rev  ON notifications (rev);
CREATE INDEX audit_rev          ON audit (rev);
CREATE INDEX platform_state_rev ON platform_state (rev);

CREATE TABLE removed_records (
  rev        bigint PRIMARY KEY,
  table_name text NOT NULL,
  id         text NOT NULL,
  at         timestamptz NOT NULL DEFAULT now()
)
