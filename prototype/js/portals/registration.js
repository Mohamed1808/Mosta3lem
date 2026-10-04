/* Service provider registration pages: self sign-up from the app (public), the applicant's
   application page while the platform reviews it, and registration by a platform admin. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.auth = P.auth || {};
  P.applicant = P.applicant || {};
  P.admin = P.admin || {};

  function brandMark() { return ICM.config.PLATFORM_NAME.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'PN'; }

  /** Wizard actions shared by self sign-up and admin registration. finish(values) does the submit. */
  function wizardActions(mode, finish) {
    return {
      regNext: async function (form, ev, ctx) {
        var st = ctx.state;
        ui.regWizard.collect(form, st);
        st.errors = ui.regWizard.validateStep(st, mode, ICM.clock.now());
        if (Object.keys(st.errors).length) { ctx.reload(); return; }
        if (st.step < ui.regWizard.STEPS.length - 1) { st.step++; ctx.reload(); window.scrollTo(0, 0); return; }
        st.busy = true;
        try { await finish(st.values, ctx); }
        catch (e) {
          st.busy = false;
          if (ui.regWizard.applyError(st, e)) { ctx.reload(); ui.toast(ui.errorText(e), 'danger'); }
          else throw e;
        }
      },
      regBack: function (el, ev, ctx) {
        var form = document.getElementById('reg-form');
        if (form) ui.regWizard.collect(form, ctx.state);
        ctx.state.errors = {};
        ctx.state.step = Math.max(0, ctx.state.step - 1);
        ctx.reload();
      },
      regGo: function (el, ev, ctx) {
        var form = document.getElementById('reg-form');
        if (form) ui.regWizard.collect(form, ctx.state);
        ctx.state.errors = {};
        ctx.state.step = +el.getAttribute('data-step');
        ctx.reload();
      }
    };
  }

  // ================================================================ self sign-up (public)
  P.auth.register = {
    title: function () { return t('reg.title'); },
    initState: function () { return ui.regWizard.initState(); },
    load: function () { return S.config.get().then(function (cfg) { ui.cfg = cfg; return null; }); },
    render: function (d, ctx) {
      return h`<div class="reg-page">
        <header class="reg-top">
          <a class="brand" href="#/login" style="padding:0"><div class="brand-mark">${brandMark()}</div><div class="brand-name">${ICM.config.PLATFORM_NAME}</div></a>
          <div class="row"><button type="button" class="btn btn-sm btn-ghost" data-action="toggleLang">${icon('globe')}${ICM.i18n.lang() === 'ar' ? 'English' : 'العربية'}</button>
            <a class="btn btn-sm" href="#/login">${t('reg.haveAccount')}</a></div>
        </header>
        <main class="reg-main">
          <div class="mb-16"><h1>${t('reg.title')}</h1><p class="muted mt-8">${t('reg.intro')}</p></div>
          ${ui.regWizard.render(ctx.state, 'self')}
          <p class="xs faint mt-16">${t('reg.demoNote')}</p>
        </main>
      </div>`;
    },
    actions: wizardActions('self', async function (values, ctx) {
      await S.registration.submit(values);
      delete ICM.app.pageState[ctx.route.pattern + '|{}'];
      ctx.navigate('#/application?welcome=1');
    })
  };

  // ================================================================ applicant: my application
  var TRACK = wf.APPLICATION_STAGES;

  P.applicant.application = {
    live: true,
    title: function () { return t('application.title'); },
    load: function () { return S.registration.mine(); },
    render: function (p, ctx) {
      var st = p.verification.status;
      var company = p.kind === 'company';
      var canEdit = p.canUpload;
      var lastNote = p.verification.notes.filter(function (n) { return n.kind === 'info_requested' || n.kind === 'rejected'; }).slice(-1)[0];
      var stage = p.stage;
      var ltr = function (x) { return x ? h`<bdi dir="ltr">${x}</bdi>` : '-'; };
      var missing = p.verification.documents.filter(function (d) { return d.status === 'missing'; }).length;
      return h`${ui.pageHead(t('application.title'), h`${p.name} · <span class="mono">${p.registration ? p.registration.ref : ''}</span>`, h`${ui.status(st)}${ui.kindBadge(p.kind)}`)}
        ${ctx.query.welcome ? h`<div class="mb-16">${ui.notice(t('application.welcome', { ref: p.registration.ref }), 'ok')}</div>` : ''}
        <ol class="track mb-16">${TRACK.map(function (k, i) {
          var cls = i < stage ? 'done' : i === stage ? (st === 'rejected' ? 'bad' : st === 'info_requested' ? 'warn' : 'on') : '';
          return h`<li class="${cls}"><span class="n">${i < stage ? icon('check') : U.num(i + 1)}</span><span>${t('application.track.' + (k === 'review' && st === 'info_requested' ? 'info' : k === 'decision' && st === 'rejected' ? 'rejected' : k))}</span></li>`;
        })}</ol>
        ${st === 'pending' ? h`<div class="mb-16">${ui.notice(missing ? t('application.pendingMissing', { n: missing }) : t('application.pending'), 'info')}</div>` : ''}
        ${st === 'awaiting_signoff' ? h`<div class="mb-16">${ui.notice(t('application.signoff'), 'info')}</div>` : ''}
        ${st === 'rejected' ? h`<div class="mb-16">${ui.notice(h`<strong>${t('application.rejected')}</strong>${lastNote ? h`<div class="mt-8">${lastNote.text}</div>` : ''}${p.canEdit ? h`<div class="mt-8">${t('application.rejectedFix')}</div>` : ''}`, 'bad')}</div>` : ''}
        ${st === 'info_requested' || (st === 'rejected' && p.canEdit) ? ui.card(st === 'rejected' ? t('application.resend') : t('application.infoRequested'), h`<div class="stack">
            ${st === 'info_requested' ? ui.notice(h`<div class="xs faint">${lastNote ? U.fmtDateTime(lastNote.at) + ' · ' + lastNote.by : ''}</div><div class="mt-8">${lastNote ? lastNote.text : ''}</div>`, 'warn') : ''}
            ${p.canEdit ? h`<form data-submit="resubmit" class="stack tight">
              <div class="field"><label for="ap-note">${t('application.yourReply')}<span class="req">*</span></label><textarea class="textarea" id="ap-note" name="note" rows="3" placeholder="${st === 'rejected' ? t('application.resendBody') : t('application.replyPlaceholder')}"></textarea></div>
              <div class="row end"><button type="submit" class="btn btn-primary">${icon('send')}${st === 'rejected' ? t('application.resend') : t('application.resubmit')}</button></div></form>` : ''}
          </div>`, { cls: 'mb-16' }) : ''}
        <div class="grid cols-2 mb-16">
          ${ui.card(t('reg.sec.documents'), h`<div class="stack tight">${p.verification.documents.map(function (d) {
            var locked = d.status === 'verified' || !canEdit;
            return h`<div class="doc-pick"><div class="grow"><div class="strong small">${t('doc.' + d.type)}</div><div class="xs ${d.fileName ? '' : 'faint'}">${d.fileName || t('reg.noFile')}</div></div>
              ${ui.status(d.status === 'uploaded' ? 'pending' : d.status === 'missing' ? 'rejected' : 'verified', 'docStatus')}
              ${locked ? '' : h`<label class="btn btn-sm">${icon('upload')}${d.fileName ? t('reg.replaceFile') : t('reg.attachFile')}<input type="file" accept="application/pdf,image/*" class="sr-only" data-change="uploadDoc" data-doc="${d.type}"></label>`}</div>`;
          })}<p class="xs faint">${t('application.docsNote')}</p></div>`)}
          ${ui.card(t('application.next'), h`<ol class="plain-steps">${(company ? ['c1', 'c2', 'c3'] : ['i1', 'i2', 'i3']).map(function (k) { return h`<li>${t('application.after.' + k)}</li>`; })}</ol>`)}
        </div>
        ${ui.card(t('application.submitted'), h`<div class="grid cols-2">
          <dl class="dl">
            ${company ? h`<dt>${t('reg.f.companyName')}</dt><dd>${p.name}</dd><dt>${t('reg.f.taxId')}</dt><dd>${ltr(p.legal.taxId)}</dd><dt>${t('reg.f.commercialRegNo')}</dt><dd>${ltr(p.legal.commercialRegNo)}</dd><dt>${t('reg.f.mainPhone')}</dt><dd>${ltr(p.phone)}</dd>
              <dt>${t('reg.sec.owner')}</dt><dd>${p.owner.name} · ${ltr(p.owner.phone)}</dd><dt>${t('reg.sec.focal')}</dt><dd>${p.focalPoint.name}${p.focalPoint.title ? ' (' + p.focalPoint.title + ')' : ''} · ${ltr(p.focalPoint.phone)}</dd>`
              : h`<dt>${t('reg.f.fullName')}</dt><dd>${p.name}</dd><dt>${t('reg.f.nationalId')}</dt><dd>${ltr(p.nationalId)}</dd><dt>${t('reg.f.phone')}</dt><dd>${ltr(p.phone)}</dd>`}
            <dt>${t('profile.services')}</dt><dd>${p.services.map(function (s) { return ui.serviceBadge(s); })}</dd>
          </dl>
          <dl class="dl"><dt>${company ? t('reg.sec.hq') : t('reg.sec.address')}</dt><dd>${ui.address(p.address)}</dd><dt>${t('reg.sec.coverage')}</dt><dd>${ui.coverage.text(p.coverageCities)}</dd>
            <dt>${t('application.submittedAt')}</dt><dd>${U.fmtDateTime(p.registration.at)}</dd></dl>
        </div>`)}`;
    },
    actions: {
      uploadDoc: async function (el, ev, ctx) {
        var f = el.files && el.files[0];
        if (!f) return;
        await S.registration.uploadDocument(el.getAttribute('data-doc'), f.name);
        ui.toast(t('profile.uploaded'), 'success'); ctx.reload();
      },
      resubmit: async function (form, ev, ctx, v) {
        if (!v.note || !v.note.trim()) { ui.toast(t('application.replyRequired'), 'danger'); return; }
        await S.registration.resubmit(v.note);
        ui.toast(t('application.resubmitted'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ admin: register a provider
  P.admin.registerProvider = {
    title: function () { return t('reg.adminTitle'); },
    initState: function () { return ui.regWizard.initState(); },
    load: function () { return Promise.resolve(null); },
    render: function (d, ctx) {
      return h`${ui.pageHead(t('reg.adminTitle'), t('reg.adminIntro'), null, ui.crumbs([{ label: t('nav.onboarding'), href: '#/admin/onboarding' }, { label: t('reg.adminTitle') }]))}
        ${ui.regWizard.render(ctx.state, 'admin')}`;
    },
    actions: wizardActions('admin', async function (values, ctx) {
      var r = await S.registration.adminRegister(values, { verifyNow: !!values.verifyNow });
      delete ICM.app.pageState[ctx.route.pattern + '|{}'];
      ui.toast(r.status === 'verified' ? t('reg.adminDoneVerified', { ref: r.ref }) : t('reg.adminDone', { ref: r.ref }), 'success');
      ctx.navigate(r.status === 'verified' ? '#/admin/providers/' + r.providerId : '#/admin/onboarding');
    })
  };
})();
