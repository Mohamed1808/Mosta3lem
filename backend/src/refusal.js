'use strict';

/** A request the server turns down on purpose: answered as { ok: false, error: { key, params } }. */
class Refusal extends Error {
  constructor(key, params, status) {
    super(key);
    this.key = key;
    this.params = params || null;
    this.status = status || 400;
  }
}

module.exports = { Refusal };
