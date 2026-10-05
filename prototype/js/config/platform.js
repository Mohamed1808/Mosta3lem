/* Platform identity. Rename the platform here and nowhere else. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};
  ICM.config.PLATFORM_NAME = 'Mosta3lem';
  ICM.config.STORAGE_KEY = 'icm-db-v1';
  ICM.config.SESSION_KEY = 'icm-session-v1';
  ICM.config.DATA_VERSION = 9;
  // Simulated backend only: the password every seeded organisation and platform account
  // starts with. The real backend stores salted hashes set by each person.
  ICM.config.DEMO_PASSWORD = 'Mosta3lem@2026';
  ICM.config.SIGN_IN_MAX_TRIES = 5;
  ICM.config.SIGN_IN_LOCK_MINUTES = 15;
})();
