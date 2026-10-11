/**
 * The security event log (table security_events): recording, and reading it back for the
 * console's Security log page.
 *
 *   POST /api/v1/security/events  { group?, days?, q?, userId?, before? }
 *     Signed in, with the security.view permission (Legal; the Super admin has every
 *     permission). Returns { events, summary, next }. Opening the log is itself recorded.
 */
'use strict';

/** Event kinds by what they mean, for filtering. */
const GROUPS = {
  signin: ['signin.ok', 'signin.demo'],
  failed: ['signin.password_failed', 'signin.code_failed', 'signin.unknown_email', 'signin.while_locked'],
  locked: ['signin.locked'],
  password: ['password.reset_requested', 'password.set'],
  signout: ['signout.everywhere'],
  log: ['security_log.viewed']
};
const FAILURES = GROUPS.failed.concat(GROUPS.locked);
const PAGE = 100;

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

function registerSecurityLog(app, { db, sessions, ICM, security }) {
  const userById = (id) => ICM.store.db.users.find((u) => u.id === id) || null;
  const refuse = (reply, code, key) => reply.code(code).send({ ok: false, error: { key, params: null } });

  app.post('/api/v1/security/events', async (req, reply) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7).trim() : null;
    const viewerId = token ? await sessions.lookup(token) : null;
    if (!viewerId) return refuse(reply, 401, 'errors.notSignedIn');
    const viewer = userById(viewerId);
    if (!viewer || !ICM.wf.isPlatformRole(viewer.role) || !ICM.wf.can(viewer.role, 'security.view')) return refuse(reply, 403, 'errors.forbidden');

    const b = req.body || {};
    const days = [1, 7, 30, 90].includes(Number(b.days)) ? Number(b.days) : 7;
    const where = ["at > now() - make_interval(days => $1::int)"];
    const params = [days];
    const add = (sql, value) => { params.push(value); where.push(sql.replace('?', '$' + params.length)); };
    if (b.group && GROUPS[b.group]) add('kind = ANY(?)', GROUPS[b.group]);
    if (b.userId) add('user_id = ?', String(b.userId));
    if (b.before) add('id < ?', Number(b.before));
    const q = String(b.q || '').trim().toLowerCase();
    if (q) {
      // A name or email finds that person's events; anything else is looked for in the address.
      const ids = ICM.store.db.users.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').includes(q)).map((u) => u.id);
      params.push(ids, '%' + q + '%');
      where.push(`(user_id = ANY($${params.length - 1}) OR ip ILIKE $${params.length})`);
    }
    const rows = (await db.query(
      `SELECT id, at, kind, user_id, ip, user_agent, detail FROM security_events WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ${PAGE + 1}`, params)).rows;

    const events = rows.slice(0, PAGE).map((r) => {
      const u = r.user_id ? userById(r.user_id) : null;
      return {
        id: Number(r.id), at: new Date(r.at).getTime(), kind: r.kind, ip: r.ip, userAgent: r.user_agent, detail: r.detail || null,
        user: u ? { id: u.id, name: u.name, role: u.role } : r.user_id ? { id: r.user_id, name: null, role: null } : null
      };
    });

    // The last 24 hours at a glance (only on the first page).
    let summary = null;
    if (!b.before) {
      const s = (await db.query(
        `SELECT count(*) FILTER (WHERE kind = ANY($1))::int AS signins,
                count(*) FILTER (WHERE kind = ANY($2))::int AS failures,
                count(*) FILTER (WHERE kind = 'signin.locked')::int AS lockouts,
                count(DISTINCT ip) FILTER (WHERE kind = ANY($2))::int AS failing_addresses
         FROM security_events WHERE at > now() - interval '24 hours'`, [GROUPS.signin, FAILURES])).rows[0];
      const top = (await db.query(
        `SELECT ip, count(*)::int AS n FROM security_events
         WHERE at > now() - interval '24 hours' AND kind = ANY($1) AND ip IS NOT NULL
         GROUP BY ip ORDER BY n DESC LIMIT 5`, [FAILURES])).rows;
      summary = { signins: s.signins, failures: s.failures, lockouts: s.lockouts, failingAddresses: s.failing_addresses, topFailing: top };
      // Opening the log is recorded once a minute per view (reloads are not counted again).
      const detail = { group: b.group || null, days, q: q || null };
      const recent = (await db.query(
        `SELECT 1 FROM security_events WHERE kind = 'security_log.viewed' AND user_id = $1 AND detail = $2::jsonb AND at > now() - interval '1 minute' LIMIT 1`,
        [viewerId, JSON.stringify(detail)])).rows.length;
      if (!recent) await security.record('security_log.viewed', { userId: viewerId, req, detail });
    }

    return { ok: true, result: { events, summary, next: rows.length > PAGE ? events[events.length - 1].id : null } };
  });
}

module.exports = { createSecurityLog, registerSecurityLog, GROUPS };
