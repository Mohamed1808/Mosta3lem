/* Provider portal: team, profile and settings, ratings, client ratings, earnings and
   the collection portfolio report. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.provider = P.provider || {};

  // ================================================================ team
  // Owner -> supervisors -> field agents. The owner manages everyone; a supervisor sees and
  // manages only the field agents that report to them.
  function agentCoverage(a) {
    if (a.coverageCities) return a.coverageCities;
    var out = {};
    (a.governorates || []).forEach(function (g) { out[g] = []; });
    return out;
  }

  function memberModal(d, role, member, presetSupervisor) {
    var isAgent = role === 'agent';
    var prov = d.provider;
    var editing = !!member;
    var sups = d.supervisors.filter(function (s) { return s.active !== false; });
    var start = member ? {
      name: member.name, phone: member.phone, email: member.email, nationalId: member.nationalId,
      services: (member.services || prov.services).slice(), coverage: isAgent ? agentCoverage(member) : null, supervisorId: member.supervisorId
    } : { services: prov.services.length === 1 ? prov.services.slice() : [], coverage: {}, supervisorId: presetSupervisor || (sups.length === 1 ? sups[0].id : '') };
    function fld(v, errors, name, label, opts) {
      opts = opts || {};
      var bad = errors[name];
      return h`<div class="field ${opts.full ? 'full' : ''}"><label for="tm_${name}">${label}${opts.required ? h`<span class="req">*</span>` : ''}</label>
        <input class="input ${bad ? 'invalid' : ''}" id="tm_${name}" name="${name}" value="${v[name] || ''}" ${opts.ltr ? ICM.raw('dir="ltr" inputmode="numeric"') : ''} ${opts.max ? ICM.raw('maxlength="' + opts.max + '"') : ''}>
        ${bad ? h`<div class="err">${t(bad)}</div>` : ''}</div>`;
    }
    function supervisorControl(v, errors) {
      if (d.canManage && !editing) {
        return h`<select class="select ${errors.supervisorId ? 'invalid' : ''}" id="tm_sup" name="supervisorId"><option value="">${t('common.select')}</option>${sups.map(function (s) {
          return h`<option value="${s.id}" ${s.id === v.supervisorId ? 'selected' : ''}>${s.name}</option>`;
        })}</select>`;
      }
      var sup = d.supervisors.filter(function (s) { return s.id === (v.supervisorId || d.me.userId); })[0];
      return h`<div class="small">${sup ? sup.name : t('team.noSupervisor')}${editing && d.canManage ? h` <span class="xs faint">${t('team.moveHint')}</span>` : ''}</div>`;
    }
    function body(v, errors) {
      return h`<form id="tm-form" data-submit="modal" class="stack" novalidate>
        <div class="form-grid">
          ${fld(v, errors, 'name', t('common.name'), { required: true })}
          ${fld(v, errors, 'phone', t('team.mobile'), { required: true, ltr: true })}
          ${fld(v, errors, 'nationalId', t('reg.f.nationalId'), { required: isAgent, ltr: true, max: 14 })}
          ${fld(v, errors, 'email', t('common.email'), {})}
          <div class="field full"><label>${isAgent ? t('team.agentServices') : t('team.supervisorServices')}<span class="req">*</span></label><div class="checks">${prov.services.map(function (s) {
            return h`<label class="check"><input type="checkbox" name="services" value="${s}" ${v.services.indexOf(s) >= 0 ? 'checked' : ''}>${t('service.' + s)}</label>`;
          })}</div>${errors.services ? h`<div class="err">${t(errors.services)}</div>` : ''}</div>
          ${isAgent ? h`<div class="field full"><label for="tm_sup">${t('team.reportsTo')}<span class="req">*</span></label>${supervisorControl(v, errors)}
            ${errors.supervisorId ? h`<div class="err">${t(errors.supervisorId)}</div>` : ''}</div>` : ''}
        </div>
        ${isAgent ? h`<div><h3 class="mb-8">${t('team.agentCoverage')}<span class="req">*</span></h3><p class="xs faint mb-8">${t('team.agentCoverageHint')}</p>
          ${errors.coverage ? h`<div class="err mb-8">${t(errors.coverage)}</div>` : ''}${ui.coverage.picker('tm', v.coverage, { only: prov.governorates, cityLimit: prov.coverageCities })}</div>` : ''}
        <div class="err small" data-err style="color:var(--bad)"></div>
      </form>`;
    }
    return new Promise(function (resolve) {
      var saved = false;
      var ctrl = ui.modal.open({
        title: editing ? t('team.editTitle', { name: member.name }) : isAgent ? t('team.addAgent') : t('team.addSupervisor'),
        size: isAgent ? 'lg' : '',
        body: body(start, {}),
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="tm-form" class="btn btn-primary">${editing ? t('common.saveChanges') : isAgent ? t('team.addAgent') : t('team.addSupervisor')}</button>`,
        onSubmit: async function (raw, form) {
          var v = {
            name: (raw.name || '').trim(), phone: (raw.phone || '').trim(), email: (raw.email || '').trim(), nationalId: (raw.nationalId || '').trim(),
            services: U.asArray(raw.services), supervisorId: raw.supervisorId || start.supervisorId || (d.canManage ? '' : d.me.userId)
          };
          if (isAgent) v.coverage = ui.coverage.read(form, 'tm') || {};
          var errors = wf.validateTeamMember(role, Object.assign({}, v, { phone: v.phone.replace(/[\s\-]/g, ''), nationalId: v.nationalId.replace(/[\s\-]/g, '') }),
            { services: prov.services, now: ICM.clock.now() });
          if (editing && isAgent && !start.supervisorId) delete errors.supervisorId;
          if (Object.keys(errors).length) { ctrl.update({ body: body(v, errors) }); return; }
          try {
            if (editing) await S.team.updateMember(member.id, v);
            else if (isAgent) await S.team.addAgent(v);
            else await S.team.addSupervisor(v);
            saved = true; ctrl.close();
            ui.toast(editing ? t('team.saved') : isAgent ? t('team.agentAdded', { name: v.name }) : t('team.supervisorAdded', { name: v.name }), 'success');
          } catch (e) {
            if (e && e.params && e.params.field) { var er = {}; er[e.params.field] = e.key; ctrl.update({ body: body(v, er) }); return; }
            var box = ctrl.el && ctrl.el.querySelector('[data-err]');
            if (box) box.textContent = ui.errorText(e); else ui.fail(e);
          }
        },
        onClose: function () { resolve(saved); }
      });
    });
  }

  P.provider.team = {
    title: function () { return t('nav.team'); },
    load: function () { return S.team.structure(); },
    render: function (d, ctx) {
      var inv = ctx.service === 'investigation';
      var owner = d.canManage;
      var activeSups = d.supervisors.filter(function (s) { return s.active !== false; });
      var agentCount = d.unassigned.length + U.sum(d.supervisors, function (s) { return s.agents.length; });
      var ltr = function (x) { return x ? h`<bdi dir="ltr">${x}</bdi>` : ''; };

      function agentTable(agents) {
        return ui.table([
          { label: t('common.name'), render: function (a) { return h`<strong>${a.name}</strong><div class="sub">${ltr(a.phone)}</div>`; } },
          { label: t('team.coverage'), render: function (a) { return h`<span class="small">${ui.coverage.text(agentCoverage(a), 3)}</span>`; } },
          { label: t('profile.services'), render: function (a) { return h`${a.services.map(function (s) { return ui.serviceBadge(s); })}`; } },
          { label: t('common.status'), render: function (a) { return a.active ? ui.badge(t('common.active'), 'success') : ui.badge(t('common.inactive'), 'muted'); } },
          { label: t('assign.load'), num: true, render: function (a) { return U.num(a.stats.open); } },
          inv ? { label: t('metric.onTime'), num: true, render: function (a) { return ui.pct(a.stats.onTimeRate); } } : { label: t('team.collected'), num: true, render: function (a) { return U.money(a.stats.collected); } },
          owner ? { label: t('team.reportsTo'), render: function (a) {
            var current = activeSups.some(function (s) { return s.id === a.supervisorId; });
            return h`<select class="select sm" data-change="moveAgent" data-id="${a.id}" aria-label="${t('team.reportsTo')}">${current ? '' : h`<option value="">${t('team.noSupervisor')}</option>`}${activeSups.map(function (s) {
              return h`<option value="${s.id}" ${s.id === a.supervisorId ? 'selected' : ''}>${s.name}</option>`;
            })}</select>`;
          } } : null,
          { label: '', cls: 'right nowrap', render: function (a) {
            return h`<button type="button" class="btn btn-sm btn-ghost" data-action="editAgent" data-id="${a.id}" title="${t('common.edit')}" aria-label="${t('common.edit')}">${icon('edit')}</button>${a.active
              ? h`<button type="button" class="btn btn-sm btn-danger" data-action="toggle" data-id="${a.id}" data-on="0">${t('team.deactivate')}</button>`
              : h`<button type="button" class="btn btn-sm" data-action="toggle" data-id="${a.id}" data-on="1">${t('team.activate')}</button>`}`;
          } }
        ].filter(Boolean), agents, { empty: t('team.noAgents') });
      }

      function supCard(s) {
        var off = s.active === false;
        var head = h`<div class="row wrap"><span class="avatar">${U.initials(s.name)}</span><div><div class="strong">${s.name}${s.id === d.me.userId ? h` <span class="xs faint">${t('team.you')}</span>` : ''}</div>
          <div class="xs faint">${t('role.provider_supervisor')} · ${ltr(s.phone)} · ${t('team.agentsN', { n: s.agents.length })}</div></div>
          ${(s.services || []).map(function (x) { return ui.serviceBadge(x); })}${off ? ui.badge(t('common.inactive'), 'muted') : ''}</div>`;
        var actions = h`${!off ? h`<button type="button" class="btn btn-sm" data-action="addAgent" data-sup="${s.id}">${icon('plus')}${t('team.addAgent')}</button>` : ''}
          ${owner || s.id === d.me.userId ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="editSupervisor" data-id="${s.id}">${icon('edit')}${t('common.edit')}</button>` : ''}
          ${owner ? (!off ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="toggleSupervisor" data-id="${s.id}" data-on="0">${t('team.deactivate')}</button>` : h`<button type="button" class="btn btn-sm" data-action="toggleSupervisor" data-id="${s.id}" data-on="1">${t('team.activate')}</button>`) : ''}`;
        return h`<section class="card team-card ${off ? 'is-off' : ''}"><div class="card-h">${head}<div class="row wrap">${actions}</div></div><div class="card-b flush">${agentTable(s.agents)}</div></section>`;
      }

      return h`${ui.pageHead(t('nav.team'), owner ? t('team.subtitleOwner', { s: d.supervisors.length, n: agentCount }) : t('team.subtitleSupervisor', { n: agentCount }),
          h`${owner ? h`<button type="button" class="btn" data-action="addSupervisor">${icon('plus')}${t('team.addSupervisor')}</button>` : ''}
            ${activeSups.length ? h`<button type="button" class="btn btn-primary" data-action="addAgent">${icon('plus')}${t('team.addAgent')}</button>` : ''}`)}
        <div class="org-strip mb-16">
          <div class="org-node">${icon('briefcase')}<div><div class="xs faint">${t('team.owner')}</div><div class="strong small">${d.owners.map(function (o) { return o.name; }).join(t('common.listSep')) || '-'}</div></div></div>
          <span class="org-arrow">${icon('chevronRight')}</span>
          <div class="org-node">${icon('users')}<div><div class="xs faint">${t('team.supervisors')}</div><div class="strong small">${U.num(activeSups.length)}</div></div></div>
          <span class="org-arrow">${icon('chevronRight')}</span>
          <div class="org-node">${icon('smartphone')}<div><div class="xs faint">${t('team.fieldAgents')}</div><div class="strong small">${U.num(agentCount)}</div></div></div>
        </div>
        ${owner ? (function () {
          var me = d.owners.filter(function (o) { return o.id === d.me.userId; })[0];
          if (!me) return '';
          var fw = me.fieldWork;
          return h`<section class="card mb-16"><div class="card-h"><div><h2>${t('team.ownerFieldWork')}</h2><div class="xs faint">${t('team.ownerFieldWorkBody')}</div></div>
            <div class="row wrap">${fw ? h`${ui.badge(t('team.ownerFieldWorkOn'), 'success')}<span class="small">${ui.coverage.text(fw.coverageCities, 3)}</span><button type="button" class="btn btn-sm btn-ghost" data-action="ownerField" data-on="0">${t('team.ownerFieldWorkStop')}</button>`
              : h`<button type="button" class="btn btn-sm btn-primary" data-action="ownerField" data-on="1">${t('team.ownerFieldWorkStart')}</button>`}</div></div></section>`;
        })() : ''}
        ${owner && !d.supervisors.length ? h`<div class="mb-16">${ui.notice(t('team.startHint'), 'info')}</div>` : ''}
        <div class="stack">${d.supervisors.map(supCard)}
          ${d.unassigned.length ? h`<section class="card"><div class="card-h"><div><h2>${t('team.unassigned')}</h2><div class="xs faint">${t('team.unassignedHint')}</div></div></div><div class="card-b flush">${agentTable(d.unassigned)}</div></section>` : ''}</div>`;
    },
    actions: {
      addSupervisor: async function (el, ev, ctx) { if (await memberModal(await S.team.structure(), 'provider_supervisor')) ctx.reload(); },
      addAgent: async function (el, ev, ctx) { if (await memberModal(await S.team.structure(), 'agent', null, el.getAttribute('data-sup'))) ctx.reload(); },
      editAgent: async function (el, ev, ctx) {
        var d = await S.team.structure();
        var all = d.supervisors.reduce(function (acc, s) { return acc.concat(s.agents); }, d.unassigned.slice());
        var a = all.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (a && await memberModal(d, 'agent', a)) ctx.reload();
      },
      editSupervisor: async function (el, ev, ctx) {
        var d = await S.team.structure();
        var s = d.supervisors.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (s && await memberModal(d, 'provider_supervisor', s)) ctx.reload();
      },
      moveAgent: async function (el, ev, ctx) {
        if (!el.value) return;
        await S.team.moveAgent(el.getAttribute('data-id'), el.value);
        ui.toast(t('team.moved'), 'success'); ctx.reload();
      },
      toggle: async function (el, ev, ctx) {
        var on = el.getAttribute('data-on') === '1';
        if (!on && !(await ui.confirm({ title: t('team.deactivate'), message: t('team.deactivateBody'), danger: true, confirmLabel: t('team.deactivate') }))) return;
        await S.team.setActive(el.getAttribute('data-id'), on);
        ctx.reload();
      },
      /** Start (covering the whole company area; the app lets the owner narrow it) or stop the owner's field work. */
      ownerField: async function (el, ev, ctx) {
        var on = el.getAttribute('data-on') === '1';
        await S.team.setOwnerFieldWork(on);
        ui.toast(on ? t('team.ownerFieldWorkStarted') : t('team.ownerFieldWorkStopped'), 'success');
        ctx.reload();
      },
      toggleSupervisor: async function (el, ev, ctx) {
        var on = el.getAttribute('data-on') === '1';
        if (!on && !(await ui.confirm({ title: t('team.deactivate'), message: t('team.deactivateSupervisorBody'), danger: true, confirmLabel: t('team.deactivate') }))) return;
        await S.team.setActive(el.getAttribute('data-id'), on);
        ctx.reload();
      }
    }
  };

  // ================================================================ profile & settings
  P.provider.profile = {
    title: function () { return t('nav.profile'); },
    load: function () { return S.providers.mine(); },
    render: function (p, ctx) {
      var pricing = ui.cfg.pricing, zones = C.ZONES;
      var inv = p.services.indexOf('investigation') >= 0, col = p.services.indexOf('collection') >= 0;
      var types = ui.cfg.lists.inquiryTypes;
      return h`${ui.pageHead(t('nav.profile'), p.name, h`${ui.status(p.verification.status)}${ui.kindBadge(p.kind)}`)}
        <form data-submit="save" class="stack">
          <div class="grid cols-2">
            ${ui.card(t('profile.basics'), h`<div class="form-grid">
              <div class="field full"><label>${t('profile.description')}</label><textarea class="textarea" name="description" rows="2">${p.description || ''}</textarea></div>
              <div class="field"><label>${t('common.phone')}</label><input class="input" name="phone" value="${p.phone || ''}" dir="ltr"></div>
              <div class="field"><label>${t('common.email')}</label><input class="input" name="email" value="${p.email || ''}" dir="ltr"></div>
              <div class="field"><label>${t('profile.city')}</label><input class="input" name="city" value="${p.city || ''}"></div>
              <div class="field"><label>${t('profile.services')}</label><div>${p.services.map(function (s) { return ui.serviceBadge(s); })}</div></div>
            </div>`)}
            ${ui.card(t('profile.documents'), h`<div class="stack tight">${p.verification.documents.map(function (dc) {
              var ex = ICM.wf.docExpiry(dc, ICM.clock.now());
              return h`<div class="stat-row"><span>${t('doc.' + dc.type)}${dc.expiresAt ? h`<div class="xs ${ex.state === 'expired' ? 'bad' : ex.state === 'expiring' ? 'warn' : 'faint'}">${t('settings.expires', { date: U.fmtDate(dc.expiresAt) })}</div>` : ''}${dc.renewal ? h`<div class="xs">${t('settings.renewalWaiting')}</div>` : ''}</span><span class="row">${ex.state === 'expired' ? ui.badge(t('settings.state.expired'), 'danger') : ex.state === 'expiring' ? ui.badge(t('settings.state.expiring'), 'warning') : ui.status(dc.status === 'uploaded' ? 'pending' : dc.status === 'missing' ? 'rejected' : 'verified', 'docStatus')}${dc.status === 'missing' ? h`<button type="button" class="btn btn-sm" data-action="upload" data-type="${dc.type}">${icon('upload')}${t('profile.upload')}</button>` : ''}</span></div>`;
            })}<p class="xs faint">${t('profile.docsNote')}</p></div>`)}
          </div>
          ${p.priceRequest ? ui.notice(t('settings.priceRequestPending', { date: U.fmtDateTime(p.priceRequest.at) }), 'info') : ''}
          ${ui.card(t('profile.registration'), h`<p class="small muted mb-8">${t('profile.registrationHint')}</p>${ui.registrationDetails(p)}`)}
          ${ui.card(t('profile.coverage'), h`<p class="small muted mb-8">${t('profile.coverageHint')}</p><div class="form-grid cols-4">${ui.cfg.lists.governorates.map(function (g) {
            var on = p.governorates.indexOf(g.id) >= 0;
            return h`<div class="field"><label class="check"><input type="checkbox" name="gov" value="${g.id}" ${on ? 'checked' : ''}>${U.label(g)}</label>
              <input class="input sm" type="number" min="1" name="cap_${g.id}" value="${p.capacity[g.id] || ''}" placeholder="${t('profile.capacity')}" aria-label="${t('profile.capacity')}"><span class="xs faint">${t('profile.load', { n: p.load[g.id] || 0 })}</span></div>`;
          })}</div>`)}
          ${inv ? ui.card(t('profile.invPricing'), h`<p class="small muted mb-8">${t('profile.pricingHint')}</p><div class="table-wrap"><table class="table"><thead><tr><th>${t('case.inquiryTypes')}</th>${zones.map(function (z) { return h`<th>${U.label(z)}</th>`; })}<th>${t('profile.slaHours')}</th></tr></thead><tbody>
            ${types.map(function (tp) {
              var band = pricing.investigationBands[tp.id];
              return h`<tr><td><strong>${U.label(tp)}</strong></td>${zones.map(function (z) {
                var m = pricing.zoneMultiplier[z.id];
                return h`<td><input class="input" type="number" name="price_${tp.id}_${z.id}" value="${((p.pricing.investigation || {})[tp.id] || {})[z.id] || ''}"><div class="sub">${U.num(Math.round(band.min * m))}-${U.num(Math.round(band.max * m))}</div></td>`;
              })}<td><input class="input" type="number" name="sla_${tp.id}" min="1" value="${(p.sla.investigation || {})[tp.id] || ''}"></td></tr>`;
            })}</tbody></table></div>`) : ''}
          ${col ? ui.card(t('profile.colPricing'), h`<p class="small muted mb-8">${t('profile.feeHint')}</p><div class="form-grid cols-4">${C.DPD_BUCKETS.map(function (b) {
              var band = pricing.collectionFeeBands[b.id];
              return h`<div class="field"><label>${U.label(b)} (%)</label><input class="input" type="number" step="0.5" name="fee_${b.id}" value="${((p.pricing.collection || {}).feePct || {})[b.id] || ''}"><span class="xs faint">${band.min}-${band.max}%</span></div>`;
            })}
            <div class="field"><label>${t('profile.fixedFee')}</label><input class="input" type="number" name="fixedFee" value="${(p.pricing.collection || {}).fixedFee || 0}"><span class="xs faint">${t('profile.max', { n: U.money(pricing.collectionFixedFeeMax) })}</span></div>
            <div class="field"><label>${t('profile.firstContact')}</label><input class="input" type="number" name="firstContact" value="${p.sla.collectionFirstContactHours || ''}"></div></div>`) : ''}
          <div class="row end"><button type="submit" class="btn btn-primary">${t('common.saveChanges')}</button></div>
        </form>`;
    },
    actions: {
      upload: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('profile.upload'), message: t('profile.uploadBody', { doc: t('doc.' + el.getAttribute('data-type')) }), confirmLabel: t('profile.upload') });
        if (!ok) return;
        await S.providers.uploadDocument(el.getAttribute('data-type'));
        ui.toast(t('profile.uploaded'), 'success'); ctx.reload();
      },
      save: async function (form, ev, ctx, v) {
        var p = await S.providers.mine();
        var govs = U.asArray(v.gov);
        var capacity = {};
        govs.forEach(function (g) { capacity[g] = +v['cap_' + g] || 5; });
        var pricing = U.clone(p.pricing), sla = U.clone(p.sla);
        if (pricing.investigation) {
          ui.cfg.lists.inquiryTypes.forEach(function (tp) {
            pricing.investigation[tp.id] = pricing.investigation[tp.id] || {};
            C.ZONES.forEach(function (z) { if (v['price_' + tp.id + '_' + z.id] !== undefined) pricing.investigation[tp.id][z.id] = +v['price_' + tp.id + '_' + z.id]; });
            sla.investigation = sla.investigation || {};
            if (v['sla_' + tp.id]) sla.investigation[tp.id] = +v['sla_' + tp.id];
          });
        }
        if (pricing.collection) {
          C.DPD_BUCKETS.forEach(function (b) { if (v['fee_' + b.id] !== undefined) pricing.collection.feePct[b.id] = +v['fee_' + b.id]; });
          pricing.collection.fixedFee = +v.fixedFee;
          if (v.firstContact) sla.collectionFirstContactHours = +v.firstContact;
        }
        var r = await S.providers.updateProfile({ description: v.description, phone: v.phone, email: v.email, city: v.city, governorates: govs, capacity: capacity, pricing: pricing, sla: sla });
        ui.toast(r.priceRequested ? t('settings.savedWithPriceRequest') : t('profile.saved'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ ratings & feedback
  P.provider.ratings = {
    title: function () { return t('nav.feedback'); },
    load: async function (ctx) {
      var r = await Promise.all([S.ratings.received(ctx.service), S.providers.mine()]);
      return { ratings: r[0], provider: r[1] };
    },
    render: function (d, ctx) {
      var sc = d.provider.score && d.provider.score.byService[ctx.service];
      var canAct = wf.PROVIDER_MANAGER_ROLES.indexOf(ctx.session.user.role) >= 0;
      return h`${ui.pageHead(t('nav.feedback'), t('providerRatings.subtitle'))}
        <div class="grid side">
          <div class="stack">${d.ratings.length ? d.ratings.map(function (r) {
            return h`<div class="card ${r.status === 'removed' ? '' : r.overall <= 2 ? 'bad-edge' : ''}"><div class="card-b stack tight">
              <div class="row between wrap"><div class="row wrap">${ui.stars(r.overall)}<strong>${r.entityName}</strong><span class="mono small faint">${r.caseRef || ''}</span>${r.archived ? ui.badge(t('rating.archived'), 'muted') : ''}${r.batchId ? ui.badge(t('ratings.batchRating'), 'neutral') : ''}
                ${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}${r.hidden ? ui.badge(t('rating.hiddenByAdmin'), 'muted') : ''}${r.flagged ? ui.badge(t('rating.reported'), 'warning') : ''}${r.dispute ? ui.badge(t('dispute.' + (r.dispute.status === 'open' ? 'openBadge' : 'resolvedBadge'), { outcome: r.dispute.outcome ? t('dispute.outcome.' + r.dispute.outcome) : '' }), r.dispute.status === 'open' ? 'warning' : 'info') : ''}</div>
                <span class="xs faint">${U.fmtDate(r.createdAt)}</span></div>
              ${ui.criteriaView(r.criteria)}
              ${r.tags.length ? ui.tagChips(r.tags) : ''}
              ${r.feedback ? h`<p class="small">${r.feedback}</p>` : ''}
              ${r.reply ? h`<div class="t-note small"><strong>${t('rating.yourReply')}</strong>: ${r.reply.text}</div>` : ''}
              ${canAct && r.status === 'active' ? h`<div class="row wrap">
                <button type="button" class="btn btn-sm" data-action="reply" data-id="${r.id}">${icon('message')}${r.reply ? t('rating.editReply') : t('rating.reply')}</button>
                ${!r.dispute || r.dispute.status !== 'open' ? h`<button type="button" class="btn btn-sm" data-action="dispute" data-id="${r.id}">${icon('scale')}${t('rating.dispute')}</button>` : ''}
                ${r.feedback && !r.flagged && !r.hidden ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="flag" data-id="${r.id}">${icon('flag')}${t('rating.report')}</button>` : ''}
              </div>` : ''}
            </div></div>`;
          }) : ui.card(null, ui.empty(t('providerRatings.none'), null, 'star'))}</div>
          ${ui.card(t('providerRatings.summary'), sc ? h`<div class="stack">
            <div class="row between">${ui.rating(sc.avgRating, sc.ratingCount, sc.isNew)}${ui.scoreBox(sc.score)}</div>
            ${sc.isNew ? h`<p class="small muted">${t('providerRatings.newExplain', { n: ui.cfg.scoring.minRatings })}</p>` : ''}
            ${ui.criteriaView(sc.criteria)}
            <p class="xs faint">${t('providerRatings.weighting', { days: ui.cfg.scoring.recencyDays, cap: ui.cfg.scoring.entityCapPct })}</p>
          </div>` : ui.empty(t('score.none')))}
        </div>`;
    },
    actions: {
      reply: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('rating.reply'), message: t('rating.replyHint'), reason: 'required', reasonLabel: t('rating.replyLabel'), confirmLabel: t('rating.publishReply') });
        if (!v) return;
        await S.ratings.reply(el.getAttribute('data-id'), v.reason);
        ui.toast(t('rating.replySaved'), 'success'); ctx.reload();
      },
      dispute: async function (el, ev, ctx) { if (await ui.dialogs.dispute('rating', el.getAttribute('data-id'))) ctx.reload(); },
      flag: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('rating.report'), message: t('rating.reportBody'), reason: 'required', confirmLabel: t('rating.report') });
        if (!v) return;
        await S.ratings.flag(el.getAttribute('data-id'), v.reason);
        ui.toast(t('rating.reportedToast'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ rate clients
  P.provider.clients = {
    title: function () { return t('nav.rateClients'); },
    load: async function () {
      var r = await Promise.all([S.ratings.clientPending(), S.ratings.clientRatings()]);
      return { pending: r[0], given: r[1] };
    },
    render: function (d) {
      return h`${ui.pageHead(t('nav.rateClients'), t('clientRating.subtitle'))}
        <div class="grid cols-2">
          ${ui.card(t('clientRating.pending', { n: d.pending.length }), ui.table([
            { label: t('case.ref'), render: function (x) { return h`<span class="mono">${x.ref}</span>${x.kind === 'batch' ? h`<div class="sub">${t('clientRating.batchOf', { n: x.cases })}</div>` : ''}`; } },
            { label: t('case.client'), render: function (x) { return x.entityName; } },
            { label: t('ratings.closedOn'), render: function (x) { return U.fmtDate(x.closedAt); } },
            { label: '', cls: 'right', render: function (x) { return h`<button type="button" class="btn btn-sm btn-primary" data-action="rate" data-kind="${x.kind}" data-id="${x.id}">${t('clientRating.rateBtn')}</button>`; } }
          ], d.pending, { empty: t('clientRating.nonePending') }), { flush: true })}
          ${ui.card(t('clientRating.given'), ui.table([
            { label: t('case.client'), render: function (r) { return r.entityName; } },
            { label: t('clientRating.dataQuality'), render: function (r) { return ui.stars(r.dataQuality); } },
            { label: t('clientRating.paymentTimeliness'), render: function (r) { return ui.stars(r.paymentTimeliness); } },
            { label: t('common.comment'), render: function (r) { return h`<span class="small">${r.comment || '-'}</span>`; } }
          ], d.given, { empty: t('common.empty') }), { flush: true })}
        </div>`;
    },
    actions: {
      rate: async function (el, ev, ctx) {
        var list = await S.ratings.clientPending();
        var item = list.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (await ui.flows.rateClient(item)) ctx.reload();
      }
    }
  };

  // ================================================================ earnings
  P.provider.earningsView = function (d, title) {
    return h`${ui.pageHead(title, t('earnings.subtitle', { pct: d.feePct }))}
      <div class="kpis">
        ${ui.kpi(t('earnings.monthGross'), U.money(d.thisMonthGross))}
        ${ui.kpi(t('earnings.monthNet'), U.money(d.thisMonthNet), t('earnings.afterFee'))}
        ${ui.kpi(t('earnings.accruing'), U.money(d.accruing), t('earnings.accruingSub'))}
        ${ui.kpi(t('earnings.pending'), U.money(d.pending), t('earnings.pendingSub'), d.pending ? 'warn' : '')}
        ${ui.kpi(t('earnings.paidOut'), U.money(d.paidOut), null, 'ok')}
      </div>
      ${ui.card(t('earnings.perCase'), ui.table([
        { label: t('case.ref'), render: function (r) { return h`<span class="mono">${r.caseRef}</span><div class="sub">${r.invoiceRef}</div>`; } },
        { label: t('case.client'), render: function (r) { return r.entityName; } },
        { label: t('case.service'), render: function (r) { return t('service.' + r.service); } },
        { label: t('invoice.closed'), render: function (r) { return U.fmtDate(r.closedAt); } },
        { label: t('earnings.gross'), num: true, render: function (r) { return h`${U.money(r.gross)}${r.adjusted ? h`<div class="sub">${t('earnings.adjusted')}</div>` : ''}`; } },
        { label: t('earnings.fee'), num: true, render: function (r) { return U.money(r.fee); } },
        { label: t('earnings.net'), num: true, render: function (r) { return h`<strong>${U.money(r.net)}</strong>`; } },
        { label: t('earnings.payout'), render: function (r) { return ui.badge(t('payout.' + r.payout), r.payout === 'paid_out' ? 'success' : r.payout === 'pending' ? 'warning' : 'neutral'); } }
      ], d.rows, { empty: t('earnings.none') }), { flush: true })}`;
  };
  P.provider.earnings = {
    title: function () { return t('nav.earnings'); },
    load: function (ctx) { return S.billing.earnings(ctx.service); },
    render: function (d) {
      // Supervisors see their own agents only; owners see each agent across the company.
      var byAgent = d.byAgent && d.byAgent.length ? ui.card(t('earnings.byAgent'), ui.table([
        { label: t('team.fieldAgents'), render: function (r) { return h`<strong>${r.name || t('earnings.noAgent')}</strong>${r.owner ? h` <span class="xs faint">${t('team.ownerTag')}</span>` : ''}${d.scope === 'all' && r.supervisorName ? h`<div class="sub">${r.supervisorName}</div>` : ''}`; } },
        { label: t('earnings.casesMonth'), num: true, render: function (r) { return U.num(r.casesThisMonth); } },
        { label: t('earnings.monthNet'), num: true, render: function (r) { return U.money(r.netThisMonth); } },
        { label: t('earnings.allTime'), num: true, render: function (r) { return h`${U.money(r.net)}<div class="sub">${t('earnings.casesN', { n: r.cases })}</div>`; } }
      ], d.byAgent), { flush: true, cls: 'mt-16' }) : '';
      return h`${d.scope === 'team' ? h`<div class="mb-16">${ui.notice(t('earnings.teamOnly'), 'info')}</div>` : ''}${P.provider.earningsView(d, t('nav.earnings'))}${byAgent}`;
    }
  };

  // ================================================================ portfolio (collection)
  P.provider.portfolio = {
    title: function () { return t('nav.portfolio'); },
    initState: function () { return { month: '' }; },
    load: async function (ctx) {
      var clock = await S.demo.clock();
      ctx.state.month = ctx.state.month || U.monthKey(clock.now);
      var rows = await S.analytics.portfolioReport(ctx.state.month);
      return { rows: rows, now: clock.now };
    },
    render: function (d, ctx) {
      if (ctx.service !== 'collection') return ui.empty(t('portfolio.collectionOnly'));
      var months = [];
      for (var i = 0; i < 4; i++) { var dt = new Date(d.now); months.push(U.monthKey(new Date(dt.getFullYear(), dt.getMonth() - i, 15).getTime())); }
      var tot = { overdue: U.sum(d.rows, function (r) { return r.overdue; }), recovered: U.sum(d.rows, function (r) { return r.recovered; }), month: U.sum(d.rows, function (r) { return r.recoveredMonth; }) };
      return h`${ui.pageHead(t('nav.portfolio'), t('portfolio.subtitle'), h`<div class="field" style="width:200px">${ui.select('month', months.map(function (m) { return { value: m, label: U.fmtMonth(m) }; }), ctx.state.month, { change: 'month' })}</div>`)}
        <div class="kpis">${ui.kpi(t('portfolio.overdue'), U.money(tot.overdue))}${ui.kpi(t('collection.recovered'), U.money(tot.recovered), null, 'ok')}${ui.kpi(t('metric.recovery'), ui.pct(tot.overdue ? tot.recovered / tot.overdue : null))}${ui.kpi(t('portfolio.recoveredMonth'), U.money(tot.month))}</div>
        ${ui.card(t('portfolio.byBatch'), ui.table([
          { label: t('portfolio.portfolio'), render: function (r) { return r.batchRef ? h`<span class="mono">${r.batchRef}</span><div class="sub">${r.batchName || ''}</div>` : h`${t('portfolio.singles')}`; } },
          { label: t('case.client'), render: function (r) { return r.entityName; } },
          { label: t('batch.cases'), num: true, render: function (r) { return h`${U.num(r.cases)}<div class="sub">${t('portfolio.openN', { n: r.open })}</div>`; } },
          { label: t('portfolio.overdue'), num: true, render: function (r) { return U.money(r.overdue); } },
          { label: t('collection.recovered'), num: true, render: function (r) { return U.money(r.recovered); } },
          { label: t('metric.recovery'), num: true, render: function (r) { return ui.pct(r.recoveryRate); } },
          { label: t('portfolio.recoveredMonth'), num: true, render: function (r) { return U.money(r.recoveredMonth); } },
          { label: t('portfolio.ptp'), num: true, render: function (r) { return h`${U.num(r.ptpKept)}/${U.num(r.ptpTotal)}`; } },
          { label: t('portfolio.ptpConversion'), num: true, render: function (r) { return ui.pct(r.ptpConversion); } }
        ], d.rows, { empty: t('common.empty') }), { flush: true })}`;
    },
    actions: { month: function (el, ev, ctx) { ctx.state.month = el.value; ctx.reload(); } }
  };
})();
