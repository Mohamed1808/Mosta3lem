/**
 * Sign-in sessions. A device gets a random token once, when it signs in, and sends it on
 * every request. The database keeps only a SHA-256 hash of the token, so a copy of the
 * database cannot be used to sign in.
 *
 * A session ends at its expiry, or earlier when it has not been used for a while
 * (idleHoursFor: shorter for platform staff, whose accounts reach everyone's data).
 */
'use strict';

const crypto = require('crypto');

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

function createSessions(db, { ttlHours, idleHoursFor }) {
  const ttlMs = ttlHours * 3600 * 1000;
  return {
    async create(userId, userAgent) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + ttlMs);
      await db.query(
        'INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)',
        [hash(token), userId, expiresAt.toISOString(), (userAgent || '').slice(0, 300)]
      );
      return { token, expiresAt: expiresAt.getTime() };
    },

    /** The user id behind a token, or null when it is unknown, expired or idle too long. */
    async lookup(token) {
      if (!token || token.length > 200) return null;
      const h = hash(token);
      const row = (await db.query(
        `SELECT user_id, EXTRACT(EPOCH FROM (now() - last_seen_at)) AS idle_s
         FROM sessions WHERE token_hash = $1 AND expires_at > now()`, [h])).rows[0];
      if (!row) return null;
      const idleHours = idleHoursFor ? idleHoursFor(row.user_id) : null;
      if (idleHours && Number(row.idle_s) > idleHours * 3600) {
        await db.query('DELETE FROM sessions WHERE token_hash = $1', [h]);
        return null;
      }
      await db.query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [h]);
      return row.user_id;
    },

    async remove(token) {
      if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hash(token)]);
    },

    /** Sign a person out everywhere (used when an account is deactivated or reset). */
    async removeUser(userId) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    },

    async purgeExpired() {
      await db.query('DELETE FROM sessions WHERE expires_at <= now()');
    }
  };
}

module.exports = { createSessions };
