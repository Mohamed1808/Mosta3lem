/**
 * Settings, from environment variables (see .env.example). Nothing secret has a default.
 */
'use strict';

function readConfig(env = process.env) {
  const mode = env.MOSTA3LEM_MODE || 'demo';
  if (mode !== 'demo') {
    // A live platform needs real sign-in (SMS and email codes, real passwords) and must
    // not offer "sign in as anyone". That arrives in the next step; until then the server
    // only runs with the demo data.
    throw new Error('MOSTA3LEM_MODE must be "demo" for now. Live mode arrives with real sign-in.');
  }
  return {
    mode,
    port: Number(env.PORT || 4000),
    host: env.HOST || '0.0.0.0',
    databaseUrl: env.DATABASE_URL || null,
    dataDir: env.PGLITE_DIR || '.data/pglite',
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:3600,http://localhost:8081')
      .split(',').map((s) => s.trim()).filter(Boolean),
    sessionHours: Number(env.SESSION_HOURS || 168),
    tickSeconds: Number(env.TICK_SECONDS || 30),
    bodyLimitMb: Number(env.BODY_LIMIT_MB || 15),
    logLevel: env.LOG_LEVEL || 'info'
  };
}

module.exports = { readConfig };
