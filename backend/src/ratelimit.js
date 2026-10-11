/**
 * Where the rate limits keep their counts. In the database (RATE_LIMIT_STORE=database, the
 * default) every copy of the API counts together, so running 3 copies does not triple what
 * one address may do. In memory (RATE_LIMIT_STORE=memory) each copy counts on its own.
 *
 * The store follows @fastify/rate-limit's interface: incr(key, cb, timeWindow, max) and
 * child(routeOptions). One SQL statement counts a request atomically, so two copies counting
 * the same address at the same moment never lose one.
 */
'use strict';

const COUNT = `
  INSERT INTO rate_limits (key, count, window_ends) VALUES ($1, 1, now() + make_interval(secs => $2::double precision / 1000))
  ON CONFLICT (key) DO UPDATE SET
    count       = CASE WHEN rate_limits.window_ends <= now() THEN 1 ELSE rate_limits.count + 1 END,
    window_ends = CASE WHEN rate_limits.window_ends <= now() THEN EXCLUDED.window_ends ELSE rate_limits.window_ends END
  RETURNING count, GREATEST(0, EXTRACT(EPOCH FROM (window_ends - now())) * 1000)::bigint AS ttl`;

/** A store class bound to a database (the plugin creates it with `new`). */
function databaseStore(db) {
  function DatabaseStore(params, prefix) {
    this.prefix = prefix || 'all:';
  }
  DatabaseStore.prototype.incr = function (key, cb, timeWindow) {
    db.query(COUNT, [(this.prefix + key).slice(0, 300), timeWindow]).then(
      (r) => cb(null, { current: r.rows[0].count, ttl: Number(r.rows[0].ttl) }),
      (e) => cb(e, null)
    );
  };
  DatabaseStore.prototype.child = function (routeOptions) {
    const info = routeOptions.routeInfo || {};
    return new DatabaseStore(routeOptions, (info.method || '') + (info.url || '') + ':');
  };
  return DatabaseStore;
}

/** Remove counts whose window ended (the ticker calls this). */
const sweep = (db) => db.query("DELETE FROM rate_limits WHERE window_ends < now() - interval '1 minute'");

module.exports = { databaseStore, sweep };
