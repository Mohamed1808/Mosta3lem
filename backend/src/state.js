/**
 * Keeps the engine's data and PostgreSQL in step.
 *
 * On start the server reads every table into the engine. After each request it compares
 * the engine's data with what was last saved and writes only the records that changed,
 * in one database transaction, before answering. If that write fails the server stops,
 * so it never keeps answering from data the database does not have; it reloads from the
 * database when it starts again.
 */
'use strict';

/** Engine collection -> table. Everything else in the data lives in platform_state. */
const TABLES = {
  users: 'users', entities: 'entities', providers: 'providers', agents: 'agents',
  cases: 'cases', offers: 'offers', batches: 'batches', ratings: 'ratings',
  clientRatings: 'client_ratings', disputes: 'disputes', invoices: 'invoices',
  notifications: 'notifications', audit: 'audit'
};

function createState(db, ICM) {
  // What the database holds now: collection -> (id -> JSON text), and key -> JSON text.
  let saved = { rows: {}, values: {} };

  function snapshot(data) {
    const rows = {}, values = {};
    for (const coll of Object.keys(TABLES)) {
      rows[coll] = new Map();
      for (const rec of data[coll] || []) rows[coll].set(rec.id, JSON.stringify(rec));
    }
    for (const key of Object.keys(data)) {
      if (!TABLES[key]) values[key] = JSON.stringify(data[key]);
    }
    return { rows, values };
  }

  /** The writes needed to bring the database to the engine's current data. */
  function changes() {
    const now = snapshot(ICM.store.db);
    const writes = [];
    for (const coll of Object.keys(TABLES)) {
      const before = saved.rows[coll] || new Map(), after = now.rows[coll];
      for (const [id, json] of after) {
        if (before.get(id) !== json) writes.push(['upsert', TABLES[coll], id, json]);
      }
      for (const id of before.keys()) if (!after.has(id)) writes.push(['delete', TABLES[coll], id]);
    }
    for (const key of Object.keys(now.values)) {
      if (saved.values[key] !== now.values[key]) writes.push(['value', key, now.values[key]]);
    }
    for (const key of Object.keys(saved.values)) if (!(key in now.values)) writes.push(['unset', key]);
    return { writes, next: now };
  }

  async function write(writes) {
    if (!writes.length) return;
    await db.transaction(async (tx) => {
      for (const w of writes) {
        if (w[0] === 'upsert') {
          await tx.query(`INSERT INTO ${w[1]} (id, doc, updated_at) VALUES ($1, $2::jsonb, now())
            ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`, [w[2], w[3]]);
        } else if (w[0] === 'delete') {
          await tx.query(`DELETE FROM ${w[1]} WHERE id = $1`, [w[2]]);
        } else if (w[0] === 'value') {
          await tx.query(`INSERT INTO platform_state (key, value, updated_at) VALUES ($1, $2::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [w[1], w[2]]);
        } else {
          await tx.query('DELETE FROM platform_state WHERE key = $1', [w[1]]);
        }
      }
    });
  }

  return {
    /**
     * Read the data into the engine. An empty database starts with the demo data
     * (start: 'demo') or as an empty platform with the default settings (start: 'empty').
     * Returns 'loaded', 'seeded' or 'created'.
     */
    async load({ start }) {
      const values = (await db.query('SELECT key, value FROM platform_state')).rows;
      if (!values.length) {
        ICM.store.db = start === 'demo' ? ICM.seed.build(Date.now()) : emptyPlatform(ICM);
        saved = { rows: {}, values: {} };
        await this.persist();
        return start === 'demo' ? 'seeded' : 'created';
      }
      const data = {};
      for (const r of values) data[r.key] = r.value;
      for (const coll of Object.keys(TABLES)) {
        // seq is the order records were added in (the engine only ever appends).
        const rows = (await db.query(`SELECT doc FROM ${TABLES[coll]} ORDER BY seq`)).rows;
        data[coll] = rows.map((r) => r.doc);
      }
      if (data.version !== ICM.config.DATA_VERSION) {
        throw new Error(`The database holds data version ${data.version}; this server expects ${ICM.config.DATA_VERSION}.`);
      }
      ICM.store.db = data;
      saved = snapshot(data);
      return 'loaded';
    },

    /** Write what changed since the last save. Returns the number of rows written. */
    async persist() {
      const { writes, next } = changes();
      await write(writes);
      saved = next;
      return writes.length;
    }
  };
}

/** A live platform's first day: the default settings and lists, no people, no work. */
function emptyPlatform(ICM) {
  const now = Date.now();
  const data = ICM.seed.build(now);
  for (const coll of Object.keys(TABLES)) data[coll] = [];
  data.scores = {};
  data.counters = {};
  data.clock = { offsetMs: 0 };
  data.seededAt = now;
  return data;
}

module.exports = { createState, TABLES };
