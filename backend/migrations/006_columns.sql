-- Proper columns. Each record stays whole in doc (the engine reads and writes it as is), and
-- PostgreSQL derives typed columns from it on every write (GENERATED ... STORED): ids that
-- link records, statuses, dates and amounts. On top of them: links between tables that the
-- database enforces, checks, indexes, and views for reports.
--
-- Dates in doc are milliseconds since 1970; numbers and dates are only read when the value
-- really is a number, so an unexpected shape gives an empty column, never a failed write.
-- Customers' personal data (names, national IDs, phones, addresses) gets no columns.

-- users
ALTER TABLE users
  ADD COLUMN role        text        GENERATED ALWAYS AS (doc->>'role') STORED,
  ADD COLUMN email       text        GENERATED ALWAYS AS (lower(doc->>'email')) STORED,
  ADD COLUMN entity_id   text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN provider_id text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN agent_id    text        GENERATED ALWAYS AS (doc->>'agentId') STORED,
  ADD COLUMN active      boolean     GENERATED ALWAYS AS (coalesce((doc->'active') <> 'false'::jsonb, true)) STORED,
  ADD COLUMN created_at  timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED;

-- entities (client organisations)
ALTER TABLE entities
  ADD COLUMN name       text        GENERATED ALWAYS AS (doc->>'name') STORED,
  ADD COLUMN type       text        GENERATED ALWAYS AS (doc->>'type') STORED,
  ADD COLUMN city       text        GENERATED ALWAYS AS (doc->>'city') STORED,
  ADD COLUMN active     boolean     GENERATED ALWAYS AS (coalesce((doc->'active') <> 'false'::jsonb, true)) STORED,
  ADD COLUMN created_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED;

-- providers
ALTER TABLE providers
  ADD COLUMN name                text        GENERATED ALWAYS AS (doc->>'name') STORED,
  ADD COLUMN kind                text        GENERATED ALWAYS AS (doc->>'kind') STORED,
  ADD COLUMN city                text        GENERATED ALWAYS AS (doc->>'city') STORED,
  ADD COLUMN verification_status text        GENERATED ALWAYS AS (doc->'verification'->>'status') STORED,
  ADD COLUMN enforcement_level   text        GENERATED ALWAYS AS (doc->'enforcement'->>'level') STORED,
  ADD COLUMN joined_at           timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'joinedAt') = 'number' THEN to_timestamp((doc->>'joinedAt')::double precision / 1000) END) STORED;

-- agents (field agents)
ALTER TABLE agents
  ADD COLUMN provider_id   text    GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN user_id       text    GENERATED ALWAYS AS (doc->>'userId') STORED,
  ADD COLUMN supervisor_id text    GENERATED ALWAYS AS (doc->>'supervisorId') STORED,
  ADD COLUMN active        boolean GENERATED ALWAYS AS (coalesce((doc->'active') <> 'false'::jsonb, true)) STORED;

-- cases
ALTER TABLE cases
  ADD COLUMN ref          text        GENERATED ALWAYS AS (doc->>'ref') STORED,
  ADD COLUMN service      text        GENERATED ALWAYS AS (doc->>'service') STORED,
  ADD COLUMN status       text        GENERATED ALWAYS AS (doc->>'status') STORED,
  ADD COLUMN entity_id    text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN provider_id  text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN agent_id     text        GENERATED ALWAYS AS (doc->>'agentId') STORED,
  ADD COLUMN batch_id     text        GENERATED ALWAYS AS (doc->>'batchId') STORED,
  ADD COLUMN offer_id     text        GENERATED ALWAYS AS (doc->>'offerId') STORED,
  ADD COLUMN governorate  text        GENERATED ALWAYS AS (doc->>'governorate') STORED,
  ADD COLUMN price        numeric     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'price') = 'number' THEN (doc->>'price')::numeric END) STORED,
  ADD COLUMN on_time      boolean     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'onTime') = 'boolean' THEN (doc->>'onTime')::boolean END) STORED,
  ADD COLUMN outcome      text        GENERATED ALWAYS AS (doc->>'outcome') STORED,
  ADD COLUMN created_at   timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED,
  ADD COLUMN submitted_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'submittedAt') = 'number' THEN to_timestamp((doc->>'submittedAt')::double precision / 1000) END) STORED,
  ADD COLUMN due_at       timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'dueAt') = 'number' THEN to_timestamp((doc->>'dueAt')::double precision / 1000) END) STORED,
  ADD COLUMN delivered_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'deliveredAt') = 'number' THEN to_timestamp((doc->>'deliveredAt')::double precision / 1000) END) STORED,
  ADD COLUMN closed_at    timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'closedAt') = 'number' THEN to_timestamp((doc->>'closedAt')::double precision / 1000) END) STORED;

-- offers
ALTER TABLE offers
  ADD COLUMN provider_id  text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN entity_id    text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN service      text        GENERATED ALWAYS AS (doc->>'service') STORED,
  ADD COLUMN batch_id     text        GENERATED ALWAYS AS (doc->>'batchId') STORED,
  ADD COLUMN status       text        GENERATED ALWAYS AS (doc->>'status') STORED,
  ADD COLUMN sent_at      timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'sentAt') = 'number' THEN to_timestamp((doc->>'sentAt')::double precision / 1000) END) STORED,
  ADD COLUMN expires_at   timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'expiresAt') = 'number' THEN to_timestamp((doc->>'expiresAt')::double precision / 1000) END) STORED,
  ADD COLUMN responded_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'respondedAt') = 'number' THEN to_timestamp((doc->>'respondedAt')::double precision / 1000) END) STORED;

-- batches (bulk uploads)
ALTER TABLE batches
  ADD COLUMN ref        text        GENERATED ALWAYS AS (doc->>'ref') STORED,
  ADD COLUMN entity_id  text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN service    text        GENERATED ALWAYS AS (doc->>'service') STORED,
  ADD COLUMN created_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED,
  ADD COLUMN closed_at  timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'closedAt') = 'number' THEN to_timestamp((doc->>'closedAt')::double precision / 1000) END) STORED;

-- ratings (organisations rating providers)
ALTER TABLE ratings
  ADD COLUMN provider_id text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN entity_id   text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN case_id     text        GENERATED ALWAYS AS (doc->>'caseId') STORED,
  ADD COLUMN overall     numeric     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'overall') = 'number' THEN (doc->>'overall')::numeric END) STORED,
  ADD COLUMN status      text        GENERATED ALWAYS AS (doc->>'status') STORED,
  ADD COLUMN created_at  timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED;

-- client_ratings (providers rating organisations)
ALTER TABLE client_ratings
  ADD COLUMN provider_id        text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN entity_id          text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN data_quality       numeric     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'dataQuality') = 'number' THEN (doc->>'dataQuality')::numeric END) STORED,
  ADD COLUMN payment_timeliness numeric     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'paymentTimeliness') = 'number' THEN (doc->>'paymentTimeliness')::numeric END) STORED,
  ADD COLUMN created_at         timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED;

-- disputes
ALTER TABLE disputes
  ADD COLUMN ref         text        GENERATED ALWAYS AS (doc->>'ref') STORED,
  ADD COLUMN kind        text        GENERATED ALWAYS AS (doc->>'kind') STORED,
  ADD COLUMN status      text        GENERATED ALWAYS AS (doc->>'status') STORED,
  ADD COLUMN case_id     text        GENERATED ALWAYS AS (doc->>'caseId') STORED,
  ADD COLUMN entity_id   text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN provider_id text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN created_at  timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'createdAt') = 'number' THEN to_timestamp((doc->>'createdAt')::double precision / 1000) END) STORED,
  ADD COLUMN resolved_at timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'resolvedAt') = 'number' THEN to_timestamp((doc->>'resolvedAt')::double precision / 1000) END) STORED;

-- invoices
ALTER TABLE invoices
  ADD COLUMN ref         text        GENERATED ALWAYS AS (doc->>'ref') STORED,
  ADD COLUMN entity_id   text        GENERATED ALWAYS AS (doc->>'entityId') STORED,
  ADD COLUMN provider_id text        GENERATED ALWAYS AS (doc->>'providerId') STORED,
  ADD COLUMN month       text        GENERATED ALWAYS AS (doc->>'month') STORED,
  ADD COLUMN status      text        GENERATED ALWAYS AS (doc->>'status') STORED,
  ADD COLUMN fee_pct     numeric     GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'platformFeePct') = 'number' THEN (doc->>'platformFeePct')::numeric END) STORED,
  ADD COLUMN issued_at   timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'issuedAt') = 'number' THEN to_timestamp((doc->>'issuedAt')::double precision / 1000) END) STORED,
  ADD COLUMN paid_at     timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'paidAt') = 'number' THEN to_timestamp((doc->>'paidAt')::double precision / 1000) END) STORED;

-- notifications
ALTER TABLE notifications
  ADD COLUMN user_id text        GENERATED ALWAYS AS (doc->>'userId') STORED,
  ADD COLUMN key     text        GENERATED ALWAYS AS (doc->>'key') STORED,
  ADD COLUMN read    boolean     GENERATED ALWAYS AS (coalesce((doc->'read') = 'true'::jsonb, false)) STORED,
  ADD COLUMN at      timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'at') = 'number' THEN to_timestamp((doc->>'at')::double precision / 1000) END) STORED;

-- audit (the activity log)
ALTER TABLE audit
  ADD COLUMN at          timestamptz GENERATED ALWAYS AS (CASE WHEN jsonb_typeof(doc->'at') = 'number' THEN to_timestamp((doc->>'at')::double precision / 1000) END) STORED,
  ADD COLUMN actor_id    text        GENERATED ALWAYS AS (doc->>'actorId') STORED,
  ADD COLUMN actor_role  text        GENERATED ALWAYS AS (doc->>'actorRole') STORED,
  ADD COLUMN action      text        GENERATED ALWAYS AS (doc->>'action') STORED,
  ADD COLUMN target_type text        GENERATED ALWAYS AS (doc->>'targetType') STORED,
  ADD COLUMN target_id   text        GENERATED ALWAYS AS (doc->>'targetId') STORED;

-- Every row's id is the id inside its record.
ALTER TABLE users          ADD CONSTRAINT users_id_matches          CHECK (doc->>'id' = id);
ALTER TABLE entities       ADD CONSTRAINT entities_id_matches       CHECK (doc->>'id' = id);
ALTER TABLE providers      ADD CONSTRAINT providers_id_matches      CHECK (doc->>'id' = id);
ALTER TABLE agents         ADD CONSTRAINT agents_id_matches         CHECK (doc->>'id' = id);
ALTER TABLE cases          ADD CONSTRAINT cases_id_matches          CHECK (doc->>'id' = id);
ALTER TABLE offers         ADD CONSTRAINT offers_id_matches         CHECK (doc->>'id' = id);
ALTER TABLE batches        ADD CONSTRAINT batches_id_matches        CHECK (doc->>'id' = id);
ALTER TABLE ratings        ADD CONSTRAINT ratings_id_matches        CHECK (doc->>'id' = id);
ALTER TABLE client_ratings ADD CONSTRAINT client_ratings_id_matches CHECK (doc->>'id' = id);
ALTER TABLE disputes       ADD CONSTRAINT disputes_id_matches       CHECK (doc->>'id' = id);
ALTER TABLE invoices       ADD CONSTRAINT invoices_id_matches       CHECK (doc->>'id' = id);
ALTER TABLE notifications  ADD CONSTRAINT notifications_id_matches  CHECK (doc->>'id' = id);
ALTER TABLE audit          ADD CONSTRAINT audit_id_matches          CHECK (doc->>'id' = id);

-- Values that must make sense.
ALTER TABLE users     ADD CONSTRAINT users_role_present   CHECK (role IS NOT NULL AND role <> '');
ALTER TABLE cases     ADD CONSTRAINT cases_service_known  CHECK (service IN ('investigation', 'collection'));
ALTER TABLE cases     ADD CONSTRAINT cases_status_present CHECK (status IS NOT NULL AND status <> '');
ALTER TABLE cases     ADD CONSTRAINT cases_price_positive CHECK (price IS NULL OR price >= 0);
ALTER TABLE invoices  ADD CONSTRAINT invoices_fee_range   CHECK (fee_pct IS NULL OR (fee_pct >= 0 AND fee_pct <= 100));
ALTER TABLE ratings   ADD CONSTRAINT ratings_overall_range CHECK (overall IS NULL OR (overall >= 0 AND overall <= 5));

-- One account per email.
CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE email IS NOT NULL AND email <> '';

-- Links the database enforces. They are checked when a save commits, so a save that adds an
-- organisation and its first user together is fine in either order.
ALTER TABLE users     ADD CONSTRAINT users_entity_fk      FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE users     ADD CONSTRAINT users_provider_fk    FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE users     ADD CONSTRAINT users_agent_fk       FOREIGN KEY (agent_id)    REFERENCES agents    (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE agents    ADD CONSTRAINT agents_provider_fk   FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE agents    ADD CONSTRAINT agents_user_fk       FOREIGN KEY (user_id)     REFERENCES users     (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE cases     ADD CONSTRAINT cases_entity_fk      FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE cases     ADD CONSTRAINT cases_provider_fk    FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE cases     ADD CONSTRAINT cases_agent_fk       FOREIGN KEY (agent_id)    REFERENCES agents    (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE cases     ADD CONSTRAINT cases_batch_fk       FOREIGN KEY (batch_id)    REFERENCES batches   (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE offers    ADD CONSTRAINT offers_provider_fk   FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE offers    ADD CONSTRAINT offers_entity_fk     FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE batches   ADD CONSTRAINT batches_entity_fk    FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ratings   ADD CONSTRAINT ratings_provider_fk  FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ratings   ADD CONSTRAINT ratings_entity_fk    FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ratings   ADD CONSTRAINT ratings_case_fk      FOREIGN KEY (case_id)     REFERENCES cases     (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE disputes  ADD CONSTRAINT disputes_case_fk     FOREIGN KEY (case_id)     REFERENCES cases     (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE disputes  ADD CONSTRAINT disputes_entity_fk   FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE disputes  ADD CONSTRAINT disputes_provider_fk FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE invoices  ADD CONSTRAINT invoices_entity_fk   FOREIGN KEY (entity_id)   REFERENCES entities  (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE invoices  ADD CONSTRAINT invoices_provider_fk FOREIGN KEY (provider_id) REFERENCES providers (id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) DEFERRABLE INITIALLY DEFERRED;

-- Indexes for the common questions.
DROP INDEX IF EXISTS cases_status;
DROP INDEX IF EXISTS notifications_user;
CREATE INDEX cases_status_due        ON cases (status, due_at);
CREATE INDEX cases_entity            ON cases (entity_id, created_at);
CREATE INDEX cases_provider          ON cases (provider_id, status);
CREATE INDEX cases_agent             ON cases (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX offers_provider_status  ON offers (provider_id, status);
CREATE INDEX invoices_entity_month   ON invoices (entity_id, month);
CREATE INDEX invoices_provider_month ON invoices (provider_id, month);
CREATE INDEX notifications_user_read ON notifications (user_id, read, at);
CREATE INDEX audit_at                ON audit (at);
CREATE INDEX audit_target            ON audit (target_type, target_id);
CREATE INDEX users_entity            ON users (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX users_provider          ON users (provider_id) WHERE provider_id IS NOT NULL;

-- Views for reports (no customers' personal data).
CREATE VIEW report_cases AS
SELECT c.id, c.ref, c.service, c.status, c.governorate,
       c.entity_id, e.name AS organisation, c.provider_id, p.name AS provider,
       c.price, c.on_time, c.outcome,
       c.created_at, c.submitted_at, c.due_at, c.delivered_at, c.closed_at,
       CASE WHEN c.delivered_at IS NOT NULL AND c.submitted_at IS NOT NULL
            THEN round(EXTRACT(EPOCH FROM (c.delivered_at - c.submitted_at)) / 3600, 1) END AS hours_to_deliver
FROM cases c
LEFT JOIN entities e ON e.id = c.entity_id
LEFT JOIN providers p ON p.id = c.provider_id;

CREATE VIEW report_invoices AS
SELECT i.id, i.ref, i.month, i.status, i.fee_pct,
       i.entity_id, e.name AS organisation, i.provider_id, p.name AS provider,
       jsonb_array_length(coalesce(i.doc->'lines', '[]'::jsonb)) AS lines,
       i.issued_at, i.paid_at
FROM invoices i
LEFT JOIN entities e ON e.id = i.entity_id
LEFT JOIN providers p ON p.id = i.provider_id;

CREATE VIEW report_providers AS
SELECT p.id, p.name, p.kind, p.city, p.verification_status, p.enforcement_level, p.joined_at,
       count(c.id) FILTER (WHERE c.status IS NOT NULL) AS cases,
       count(c.id) FILTER (WHERE c.closed_at IS NOT NULL) AS closed_cases,
       round(100.0 * count(c.id) FILTER (WHERE c.on_time) / nullif(count(c.id) FILTER (WHERE c.on_time IS NOT NULL), 0), 1) AS on_time_pct,
       (SELECT round(avg(r.overall), 2) FROM ratings r WHERE r.provider_id = p.id) AS avg_rating
FROM providers p
LEFT JOIN cases c ON c.provider_id = p.id
GROUP BY p.id
