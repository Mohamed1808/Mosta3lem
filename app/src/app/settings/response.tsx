/**
 * Promised response times: hours to deliver each inquiry type and, for collections, hours
 * to first contact. Applies at once; never slower than the platform maximum.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { services } from '@/backend/engine';
import { listItemLabel, NumberInput, useSettings } from '@/components/settings';
import { errorText, num } from '@/lib/format';
import { useT } from '@/state/app';
import { space } from '@/theme';
import { Button, Card, Grow, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function ResponseSettings() {
  const t = useT();
  const q = useSettings();
  if (!q.data) return <Screen title={t('settingsApp.responseTimes')} back><Loading /></Screen>;
  return <Body s={q.data} />;
}

function Body({ s }: { s: any }) {
  const t = useT();
  const { toast } = useDialog();
  const p = s.provider;
  const inv = p.services.indexOf('investigation') >= 0;
  const col = p.services.indexOf('collection') >= 0;
  const types = Object.keys(s.limits.investigation);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    types.forEach((k) => { v['sla_' + k] = String(((p.sla && p.sla.investigation) || {})[k] || s.limits.investigation[k]); });
    v.firstContact = String((p.sla && p.sla.collectionFirstContactHours) || s.limits.collectionFirstContactHours);
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { setVals({ ...vals, [k]: v }); setErrors({}); setErr(''); };

  const save = async () => {
    const sla = { investigation: Object.fromEntries(types.map((k) => [k, +vals['sla_' + k]])), collectionFirstContactHours: +vals.firstContact };
    setBusy(true);
    try {
      await services().providers.updateResponseTimes(sla);
      toast(t('settingsApp.saved'));
      router.back();
    } catch (e: any) {
      setErrors(e?.params?.errors || (e?.params?.field ? { [e.params.field]: e.key } : {}));
      setErr(errorText(e));
    } finally { setBusy(false); }
  };

  const line = (key: string, label: string, max: number) => (
    <Stack key={key} gap={4}>
      <Row gap={12}>
        <Grow><Txt v="sm">{label}</Txt><Txt v="xs" c="faint">{t('settingsApp.maxHours', { n: num(max) })}</Txt></Grow>
        <NumberInput value={vals[key]} onChange={(v) => set(key, v)} bad={!!errors[key]} label={label} />
        <Txt v="sm" c="muted">{t('settingsApp.hours')}</Txt>
      </Row>
      {errors[key] ? <Txt v="xs" c="bad">{t(errors[key])}</Txt> : null}
    </Stack>
  );

  return (
    <Screen title={t('settingsApp.responseTimes')} back footer={s.canEdit ? <Button label={t('signup.saveChanges')} kind="primary" icon="check" onPress={save} busy={busy} block /> : undefined}>
      <Txt v="sm" c="muted">{t('settingsApp.responseIntro')}</Txt>
      {err ? <Notice tone="danger" text={err} /> : null}
      {inv ? (
        <Card title={t('settingsApp.deliverWithin')}>
          <Stack gap={space.lg}>{types.map((k) => line('sla_' + k, listItemLabel('inquiryTypes', k), s.limits.investigation[k]))}</Stack>
        </Card>
      ) : null}
      {col ? <Card title={t('settingsApp.firstContactTitle')}>{line('firstContact', t('profile.firstContact'), s.limits.collectionFirstContactHours)}</Card> : null}
    </Screen>
  );
}
