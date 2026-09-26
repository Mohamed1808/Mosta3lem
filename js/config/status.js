/* Status lists and the single colour map every portal uses for badges. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  ICM.config.INVESTIGATION_STATUSES = [
    'draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired', 'accepted', 'assigned', 'in_field',
    'submitted_for_review', 'returned_to_agent', 'delivered', 'rework_requested', 'accepted_by_entity',
    'closed', 'cancelled'
  ];
  ICM.config.COLLECTION_STATUSES = [
    'draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired', 'accepted', 'assigned', 'active',
    'awaiting_entity_approval', 'closed', 'recalled', 'cancelled'
  ];
  ICM.config.TERMINAL_STATUSES = ['closed', 'cancelled', 'recalled'];

  // Tone names map to CSS badge classes (.b-neutral, .b-info, ...).
  ICM.config.STATUS_TONE = {
    draft: 'neutral',
    submitted: 'neutral',
    awaiting_acceptance: 'pending',
    declined: 'danger',
    expired: 'danger',
    accepted: 'info',
    assigned: 'info',
    in_field: 'accent',
    active: 'accent',
    submitted_for_review: 'pending',
    returned_to_agent: 'warning',
    delivered: 'success',
    rework_requested: 'warning',
    awaiting_entity_approval: 'pending',
    accepted_by_entity: 'success',
    closed: 'muted',
    cancelled: 'muted',
    recalled: 'muted',
    // offers, invoices, disputes, batches, verification, enforcement
    pending: 'pending', accepted_offer: 'success', withdrawn: 'muted',
    draft_invoice: 'neutral', issued: 'info', paid: 'success',
    open: 'warning', resolved: 'success',
    pending_acceptance: 'pending', in_progress: 'accent', partially_closed: 'info',
    verified: 'success', rejected: 'danger', info_requested: 'warning',
    none: 'success', warned: 'warning', reduced: 'danger', suspended: 'danger',
    on_track: 'success', at_risk: 'warning', breached: 'danger', met: 'success', missed: 'danger',
    kept: 'success', broken: 'danger', approved: 'success'
  };
})();
