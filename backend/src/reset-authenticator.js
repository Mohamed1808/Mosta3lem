/**
 * Remove a staff member's authenticator app, for a lost phone when no other Super admin can
 * reset their sign-in from the console. They set up a new one at their next sign-in.
 * Run it while the API is stopped:
 *
 *   npm run reset-authenticator -- --email laila@mosta3lem.example
 */
'use strict';

const { readConfig } = require('./config');
const { buildServer } = require('./server');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const email = (arg('email') || '').trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run reset-authenticator -- --email name@company.com');
  const app = await buildServer(Object.assign(readConfig(), { tickSeconds: 0, logLevel: 'warn' }));
  try {
    const r = await app.adminTools.resetAuthenticator(email);
    console.log(r.removed ? `Authenticator removed for ${email}. They set up a new one at their next sign-in.` : `${email} had no authenticator.`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
