/* Mock service: investigation results in the client's Excel template layout
   (DRIVE_HOME_INVESTIGATION for Residence, DRIVE_CORP_INVESTIGATION for Business).
   Answers come from the report fields' `col`; every other column is filled from the case,
   its timeline and its check-in. Values use the template's codes (MARRIED, APPROVED). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function pad(n) { return String(n).padStart(2, '0'); }
  function day(ms) { if (ms == null) return ''; var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function time(ms) { if (ms == null) return ''; var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function stamp(ms) { if (ms == null) return ''; var d = new Date(ms); return day(ms) + ' ' + time(ms) + ':' + pad(d.getSeconds()); }

  var STATUS = {
    draft: 'NEW', submitted: 'NEW', awaiting_acceptance: 'NEW', declined: 'NEW', expired: 'NEW',
    accepted: 'ASSIGNED', assigned: 'ASSIGNED', in_field: 'IN_PROGRESS', submitted_for_review: 'UNDER_REVIEW',
    returned_to_agent: 'RETURNED', rework_requested: 'RETURNED', delivered: 'COMPLETED', accepted_by_entity: 'COMPLETED',
    closed: 'COMPLETED', cancelled: 'CANCELLED', recalled: 'CANCELLED'
  };
  var FINAL = ['delivered', 'accepted_by_entity', 'closed'];

  function addressText(a) { return a ? [a.street, a.city, a.landmark].filter(Boolean).join(' - ') + (a.governorate ? ' - ' + (D.gov(E.db(), a.governorate) || {}).ar : '') : ''; }

  /** A report value as the template stores it. */
  function cell(f, v) {
    if (v == null || v === '') return '';
    switch (f.type) {
      case 'yesno': return v === 'yes' ? 1 : 0;
      case 'number': case 'computed': return +v;
      case 'signature': return 'SIGNED';
      case 'ocrDoc': return '';
      case 'license': return v.has === 'yes' ? (v.number || 'YES') : 'NO';
      default: return String(v);
    }
  }

  /** Map of template header -> value from the report answers (references joined with " | "). */
  function reportColumns(type, values) {
    var out = {};
    wf.formFields(C.REPORT_FORMS[type]).forEach(function (f) {
      if (f.type === 'repeat') {
        var rows = values[f.name] || [];
        f.fields.forEach(function (sf) {
          if (sf.col) out[sf.col] = rows.map(function (r) { return cell(sf, r[sf.name]); }).filter(function (x) { return x !== ''; }).join(' | ');
        });
        return;
      }
      if (f.col) out[f.col] = cell(f, values[f.name]);
    });
    if (type === 'business') {
      out.MAIN_CENTER = [values.mainCenterOwnership, values.mainCenterAddress].filter(Boolean).join(' - ');
      out.STORES = values.storesCount == null ? '' : values.storesCount + (values.storesAddresses ? ' - ' + values.storesAddresses : '');
      out.BRANCHES = values.branchesCount == null ? '' : values.branchesCount + (values.branchesAddresses ? ' - ' + values.branchesAddresses : '');
    }
    return out;
  }

  function lastEntry(c, actions) {
    var list = (c.timeline || []).filter(function (e) { return actions.indexOf(e.action) >= 0; });
    return list[list.length - 1] || null;
  }

  function reviewStatus(c) {
    if (c.status === 'submitted_for_review') return 'UNDER_REVIEW';
    if (c.status === 'returned_to_agent') return 'RETURNED';
    if (c.status === 'rework_requested') return 'REWORK_REQUESTED';
    if (c.status === 'delivered') return 'APPROVED';
    if (c.status === 'accepted_by_entity' || c.status === 'closed') return 'ACCEPTED';
    return 'PENDING';
  }
  function decisionStage(c) {
    if (['in_field', 'assigned', 'accepted', 'returned_to_agent', 'rework_requested'].indexOf(c.status) >= 0) return 'FIELD';
    if (c.status === 'submitted_for_review') return 'REVIEW';
    if (c.status === 'delivered') return 'CLIENT';
    if (c.status === 'accepted_by_entity' || c.status === 'closed') return c.clientDecision && c.clientDecision.value !== 'PENDING' ? 'FINAL' : 'CLIENT';
    return 'REQUEST';
  }

  /** Columns the app fills (tracking, request data, check-in, review and decisions). */
  function systemColumns(type, c, all) {
    var db = E.db();
    var agentUser = c.agentId ? D.agentUser(db, c.agentId) : null;
    var submits = (c.timeline || []).filter(function (e) { return e.action === 'submit_report'; });
    var returned = lastEntry(c, ['return_to_agent']);
    var rework = lastEntry(c, ['request_rework']);
    var revision = lastEntry(c, ['return_to_agent', 'request_rework']);
    var lastAny = (c.timeline || [])[(c.timeline || []).length - 1];
    var batch = c.batchId ? E.batchById(c.batchId) : null;
    var ci = c.checkIn;
    var key = c.accountNumber || (c.customer || {}).nationalId;
    var seq = all.filter(function (x) { return (x.accountNumber || (x.customer || {}).nationalId) === key && x.createdAt <= c.createdAt; }).length;
    var addr = type === 'business' ? (c.addresses || {}).business : (c.addresses || {}).home;
    var decision = c.clientDecision ? c.clientDecision.value : (FINAL.indexOf(c.status) >= 0 ? 'PENDING' : '');
    var out = {
      ID: c.ref, BATCH_NUMBER: batch ? batch.ref : '', ACCOUNT_NUMBER: c.accountNumber || '', INVESTIGATION_SEQUENCE: seq || 1, SEQUENCE_ADDRESS: 1,
      VERSION: Math.max(1, submits.length), IS_ACTIVE: ['cancelled', 'recalled'].indexOf(c.status) >= 0 ? 0 : 1, IS_FINAL: FINAL.indexOf(c.status) >= 0 ? 1 : 0,
      STATUS: STATUS[c.status] || String(c.status).toUpperCase(),
      LATITUDE: ci ? ci.lat : '', LONGITUDE: ci ? ci.lng : '', LOCATION_ACCURACY: ci ? (ci.accuracyM || '') : '', LOCATION_TIMESTAMP: ci ? stamp(ci.at) : '',
      CREATED_ON: stamp(c.createdAt), UPDATED_ON: stamp(c.updatedAt || c.createdAt),
      ASSIGNED_TO_ID: agentUser ? agentUser.id : '', CREATED_BY_ID: c.createdBy || '', LAST_UPDATED_BY_ID: lastAny ? lastAny.actorId || '' : '',
      PREVIOUS_VERSION_ID: submits.length > 1 ? c.ref + '-V' + (submits.length - 1) : '',
      DATA_ENTRY_USER_ID: agentUser ? agentUser.id : '',
      RETURN_REASON: returned ? returned.note || '' : '', RETURNED_AT: returned ? stamp(returned.at) : '', RETURNED_BY_ID: returned ? returned.actorId || '' : '',
      // Request data from the bank.
      NAME: (c.customer || {}).name || '', NATIONAL_ID: (c.customer || {}).nationalId || '', MOBILE: ((c.customer || {}).mobiles || [])[0] || '',
      TELEPHONE: (c.customer || {}).telephone || '', CUSTOMER_ADDRESS: addressText(addr),
      ORDER_NUMBER: c.orderNumber || '', COMPANY_NAME: c.businessName || '', ADDRESS: addressText(addr), PHONE: c.businessPhone || '',
      // Visit.
      VISIT_DATE: ci ? day(ci.at) : '', VISIT_TIME: ci ? time(ci.at) : '', DATE_OF_VISIT: ci ? day(ci.at) : '', VISITING_TIME: ci ? time(ci.at) : '',
      // Review and decisions.
      REVISION_NOTES: revision ? revision.note || '' : '', REVISION_REQUESTED_BY_ID: rework ? rework.actorId || '' : '',
      'Final Decision Home': decision, 'Recommended Decision': decision, 'Decision Stage': decisionStage(c), 'Review Status': reviewStatus(c),
      POSITION: agentUser ? ICM.t('role.' + agentUser.role) : '', USER_NAME: agentUser ? (agentUser.email || agentUser.phone || agentUser.name) : ''
    };
    return out;
  }

  /**
   * For a client's own copy: the provider's people are named by their company. Person ids
   * of provider staff become the provider's id, and the user columns hold the company name.
   */
  function hideProviderStaff(out, c) {
    var db = E.db(), prov = c.providerId ? E.providerById(c.providerId) : null;
    if (!prov) return out;
    var staff = function (id) { var u = id ? db.users.filter(function (x) { return x.id === id; })[0] : null; return !!(u && u.providerId); };
    ['ASSIGNED_TO_ID', 'DATA_ENTRY_USER_ID', 'LAST_UPDATED_BY_ID', 'RETURNED_BY_ID', 'REVISION_REQUESTED_BY_ID'].forEach(function (k) { if (staff(out[k])) out[k] = prov.id; });
    if (out.USER_NAME) { out.USER_NAME = prov.name; out.POSITION = ICM.t('dispute.party.provider'); }
    return out;
  }

  function rowFor(type, c, all, viewer) {
    var sys = systemColumns(type, c, all);
    if (viewer && wf.isEntityRole(viewer.role)) sys = hideProviderStaff(sys, c);
    var rep = reportColumns(type, (c.report || {})[type] || {});
    return C.EXPORT_SHEETS[type].headers.map(function (hd) {
      var v = rep[hd];
      if (v === undefined || v === '') v = sys[hd];
      return v == null ? '' : v;
    });
  }

  S.exports = {
    /** Residence and Business investigations the viewer can see, laid out as the client's template sheets. filters: as cases.list */
    investigations: function (filters) {
      return S.cases.list(Object.assign({}, filters || {}, { service: 'investigation' })).then(function (rows) {
        return E.run(function () {
          var a = E.actor();
          if (!wf.isEntityRole(a.role) && a.role !== 'platform_admin') throw new Err('errors.forbidden');
          var ids = rows.map(function (r) { return r.id; });
          var cases = E.db().cases.filter(function (c) { return ids.indexOf(c.id) >= 0; }).sort(function (x, y) { return x.createdAt - y.createdAt; });
          var all = E.db().cases.filter(function (c) { return c.service === 'investigation' && c.entityId && (a.role === 'platform_admin' || c.entityId === a.entityId); });
          return ['residence', 'business'].map(function (type) {
            var mine = cases.filter(function (c) { return (c.inquiryTypes || []).indexOf(type) >= 0; });
            return { type: type, sheet: C.EXPORT_SHEETS[type].sheet, headers: C.EXPORT_SHEETS[type].headers.slice(), rows: mine.map(function (c) { return rowFor(type, c, all, a); }) };
          });
        });
      });
    },
    _rowFor: rowFor
  };
})();
