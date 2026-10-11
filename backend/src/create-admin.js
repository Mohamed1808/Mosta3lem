/**
 * Add the first Super admin to a live platform and email them a link to choose a password.
 * Run it while the API is stopped (the API keeps the data in memory while it runs):
 *
 *   npm run create-admin -- --name "Laila Hosny" --email laila@mosta3lem.example
 *
 * After that, the Super admin adds everyone else from the console.
 */
'use strict';

const { readConfig } = require('./config');
const { buildServer } = require('./server');

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : null;
}

async function main() {
  const name = (arg('name') || '').trim();
  const email = (arg('email') || '').trim().toLowerCase();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Usage: npm run create-admin -- --name "Full Name" --email name@company.com');
  }
  const config = Object.assign(readConfig(), { tickSeconds: 0, logLevel: 'warn' });
  const app = await buildServer(config);
  try {
    const { userId } = await app.adminTools.createSuperAdmin(name, email);
    console.log(`Super admin ${name} <${email}> added (${userId}). A link to choose a password was sent to that email.`);
    if (config.messagingDriver === 'dev') {
      // Nothing is really sent yet: show the message so the link can be passed on by hand.
      const msg = (await app.db.query('SELECT body FROM outbox WHERE destination = $1 ORDER BY id DESC LIMIT 1', [email])).rows[0];
      if (msg) console.log('\nDevelopment messenger, the email reads:\n' + msg.body);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
