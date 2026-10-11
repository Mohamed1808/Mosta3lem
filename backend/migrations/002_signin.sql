-- Real sign-in: passwords, one-time codes, invitation and reset links, outgoing messages.

-- Passwords of organisation users and platform staff (providers sign in with their mobile).
-- password_hash is scrypt with a random salt; the password itself is never stored.
CREATE TABLE credentials (
  user_id         text PRIMARY KEY,
  password_hash   text,
  password_set_at timestamptz,
  failed_count    integer NOT NULL DEFAULT 0,
  locked_until    timestamptz
);

-- One-time codes sent by SMS or email. Only a hash of the code is kept.
-- purpose: signin (signs the person in) or signup (proves a new provider owns the mobile).
CREATE TABLE sign_in_codes (
  id          text PRIMARY KEY,
  purpose     text NOT NULL,
  user_id     text,
  channel     text NOT NULL,
  destination text NOT NULL,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  proof_hash  text,
  proof_expires_at timestamptz
);
CREATE INDEX sign_in_codes_destination ON sign_in_codes (destination, created_at);

-- Links to choose a password: invite (new account) or reset. Only a hash of the token is kept.
CREATE TABLE password_tokens (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL,
  purpose    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);
CREATE INDEX password_tokens_user ON password_tokens (user_id);

-- Every message the platform sends, for support and auditing. With the development
-- messenger the text is kept here so codes can be read during testing; real SMS and email
-- providers store only who, which template and when.
CREATE TABLE outbox (
  id          bigserial PRIMARY KEY,
  channel     text NOT NULL,
  destination text NOT NULL,
  template    text NOT NULL,
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  error       text
);
