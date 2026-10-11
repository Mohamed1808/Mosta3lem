/* Remote services: the same ICM.services contract, answered by the Mosta3lem API instead of
   the in-browser mock. The app and the console load the engine as before (translations,
   settings lists, workflow rules) and then call ICM.remote.connect(); from then on every
   service method is a request to the server, and pages do not change.

   ICM.remote.connect({ baseUrl, storage, onSignedOut }) -> Promise
     baseUrl      the API, e.g. https://api.example.com
     storage      { get(key), set(key, value), remove(key) } for the sign-in token (may be async)
     onSignedOut  called when the server no longer accepts the token (expired, signed out
                  elsewhere, deactivated)

   ICM.remote.session: the real sign-in steps (password, phone, verify, forgot, setPassword)
   and phone registration for push notifications. See backend/README.md. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var TOKEN_KEY = 'icm-api-token';

  function RemoteError(key, params, status) {
    this.name = 'ServiceError';
    this.key = key;
    this.params = params || null;
    this.status = status || 0;
    this.message = key;
  }
  RemoteError.prototype = Object.create(Error.prototype);

  ICM.remote = {
    connected: false,
    RemoteError: RemoteError,

    connect: async function (opts) {
      var base = String(opts.baseUrl || '').replace(/\/+$/, '');
      if (!base) throw new Error('ICM.remote.connect needs baseUrl');
      var storage = opts.storage || { get: function () { return null; }, set: function () {}, remove: function () {} };
      var fetchFn = opts.fetch || window.fetch.bind(window);
      var token = (await storage.get(TOKEN_KEY)) || null;
      var phoneProof = null;
      var listeners = [];
      var emitQueued = false;
      var S = ICM.services;

      // Pages read settings lists and the clock from ICM.store.db; keep a copy of those here.
      ICM.store.db = { version: ICM.config.DATA_VERSION, config: null, clock: { offsetMs: 0 } };
      ICM.store.load = function () { return ICM.store.db; };
      ICM.store.save = function () { return true; };

      async function setToken(t) {
        token = t || null;
        if (token) await storage.set(TOKEN_KEY, token);
        else await storage.remove(TOKEN_KEY);
      }

      function emit() {
        if (emitQueued) return;
        emitQueued = true;
        Promise.resolve().then(function () {
          emitQueued = false;
          listeners.slice().forEach(function (l) { try { l(); } catch (e) { if (window.console) console.error(e); } });
        });
      }

      async function post(path, body, extra) {
        var headers = { 'Content-Type': 'application/json', 'X-Lang': ICM.i18n.lang() };
        if (token) headers.Authorization = 'Bearer ' + token;
        Object.keys(extra || {}).forEach(function (k) { headers[k] = extra[k]; });
        var res, data;
        try {
          res = await fetchFn(base + path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) });
        } catch (e) {
          throw new RemoteError('errors.network');
        }
        try { data = await res.json(); } catch (e) { throw new RemoteError('errors.generic', null, res.status); }
        if (data && data.meta) ICM.store.db.clock.offsetMs = data.meta.clockOffsetMs || 0;
        if (!data || !data.ok) {
          var err = (data && data.error) || { key: 'errors.generic' };
          if (res.status === 401 && token) {
            await setToken(null);
            if (opts.onSignedOut) { try { opts.onSignedOut(); } catch (e) { /* ignore */ } }
          }
          throw new RemoteError(err.key, err.params, res.status);
        }
        if (data.session && data.session.token) await setToken(data.session.token);
        return data;
      }

      async function refreshConfig() {
        var r = await post('/api/v1/config/get', { args: [] });
        ICM.store.db.config = r.result;
      }

      // Every method in the contract becomes a request; helpers outside it (auth.portalOf...) stay.
      Object.keys(ICM.contracts).forEach(function (svc) {
        S[svc] = S[svc] || {};
        Object.keys(ICM.contracts[svc]).forEach(function (method) {
          S[svc][method] = async function () {
            var args = Array.prototype.slice.call(arguments);
            var name = svc + '.' + method;
            var extra = name === 'registration.submit' && phoneProof ? { 'X-Phone-Proof': phoneProof } : null;
            var data = await post('/api/v1/' + svc + '/' + method, { args: args }, extra);
            if (name === 'auth.logout') await setToken(null);
            if (name === 'registration.submit') phoneProof = null;
            if (data.meta && data.meta.changed) {
              if (svc === 'config') ICM.store.db.config = await S.config.get();
              emit();
            }
            return data.result;
          };
        });
      });
      S.subscribe = function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
      };

      ICM.remote.session = {
        /** Organisation users and staff: email and password; a code goes to the email. */
        password: async function (email, password) { return (await post('/api/v1/session/password', { email: email, password: password })).result; },
        /** Providers and agents (purpose 'signin'), or a new provider proving the mobile ('signup'). */
        phone: async function (phone, purpose) { return (await post('/api/v1/session/phone', { phone: phone, purpose: purpose || 'signin' })).result; },
        /** The code. Signs in (returns the session user), or for sign-up keeps the mobile proof. */
        verify: async function (challengeId, code) {
          var r = (await post('/api/v1/session/verify', { challengeId: challengeId, code: code })).result;
          if (r && r.phoneProof) phoneProof = r.phoneProof;
          else emit();
          return r;
        },
        forgot: async function (email) { await post('/api/v1/session/forgot', { email: email }); },
        setPassword: async function (linkToken, password) { await post('/api/v1/session/set-password', { token: linkToken, password: password }); },
        registerDevice: async function (pushToken, platform) {
          await post('/api/v1/devices/register', { token: pushToken, platform: platform, lang: ICM.i18n.lang() });
        },
        unregisterDevice: async function (pushToken) { await post('/api/v1/devices/unregister', { token: pushToken }); },
        signedIn: function () { return !!token; }
      };

      await refreshConfig();
      ICM.remote.connected = true;
      ICM.remote.baseUrl = base;
      return ICM.remote;
    }
  };
})();
