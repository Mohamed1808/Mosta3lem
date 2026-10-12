/**
 * Change FILES_KEY: re-encrypt every stored file and every authenticator secret with a new
 * key. Do it when the key may have leaked, or as a yearly habit. With the API stopped:
 *
 *   1. Make a new key:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *   2. Take a backup (ops/backup), and keep the old key until step 5.
 *   3. npm run rotate-files-key -- --new-key <the new key>     (FILES_KEY still the old one)
 *   4. Put the new key in FILES_KEY (the secret store) on every copy of the API; start them.
 *   5. Check a few photos open in the console, then destroy the old key.
 *
 * If it stops half-way, run step 3 again: what the new key already opens is skipped.
 */
'use strict';

const { readConfig } = require('./config');
const { buildServer } = require('./server');
const { parseKey } = require('./files');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const newKey = (arg('new-key') || '').trim();
  parseKey(newKey);
  const config = Object.assign(readConfig(), { tickSeconds: 0, logLevel: 'warn' });
  if (config.filesKey && config.filesKey.trim() === newKey) throw new Error('The new key is the same as FILES_KEY.');
  const app = await buildServer(config);
  try {
    const r = await app.adminTools.rotateFilesKey(newKey);
    console.log(`Files: ${r.files.rotated} re-encrypted, ${r.files.already} already on the new key.`);
    console.log(`Authenticator secrets: ${r.secrets.rotated} re-encrypted, ${r.secrets.already} already on the new key.`);
    console.log('Now set FILES_KEY to the new key on every copy of the API and start them.');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
