/**
 * Real sign-in.
 *
 *   POST /api/v1/session/password      { email, password }      organisation users and staff
 *   POST /api/v1/session/phone         { phone, purpose }       providers and agents (purpose
 *                                                              signin), or a new provider
 *                                                              proving their mobile (signup)
 *   POST /api/v1/session/verify        { challengeId, code }    the code from SMS or email
 *   POST /api/v1/session/forgot        { email }                sends a link to choose a new password
 *   POST /api/v1/session/set-password  { token, password }      from an invitation or reset link
 *
 * Every sign-in ends with a one-time code. Answers never reveal whether an email or mobile
 * has an account. Codes, links and passwords are stored only as hashes.
 */
'use strict';

const crypto = require('crypto');
const { hashPassword, verifyPassword, burn, passwordProblem } = require('./passwords');
const { Refusal } = require('./refusal');

const CODE_MINUTES = 10;
const CODE_TRIES = 5;
const CODES_PER_HOUR = 5;            // per mobile or email
const LINKS_PER_HOUR = 3;            // password links per person
const PROOF_MINUTES = 30;            // a confirmed mobile stays valid for sign-up this long
const INVITE_HOURS = 72;
const RESET_HOURS = 24;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** "01012345678" from "+20 101 234 5678", "٠١٠١٢٣٤٥٦٧٨" and the like; null when not an Egyptian mobile. */
function normalizePhone(input) {
  let d = String(input || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
  if (d.startsWith('0020')) d = d.slice(4);
  if (d.startsWith('20') && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}
const maskPhone = (p) => p.slice(0, 3) + '*****' + p.slice(-3);
const maskEmail = (e) => { const at = e.indexOf('@'); return at > 1 ? e.charAt(0) + '****' + e.slice(at) : e; };

function registerSignIn(app, { ICM, db, sessions, messenger, inEngine, config, security }) {
  const record = (kind, userId, req, detail) => (security ? security.record(kind, { userId, req, detail }) : Promise.resolve());
  const C = ICM.config;
  const users = () => ICM.store.db.users;
  const portalOf = (u) => ICM.services.auth.portalOf(u);
  const usesEmail = (u) => { const p = portalOf(u); return p === 'entity' || p === 'admin'; };
  const userById = (id) => users().find((u) => u.id === id) || null;
  const byEmail = (email) => {
    const mail = String(email || '').trim().toLowerCase();
    return users().find((u) => u.active !== false && u.email && u.email.toLowerCase() === mail && usesEmail(u)) || null;
  };
  const byPhone = (phone) => users().find((u) => u.active !== false && !usesEmail(u) && normalizePhone(u.phone) === phone) || null;
  const langOf = (req) => (req.headers['x-lang'] === 'ar' ? 'ar' : 'en');

  const limits = { config: { rateLimit: { max: config.signInPerMinute, timeWindow: '1 minute' } } };
  const route = (url, handler) => app.post('/api/v1/session/' + url, limits, async (req, reply) => {
    try {
      return await handler(req.body || {}, req);
    } catch (e) {
      if (e instanceof Refusal) return reply.code(e.status).send({ ok: false, error: { key: e.key, params: e.params } });
      throw e;
    }
  });

  // ------------------------------------------------------------- codes
  async function issueCode({ purpose, user, channel, destination, lang }) {
    const recent = await db.query(
      "SELECT count(*)::int AS n FROM sign_in_codes WHERE destination = $1 AND created_at > now() - interval '1 hour'", [destination]);
    if (recent.rows[0].n >= CODES_PER_HOUR) throw new Refusal('errors.tooManyRequests', null, 429);
    const id = randomToken();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await db.query(
      `INSERT INTO sign_in_codes (id, purpose, user_id, channel, destination, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + interval '${CODE_MINUTES} minutes')`,
      [id, purpose, user ? user.id : null, channel, destination, sha(id + ':' + code)]);
    // Only real accounts (or a new provider signing up) get a message; the answer is the same either way.
    if (user || purpose === 'signup') {
      await messenger.send(channel, destination, purpose === 'signup' ? 'signup_code' : 'signin_code', { code, minutes: CODE_MINUTES }, lang);
    }
    return { challengeId: id, expiresAt: Date.now() + CODE_MINUTES * 60000 };
  }

  // ------------------------------------------------------------- password links
  async function issuePasswordLink(user, purpose, lang) {
    const recent = await db.query(
      "SELECT count(*)::int AS n FROM password_tokens WHERE user_id = $1 AND created_at > now() - interval '1 hour'", [user.id]);
    if (recent.rows[0].n >= LINKS_PER_HOUR) return false;
    const token = randomToken();
    const hours = purpose === 'invite' ? INVITE_HOURS : RESET_HOURS;
    await db.query(
      `INSERT INTO password_tokens (token_hash, user_id, purpose, expires_at) VALUES ($1, $2, $3, now() + interval '${hours} hours')`,
      [sha(token), user.id, purpose]);
    const link = config.publicUrl.replace(/\/$/, '') + '/set-password?token=' + encodeURIComponent(token);
    await messenger.send('email', user.email, purpose, { name: user.name, link, hours }, lang);
    return true;
  }

  async function credentialOf(userId) {
    return (await db.query('SELECT * FROM credentials WHERE user_id = $1', [userId])).rows[0] || null;
  }

  /** Show the lock in the console (the engine's lockedUntil), and keep it saved. */
  const mirrorLock = (userId, until) => inEngine(null, 'en', () => {
    const u = userById(userId);
    if (u) { u.lockedUntil = until; u.signInFails = 0; }
  });

  // ------------------------------------------------------------- routes
  route('password', async (body, req) => {
    const password = String(body.password || '');
    const u = byEmail(body.email);
    if (!u) { await burn(password); await record('signin.unknown_email', null, req); throw new Refusal('errors.wrongPassword'); }
    const cred = await credentialOf(u.id);
    const lockedUntil = cred && cred.locked_until ? new Date(cred.locked_until).getTime() : 0;
    if (lockedUntil > Date.now()) {
      await burn(password);
      await record('signin.while_locked', u.id, req);
      throw new Refusal('errors.signInLocked', { min: Math.ceil((lockedUntil - Date.now()) / 60000) });
    }
    const ok = cred && cred.password_hash
      ? await verifyPassword(password, cred.password_hash)
      : (await burn(password), config.mode === 'demo' && password === C.DEMO_PASSWORD);
    if (!ok) {
      const fails = (cred ? cred.failed_count : 0) + 1;
      const lock = fails >= C.SIGN_IN_MAX_TRIES;
      const until = lock ? new Date(Date.now() + C.SIGN_IN_LOCK_MINUTES * 60000) : null;
      await db.query(
        `INSERT INTO credentials (user_id, failed_count, locked_until) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET failed_count = EXCLUDED.failed_count, locked_until = EXCLUDED.locked_until`,
        [u.id, lock ? 0 : fails, until ? until.toISOString() : null]);
      await record(lock ? 'signin.locked' : 'signin.password_failed', u.id, req, { fails });
      if (lock) {
        await mirrorLock(u.id, until.getTime());
        throw new Refusal('errors.signInLocked', { min: C.SIGN_IN_LOCK_MINUTES });
      }
      throw new Refusal('errors.wrongPassword');
    }
    if (cred && cred.failed_count) await db.query('UPDATE credentials SET failed_count = 0 WHERE user_id = $1', [u.id]);
    const c = await issueCode({ purpose: 'signin', user: u, channel: 'email', destination: u.email.toLowerCase(), lang: langOf(req) });
    return { ok: true, result: Object.assign(c, { sentTo: maskEmail(u.email) }) };
  });

  route('phone', async (body, req) => {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new Refusal('errors.mobileFormat');
    const purpose = body.purpose === 'signup' ? 'signup' : 'signin';
    const user = purpose === 'signin' ? byPhone(phone) : null;
    const c = await issueCode({ purpose, user, channel: 'sms', destination: phone, lang: langOf(req) });
    return { ok: true, result: Object.assign(c, { sentTo: maskPhone(phone) }) };
  });

  route('verify', async (body, req) => {
    const id = String(body.challengeId || ''), code = String(body.code || '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
    const row = id ? (await db.query('SELECT *, expires_at > now() AS live FROM sign_in_codes WHERE id = $1', [id])).rows[0] : null;
    if (!row || row.used_at || !row.live || row.attempts >= CODE_TRIES) throw new Refusal('errors.codeExpired');
    if (!sameHash(sha(id + ':' + code), row.code_hash)) {
      await db.query('UPDATE sign_in_codes SET attempts = attempts + 1 WHERE id = $1', [id]);
      await record('signin.code_failed', row.user_id, req, { channel: row.channel, attempt: row.attempts + 1 });
      throw new Refusal(row.attempts + 1 >= CODE_TRIES ? 'errors.codeExpired' : 'errors.codeWrong');
    }
    if (row.purpose === 'signup') {
      const proof = randomToken();
      await db.query(
        `UPDATE sign_in_codes SET used_at = now(), proof_hash = $2, proof_expires_at = now() + interval '${PROOF_MINUTES} minutes' WHERE id = $1`,
        [id, sha(proof)]);
      return { ok: true, result: { phoneProof: proof, phone: row.destination } };
    }
    await db.query('UPDATE sign_in_codes SET used_at = now() WHERE id = $1', [id]);
    const u = row.user_id ? userById(row.user_id) : null;
    // A mobile with no account got no code, so any code for it is "wrong".
    if (!u || u.active === false) throw new Refusal('errors.codeWrong');
    const session = await sessions.create(u.id, req.headers['user-agent']);
    await record('signin.ok', u.id, req, { channel: row.channel });
    const me = await inEngine(u.id, langOf(req), () => ICM.services.auth.currentUser());
    return { ok: true, result: me, session };
  });

  route('forgot', async (body, req) => {
    const u = byEmail(body.email);
    if (u) { await issuePasswordLink(u, 'reset', langOf(req)); await record('password.reset_requested', u.id, req); }
    return { ok: true, result: null };
  });

  route('set-password', async (body, req) => {
    const token = String(body.token || '');
    const row = token
      ? (await db.query('SELECT *, expires_at > now() AS live FROM password_tokens WHERE token_hash = $1', [sha(token)])).rows[0]
      : null;
    const u = row ? userById(row.user_id) : null;
    if (!row || row.used_at || !row.live || !u || u.active === false) throw new Refusal('errors.linkInvalid');
    const problem = passwordProblem(body.password, u.email);
    if (problem) throw new Refusal(problem);
    const hash = await hashPassword(String(body.password));
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO credentials (user_id, password_hash, password_set_at, failed_count, locked_until) VALUES ($1, $2, now(), 0, NULL)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, password_set_at = now(), failed_count = 0, locked_until = NULL`,
        [u.id, hash]);
      // This link and any other open link for the person stop working.
      await tx.query('UPDATE password_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [u.id]);
    });
    await sessions.removeUser(u.id);
    await inEngine(null, 'en', () => { u.lockedUntil = null; u.signInFails = 0; u.invited = false; });
    await record('password.set', u.id, req, { from: row.purpose });
    return { ok: true, result: null };
  });

  // ------------------------------------------------------------- around service calls
  return {
    /** Checks before a service method runs. Throws a Refusal to stop it. */
    async before(name, args, req) {
      if (name !== 'registration.submit') return null;
      // A new provider signs up with a mobile they proved they own (signup code).
      const v = args[0] || {};
      const phone = normalizePhone(v.kind === 'company' ? v.ownerPhone : v.phone);
      const proof = String(req.headers['x-phone-proof'] || '');
      if (config.mode === 'demo' && !proof) return null;
      const row = proof && phone ? (await db.query(
        'SELECT id FROM sign_in_codes WHERE proof_hash = $1 AND destination = $2 AND proof_expires_at > now()', [sha(proof), phone])).rows[0] : null;
      if (!row) throw new Refusal('errors.phoneNotVerified', null, 403);
      return row.id;
    },

    /** Follow-up after a service method succeeded: invitation and reset emails. */
    async after(name, args, req, { usersBefore, proofId }) {
      if (proofId) await db.query('UPDATE sign_in_codes SET proof_expires_at = now() WHERE id = $1', [proofId]);
      for (const u of users()) {
        if (!usersBefore.has(u.id) && u.email && usesEmail(u)) await issuePasswordLink(u, 'invite', langOf(req));
      }
      if (name === 'accounts.resetLogin') {
        const u = userById(args[0]);
        if (u) {
          await db.query('UPDATE credentials SET password_hash = NULL, failed_count = 0, locked_until = NULL WHERE user_id = $1', [u.id]);
          await issuePasswordLink(u, 'reset', langOf(req));
        }
      }
    },

    /** The first Super admin of a live platform (see create-admin.js). */
    async createSuperAdmin(name, email) {
      if (users().some((u) => (u.email || '').toLowerCase() === email)) throw new Error('This email already has an account.');
      const u = await inEngine(null, 'en', () => {
        const user = { id: ICM.util.uid('u'), name, email, role: 'platform_admin', active: true, invited: true, createdAt: Date.now() };
        users().push(user);
        return user;
      });
      await issuePasswordLink(u, 'invite', 'en');
      return { userId: u.id };
    }
  };
}

module.exports = { registerSignIn, normalizePhone };
