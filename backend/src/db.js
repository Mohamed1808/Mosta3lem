/**
 * PostgreSQL access. With DATABASE_URL set it connects to a real PostgreSQL server
 * (Docker, staging, production). Without it, it runs PGlite: real PostgreSQL compiled to
 * run inside Node, kept in a local folder, so development and tests need nothing installed.
 *
 * Both give the same small interface: query(sql, params), transaction(fn), close().
 */
'use strict';

const fs = require('fs');
const path = require('path');

async function openDb({ databaseUrl, dataDir }) {
  if (databaseUrl) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: databaseUrl, max: 10 });
    // Arabic names and addresses need a UTF-8 database (Windows installs can default to WIN1252).
    const enc = (await pool.query('SHOW server_encoding')).rows[0].server_encoding;
    if (String(enc).toUpperCase() !== 'UTF8') {
      await pool.end();
      throw new Error(`The database uses the ${enc} encoding; Mosta3lem needs UTF8 (CREATE DATABASE ... ENCODING 'UTF8').`);
    }
    return {
      kind: 'postgres',
      query: (sql, params) => pool.query(sql, params),
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const r = await fn({ query: (sql, params) => client.query(sql, params) });
          await client.query('COMMIT');
          return r;
        } catch (e) {
          await client.query('ROLLBACK').catch(() => undefined);
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end()
    };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir && dataDir !== 'memory') fs.mkdirSync(path.dirname(path.resolve(dataDir)), { recursive: true });
  const pg = dataDir && dataDir !== 'memory' ? new PGlite(path.resolve(dataDir)) : new PGlite();
  await pg.waitReady;
  return {
    kind: 'pglite',
    query: (sql, params) => pg.query(sql, params),
    transaction: (fn) => pg.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params) })),
    close: () => pg.close()
  };
}

/** The lock copies of the API take while migrating (an arbitrary constant). */
const MIGRATION_LOCK = 7316420500;

/**
 * Apply every migrations/*.sql file not applied yet, in name order. Each runs in its own
 * transaction under a lock, so two copies starting together never apply one twice.
 */
async function migrate(db) {
  await db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  });
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied = [];
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    await db.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);
      const done = (await tx.query('SELECT 1 FROM schema_migrations WHERE name = $1', [f])).rows.length;
      if (done) return;
      for (const statement of splitSql(sql)) await tx.query(statement);
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      applied.push(f);
    });
  }
  return applied;
}

/** Split a migration into statements (no semicolons inside strings in our migrations). */
function splitSql(sql) {
  return sql
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    .split(';').map((s) => s.trim()).filter(Boolean);
}

module.exports = { openDb, migrate };
