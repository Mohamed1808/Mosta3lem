-- Authenticator apps for the second sign-in step of key staff (Super admin and Finance by
-- default, TOTP_ROLES). The secret is encrypted with a key derived from FILES_KEY; last_step
-- stops a code from being used twice. confirmed_at is set once the person typed a first code.
CREATE TABLE authenticators (
  user_id      text PRIMARY KEY,
  secret_enc   text NOT NULL,
  confirmed_at timestamptz,
  last_step    bigint NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
