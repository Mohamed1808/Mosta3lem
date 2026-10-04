/* Shared UI building blocks. Each returns SafeHtml built with ICM.h, so every piece of
   data is escaped. Config labels come from ICM.ui.cfg, a cache the app loads through the
   config service. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon;
  var ui = (ICM.ui = ICM.ui || {});

  ui.cfg = null; // PlatformConfig, set by the app

  /** Label of an item in a runtime config list (governorates, inquiryTypes, ...). */
  ui.L = function (list, id) {
    if (id == null || id === '') return '-';
    var items = (ui.cfg && ui.cfg.lists[list]) || [];
    var it = items.filter(function (x) { return x.id === id; })[0];
    return it ? U.label(it) : String(id);
  };
  ui.gov = function (id) { return ui.L('governorates', id); };
  ui.types = function (ids) { return (ids || []).map(function (id) { return ui.L('inquiryTypes', id); }).join(', '); };
  ui.bucket = function (id) {
    var b = ICM.config.DPD_BUCKETS.filter(function (x) { return x.id === id; })[0];
    return b ? U.label(b) : '-';
  };

  ui.badge = function (text, tone, dot) {
    return h`<span class="badge b-${tone || 'neutral'}">${dot ? ICM.raw('<span class="bdot"></span>') : ''}${text}</span>`;
  };
  ui.status = function (status, prefix) {
    var tone = ICM.config.STATUS_TONE[status] || 'neutral';
    return ui.badge(t((prefix || 'status') + '.' + status), tone);
  };

  ui.slaBadge = function (c) {
    if (!c || !c.sla || c.sla === 'none') return '';
    var tone = ICM.config.STATUS_TONE[c.sla];
    var text = t('sla.' + c.sla);
    if ((c.sla === 'on_track' || c.sla === 'at_risk') && c.slaRemaining != null) text = t('sla.left', { time: U.fmtDuration(c.slaRemaining) });
    if (c.sla === 'breached' && c.slaRemaining != null) text = t('sla.overdue', { time: U.fmtDuration(c.slaRemaining) });
    return h`<span class="badge b-${tone}" title="${t('sla.' + c.sla)}"><span class="bdot"></span>${text}</span>`;
  };

  ui.scoreBox = function (score) {
    if (score == null) return h`<span class="score">-</span>`;
    var cls = score >= 75 ? 'hi' : score >= 55 ? 'mid' : 'lo';
    return h`<span class="score ${cls}" title="${t('score.title')}">${U.num(score, 0)}</span>`;
  };

  var STAR = '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>';
  ui.stars = function (value, cls) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      var fill = value >= i ? 1 : value > i - 1 ? value - (i - 1) : 0;
      var id = 'g' + Math.random().toString(36).slice(2, 8);
      out += '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="' + id + '"><rect x="0" y="0" width="' + (24 * fill) + '" height="24"/></clipPath></defs>' +
        '<g fill="#dfe3ea">' + STAR + '</g><g fill="#d18b0b" clip-path="url(#' + id + ')">' + STAR + '</g></svg>';
    }
    return ICM.raw('<span class="stars ' + (cls || '') + '" dir="ltr" role="img" aria-label="' + ICM.esc(t('rating.outOf', { n: U.num(value || 0, 1) })) + '">' + out + '</span>');
  };
  /** Stars with average and count, or a "New" badge below the minimum rating count. */
  ui.rating = function (avg, count, isNew) {
    if (isNew || avg == null) return h`<span class="rating-line">${ui.badge(t('rating.new'), 'info')}<span class="faint small">${t('rating.count', { n: count || 0 })}</span></span>`;
    return h`<span class="rating-line">${ui.stars(avg)}<span class="strong">${U.num(avg, 1)}</span><span class="faint small">(${U.num(count)})</span></span>`;
  };
  ui.starInput = function (name, value, size) {
    var out = [];
    for (var i = 1; i <= 5; i++) {
      out.push(h`<button type="button" class="${i <= value ? 'on' : ''}" data-action="setStars" data-name="${name}" data-value="${i}" aria-label="${t('rating.outOf', { n: i })}"><svg viewBox="0 0 24 24" fill="currentColor">${ICM.raw(STAR)}</svg></button>`);
    }
    return h`<span class="star-input ${size || ''}" data-stars="${name}">${out}<input type="hidden" name="${name}" value="${value || ''}"></span>`;
  };

  ui.avail = function (a) {
    var tone = { high: 'success', medium: 'info', low: 'warning', full: 'danger', none: 'muted' }[a] || 'neutral';
    return ui.badge(t('avail.' + a), tone, true);
  };

  ui.kpi = function (label, value, sub, tone, href) {
    var inner = h`<div class="label">${label}</div><div class="value">${value}</div>${sub ? h`<div class="sub">${sub}</div>` : ''}`;
    return href ? h`<a class="kpi ${tone || ''}" href="${href}">${inner}</a>` : h`<div class="kpi ${tone || ''}">${inner}</div>`;
  };

  ui.pageHead = function (title, sub, actions, crumbs) {
    return h`<div class="page-head"><div>${crumbs ? h`<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1>${sub ? h`<div class="sub">${sub}</div>` : ''}</div>${actions ? h`<div class="row wrap">${actions}</div>` : ''}</div>`;
  };
  ui.crumbs = function (items) {
    return items.map(function (it, i) {
      return h`${i ? icon('chevronRight') : ''}${it.href ? h`<a href="${it.href}">${it.label}</a>` : h`<span>${it.label}</span>`}`;
    });
  };

  ui.card = function (title, body, opts) {
    opts = opts || {};
    return h`<section class="card ${opts.cls || ''}">${title ? h`<div class="card-h"><h2>${title}</h2>${opts.actions ? h`<div class="row wrap">${opts.actions}</div>` : ''}</div>` : ''}<div class="card-b ${opts.flush ? 'flush' : ''}">${body}</div>${opts.footer ? h`<div class="card-f">${opts.footer}</div>` : ''}</section>`;
  };

  ui.empty = function (msg, action, ic) {
    return h`<div class="empty">${icon(ic || 'inbox')}<div>${msg}</div>${action ? h`<div class="mt-12">${action}</div>` : ''}</div>`;
  };

  ui.skeleton = function () {
    return h`<div class="stack"><div class="skeleton sk-line" style="width:30%"></div><div class="kpis">${[1, 2, 3, 4].map(function () { return h`<div class="kpi"><div class="skeleton sk-line" style="width:60%"></div><div class="skeleton sk-line" style="width:40%;height:20px"></div></div>`; })}</div><div class="card"><div class="card-b">${[1, 2, 3, 4, 5, 6].map(function () { return h`<div class="skeleton sk-line"></div>`; })}</div></div></div>`;
  };

  ui.notice = function (msg, tone, ic) {
    var map = { info: 'info', warn: 'alert', bad: 'alert', ok: 'check' };
    return h`<div class="notice ${tone || 'info'}">${icon(ic || map[tone || 'info'])}<div>${msg}</div></div>`;
  };

  /**
   * columns: [{ label, render(row) -> html, cls, num }]
   * opts: { href(row) -> url, empty, rowCls(row) }
   */
  ui.table = function (columns, rows, opts) {
    opts = opts || {};
    if (!rows.length) return ui.empty(opts.empty || t('common.noResults'));
    return h`<div class="table-wrap"><table class="table"><thead><tr>${columns.map(function (c) {
      return h`<th class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.label}</th>`;
    })}</tr></thead><tbody>${rows.map(function (r) {
      var href = opts.href ? opts.href(r) : null;
      return h`<tr class="${href ? 'link' : ''} ${opts.rowCls ? opts.rowCls(r) : ''}" ${href ? ICM.raw('data-href="' + ICM.esc(href) + '"') : ''}>${columns.map(function (c) {
        return h`<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.render(r)}</td>`;
      })}</tr>`;
    })}</tbody></table></div>`;
  };

  ui.tabs = function (items, active, action) {
    return h`<div class="tabs" role="tablist">${items.map(function (it) {
      return h`<button type="button" role="tab" class="${it.id === active ? 'on' : ''}" data-action="${action}" data-value="${it.id}">${it.label}${it.count != null ? h`<span class="n">${it.count}</span>` : ''}</button>`;
    })}</div>`;
  };

  ui.segmented = function (items, active, action) {
    return h`<div class="btn-group">${items.map(function (it) {
      return h`<button type="button" class="btn btn-sm ${it.id === active ? 'on' : ''}" data-action="${action}" data-value="${it.id}">${it.icon ? icon(it.icon) : ''}${it.label}</button>`;
    })}</div>`;
  };

  ui.progress = function (ratio, tone) {
    var pct = Math.max(0, Math.min(1, ratio || 0)) * 100;
    return h`<div class="progress ${tone || ''}"><span style="width:${pct.toFixed(1)}%"></span></div>`;
  };

  ui.select = function (name, options, value, attrs) {
    return h`<select class="select ${attrs && attrs.cls || ''}" name="${name}" ${attrs && attrs.id ? ICM.raw('id="' + attrs.id + '"') : ''} ${attrs && attrs.change ? ICM.raw('data-change="' + attrs.change + '"') : ''}>${options.map(function (o) {
      return h`<option value="${o.value}" ${String(o.value) === String(value == null ? '' : value) ? 'selected' : ''}>${o.label}</option>`;
    })}</select>`;
  };
  ui.listOptions = function (list, withAll, allLabel) {
    var items = ((ui.cfg && ui.cfg.lists[list]) || []).map(function (x) { return { value: x.id, label: U.label(x) }; });
    return withAll ? [{ value: '', label: allLabel || t('common.all') }].concat(items) : items;
  };

  ui.masked = function (v) {
    return v == null || v === '' ? h`<span class="lock">${icon('lock')}${t('mask.hidden')}</span>` : v;
  };

  ui.userName = function (name, role) {
    return h`<span>${name}${role ? h` <span class="faint small">${t('role.' + role)}</span>` : ''}</span>`;
  };

  ui.photo = function (p, opts) {
    opts = opts || {};
    if (p.hidden) return h`<div class="photo"><div class="ph">${icon('lock')}</div><div class="stamp">${t('mask.hidden')}</div></div>`;
    return h`<div class="photo">${p.dataUrl ? h`<img src="${p.dataUrl}" alt="${t('evidence.photo')}">` : h`<div class="ph">${icon('camera')}&nbsp;${t('evidence.label.' + (p.label || 'building'))}</div>`}
      <div class="stamp">${U.fmtDateTime(p.at)}<br><span class="mono" dir="ltr">${p.lat != null ? p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) : ''}</span></div>
      ${opts.removable ? h`<button type="button" class="rm" data-action="removePhoto" data-id="${p.id}" title="${t('common.delete')}">${icon('x')}</button>` : ''}</div>`;
  };

  ui.tagChips = function (ids) {
    var tags = (ui.cfg && ui.cfg.lists.ratingTags) || [];
    return h`<span class="tag-list">${(ids || []).map(function (id) {
      var tg = tags.filter(function (x) { return x.id === id; })[0];
      return h`<span class="chip ${tg ? tg.sentiment : ''}">${tg ? U.label(tg) : id}</span>`;
    })}</span>`;
  };

  ui.countdown = function (ms) {
    if (ms == null) return '';
    if (ms <= 0) return h`<span class="badge b-danger">${t('offers.expired')}</span>`;
    var tone = ms < 60 * U.MIN ? 'danger' : ms < 2 * U.HOUR ? 'warning' : 'info';
    return h`<span class="badge b-${tone} countdown">${icon('clock')}${t('offers.expiresIn', { time: U.fmtDuration(ms) })}</span>`;
  };

  ui.money = U.money;
  ui.amountRange = function (key) { return key ? t('amountRange.' + key) : '-'; };

  ui.serviceBadge = function (s) { return ui.badge(t('service.' + s), s === 'investigation' ? 'accent' : 'pending'); };
  ui.kindBadge = function (k) { return ui.badge(t('kind.' + k), k === 'freelancer' ? 'neutral' : 'muted'); };
  ui.verified = function () { return h`<span class="badge b-success" title="${t('provider.verified')}">${icon('shieldCheck')}${t('provider.verified')}</span>`; };

  /** Case timeline. */
  ui.timeline = function (entries) {
    if (!entries || !entries.length) return ui.empty(t('timeline.empty'));
    var list = entries.slice().sort(function (a, b) { return b.at - a.at; });
    return h`<ul class="timeline">${list.map(function (e) {
      var alert = ['sla_breached', 'promise_broken', 'dispute_opened', 'decline', 'expire'].indexOf(e.action) >= 0;
      var label = ICM.i18n.has('timeline.' + e.action) ? t('timeline.' + e.action, e.data || {}) : e.action;
      return h`<li class="${e.to ? 'tx' : ''} ${alert ? 'alert' : ''}">
        <div class="t-head"><span class="strong">${label}</span>${e.to ? ui.status(e.to) : ''}</div>
        <div class="t-meta">${U.fmtDateTime(e.at)} · ${e.actorRole === 'system' ? t('role.system') : h`${e.actorName} (${t('role.' + e.actorRole)})`}</div>
        ${e.note ? h`<div class="t-note">${e.note}</div>` : ''}
      </li>`;
    })}</ul>`;
  };

  ui.addr = function (a) {
    if (!a) return '-';
    if (!a.street) return h`${ui.gov(a.governorate)} ${ui.masked(null)}`;
    // The city in the current language when it is on the governorate's list.
    var cityId = ICM.config.cityIdOf ? ICM.config.cityIdOf(a.governorate, a.city) : null;
    var city = cityId ? U.label(ICM.config.cityLabel(a.governorate, cityId)) : a.city;
    return h`${a.street}, ${city}, ${ui.gov(a.governorate)}${a.landmark ? h`<div class="faint small">${a.landmark}</div>` : ''}`;
  };

  ui.pct = function (x) { return x == null ? '-' : U.pct(x); };

  ui.errorText = function (e) {
    if (!e) return t('errors.generic');
    if (e.key) {
      var p = Object.assign({}, e.params || {});
      if (p.type) p.type = ui.L('inquiryTypes', p.type);
      if (p.zone) p.zone = U.label(ICM.config.ZONES.filter(function (z) { return z.id === p.zone; })[0]);
      if (p.bucket) p.bucket = ui.bucket(p.bucket);
      if (p.gov) p.gov = ui.gov(p.gov);
      return t(e.key, p);
    }
    return e.message || t('errors.generic');
  };
})();
