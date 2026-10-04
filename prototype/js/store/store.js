/* The data store: one JSON document persisted to localStorage. Only the mock service
   layer (js/services) reads or writes it. Pages never touch it. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var C = ICM.config;
  var listeners = [];

  var store = {
    db: null,

    load: function () {
      var parsed = null;
      try {
        var raw = localStorage.getItem(C.STORAGE_KEY);
        if (raw) parsed = JSON.parse(raw);
      } catch (e) { parsed = null; }
      if (!parsed || parsed.version !== C.DATA_VERSION) {
        this.db = ICM.seed.build(Date.now());
        this.save();
      } else {
        this.db = parsed;
      }
      return this.db;
    },

    save: function () {
      try {
        localStorage.setItem(C.STORAGE_KEY, JSON.stringify(this.db));
        return true;
      } catch (e) {
        if (ICM.ui && ICM.ui.toast) ICM.ui.toast(ICM.t('errors.storageFull'), 'danger');
        return false;
      }
    },

    /** Run a mutation, persist, then notify subscribers. */
    tx: function (fn) {
      var result = fn(this.db);
      this.save();
      this.emit();
      return result;
    },

    reset: function () {
      this.db = ICM.seed.build(Date.now());
      this.save();
      this.emit();
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
    },

    emit: function () { listeners.slice().forEach(function (l) { try { l(); } catch (e) { console.error(e); } }); }
  };

  ICM.store = store;

  /** The demo clock: real time plus an offset the admin can advance. */
  ICM.clock = {
    now: function () { return Date.now() + ((store.db && store.db.clock && store.db.clock.offsetMs) || 0); }
  };
})();
