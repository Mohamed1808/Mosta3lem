/**
 * Files: case photos, provider documents and their renewals.
 *
 * The app and the console send a file inside a request as a data URL ("data:image/jpeg;
 * base64,..."), exactly as they do with the simulated backend. On the way in the server
 * checks it is really a photo or a PDF, encrypts it, stores it, and hands the engine a
 * reference ("file:<id>") instead. On the way out every reference the engine returns
 * becomes a signed link that works for a few minutes. The engine still decides who sees
 * which file: when it hides a document from a team, there is no reference to sign.
 *
 *   GET /files/<id>?exp=<ms>&sig=<signature>
 *
 * Storage is a driver (FILES_DRIVER): local (a folder on the server's disk) or memory
 * (tests). An Egyptian cloud's object storage plugs in here once chosen.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Refusal } = require('./refusal');

const REF = /^file:(f_[A-Za-z0-9_-]{16,64})$/;
const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+)?(;[a-z-]+=[^;,]+)*;base64,/i;
const LINK_MINUTES = 15;

/** What a file really is, from its first bytes (the name or declared type is not trusted). */
function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

// ------------------------------------------------------------------ storage drivers
function localDriver(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const where = (key) => path.join(dir, key.slice(2, 4), key);
  return {
    async put(key, blob) {
      fs.mkdirSync(path.dirname(where(key)), { recursive: true });
      await fs.promises.writeFile(where(key), blob, { flag: 'wx' });
    },
    get: (key) => fs.promises.readFile(where(key)),
    remove: (key) => fs.promises.rm(where(key), { force: true })
  };
}

function memoryDriver() {
  const blobs = new Map();
  return {
    async put(key, blob) { blobs.set(key, Buffer.from(blob)); },
    async get(key) { if (!blobs.has(key)) throw new Error('missing file ' + key); return blobs.get(key); },
    async remove(key) { blobs.delete(key); }
  };
}

/** The master key: FILES_KEY (32 bytes, base64), or in demo mode one kept next to the data. */
function masterKey(config) {
  if (config.filesKey) {
    const k = Buffer.from(config.filesKey, 'base64');
    if (k.length !== 32) throw new Error('FILES_KEY must be 32 random bytes, base64 encoded.');
    return k;
  }
  if (config.mode !== 'demo') throw new Error('Live mode needs FILES_KEY (32 random bytes, base64) to encrypt files.');
  if (config.filesDriver === 'memory') return crypto.randomBytes(32);
  const file = path.join(config.filesDir, '.demo-key');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(config.filesDir, { recursive: true });
    fs.writeFileSync(file, crypto.randomBytes(32).toString('base64'), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'base64');
}

function createFiles({ db, config, log }) {
  const master = masterKey(config);
  const derive = (label) => Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), label, 32));
  const encKey = derive('mosta3lem files encryption');
  const signKey = derive('mosta3lem file links');
  const store = config.filesDriver === 'memory' ? memoryDriver() : localDriver(config.filesDir);
  const maxBytes = config.fileMaxMb * 1024 * 1024;

  // AES-256-GCM. Stored as iv (12) | tag (16) | ciphertext; the file id is bound in as extra data.
  function seal(id, plain) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    c.setAAD(Buffer.from(id));
    const body = Buffer.concat([c.update(plain), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), body]);
  }
  function open(id, blob) {
    const d = crypto.createDecipheriv('aes-256-gcm', encKey, blob.subarray(0, 12));
    d.setAAD(Buffer.from(id));
    d.setAuthTag(blob.subarray(12, 28));
    return Buffer.concat([d.update(blob.subarray(28)), d.final()]);
  }

  const sign = (id, exp) => crypto.createHmac('sha256', signKey).update(id + '.' + exp).digest('base64url');

  /** Store one data URL; returns its reference "file:<id>". */
  async function save(dataUrl, userId) {
    const comma = dataUrl.indexOf(',');
    const buf = Buffer.from(dataUrl.slice(comma + 1), 'base64');
    if (!buf.length) throw new Refusal('errors.fileType');
    if (buf.length > maxBytes) throw new Refusal('errors.fileTooBig', { mb: config.fileMaxMb }, 413);
    const mime = sniff(buf);
    if (!mime) throw new Refusal('errors.fileType', null, 415);
    const id = 'f_' + crypto.randomBytes(18).toString('base64url');
    await store.put(id, seal(id, buf));
    await db.query(
      'INSERT INTO files (id, mime, size_bytes, sha256, storage_key, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, mime, buf.length, crypto.createHash('sha256').update(buf).digest('hex'), id, userId || null]);
    return 'file:' + id;
  }

  /** A copy of value with every data URL replaced by a stored file's reference. */
  async function ingest(value, userId, depth = 0) {
    if (typeof value === 'string') return DATA_URL.test(value) ? save(value, userId) : value;
    if (depth > 10 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      const out = [];
      for (const v of value) out.push(await ingest(v, userId, depth + 1));
      return out;
    }
    const out = {};
    for (const k of Object.keys(value)) out[k] = await ingest(value[k], userId, depth + 1);
    return out;
  }

  /** Replace, in place, every file reference with a signed link under base. */
  function present(value, base, depth = 0) {
    if (depth > 30 || value === null || typeof value !== 'object') return value;
    const keys = Array.isArray(value) ? value.keys() : Object.keys(value);
    for (const k of keys) {
      const v = value[k];
      if (typeof v === 'string') {
        const m = REF.exec(v);
        if (m) value[k] = link(m[1], base);
      } else if (v && typeof v === 'object') {
        present(v, base, depth + 1);
      }
    }
    return value;
  }

  function link(id, base) {
    const exp = Date.now() + LINK_MINUTES * 60000;
    return `${base}/files/${id}?exp=${exp}&sig=${sign(id, exp)}`;
  }

  /** Every file the engine's data still points to. */
  function referenced(data) {
    const ids = new Set();
    const re = /"file:(f_[A-Za-z0-9_-]{16,64})"/g;
    const text = JSON.stringify(data);
    let m;
    while ((m = re.exec(text))) ids.add(m[1]);
    return ids;
  }

  return {
    ingest,
    present,
    referenced,

    /** Files nothing points to any more (a removed photo, a replaced document), after a day. */
    async sweep(data) {
      const keep = referenced(data);
      const old = (await db.query(
        "SELECT id, storage_key FROM files WHERE deleted_at IS NULL AND created_at < now() - interval '1 day'")).rows;
      let removed = 0;
      for (const f of old) {
        if (keep.has(f.id)) continue;
        await store.remove(f.storage_key);
        await db.query('UPDATE files SET deleted_at = now() WHERE id = $1', [f.id]);
        removed++;
      }
      return removed;
    },

    routes(app) {
      app.get('/files/:id', async (req, reply) => {
        const { id } = req.params;
        const exp = Number(req.query.exp), sig = String(req.query.sig || '');
        const expected = /^f_[A-Za-z0-9_-]{16,64}$/.test(id) && exp ? sign(id, exp) : '';
        const valid = expected && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
        if (!valid || exp < Date.now()) return reply.code(403).send({ ok: false, error: { key: 'errors.linkInvalid', params: null } });
        const row = (await db.query('SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
        if (!row) return reply.code(404).send({ ok: false, error: { key: 'errors.notFound', params: null } });
        let body;
        try {
          body = open(id, await store.get(row.storage_key));
        } catch (e) {
          log.error({ err: e, file: id }, 'file could not be read');
          return reply.code(500).send({ ok: false, error: { key: 'errors.generic', params: null } });
        }
        return reply
          .header('Content-Type', row.mime)
          .header('Content-Disposition', 'inline')
          .header('Content-Security-Policy', "default-src 'none'; sandbox")
          .send(body);
      });
    }
  };
}

module.exports = { createFiles, sniff };
