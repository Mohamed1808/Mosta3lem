/* Start the Expo dev server for the web build (used by the local preview):
   node app/scripts/dev-web.js [port] */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const port = process.argv[2] || '8081';
const cli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', '--web', '--port', port], {
  cwd: root, stdio: 'inherit', env: Object.assign({}, process.env, { CI: '1', BROWSER: 'none' }),
});
child.on('exit', (code) => process.exit(code || 0));
