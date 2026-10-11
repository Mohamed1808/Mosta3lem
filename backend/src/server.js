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

/** Demo helpers that must never be reachable on a live platform: "sign in as" anyone,
    the demo password check, and the demo clock and shortcuts. */
const DEMO_ONLY = new Set(['auth.loginAs', 'auth.listDemoUsers', 'auth.checkPassword']);
const isDemoOnly = (name) => DEMO_ONLY.has(name) || name.startsWith('demo.') && name !== 'demo.tick' && name !== 'demo.clock';

/** Methods after which the person concerned is signed out on every device. */
const SIGN_OUT_AFTER = {
  'accounts.resetLogin': (args) => args[0],
  'staff.setActive': (args) => (args[1] === false ? args[0] : null)
};

const STATUS = { 'errors.notSignedIn': 401, 'errors.forbidden': 403, 'errors.notFound': 404 };

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
    logger: config.logger === false ? false : { level: config.logLevel || 'info', redact: ['req.headers.authorization'] },
    bodyLimit: config.bodyLimitMb * 1024 * 1024,
    trustProxy: true
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
  const sessions = createSessions(db, { ttlHours: config.sessionHours });
  const queue = serial();

  /** Run engine work as this person, then save what changed before answering. */
  function inEngine(userId, lang, fn) {
    return queue(async () => {
      engine.as(userId, lang);
      try {
        return await fn();
      } finally {
        try {
          await state.persist();
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
  const signIn = registerSignIn(app, { ICM, db, sessions, messenger, inEngine, config });
  app.decorate('adminTools', { createSuperAdmin: signIn.createSuperAdmin });

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/health', async () => ({ ok: true, mode: config.mode, database: db.kind, dataVersion: ICM.config.DATA_VERSION }));

  app.post('/api/v1/:service/:method', async (req, reply) => {
    const { service, method } = req.params;
    const name = service + '.' + method;
    const fail = (code, key, params) => reply.code(code).send({ ok: false, error: { key, params: params || null } });

    if (!Object.hasOwn(contracts, service) || !Object.hasOwn(contracts[service], method)) return fail(404, 'errors.notFound');
    if (config.mode !== 'demo' && isDemoOnly(name)) return fail(404, 'errors.notFound');
    const args = req.body && req.body.args !== undefined ? req.body.args : [];
    if (!Array.isArray(args) || args.length > 10) return fail(400, 'errors.badRequest');

    const token = bearer(req);
    const userId = token ? await sessions.lookup(token) : null;
    if (token && !userId) return fail(401, 'errors.notSignedIn');
    const lang = req.headers['x-lang'] === 'ar' ? 'ar' : 'en';

    let result, change, usersBefore, proofId;
    try {
      proofId = await signIn.before(name, args, req);
      result = await inEngine(userId, lang, async () => {
        usersBefore = new Set(ICM.store.db.users.map((u) => u.id));
        const r = await ICM.services[service][method](...args);
        change = engine.sessionChange();
        return r;
      });
    } catch (e) {
      if (e instanceof signIn.Refusal) return fail(e.status, e.key, e.params);
      // Errors from the engine carry a translation key; anything else is a bug.
      if (e && typeof e.key === 'string' && e.name === 'ServiceError') return fail(STATUS[e.key] || 400, e.key, e.params);
      req.log.error({ err: e, call: name }, 'service call failed');
      return fail(500, 'errors.generic');
    }

    await signIn.after(name, args, req, { usersBefore, proofId });
    const body = { ok: true, result: result === undefined ? null : result };
    if (change) body.session = await sessions.create(change, req.headers['user-agent']);
    if (change === null) await sessions.remove(token);
    const signOut = SIGN_OUT_AFTER[name] && SIGN_OUT_AFTER[name](args);
    if (signOut) await sessions.removeUser(signOut);
    return body;
  });

  // Deadlines, offer expiry and document reminders move on with time, not with requests.
  const ticker = config.tickSeconds > 0 ? setInterval(() => {
    inEngine(null, 'en', () => ICM.services.demo.tick()).catch((e) => app.log.error({ err: e }, 'tick failed'));
    sessions.purgeExpired().catch(() => undefined);
  }, config.tickSeconds * 1000) : null;
  if (ticker) ticker.unref();

  app.addHook('onClose', async () => {
    if (ticker) clearInterval(ticker);
    await queue(() => undefined);
    await db.close();
  });

  return app;
}

module.exports = { buildServer };
