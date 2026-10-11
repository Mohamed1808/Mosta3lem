'use strict';

const { readConfig } = require('./config');
const { buildServer } = require('./server');

async function main() {
  const config = readConfig();
  const app = await buildServer(config);
  await app.listen({ port: config.port, host: config.host });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { app.close().then(() => process.exit(0)); });
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
