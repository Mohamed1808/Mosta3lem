/**
 * Settings, from environment variables (see .env.example). Nothing secret has a default.
 */
'use strict';

const path = require('path');

// Local data sits in backend/.data whichever folder the server is started from.
const HERE = (p) => path.resolve(__dirname, '..', p);

function readConfig(env = process.env) {
  const mode = env.MOSTA3LEM_MODE || 'demo';
  if (mode !== 'demo' && mode !== 'live') throw new Error('MOSTA3LEM_MODE must be "demo" or "live".');
  const messagingDriver = env.MESSAGING_DRIVER || 'dev';
  if (mode === 'live' && messagingDriver === 'dev' && env.ALLOW_DEV_MESSAGING !== 'true') {
    // The development messenger writes codes into the log. On a live platform that is only
    // acceptable on a closed staging server, and must be switched on deliberately.
    throw new Error('Live mode needs a real SMS and email provider (MESSAGING_DRIVER). For a closed staging server set ALLOW_DEV_MESSAGING=true.');
  }
  if (mode === 'live' && !env.FILES_KEY) {
    throw new Error('Live mode needs FILES_KEY (32 random bytes, base64) to encrypt files.');
  }
  return {
    mode,
    port: Number(env.PORT || 4000),
    host: env.HOST || '0.0.0.0',
    databaseUrl: env.DATABASE_URL || null,
    dataDir: env.PGLITE_DIR || HERE('.data/pglite'),
    // Web pages allowed to call the API. Live mode allows none until they are listed.
    corsOrigins: (env.CORS_ORIGINS != null ? env.CORS_ORIGINS : mode === 'demo' ? 'http://localhost:3600,http://localhost:8081' : '')
      .split(',').map((s) => s.trim()).filter(Boolean),
    trustProxy: trustProxy(env.TRUST_PROXY),
    idleHours: Number(env.SESSION_IDLE_HOURS || 72),
    staffIdleHours: Number(env.STAFF_IDLE_HOURS || 8),
    publicUrl: env.PUBLIC_URL || 'http://localhost:3600',
    messagingDriver,
    pushDriver: env.PUSH_DRIVER || 'dev',
    expoAccessToken: env.EXPO_ACCESS_TOKEN || null,
    publicApiUrl: env.PUBLIC_API_URL || null,
    filesDriver: env.FILES_DRIVER || 'local',
    filesDir: env.FILES_DIR || HERE('.data/files'),
    filesKey: env.FILES_KEY || null,
    fileMaxMb: Number(env.FILE_MAX_MB || 8),
    sessionHours: Number(env.SESSION_HOURS || 168),
    tickSeconds: Number(env.TICK_SECONDS || 30),
    // Hour (Cairo time) after which organisation users get the daily summary email.
    digestHour: env.DIGEST_HOUR === undefined || env.DIGEST_HOUR === '' ? 8 : Number(env.DIGEST_HOUR),
    bodyLimitMb: Number(env.BODY_LIMIT_MB || 15),
    requestsPerMinute: Number(env.REQUESTS_PER_MINUTE || 300),
    signInPerMinute: Number(env.SIGN_IN_PER_MINUTE || 10),
    // database: every copy of the API counts together. memory: each copy on its own.
    rateLimitStore: env.RATE_LIMIT_STORE === 'memory' ? 'memory' : 'database',
    logLevel: env.LOG_LEVEL || 'info'
  };
}

/**
 * TRUST_PROXY: empty when the API faces the internet directly; otherwise the address (or
 * addresses / ranges, comma separated) of the proxy in front of it, whose X-Forwarded-For
 * and X-Forwarded-Proto are then believed. "true" believes anyone: only when the API cannot
 * be reached except through the proxy.
 */
function trustProxy(v) {
  if (!v || v === 'false') return false;
  if (v === 'true') return true;
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = { readConfig };
