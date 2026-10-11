-- Security events: sign-ins, failures, lockouts, password changes and sign-outs, with the
-- address and device they came from. For investigating misuse; kept apart from the
-- business activity log. Never holds passwords, codes or tokens.
CREATE TABLE security_events (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  kind       text NOT NULL,
  user_id    text,
  ip         text,
  user_agent text,
  detail     jsonb
);
CREATE INDEX security_events_user ON security_events (user_id, at);
CREATE INDEX security_events_kind ON security_events (kind, at)
