/* Platform identity. Rename the platform here and nowhere else. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};
  ICM.config.PLATFORM_NAME = '[PlatformName]';
  ICM.config.STORAGE_KEY = 'icm-db-v1';
  ICM.config.SESSION_KEY = 'icm-session-v1';
  ICM.config.DATA_VERSION = 6;
})();
