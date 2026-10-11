/* Files: what is accepted, encryption at rest, signed links, who sees what, clean-up. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { start, client, signInAs } = require('./helpers');
const { sniff } = require('../src/files');

// A real 1x1 JPEG and PNG.
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const dataUrl = (buf, type) => `data:${type};base64,${buf.toString('base64')}`;

/** Fetch a signed link through the server. */
async function fetchLink(app, link) {
  const u = new URL(link);
  return app.inject({ url: u.pathname + u.search });
}

test('files are recognised by their content, not their label', () => {
  assert.equal(sniff(JPEG), 'image/jpeg');
  assert.equal(sniff(PNG), 'image/png');
  assert.equal(sniff(Buffer.from('%PDF-1.7\n')), 'application/pdf');
  assert.equal(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniff(Buffer.from('MZ executable')), null);
});

test('file storage', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosta3lem-files-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const app = await start({ filesDriver: 'local', filesDir: dir, fileMaxMb: 1 });
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;

  // A new individual provider, signed in to their application.
  const signup = await call('registration.submit', [{
    kind: 'individual', services: ['investigation'], fullName: 'Hany Adel Mostafa', nationalId: '29105152112345', phone: '01066554433',
    addrGov: 'giza', addrCity: 'faisal', addrStreet: '3 Faisal St', coverage: { giza: ['faisal'] }, terms: true
  }]);
  assert.equal(signup.status, 200, JSON.stringify(signup.body));
  const applicant = signup.body.session.token;
  const providerId = signup.body.result.providerId;
  const docType = (await call('registration.mine', [], applicant)).body.result.verification.documents[0].type;

  let link;
  await t.test('a photo is stored, and comes back as a short-lived signed link', async () => {
    const r = await call('registration.uploadDocument', [docType, 'id.jpg', dataUrl(JPEG, 'image/jpeg')], applicant);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const doc = r.body.result.verification.documents.find((d) => d.type === docType);
    assert.match(doc.url, /^http:\/\/localhost(:\d+)?\/files\/f_[A-Za-z0-9_-]+\?exp=\d+&sig=/);
    link = doc.url;
    const res = await fetchLink(app, link);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.match(res.headers['content-security-policy'], /sandbox/);
    assert.ok(res.rawPayload.equals(JPEG));
  });

  await t.test('the engine keeps only a reference, and the disk only encrypted bytes', async () => {
    const row = (await app.db.query("SELECT doc FROM providers WHERE id = $1", [providerId])).rows[0];
    const doc = row.doc.verification.documents.find((d) => d.type === docType);
    assert.match(doc.url, /^file:f_/);
    const stored = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.startsWith('f_') && stored.push(path.join(d, e.name))));
    walk(dir);
    assert.equal(stored.length, 1);
    const blob = fs.readFileSync(stored[0]);
    assert.ok(!blob.includes(JPEG.subarray(0, 32)), 'not the plain photo');
  });

  await t.test('a changed or made-up link does not open', async () => {
    const u = new URL(link);
    const later = new URL(link); later.searchParams.set('exp', String(Number(u.searchParams.get('exp')) + 3600000));
    assert.equal((await fetchLink(app, later.toString())).statusCode, 403);
    const other = new URL(link); other.pathname = '/files/f_' + 'A'.repeat(24);
    assert.equal((await fetchLink(app, other.toString())).statusCode, 403);
    const noSig = new URL(link); noSig.searchParams.delete('sig');
    assert.equal((await fetchLink(app, noSig.toString())).statusCode, 403);
  });

  await t.test('teams the engine hides documents from get no link at all', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const seenByOps = JSON.stringify((await call('providers.get', [providerId], ops.token)).body);
    assert.match(seenByOps, /\/files\/f_/);
    const sales = await signInAs(call, 'platform_sales');
    const seenBySales = JSON.stringify((await call('providers.get', [providerId], sales.token)).body);
    assert.doesNotMatch(seenBySales, /\/files\/|file:f_/);
  });

  await t.test('only photos and PDFs are accepted', async () => {
    const before = (await app.db.query('SELECT count(*)::int AS n FROM files')).rows[0].n;
    const fake = await call('registration.uploadDocument', [docType, 'id.jpg', 'data:image/jpeg;base64,' + Buffer.from('not a photo at all').toString('base64')], applicant);
    assert.equal(fake.status, 415);
    assert.equal(fake.body.error.key, 'errors.fileType');
    const svg = await call('registration.uploadDocument', [docType, 'x.svg', dataUrl(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml')], applicant);
    assert.equal(svg.status, 415);
    const pdf = await call('registration.uploadDocument', [docType, 'id.pdf', dataUrl(Buffer.from('%PDF-1.4\n%%EOF\n'), 'application/pdf')], applicant);
    assert.equal(pdf.status, 200);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM files')).rows[0].n, before + 1);
  });

  await t.test('files over the size limit are refused', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(1024 * 1024)]);
    const r = await call('registration.uploadDocument', [docType, 'big.jpg', dataUrl(big, 'image/jpeg')], applicant);
    assert.equal(r.status, 413);
    assert.deepEqual(r.body.error, { key: 'errors.fileTooBig', params: { mb: 1 } });
  });

  await t.test('nothing is stored for someone who is not signed in', async () => {
    const before = (await app.db.query('SELECT count(*)::int AS n FROM files')).rows[0].n;
    const r = await call('registration.uploadDocument', [docType, 'id.jpg', dataUrl(JPEG, 'image/jpeg')]);
    assert.equal(r.status, 401);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM files')).rows[0].n, before);
  });

  await t.test('a field agent adds a visit photo', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const rows = (await call('cases.list', [{}], ops.token)).body.result;
    const inField = rows.find((c) => c.status === 'in_field' && c.agentId);
    assert.ok(inField, 'a case in the field');
    const agentUser = people.find((u) => u.agentId === inField.agentId);
    const { token } = await (async () => { const r = await call('auth.loginAs', [agentUser.id]); return { token: r.body.session.token }; })();
    const r = await call('cases.addPhoto', [inField.id, dataUrl(PNG, 'image/png'), 'Front door'], token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const photo = r.body.result.photos[r.body.result.photos.length - 1];
    const res = await fetchLink(app, photo.dataUrl);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/png');
  });

  await t.test('files nothing points to are removed after a day', async () => {
    // The first photo was replaced by the PDF, so nothing points to it now.
    await app.db.query("UPDATE files SET created_at = now() - interval '2 days'");
    const removed = await app.filesSweep();
    assert.equal(removed, 1);
    assert.equal((await fetchLink(app, link)).statusCode, 404);
    const left = (await app.db.query('SELECT count(*)::int AS n FROM files WHERE deleted_at IS NULL')).rows[0].n;
    assert.equal(left, 2, 'the PDF and the visit photo stay');
  });
});

test('a live platform does not start without a key to encrypt files', async () => {
  await assert.rejects(async () => start({}, { MOSTA3LEM_MODE: 'live', ALLOW_DEV_MESSAGING: 'true' }), /FILES_KEY/);
  await assert.rejects(async () => start({}, { MOSTA3LEM_MODE: 'live', ALLOW_DEV_MESSAGING: 'true', FILES_KEY: 'c2hvcnQ=' }), /32 random bytes/);
});
