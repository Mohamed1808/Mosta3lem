/** Batch pieces: a progress bar and the panel that sends a batch's open cases to providers. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { services } from '@/backend/engine';
import { gov, money, num } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Divider, Grow, Notice, Row, Segmented, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(pct * 100)}%`, height: 6, backgroundColor: pct >= 1 ? colors.ok : colors.accent }} />
    </View>
  );
}

/**
 * Choose providers for a batch: one provider for everything, or one per governorate.
 * Each list holds only providers that cover those places, ranked by the platform.
 */
export function AssignPanel({ plan, windowHours }: { plan: any; windowHours: number }) {
  const t = useT();
  const { ask, toast } = useDialog();
  const run = useAction();
  const [mode, setMode] = useState<string>(plan.groups.length > 1 ? 'split' : 'single');
  const [pick, setPick] = useState<Record<string, string>>({});
  const service = plan.batch.service;
  const price = (p: any) => (service === 'investigation' ? money(p.price) : t('select.feeText', { pct: p.feePct, fixed: money(p.fixedFee) }));
  const keys = mode === 'single' ? ['all'] : plan.groups.map((g: any) => g.governorate);
  const listFor = (k: string) => (k === 'all' ? plan.whole.providers : (plan.groups.find((g: any) => g.governorate === k) || { eligible: { providers: [] } }).eligible.providers);

  const best = () => {
    const next: Record<string, string> = {};
    keys.forEach((k: string) => { const l = listFor(k); if (l[0]) next[k] = l[0].id; });
    setPick(next);
  };
  const send = async () => {
    if (keys.some((k: string) => !pick[k])) { toast(t('batch.pickAll'), 'danger'); return; }
    if (!(await ask({ title: t('batch.sendOffers'), message: t('batch.sendOffersBody', { hours: windowHours }), confirmLabel: t('batch.sendOffers') }))) return;
    const assignments: Record<string, string> = {};
    keys.forEach((k: string) => { assignments[k] = pick[k]; });
    if (await run(() => services().batches.assign(plan.batch.id, mode, assignments), t('batch.offersSent'))) setPick({});
  };

  const providerList = (k: string) => {
    const list = listFor(k);
    if (!list.length) return <Notice tone="warning" text={k === 'all' ? t('batch.noSingleProvider') : t('batch.noProviderForGroup')} />;
    return (
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }}>
        {list.map((p: any, i: number) => {
          const on = pick[k] === p.id;
          return (
            <View key={p.id}>
              {i ? <Divider /> : null}
              <Pressable onPress={() => setPick({ ...pick, [k]: p.id })} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={p.name}
                style={{ padding: space.md, backgroundColor: on ? colors.accentSoft : colors.surface }}>
                <Row gap={10}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? colors.accent : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /> : null}
                  </View>
                  <Grow>
                    <Txt b={on}>{p.name}</Txt>
                    <Txt v="xs" c="muted">{t('score.label')} {p.score != null ? num(p.score, 0) : '-'} · {t('avail.' + p.availability)}</Txt>
                  </Grow>
                  <Txt v="sm" b>{price(p)}</Txt>
                </Row>
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Card title={t('batch.assignTitle', { n: num(plan.open) })}>
      <Stack gap={12}>
        <Segmented items={[{ id: 'single', label: t('client.modeSingle') }, { id: 'split', label: t('client.modeSplit') }]} value={mode} onChange={(m) => { setMode(m); setPick({}); }} />
        <Button small icon="zap" label={t('client.pickBest')} onPress={best} />
        {keys.map((k: string) => (
          <Stack key={k} gap={6}>
            {k !== 'all' ? <Txt v="sm" b>{gov(k)} · {t('client.casesN', { n: num((plan.groups.find((g: any) => g.governorate === k) || {}).count || 0) })}</Txt> : null}
            {providerList(k)}
          </Stack>
        ))}
        <Button kind="primary" icon="send" block label={t('batch.sendOffers')} onPress={send} />
      </Stack>
    </Card>
  );
}
