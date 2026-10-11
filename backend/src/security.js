/**
 * The security event log (table security_events). Recording never stops a request: if the
 * write fails it is logged and the request carries on.
 */
'use strict';

function createSecurityLog(db, log) {
  return {
    /** kind: e.g. signin.password_failed; req: the request (address and device); detail: extra facts. */
    async record(kind, { userId, req, detail } = {}) {
      try {
        await db.query(
          'INSERT INTO security_events (kind, user_id, ip, user_agent, detail) VALUES ($1, $2, $3, $4, $5::jsonb)',
          [kind, userId || null, req ? req.ip : null, req ? String(req.headers['user-agent'] || '').slice(0, 300) : null, detail ? JSON.stringify(detail) : null]);
      } catch (e) {
        log.error({ err: e, kind }, 'could not record security event');
      }
    }
  };
}

module.exports = { createSecurityLog };
