/**
 * The Mosta3lem API.
 *
 *   GET  /health                      is the server up, which database, which mode
 *   POST /api/v1/<service>/<method>   call one service method: body { "args": [...] }
 *
 * The services and methods are exactly those in prototype/js/services/contracts.js, the
 * contract the app and the console already use, so they can switch from the simulated
 * backend to this server without changing any screen.
 *
 * Every answer is { ok: true, result } or { ok: false, error: { key, params } }, where key
 * is a translation key. Signing in (see signin.js) also returns { session: { token,
 * expiresAt } }; the device sends the token back as "Authorization: Bearer <token>".
 */
'use strict';

const Fastify = require('fastify');

const { loadEngine } = require('./engine');
const { openDb, migrate } = require('./db');
const { createState } = require('./state');
const { createSessions } = require('./sessions');
const { createMessenger } = require('./messaging');
const { registerSignIn } = require('./signin');
const { createFiles } = require('./files');
const { createNotifications } = require('./notifications');
const { Refusal } = require('./refusal');
const { createSecurityLog } = require('./security');

/** Demo helpers that must never be reachable on a live platform: "sign in as" anyone,
    the demo password check, and the demo clock and shortcuts. */
const DEMO_ONLY = new Set(['auth.loginAs', 'auth.listDemoUsers', 'auth.checkPassword']);
const isDemoOnly = (name) => DEMO_ONLY.has(name) || name.startsWith('demo.') && name !== 'demo.tick' && name !== 'demo.clock';

/** Methods after which the person concerned is signed out on every device. */
const SIGN_OUT_AFTER = {
  'accounts.resetLogin': (args) => args[0],
  'staff.setActive': (args) => (args[1] === false ? args[0] : null)
};

/** The only methods that answer without a sign-in. Everything else needs one, whatever the
    engine would do, so a method added later is private unless it is listed here. */
const PUBLIC = new Set([
  'auth.currentUser', 'auth.logout', 'config.get', 'demo.clock', 'demo.tick',
  'registration.submit',                                   // a new provider (live: with a confirmed mobile)
  'auth.loginAs', 'auth.listDemoUsers', 'auth.checkPassword' // demo mode only (see DEMO_ONLY)
]);

/** Demo controls that change everyone's data: on a shared server, the Super admin only. */
const SUPER_ADMIN_ONLY = new Set(['demo.reset', 'demo.advance', 'demo.resetClock', 'demo.simulateBatchWork']);

/** Without a sign-in, requests stay small (sign-up may carry document photos). */
const ANONYMOUS_BODY_LIMIT = 64 * 1024;

const STATUS = { 'errors.notSignedIn': 401, 'errors.forbidden': 403, 'errors.notFound': 404 };

/** A URL without its query string, so signed file links never reach the logs. */
const pathOnly = (url) => String(url || '').split('?')[0];

/** A one-at-a-time queue: the engine works on shared data, so requests take turns. */
function serial() {
  let last = Promise.resolve();
  return (fn) => {
    const run = last.then(fn, fn);
    last = run.catch(() => undefined);
    return run;
  };
}

async function buildServer(config) {
  const app = Fastify({
    logger: config.logger === false ? false : {
      level: config.logLevel || 'info',
      redact: ['req.headers.authorization', 'req.headers["x-phone-proof"]'],
      serializers: { req: (req) => ({ method: req.method, url: pathOnly(req.url), ip: req.ip }) },
      ...(config.logStream ? { stream: config.logStream } : {})
    },
    bodyLimit: config.bodyLimitMb * 1024 * 1024,
    // Only trust X-Forwarded-For from the proxy in front of the API (TRUST_PROXY); trusting it
    // from anyone would let a caller pick their own address and slip past the rate limits.
    trustProxy: config.trustProxy
  });

  const db = await openDb({ databaseUrl: config.databaseUrl, dataDir: config.dataDir });
  const applied = await migrate(db);
  if (applied.length) app.log.info({ applied }, 'database migrations applied');

  const engine = loadEngine();
  const { ICM } = engine;
  const state = createState(db, ICM);
  const how = await state.load({ start: config.mode === 'demo' ? 'demo' : 'empty' });
  app.log.info({ data: how, database: db.kind, mode: config.mode }, 'data ready');

  app.decorate('db', db);
  const security = createSecurityLog(db, app.log);
  app.decorate('security', security);
  const isStaff = (userId) => {
    const u = ICM.store.db.users.find((x) => x.id === userId);
    return !!u && ICM.wf.isPlatformRole(u.role);
  };
  const sessions = createSessions(db, {
    ttlHours: config.sessionHours,
    idleHoursFor: (userId) => (isStaff(userId) ? config.staffIdleHours : config.idleHours)
  });
  const queue = serial();

  /** Run engine work as this person, then save what changed before answering. */
  function inEngine(userId, lang, fn, info) {
    return queue(async () => {
      engine.as(userId, lang);
      try {
        return await fn();
      } finally {
        try {
          const writes = await state.persist();
          if (info) info.writes = writes;
        } catch (e) {
          // Memory and database no longer match: stop, and reload from the database on restart.
          app.log.fatal({ err: e }, 'could not save changes; stopping');
          setImmediate(() => process.exit(1));
          throw e;
        }
      }
    });
  }

  const contracts = ICM.contracts;
  const bearer = (req) => {
    const h = req.headers.authorization || '';
    return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  };

  if (config.corsOrigins.length) {
    await app.register(require('@fastify/cors'), {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Lang', 'X-Phone-Proof']
    });
  }

  // Requests per minute from one address; sign-in routes have a tighter limit of their own.
  await app.register(require('@fastify/rate-limit'), {
    max: config.requestsPerMinute,
    timeWindow: '1 minute',
    errorResponseBuilder: (req, ctx) => ({ statusCode: ctx.statusCode, ok: false, error: { key: 'errors.tooManyRequests', params: null } })
  });

  const messenger = createMessenger({ driver: config.messagingDriver, db, log: app.log });
  const signIn = registerSignIn(app, { ICM, db, sessions, messenger, inEngine, config, security });
  app.decorate('adminTools', { createSuperAdmin: signIn.createSuperAdmin });

  const files = createFiles({ db, config, log: app.log });
  files.routes(app);
  // Data saved before file storage existed may still hold files inline: store them properly.
  await inEngine(null, 'en', async () => { ICM.store.db = await files.ingest(ICM.store.db, null); });
  /** Where signed file links point: this API as the caller reached it, unless set. */
  app.decorate('filesSweep', () => files.sweep(ICM.store.db));

  /** A notification's text in a language (the engine's translations). */
  const translate = (lang, key, params) => queue(() => { engine.as(null, lang); return ICM.t(key, params); });
  const notifications = createNotifications({ app, ICM, db, sessions, messenger, translate, config });
  await notifications.skipExisting();
  app.decorate('notifyNow', () => notifications.run());
  const apiBase = (req) => config.publicApiUrl || `${req.protocol}://${req.host}`;

  // Small anonymous requests only: refuse big bodies before they are read.
  app.addHook('onRequest', async (req, reply) => {
    const size = Number(req.headers['content-length'] || 0);
    if (size > ANONYMOUS_BODY_LIMIT && !bearer(req) && pathOnly(req.url) !== '/api/v1/registration/submit') {
      return reply.code(413).send({ ok: false, error: { key: 'errors.badRequest', params: null } });
    }
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // The API answers JSON (and files, which set their own stricter policy): nothing to run.
    if (!reply.getHeader('Content-Security-Policy')) reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (req.protocol === 'https') reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  });

  app.get('/health', async () => ({ ok: true, mode: config.mode, database: db.kind, dataVersion: ICM.config.DATA_VERSION }));

  app.post('/api/v1/:service/:method', async (req, reply) => {
    const { service, method } = req.params;
    const name = service + '.' + method;
    const fail = (code, key, params) => reply.code(code).send({ ok: false, error: { key, params: params || null } });

    if (!Object.hasOwn(contracts, service) || !Object.hasOwn(contracts[service], method)) return fail(404, 'errors.notFound');
    if (config.mode !== 'demo' && isDemoOnly(name)) return fail(404, 'errors.notFound');
    let args = req.body && req.body.args !== undefined ? req.body.args : [];
    if (!Array.isArray(args) || args.length > 10) return fail(400, 'errors.badRequest');

    const token = bearer(req);
    const userId = token ? await sessions.lookup(token) : null;
    if (token && !userId) return fail(401, 'errors.notSignedIn');
    if (!userId && !PUBLIC.has(name)) return fail(401, 'errors.notSignedIn');
    if (SUPER_ADMIN_ONLY.has(name)) {
      const u = ICM.store.db.users.find((x) => x.id === userId);
      if (!u || u.role !== 'platform_admin') return fail(403, 'errors.forbidden');
    }
    const lang = req.headers['x-lang'] === 'ar' ? 'ar' : 'en';

    let result, change, usersBefore, proofId;
    const info = { writes: 0 };
    try {
      proofId = await signIn.before(name, args, req);
      // Files are only taken from signed-in people, and from a new provider's sign-up.
      if (userId || name === 'registration.submit') args = await files.ingest(args, userId);
      result = await inEngine(userId, lang, async () => {
        usersBefore = new Set(ICM.store.db.users.map((u) => u.id));
        const r = await ICM.services[service][method](...args);
        change = engine.sessionChange();
        return r;
      }, info);
    } catch (e) {
      if (e instanceof Refusal) return fail(e.status, e.key, e.params);
      // Errors from the engine carry a translation key; anything else is a bug.
      if (e && typeof e.key === 'string' && e.name === 'ServiceError') return fail(STATUS[e.key] || 400, e.key, e.params);
      req.log.error({ err: e, call: name }, 'service call failed');
      return fail(500, 'errors.generic');
    }

    await signIn.after(name, args, req, { usersBefore, proofId });
    const body = { ok: true, result: result === undefined ? null : files.present(result, apiBase(req)) };
    // changed: this call changed data, so screens showing it should refresh. The clock offset
    // lets screens count deadlines the same way the server does (the demo clock can move).
    body.meta = { changed: info.writes > 0, clockOffsetMs: (ICM.store.db.clock && ICM.store.db.clock.offsetMs) || 0 };
    if (change) body.session = await sessions.create(change, req.headers['user-agent']);
    if (change === null) await sessions.remove(token);
    const signOut = SIGN_OUT_AFTER[name] && SIGN_OUT_AFTER[name](args);
    if (signOut) {
      await sessions.removeUser(signOut);
      await notifications.removeDevices(signOut);
      await security.record('signout.everywhere', { userId: signOut, req, detail: { by: userId, after: name } });
    }
    if (change) await security.record('signin.demo', { userId: change, req });
    // Send any notifications this call created, without making the caller wait.
    notifications.run();
    return body;
  });

  // Deadlines, offer expiry and document reminders move on with time, not with requests.
  let ticks = 0;
  const ticker = config.tickSeconds > 0 ? setInterval(() => {
    inEngine(null, 'en', () => ICM.services.demo.tick()).catch((e) => app.log.error({ err: e }, 'tick failed'));
    sessions.purgeExpired().catch(() => undefined);
    notifications.run();
    // About once an hour, remove files nothing points to any more.
    if (++ticks % Math.max(1, Math.round(3600 / config.tickSeconds)) === 0) {
      files.sweep(ICM.store.db).then((n) => n && app.log.info({ removed: n }, 'unused files removed'))
        .catch((e) => app.log.error({ err: e }, 'file sweep failed'));
    }
  }, config.tickSeconds * 1000) : null;
  if (ticker) ticker.unref();

  app.addHook('onClose', async () => {
    if (ticker) clearInterval(ticker);
    await notifications.stop();
    await queue(() => undefined);
    await db.close();
  });

  return app;
}

module.exports = { buildServer };
