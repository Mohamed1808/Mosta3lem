/**
 * Keeping an eye on the running platform.
 *
 *   GET /health         alive (the process answers): for the container's own health check
 *   GET /health/ready   ready to serve: the database answers, the background clock is
 *                       running, and the last backup is recent (when backups are expected).
 *                       503 otherwise, so a load balancer or an uptime monitor can react.
 *
 * Alerts: an email to ALERT_EMAILS when something needs a person, at most once every 6
 * hours per problem (recorded in ops_events, so several copies of the API send it once):
 *   - the background clock failed 3 times in a row;
 *   - notifications could not be delivered in the last hour;
 *   - no successful backup in 26 hours, or a backup or restore test failed (BACKUPS_EXPECTED).
 */
'use strict';

const ALERT_EVERY_HOURS = 6;
const BACKUP_MAX_HOURS = 26;

function createOps({ app, db, config, messenger }) {
  let lastTickAt = Date.now();
  let tickFailures = 0;

  async function lastBackup() {
    const r = (await db.query("SELECT ok, at, detail FROM ops_events WHERE kind = 'backup' ORDER BY at DESC LIMIT 1")).rows[0];
    return r ? { ok: r.ok, at: new Date(r.at).getTime(), detail: r.detail } : null;
  }

  async function readiness() {
    const out = { ok: true, checks: {} };
    const t0 = Date.now();
    try {
      await db.query('SELECT 1');
      out.checks.database = { ok: true, ms: Date.now() - t0 };
    } catch (e) {
      out.checks.database = { ok: false };
      out.ok = false;
      return out;
    }
    if (config.tickSeconds > 0) {
      const age = Math.round((Date.now() - lastTickAt) / 1000);
      out.checks.clock = { ok: age < config.tickSeconds * 3 + 60 && tickFailures < 3, secondsSinceTick: age };
      if (!out.checks.clock.ok) out.ok = false;
    }
    if (config.backupsExpected) {
      const b = await lastBackup();
      const hours = b ? Math.round((Date.now() - b.at) / 3600000) : null;
      out.checks.backup = { ok: !!(b && b.ok && hours <= BACKUP_MAX_HOURS), hoursSince: hours };
      if (!out.checks.backup.ok) out.ok = false;
    }
    return out;
  }

  app.get('/health/ready', async (req, reply) => {
    const r = await readiness();
    return reply.code(r.ok ? 200 : 503).send(r);
  });

  /** Send an alert unless the same one went out in the last hours. */
  async function alert(key, text) {
    if (!config.alertEmails.length) { app.log.warn({ alert: key }, text); return false; }
    const recent = (await db.query(
      `SELECT 1 FROM ops_events WHERE kind = 'alert' AND detail->>'key' = $1 AND at > now() - make_interval(hours => $2) LIMIT 1`,
      [key, ALERT_EVERY_HOURS])).rows.length;
    if (recent) return false;
    await db.query("INSERT INTO ops_events (kind, ok, detail) VALUES ('alert', true, $1::jsonb)", [JSON.stringify({ key, text })]);
    for (const to of config.alertEmails) {
      try { await messenger.send('email', to, 'alert', { text, server: config.publicApiUrl || 'Mosta3lem API' }, 'en'); } catch (e) {
        app.log.error({ err: e, to }, 'alert email failed');
      }
    }
    app.log.warn({ alert: key }, text);
    return true;
  }

  /** Look for problems (the clock calls it every few minutes). Returns the alerts sent. */
  async function check() {
    const sent = [];
    if (tickFailures >= 3 && await alert('clock', `The background clock failed ${tickFailures} times in a row: deadlines, reminders and retention are not running.`)) sent.push('clock');
    const failed = (await db.query(
      "SELECT count(*)::int AS n FROM notification_deliveries WHERE status = 'failed' AND next_at > now() - interval '1 hour'")).rows[0].n;
    if (failed && await alert('deliveries', `${failed} notification(s) could not be delivered in the last hour. Check the SMS, email and push providers.`)) sent.push('deliveries');
    if (config.backupsExpected) {
      const b = await lastBackup();
      if (!b || Date.now() - b.at > BACKUP_MAX_HOURS * 3600000) {
        if (await alert('backup_missing', `No successful backup in the last ${BACKUP_MAX_HOURS} hours. Check the backup service.`)) sent.push('backup_missing');
      } else if (!b.ok) {
        if (await alert('backup_failed', 'The last backup failed: ' + JSON.stringify(b.detail || {}))) sent.push('backup_failed');
      }
      const rt = (await db.query("SELECT ok, detail FROM ops_events WHERE kind = 'restore_test' ORDER BY at DESC LIMIT 1")).rows[0];
      if (rt && !rt.ok && await alert('restore_test', 'The last restore test failed: the backup could not be restored. ' + JSON.stringify(rt.detail || {}))) sent.push('restore_test');
    }
    return sent;
  }

  return {
    readiness,
    check,
    alert,
    tickOk() { lastTickAt = Date.now(); tickFailures = 0; },
    tickFailed() { tickFailures++; }
  };
}

module.exports = { createOps };
