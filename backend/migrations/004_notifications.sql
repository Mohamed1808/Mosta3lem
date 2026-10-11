-- Delivering the engine's notifications: phone push, email and SMS.

-- Phones that asked for push notifications. A phone belongs to the sign-in it registered
-- with, so signing out (or being signed out everywhere) stops its notifications.
CREATE TABLE devices (
  token        text PRIMARY KEY,
  user_id      text NOT NULL,
  session_hash text NOT NULL,
  platform     text,
  lang         text NOT NULL DEFAULT 'ar',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_user ON devices (user_id);

-- One row per notification and channel: what was sent where, retries and errors.
-- channel: push | email | sms | none (nothing to send, or sent before delivery existed).
CREATE TABLE notification_deliveries (
  notification_id text NOT NULL,
  channel         text NOT NULL,
  destination     text NOT NULL DEFAULT '',
  status          text NOT NULL,
  attempts        integer NOT NULL DEFAULT 0,
  next_at         timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, channel, destination)
);
CREATE INDEX notification_deliveries_due ON notification_deliveries (status, next_at);

-- One-off jobs the server has done (so they are not repeated).
CREATE TABLE server_flags (
  key   text PRIMARY KEY,
  at    timestamptz NOT NULL DEFAULT now()
)
