/* Shared test helpers: a server on its own PGlite database, and a small API client. */
'use strict';

const assert = require('node:assert/strict');
const { readConfig } = require('../src/config');
const { buildServer } = require('../src/server');

const config = (over, env) => Object.assign(readConfig(Object.assign({ MOSTA3LEM_MODE: 'demo' }, env || {})), {
  dataDir: 'memory', corsOrigins: [], sessionHours: 1, tickSeconds: 0, logger: false,
  requestsPerMinute: 10000, signInPerMinute: 10000, filesDriver: 'memory'
}, over || {});

const start = (over, env) => buildServer(config(over, env));

function client(app) {
  return async function call(name, args, token, headers) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/' + name.replace('.', '/'),
      payload: { args: args || [] },
      headers: Object.assign(token ? { authorization: 'Bearer ' + token } : {}, headers || {})
    });
    return { status: res.statusCode, body: res.json() };
  };
}

/** POST to a sign-in route: post(app, 'password', { email, password }). */
async function post(app, route, payload, headers) {
  const res = await app.inject({ method: 'POST', url: '/api/v1/session/' + route, payload, headers: headers || {} });
  return { status: res.statusCode, body: res.json() };
}

/** The last message sent to someone, from the development messenger's outbox. */
async function lastMessage(app, to) {
  const r = await app.db.query('SELECT * FROM outbox WHERE destination = $1 ORDER BY id DESC LIMIT 1', [to]);
  return r.rows[0] || null;
}
const codeIn = (msg) => (msg.body.match(/\b(\d{6})\b/) || [])[1];
const linkTokenIn = (msg) => decodeURIComponent((msg.body.match(/token=([^\s)]+)/) || [])[1] || '');

/** Demo sign-in: "sign in as" the first person with this role. */
async function signInAs(call, role) {
  const users = (await call('auth.listDemoUsers')).body.result;
  const u = users.find((x) => x.role === role);
  const r = await call('auth.loginAs', [u.id]);
  assert.equal(r.status, 200);
  return { user: u, token: r.body.session.token };
}

module.exports = { config, start, client, post, lastMessage, codeIn, linkTokenIn, signInAs };
