/* Chart.js wrapper. Pages render <canvas data-chart="id"> and pass chart configs to
   ICM.ui.charts.mount after render. Charts are destroyed before every re-render. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var ui = (ICM.ui = ICM.ui || {});
  var live = [];

  var PALETTE = ['#1d5ba6', '#0b6a80', '#8f5b00', '#1a7446', '#6b7585', '#b42318', '#5b7fb5', '#3d9aa8'];

  ui.charts = {
    palette: PALETTE,
    destroyAll: function () { live.forEach(function (c) { try { c.destroy(); } catch (e) { /* ignore */ } }); live = []; },
    mount: function (root, configs) {
      if (!window.Chart) {
        Array.prototype.forEach.call(root.querySelectorAll('canvas[data-chart]'), function (cv) {
          cv.parentNode.innerHTML = '<div class="empty small">' + ICM.esc(ICM.t('charts.unavailable')) + '</div>';
        });
        return;
      }
      var rtl = ICM.i18n.dir() === 'rtl';
      var font = rtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif";
      window.Chart.defaults.font.family = font;
      window.Chart.defaults.locale = rtl ? 'ar-EG' : 'en-GB';
      window.Chart.defaults.font.size = 12;
      window.Chart.defaults.color = '#4f5a6b';
      Object.keys(configs).forEach(function (id) {
        var cv = root.querySelector('canvas[data-chart="' + id + '"]');
        if (!cv) return;
        var cfg = configs[id];
        cfg.options = Object.assign({
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', rtl: rtl, labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { rtl: rtl } }
        }, cfg.options || {});
        if (cfg.type !== 'doughnut' && cfg.type !== 'pie') {
          cfg.options.scales = cfg.options.scales || {};
          ['x', 'y'].forEach(function (ax) {
            cfg.options.scales[ax] = Object.assign({ grid: { color: '#eef0f4' }, border: { display: false } }, cfg.options.scales[ax] || {});
          });
          // Mirror for Arabic: time runs right to left and horizontal bars grow from the right.
          if (rtl) cfg.options.scales.x.reverse = true;
          if (rtl) cfg.options.scales.y.position = 'right';
        }
        (cfg.data.datasets || []).forEach(function (ds, i) {
          if (!ds.backgroundColor) ds.backgroundColor = cfg.type === 'doughnut' ? PALETTE : PALETTE[i % PALETTE.length];
          if (!ds.borderColor && cfg.type === 'line') ds.borderColor = PALETTE[i % PALETTE.length];
          if (cfg.type === 'bar') { ds.borderRadius = 2; ds.maxBarThickness = 36; }
        });
        live.push(new window.Chart(cv.getContext('2d'), cfg));
      });
    }
  };
})();
