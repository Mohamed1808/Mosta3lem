/**
 * Delivering notifications. The engine already records who should hear about what
 * (a new offer, a deadline at risk, a delivered report: 59 kinds). Here the server sends
 * each new record out:
 *
 *   push   to every phone the person signed in on (all kinds)
 *   email  for the kinds organisations and staff must not miss (EMAIL_KEYS)
 *   sms    for urgent provider kinds (SMS_KEYS), only when the person has no phone with push
 *
 * Each send is a row in notification_deliveries, retried with growing waits up to 5 times.
 *
 * Once a day, after DIGEST_HOUR in Cairo, organisation users also get a summary email
 * (digests(): the engine picks who, marking each person for the day, and writes the text).
 *
 *   POST /api/v1/devices/register    { token, platform, lang }  (signed in)
 *   POST /api/v1/devices/unregister  { token }
 *
 * Push goes through a driver (PUSH_DRIVER): dev (log and outbox) or expo (the Expo push
 * service, which forwards to Apple and Google). Push leaves Egypt by nature, so a push
 * carries no names: only reference numbers and counts, or a general line (see pushText).
 */
'use strict';

const crypto = require('crypto');

const EMAIL_KEYS = new Set([
  'notif.report_delivered', 'notif.settlement_pending', 'notif.offer_declined', 'notif.offer_expired',
  'notif.case_closed_outcome', 'notif.invoice_issued', 'notif.invoice_adjusted', 'notif.dispute_opened',
  'notif.dispute_decision_pending', 'notif.dispute_decision_sent_back', 'notif.dispute_resolved',
  'notif.fee_change_pending', 'notif.fee_change_sent_back', 'notif.platform_fee_changed',
  'notif.application_new', 'notif.application_signoff', 'notif.price_change_requested',
  'notif.report_submitted', 'notif.sla_breached', 'notif.enforcement_admin', 'notif.document_expired_admin'
]);
const SMS_KEYS = new Set([
  'notif.offer_new', 'notif.offer_expiring', 'notif.case_assigned', 'notif.case_reassigned',
  'notif.route_assigned', 'notif.report_returned', 'notif.rework_requested', 'notif.sla_breached',
  'notif.enforcement_changed', 'notif.document_expired', 'notif.provider_verified',
  'notif.application_info_requested', 'notif.application_rejected'
]);

// Values that may travel in a push: numbers and reference codes, never names.
const SAFE_PARAMS = new Set(['ref', 'count', 'n', 'minutes', 'hours', 'days', 'pct', 'month', 'score', 'done', 'total']);
const GENERIC = {
  en: { withRef: 'There is an update on {ref}. Open Mosta3lem to see it.', plain: 'You have a new notification. Open Mosta3lem to see it.' },
  ar: { withRef: 'يوجد تحديث على {ref}. افتح مستعلم لمعرفة التفاصيل.', plain: 'لديك إشعار جديد. افتح مستعلم لمعرفة التفاصيل.' }
};
const TITLE = { en: 'Mosta3lem', ar: 'مستعلم' };
const MAX_ATTEMPTS = 5;
const EXPO_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,100}\]$/;

// ------------------------------------------------------------------ push drivers
function devPush({ db, log }) {
  return {
    async send(messages) {
      for (const m of messages) {
        await db.query('INSERT INTO outbox (channel, destination, template, body, sent_at) VALUES ($1, $2, $3, $4, now())',
          ['push', m.to, 'push', m.title + ': ' + m.body]);
        log.info({ to: m.to.slice(0, 24) + '...' }, '[dev push] ' + m.body);
      }
      return messages.map(() => ({ ok: true }));
    }
  };
}

function expoPush({ accessToken }) {
  return {
    async send(messages) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' },
          accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
        body: JSON.stringify(messages)
      });
      if (!res.ok) throw new Error('Expo push answered ' + res.status);
      const tickets = (await res.json()).data || [];
      return messages.map((m, i) => {
        const t = tickets[i] || {};
        if (t.status === 'ok') return { ok: true };
        return { ok: false, error: (t.details && t.details.error) || t.message || 'unknown', gone: t.details && t.details.error === 'DeviceNotRegistered' };
      });
    }
  };
}

function createNotifications({ app, ICM, db, sessions, messenger, translate, config, inEngine }) {
  const push = config.pushDriver === 'expo' ? expoPush({ accessToken: config.expoAccessToken })
    : config.pushDriver === 'dev' ? devPush({ db, log: app.log })
      : (() => { throw new Error(`Unknown PUSH_DRIVER "${config.pushDriver}". Available: dev, expo.`); })();

  const userById = (id) => ICM.store.db.users.find((u) => u.id === id) || null;
  const usesEmail = (u) => { const p = ICM.services.auth.portalOf(u); return p === 'entity' || p === 'admin'; };

  /** Phones with push for a person, counting only those whose sign-in is still valid. */
  async function devicesOf(userId) {
    return (await db.query(
      `SELECT d.token, d.lang FROM devices d JOIN sessions s ON s.token_hash = d.session_hash
       WHERE d.user_id = $1 AND s.expires_at > now()`, [userId])).rows;
  }

  /** A push line without names: the full text when every value is safe, else a general line. */
  async function pushText(n, lang) {
    const params = n.params || {};
    if (Object.keys(params).every((k) => SAFE_PARAMS.has(k))) return translate(lang, n.key, params);
    const g = GENERIC[lang] || GENERIC.en;
    return params.ref ? g.withRef.replace('{ref}', String(params.ref)) : g.plain;
  }

  /** Decide what to send for notifications that have no delivery rows yet. */
  async function plan() {
    const rows = (await db.query(
      `SELECT n.id, n.doc FROM notifications n
       WHERE NOT EXISTS (SELECT 1 FROM notification_deliveries d WHERE d.notification_id = n.id)
       ORDER BY n.seq LIMIT 200`)).rows;
    for (const { id, doc } of rows) {
      const u = userById(doc.userId);
      const out = [];
      if (u && u.active !== false) {
        const devices = await devicesOf(u.id);
        for (const d of devices) out.push(['push', d.token]);
        if (EMAIL_KEYS.has(doc.key) && u.email && usesEmail(u)) out.push(['email', u.email]);
        if (SMS_KEYS.has(doc.key) && u.phone && !usesEmail(u) && !devices.length) out.push(['sms', u.phone]);
      }
      if (!out.length) out.push(['none', '']);
      for (const [channel, destination] of out) {
        await db.query(
          `INSERT INTO notification_deliveries (notification_id, channel, destination, status)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [id, channel, destination, channel === 'none' ? 'skipped' : 'pending']);
      }
    }
    return rows.length;
  }

  /**
   * Send what is due. Rows are claimed first (status 'sending', for 5 minutes), skipping rows
   * another copy of the API has claimed, so no message goes out twice. A claim left behind by
   * a copy that stopped mid-way is picked up again when its 5 minutes are over.
   */
  async function send() {
    const claimed = (await db.query(
      `UPDATE notification_deliveries d SET status = 'sending', next_at = now() + interval '5 minutes'
       FROM (SELECT notification_id, channel, destination FROM notification_deliveries
             WHERE status IN ('pending', 'sending') AND next_at <= now()
             ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED) due
       WHERE d.notification_id = due.notification_id AND d.channel = due.channel AND d.destination = due.destination
       RETURNING d.*`)).rows;
    const docs = claimed.length ? new Map((await db.query('SELECT id, doc FROM notifications WHERE id = ANY($1)',
      [claimed.map((c) => c.notification_id)])).rows.map((r) => [r.id, r.doc])) : new Map();
    const due = claimed.map((c) => Object.assign({}, c, { doc: docs.get(c.notification_id) })).filter((c) => c.doc);
    let sent = 0;
    for (const row of due) {
      const n = row.doc;
      let result;
      try {
        if (row.channel === 'push') {
          const dev = (await db.query('SELECT lang FROM devices WHERE token = $1', [row.destination])).rows[0];
          if (!dev) { result = { ok: false, error: 'device removed', final: true }; } else {
            const lang = dev.lang === 'en' ? 'en' : 'ar';
            [result] = await push.send([{ to: row.destination, title: TITLE[lang], body: await pushText(n, lang), sound: 'default', data: { link: n.link || null, id: n.id } }]);
            if (result.gone) { await db.query('DELETE FROM devices WHERE token = $1', [row.destination]); result.final = true; }
          }
        } else {
          const lang = await langOf(n.userId);
          await messenger.send(row.channel, row.destination, 'notice', { text: await translate(lang, n.key, n.params || {}) }, lang);
          result = { ok: true };
        }
      } catch (e) {
        result = { ok: false, error: String(e.message || e).slice(0, 300) };
      }
      if (result.ok) {
        sent++;
        await db.query("UPDATE notification_deliveries SET status = 'sent', sent_at = now(), attempts = attempts + 1, error = NULL WHERE notification_id = $1 AND channel = $2 AND destination = $3",
          [row.notification_id, row.channel, row.destination]);
      } else {
        const attempts = row.attempts + 1;
        const failed = result.final || attempts >= MAX_ATTEMPTS;
        await db.query(
          `UPDATE notification_deliveries SET attempts = $4, error = $5, status = $6,
             next_at = now() + make_interval(mins => $7::int) WHERE notification_id = $1 AND channel = $2 AND destination = $3`,
          [row.notification_id, row.channel, row.destination, attempts, result.error, failed ? 'failed' : 'pending', 2 ** attempts]);
      }
    }
    return sent;
  }

  /** The language a person last used on a phone; Arabic by default. */
  async function langOf(userId) {
    const r = (await db.query('SELECT lang FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC LIMIT 1', [userId])).rows[0];
    return r && r.lang === 'en' ? 'en' : 'ar';
  }

  /**
   * The daily summary emails due now. People are picked and marked inside one engine run
   * (holding the shared lock), so with several copies of the API each person gets one email.
   * A summary with nothing in it is not sent.
   */
  async function digests() {
    if (stopped) return 0;
    const due = await inEngine(null, 'en', () => ICM.engine.claimDigests(ICM.clock.now(), config.digestHour));
    let sent = 0;
    for (const d of due) {
      try {
        const lang = await langOf(d.userId);
        const text = await inEngine(null, lang, () => ICM.engine.digestText(d.userId, ICM.clock.now()));
        if (!text) continue;
        await messenger.send('email', d.email, 'digest', { text }, lang);
        sent++;
      } catch (e) {
        app.log.error({ err: e, user: d.userId }, 'daily summary failed');
      }
    }
    return sent;
  }

  // One run at a time; a request that adds notifications asks for a run straight away.
  let running = null, again = false, stopped = false;
  async function run() {
    if (stopped) return null;
    if (running) { again = true; return running; }
    running = (async () => {
      try {
        do { again = false; await plan(); await send(); } while (again);
      } catch (e) {
        app.log.error({ err: e }, 'notification delivery failed');
      } finally {
        running = null;
      }
    })();
    return running;
  }

  // ------------------------------------------------------------------ device routes
  const bearer = (req) => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : null; };
  const refuse = (reply, code, key) => reply.code(code).send({ ok: false, error: { key, params: null } });

  app.post('/api/v1/devices/register', async (req, reply) => {
    const token = bearer(req);
    const userId = token ? await sessions.lookup(token) : null;
    if (!userId) return refuse(reply, 401, 'errors.notSignedIn');
    const b = req.body || {};
    const pushToken = String(b.token || '');
    if (!EXPO_TOKEN.test(pushToken)) return refuse(reply, 400, 'errors.badRequest');
    const sessionHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query(
      `INSERT INTO devices (token, user_id, session_hash, platform, lang) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, session_hash = EXCLUDED.session_hash,
         platform = EXCLUDED.platform, lang = EXCLUDED.lang, last_seen_at = now()`,
      [pushToken, userId, sessionHash, ['ios', 'android'].includes(b.platform) ? b.platform : null, b.lang === 'en' ? 'en' : 'ar']);
    return { ok: true, result: null };
  });

  app.post('/api/v1/devices/unregister', async (req, reply) => {
    const token = bearer(req);
    const userId = token ? await sessions.lookup(token) : null;
    if (!userId) return refuse(reply, 401, 'errors.notSignedIn');
    await db.query('DELETE FROM devices WHERE token = $1 AND user_id = $2', [String((req.body || {}).token || ''), userId]);
    return { ok: true, result: null };
  });

  return {
    run,
    digests,
    /** Finish the current run and send nothing more (the server is closing). */
    async stop() { stopped = true; if (running) await running; },
    /** First start with delivery: notifications already in the data are not sent again. */
    async skipExisting() {
      const done = (await db.query("SELECT 1 FROM server_flags WHERE key = 'notifications_backfilled'")).rows.length;
      if (done) return;
      await db.query(
        `INSERT INTO notification_deliveries (notification_id, channel, destination, status)
         SELECT id, 'none', '', 'skipped' FROM notifications ON CONFLICT DO NOTHING`);
      await db.query("INSERT INTO server_flags (key) VALUES ('notifications_backfilled') ON CONFLICT DO NOTHING");
    },
    /** Stop pushes to a person's phones (deactivated, or signed out everywhere). */
    removeDevices: (userId) => db.query('DELETE FROM devices WHERE user_id = $1', [userId])
  };
}

module.exports = { createNotifications, EMAIL_KEYS, SMS_KEYS };
