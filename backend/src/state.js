/**
 * Keeps the engine's data and PostgreSQL in step, with one or several copies of the API.
 *
 * Every piece of engine work runs inside a database transaction that first takes a lock
 * shared by all copies (see server.js), so only one copy changes data at a time. Inside it:
 *
 *   catchUp(tx)  reads what other copies saved since this copy last looked (every saved
 *                change has a number from the data_rev sequence) and applies it in memory;
 *   persist(tx)  compares the engine's data with what was last saved and writes only the
 *                records that changed, each with the next number.
 *
 * If a save fails the server stops, so it never keeps answering from data the database does
 * not have; it reloads from the database when it starts again.
 */
'use strict';

/** Engine collection -> table. Everything else in the data lives in platform_state. */
const TABLES = {
  users: 'users', entities: 'entities', providers: 'providers', agents: 'agents',
  cases: 'cases', offers: 'offers', batches: 'batches', ratings: 'ratings',
  clientRatings: 'client_ratings', disputes: 'disputes', invoices: 'invoices',
  notifications: 'notifications', audit: 'audit'
};
const COLLECTION_OF = Object.fromEntries(Object.entries(TABLES).map(([c, t]) => [t, c]));

const CURRENT_REV = 'SELECT CASE WHEN is_called THEN last_value ELSE 0 END AS rev FROM data_rev';

function createState(db, ICM) {
  // What the database holds now: collection -> (id -> JSON text), and key -> JSON text.
  let saved = { rows: {}, values: {} };
  // Where each record sits in the engine's lists (records are only ever appended): id -> seq.
  const seqOf = {};
  let seenRev = 0;

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
        if (before.get(id) !== json) writes.push(['upsert', coll, id, json]);
      }
      for (const id of before.keys()) if (!after.has(id)) writes.push(['delete', coll, id]);
    }
    for (const key of Object.keys(now.values)) {
      if (saved.values[key] !== now.values[key]) writes.push(['value', key, now.values[key]]);
    }
    for (const key of Object.keys(saved.values)) if (!(key in now.values)) writes.push(['unset', key]);
    return { writes, next: now };
  }

  async function write(tx, writes) {
    for (const w of writes) {
      if (w[0] === 'upsert') {
        const r = await tx.query(`INSERT INTO ${TABLES[w[1]]} (id, doc, updated_at, rev) VALUES ($1, $2::jsonb, now(), nextval('data_rev'))
          ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now(), rev = EXCLUDED.rev RETURNING seq`, [w[2], w[3]]);
        (seqOf[w[1]] = seqOf[w[1]] || new Map()).set(w[2], Number(r.rows[0].seq));
      } else if (w[0] === 'delete') {
        await tx.query(`DELETE FROM ${TABLES[w[1]]} WHERE id = $1`, [w[2]]);
        await tx.query("INSERT INTO removed_records (rev, table_name, id) VALUES (nextval('data_rev'), $1, $2)", [TABLES[w[1]], w[2]]);
        if (seqOf[w[1]]) seqOf[w[1]].delete(w[2]);
      } else if (w[0] === 'value') {
        await tx.query(`INSERT INTO platform_state (key, value, updated_at, rev) VALUES ($1, $2::jsonb, now(), nextval('data_rev'))
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), rev = EXCLUDED.rev`, [w[1], w[2]]);
      } else {
        await tx.query('DELETE FROM platform_state WHERE key = $1', [w[1]]);
        await tx.query("INSERT INTO removed_records (rev, table_name, id) VALUES (nextval('data_rev'), 'platform_state', $1)", [w[1]]);
      }
    }
  }

  const currentRev = async (tx) => Number((await tx.query(CURRENT_REV)).rows[0].rev);

  /** Put a record into its list at the place its seq gives it. */
  function place(coll, rec, seq) {
    const list = ICM.store.db[coll];
    const seqs = seqOf[coll] || (seqOf[coll] = new Map());
    const at = list.findIndex((x) => x.id === rec.id);
    if (at >= 0) { list[at] = rec; seqs.set(rec.id, seq); return; }
    let i = list.length;
    while (i > 0 && (seqs.get(list[i - 1].id) || 0) > seq) i--;
    list.splice(i, 0, rec);
    seqs.set(rec.id, seq);
  }

  return {
    /**
     * Read the data into the engine. An empty database starts with the demo data
     * (start: 'demo') or as an empty platform with the default settings (start: 'empty').
     * Returns 'loaded', 'seeded' or 'created'. Run it holding the shared lock.
     */
    async load(tx, { start }) {
      const values = (await tx.query('SELECT key, value FROM platform_state')).rows;
      if (!values.length) {
        ICM.store.db = start === 'demo' ? ICM.seed.build(Date.now()) : emptyPlatform(ICM);
        saved = { rows: {}, values: {} };
        await this.persist(tx);
        return start === 'demo' ? 'seeded' : 'created';
      }
      const data = {};
      for (const r of values) data[r.key] = r.value;
      for (const coll of Object.keys(TABLES)) {
        // seq is the order records were added in (the engine only ever appends).
        const rows = (await tx.query(`SELECT doc, seq FROM ${TABLES[coll]} ORDER BY seq`)).rows;
        data[coll] = rows.map((r) => r.doc);
        seqOf[coll] = new Map(rows.map((r) => [r.doc.id, Number(r.seq)]));
      }
      if (data.version !== ICM.config.DATA_VERSION) {
        throw new Error(`The database holds data version ${data.version}; this server expects ${ICM.config.DATA_VERSION}.`);
      }
      ICM.store.db = data;
      saved = snapshot(data);
      seenRev = await currentRev(tx);
      return 'loaded';
    },

    /** Apply what other copies saved since this copy last looked. Returns the number of changes. */
    async catchUp(tx) {
      const rev = await currentRev(tx);
      if (rev === seenRev) return 0;
      let n = 0;
      for (const coll of Object.keys(TABLES)) {
        const rows = (await tx.query(`SELECT doc, seq FROM ${TABLES[coll]} WHERE rev > $1 ORDER BY seq`, [seenRev])).rows;
        for (const r of rows) {
          place(coll, r.doc, Number(r.seq));
          saved.rows[coll].set(r.doc.id, JSON.stringify(r.doc));
          n++;
        }
      }
      for (const r of (await tx.query('SELECT key, value FROM platform_state WHERE rev > $1', [seenRev])).rows) {
        ICM.store.db[r.key] = r.value;
        saved.values[r.key] = JSON.stringify(r.value);
        n++;
      }
      for (const r of (await tx.query('SELECT table_name, id FROM removed_records WHERE rev > $1 ORDER BY rev', [seenRev])).rows) {
        if (r.table_name === 'platform_state') {
          delete ICM.store.db[r.id];
          delete saved.values[r.id];
        } else {
          const coll = COLLECTION_OF[r.table_name];
          if (!coll) continue;
          ICM.store.db[coll] = ICM.store.db[coll].filter((x) => x.id !== r.id);
          saved.rows[coll].delete(r.id);
          if (seqOf[coll]) seqOf[coll].delete(r.id);
        }
        n++;
      }
      seenRev = rev;
      return n;
    },

    /** Write what changed since the last save. Returns the number of rows written. */
    async persist(tx) {
      const { writes, next } = changes();
      if (writes.length) await write(tx, writes);
      saved = next;
      seenRev = await currentRev(tx);
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
