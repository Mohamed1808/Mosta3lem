/**
 * Where the provider works: governorates, narrowed to cities, and how many open cases it
 * can take in each. Applies at once. A company cannot drop an area its active agents cover.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { services } from '@/backend/engine';
import { FormView } from '@/components/form';
import { listItemLabel, NumberInput, useSettings } from '@/components/settings';
import { errorText } from '@/lib/format';
import { useT } from '@/state/app';
import { space } from '@/theme';
import { Button, Card, Grow, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function CoverageSettings() {
  const t = useT();
  const q = useSettings();
  if (!q.data) return <Screen title={t('settingsApp.coverage')} back><Loading /></Screen>;
  return <Body p={q.data.provider} canEdit={q.data.canEdit} />;
}

function Body({ p, canEdit }: { p: any; canEdit: boolean }) {
  const t = useT();
  const { toast } = useDialog();
  const [cov, setCov] = useState<Record<string, string[]>>(() => JSON.parse(JSON.stringify(p.coverageCities || {})));
  const [cap, setCap] = useState<Record<string, string>>(() => Object.fromEntries(Object.keys(p.capacity || {}).map((g) => [g, String(p.capacity[g])])));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const govs = Object.keys(cov);

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const capacity: Record<string, number> = {};
      govs.forEach((g) => { capacity[g] = +cap[g] || 0; });
      await services().providers.updateCoverage(cov, capacity);
      toast(t('settingsApp.saved'));
      router.back();
    } catch (e: any) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Screen title={t('settingsApp.coverage')} back footer={canEdit ? <Button label={t('signup.saveChanges')} kind="primary" icon="check" onPress={save} busy={busy} block /> : undefined}>
      <Txt v="sm" c="muted">{p.kind === 'company' ? t('reg.coverageIntroCompany') : t('reg.coverageIntroIndividual')}</Txt>
      {p.kind === 'company' ? <Notice tone="info" text={t('settingsApp.coverageAgents')} /> : null}
      {err ? <Notice tone="danger" text={err} /> : null}
      <Card>
        <FormView def={{ id: 'settings', fields: [{ name: 'coverage', type: 'coverage', label: 'reg.detail.coverage', required: true }] }}
          values={{ coverage: cov }} onChange={(v) => { setCov(v.coverage); setErr(''); }} />
      </Card>
      {govs.length ? (
        <Card title={t('settingsApp.capacity')}>
          <Stack gap={space.md}>
            <Txt v="xs" c="faint">{t('settingsApp.capacityHint')}</Txt>
            {govs.map((g) => (
              <Row key={g} gap={12}>
                <Grow><Txt v="sm">{listItemLabel('governorates', g)}</Txt><Txt v="xs" c="faint">{t('profile.load', { n: (p.load || {})[g] || 0 })}</Txt></Grow>
                <NumberInput value={cap[g] || ''} onChange={(v) => setCap({ ...cap, [g]: v })} label={t('settingsApp.capacity') + ' ' + listItemLabel('governorates', g)} />
              </Row>
            ))}
          </Stack>
        </Card>
      ) : null}
    </Screen>
  );
}
