/**
 * Settings, from environment variables (see .env.example). Nothing secret has a default.
 */
'use strict';

function readConfig(env = process.env) {
  const mode = env.MOSTA3LEM_MODE || 'demo';
  if (mode !== 'demo' && mode !== 'live') throw new Error('MOSTA3LEM_MODE must be "demo" or "live".');
  const messagingDriver = env.MESSAGING_DRIVER || 'dev';
  if (mode === 'live' && messagingDriver === 'dev' && env.ALLOW_DEV_MESSAGING !== 'true') {
    // The development messenger writes codes into the log. On a live platform that is only
    // acceptable on a closed staging server, and must be switched on deliberately.
    throw new Error('Live mode needs a real SMS and email provider (MESSAGING_DRIVER). For a closed staging server set ALLOW_DEV_MESSAGING=true.');
  }
  return {
    mode,
    port: Number(env.PORT || 4000),
    host: env.HOST || '0.0.0.0',
    databaseUrl: env.DATABASE_URL || null,
    dataDir: env.PGLITE_DIR || '.data/pglite',
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:3600,http://localhost:8081')
      .split(',').map((s) => s.trim()).filter(Boolean),
    publicUrl: env.PUBLIC_URL || 'http://localhost:3600',
    messagingDriver,
    sessionHours: Number(env.SESSION_HOURS || 168),
    tickSeconds: Number(env.TICK_SECONDS || 30),
    bodyLimitMb: Number(env.BODY_LIMIT_MB || 15),
    requestsPerMinute: Number(env.REQUESTS_PER_MINUTE || 300),
    signInPerMinute: Number(env.SIGN_IN_PER_MINUTE || 10),
    logLevel: env.LOG_LEVEL || 'info'
  };
}

module.exports = { readConfig };
