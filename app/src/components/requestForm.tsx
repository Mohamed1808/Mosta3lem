/**
 * The client's request form (investigation or collection), shared by the New request tab
 * and draft editing. It uses the same form definitions and checks as the engine. Saving
 * keeps a draft; Continue saves it and opens provider selection.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { icm, services } from '@/backend/engine';
import { FormView, Values } from '@/components/form';
import { errorText } from '@/lib/format';
import { useT } from '@/state/app';
import { Button, Card, Notice, Row, Stack, Txt } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';

const HOUR = 3600 * 1000;

export function formDef(service: string) {
  return service === 'investigation' ? icm().config.FORMS.investigationRequest : icm().config.FORMS.collectionRequest;
}

/** Longest default SLA of the chosen inquiry types (at least a day). */
function slaHoursFor(types: string[]) {
  const list: any[] = icm().store.db.config.lists.inquiryTypes || [];
  return Math.max(24, ...(types || []).map((id) => (list.find((x) => x.id === id) || {}).defaultSlaHours || 48));
}

export function defaultValues(service: string): Values {
  const U = icm().util, now = icm().clock.now();
  if (service === 'investigation') return { inquiryTypes: ['residence'], deadline: U.toLocalInput(now + slaHoursFor(['residence']) * HOUR) };
  const days = icm().store.db.config.pricing.defaultCollectionDays || 30;
  return { allowedActions: ['calls', 'messages', 'visits'], settlementMode: 'none', periodEnd: U.toDateInput(now + days * 24 * HOUR) };
}

export function RequestForm({ service, draft }: { service: string; draft?: any }) {
  const t = useT();
  const { toast } = useDialog();
  const def = formDef(service);
  const [values, setValues] = useState<Values>(draft ? draft.formValues || {} : defaultValues(service));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const change = (v: Values) => {
    // A different set of inquiry types moves the deadline to their SLA, as on the web.
    if (service === 'investigation' && (v.inquiryTypes || []).join() !== (values.inquiryTypes || []).join()) {
      v = { ...v, deadline: icm().util.toLocalInput(icm().clock.now() + slaHoursFor(v.inquiryTypes) * HOUR) };
    }
    setValues(v);
    if (Object.keys(errors).length) setErrors({});
  };

  const save = async (mode: 'draft' | 'select') => {
    const govs = (icm().store.db.config.lists.governorates || []).map((g: any) => g.id);
    const errs = icm().wf.validateForm(def, values, { now: icm().clock.now(), governorates: govs });
    if (Object.keys(errs).length) { setErrors(errs); toast(t('errors.fixHighlighted'), 'danger'); return; }
    setBusy(mode);
    try {
      const c: any = draft ? await services().cases.updateDraft(draft.id, values) : await services().cases.createDraft(service, values);
      if (mode === 'draft') {
        toast(t('request.draftSaved', { ref: c.ref }));
        router.push({ pathname: '/case/[id]', params: { id: c.id } });
      } else {
        router.push({ pathname: '/select/[id]', params: { id: c.id } });
      }
      if (!draft) setValues(defaultValues(service));
    } catch (e: any) {
      if (e?.key === 'errors.formInvalid' && e.params?.errors) setErrors(e.params.errors);
      toast(errorText(e), 'danger');
    } finally { setBusy(null); }
  };

  return (
    <Stack>
      {Object.keys(errors).length ? <Notice tone="danger" text={t('errors.fixHighlighted')} /> : null}
      <Card><FormView def={def} values={values} errors={errors} onChange={change} /></Card>
      <Txt v="xs" c="faint">{service === 'investigation' ? t('request.deadlineHint') : t('request.bucketHint')}</Txt>
      <Row gap={10}>
        <Button label={t('request.saveDraft')} onPress={() => save('draft')} busy={busy === 'draft'} disabled={!!busy} style={{ flex: 1 }} />
        <Button label={t('client.toProvider')} kind="primary" icon="arrowRight" onPress={() => save('select')} busy={busy === 'select'} disabled={!!busy} style={{ flex: 1 }} />
      </Row>
    </Stack>
  );
}
