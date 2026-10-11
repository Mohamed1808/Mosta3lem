-- Rate limit counts shared by every copy of the API: one row per address and route group,
-- counting requests in the current window. UNLOGGED: fast, and losing the counts in a crash
-- only resets the limits.
CREATE UNLOGGED TABLE rate_limits (
  key         text PRIMARY KEY,
  count       integer NOT NULL,
  window_ends timestamptz NOT NULL
);
CREATE INDEX rate_limits_window ON rate_limits (window_ends)
