/**
 * Change an application after the platform asked for more information or did not approve
 * it: services, details, address and coverage. The provider type stays as registered.
 * Saving does not send it back for review; the applicant does that from the application.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { services } from '@/backend/engine';
import { FormView, Values } from '@/components/form';
import { areaDef, detailsDef, TypeStep, validate, withAreaRules } from '@/components/registration';
import { errorText } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { Button, Card, Loading, Notice } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function ApplicationEdit() {
  const t = useT();
  const q = useQuery<any>(() => services().registration.mine());
  if (!q.data) return <Screen title={t('signup.editTitle')} back><Loading /></Screen>;
  if (!q.data.canEdit) return <Screen title={t('signup.editTitle')} back><Notice tone="warning" text={t('errors.applicationLocked')} /></Screen>;
  return <EditBody initial={q.data.values} />;
}

function EditBody({ initial }: { initial: Values }) {
  const t = useT();
  const { toast } = useDialog();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const change = (v: Values) => { setValues((prev) => withAreaRules(prev, v)); if (Object.keys(errors).length) setErrors({}); };

  const save = async () => {
    const errs = validate(values, ['type', 'details', 'area']);
    if (Object.keys(errs).length) { setErrors(errs); toast(t('reg.fixErrors'), 'danger'); return; }
    setBusy(true);
    try {
      await services().registration.update(values);
      toast(t('signup.saved'));
      router.back();
    } catch (e: any) {
      if (e?.params?.field) setErrors({ ...(e.params.errors || {}), [e.params.field]: e.key });
      toast(errorText(e), 'danger');
    } finally { setBusy(false); }
  };

  return (
    <Screen title={t('signup.editTitle')} back footer={<Button label={t('signup.saveChanges')} kind="primary" icon="check" onPress={save} busy={busy} block />}>
      {Object.keys(errors).length ? <Notice tone="danger" text={t('reg.fixErrors')} /> : null}
      <Card><TypeStep values={values} onChange={change} errors={errors} kindLocked /></Card>
      <Card><FormView def={detailsDef(values.kind)} values={values} errors={errors} onChange={change} /></Card>
      <Card><FormView def={areaDef(values)} values={values} errors={errors} onChange={change} /></Card>
    </Screen>
  );
}
