/**
 * Prices: per inquiry type and pricing zone for investigations, a fee per days-past-due
 * bucket for collections. Changes go to Operations as a request; current prices apply
 * until it is approved. A demo panel plays Operations.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { listItemLabel, NumberInput, useSettings } from '@/components/settings';
import { dateTime, errorText, money, num } from '@/lib/format';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Divider, Grow, Icon, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { inputStyle, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

type Vals = Record<string, string>;

export default function PriceSettings() {
  const t = useT();
  const q = useSettings();
  if (!q.data) return <Screen title={t('settingsApp.prices')} back><Loading /></Screen>;
  return <Body key={q.data.priceRequest ? q.data.priceRequest.at : 'none'} s={q.data} />;
}

/** Form values from a price list: price_<type>_<zone>, fee_<bucket>, fixedFee. */
function toVals(pricing: any, s: any): Vals {
  const v: Vals = {};
  Object.keys(s.pricingConfig.investigationBands).forEach((tp) => s.zones.forEach((z: any) => {
    const x = ((pricing.investigation || {})[tp] || {})[z.id];
    v['price_' + tp + '_' + z.id] = x == null ? '' : String(x);
  }));
  Object.keys(s.pricingConfig.collectionFeeBands).forEach((b) => {
    const x = ((pricing.collection || {}).feePct || {})[b];
    v['fee_' + b] = x == null ? '' : String(x);
  });
  v.fixedFee = String((pricing.collection || {}).fixedFee || 0);
  return v;
}

function toPricing(v: Vals, s: any) {
  const p: any = {};
  const svc: string[] = s.provider.services;
  if (svc.indexOf('investigation') >= 0) {
    p.investigation = {};
    Object.keys(s.pricingConfig.investigationBands).forEach((tp) => {
      p.investigation[tp] = {};
      s.zones.forEach((z: any) => { p.investigation[tp][z.id] = +v['price_' + tp + '_' + z.id]; });
    });
  }
  if (svc.indexOf('collection') >= 0) {
    p.collection = { feePct: {}, fixedFee: +v.fixedFee || 0 };
    Object.keys(s.pricingConfig.collectionFeeBands).forEach((b) => { p.collection.feePct[b] = +v['fee_' + b]; });
  }
  return p;
}

function Body({ s }: { s: any }) {
  const t = useT();
  const { lang } = useApp();
  const { toast } = useDialog();
  const run = useAction();
  const p = s.provider;
  const cfg = s.pricingConfig;
  const inv = p.services.indexOf('investigation') >= 0;
  const col = p.services.indexOf('collection') >= 0;
  const req = s.priceRequest;
  const current = toVals(p.pricing || {}, s);
  const [vals, setVals] = useState<Vals>(() => toVals(req ? req.pricing : p.pricing || {}, s));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { setVals({ ...vals, [k]: v }); if (errors[k]) { const n = { ...errors }; delete n[k]; setErrors(n); } setErr(''); };
  const changed = Object.keys(vals).filter((k) => vals[k] !== current[k]).length;
  const band = (tp: string, z: string) => icm().wf.priceBand(cfg, tp, z);

  const send = async () => {
    setBusy(true);
    try {
      await services().providers.requestPriceChange(toPricing(vals, s), note);
      toast(t('settingsApp.priceSent'));
    } catch (e: any) {
      setErrors(e?.params?.errors || (e?.params?.field ? { [e.params.field]: e.key } : {}));
      setErr(errorText(e));
    } finally { setBusy(false); }
  };

  const field = (key: string, label: string, hint: string, decimals?: boolean, a11y?: string) => (
    <Stack key={key} gap={4}>
      <Row gap={12}>
        <Grow>
          <Txt v="sm">{label}</Txt>
          <Txt v="xs" c="faint">{hint}</Txt>
          {vals[key] !== current[key] ? <Txt v="xs" c="accent">{t('settingsApp.nowIs', { v: current[key] || '-' })}</Txt> : null}
        </Grow>
        <NumberInput value={vals[key]} onChange={(v) => set(key, v)} bad={!!errors[key]} label={a11y || label} decimals={decimals} />
      </Row>
      {errors[key] ? <Txt v="xs" c="bad">{t(errors[key])}</Txt> : null}
    </Stack>
  );

  return (
    <Screen title={t('settingsApp.prices')} back
      footer={s.canEdit ? <Button label={req ? t('settingsApp.replaceRequest') : t('settingsApp.sendPrices')} kind="primary" icon="send" onPress={send} busy={busy} disabled={!changed} block /> : undefined}>
      <Txt v="sm" c="muted">{t('settingsApp.pricesIntro')}</Txt>
      {req ? (
        <Card title={t('settings.priceRequest')}>
          <Stack>
            <Notice tone="info" text={t('settings.priceRequestPending', { date: dateTime(req.at) })} />
            {req.note ? <Txt v="sm">{req.note}</Txt> : null}
            {s.canEdit ? <Button small label={t('settingsApp.withdraw')} onPress={() => run(() => services().providers.withdrawPriceChange(), t('settingsApp.withdrawn'))} /> : null}
            <DemoOps />
          </Stack>
        </Card>
      ) : null}
      {err ? <Notice tone="danger" text={err} /> : null}
      {inv ? Object.keys(cfg.investigationBands).map((tp) => (
        <Card key={tp} title={listItemLabel('inquiryTypes', tp)}>
          <Stack gap={space.md}>
            {s.zones.map((z: any, i: number) => (
              <View key={z.id}>
                {i ? <View style={{ marginBottom: space.md }}><Divider /></View> : null}
                {field('price_' + tp + '_' + z.id, icm().util.label(z), t('settingsApp.range', { min: money(band(tp, z.id).min), max: money(band(tp, z.id).max) }), false, listItemLabel('inquiryTypes', tp) + ', ' + icm().util.label(z))}
              </View>
            ))}
          </Stack>
        </Card>
      )) : null}
      {col ? (
        <Card title={t('profile.colPricing')}>
          <Stack gap={space.md}>
            <Txt v="xs" c="faint">{t('profile.feeHint')}</Txt>
            {Object.keys(cfg.collectionFeeBands).map((b) => {
              const bk = icm().config.DPD_BUCKETS.find((x: any) => x.id === b);
              return field('fee_' + b, (bk ? icm().util.label(bk) : b) + ' (%)', t('settingsApp.rangePct', { min: num(cfg.collectionFeeBands[b].min), max: num(cfg.collectionFeeBands[b].max) }), true);
            })}
            {field('fixedFee', t('profile.fixedFee'), t('profile.max', { n: money(cfg.collectionFixedFeeMax) }))}
          </Stack>
        </Card>
      ) : null}
      {s.canEdit ? (
        <Card>
          <Stack gap={6}>
            <Txt v="sm" b c="muted">{t('settingsApp.noteForOps')}</Txt>
            <TextInput value={note} onChangeText={setNote} multiline placeholder={t('settingsApp.notePlaceholder')} placeholderTextColor={colors.text3}
              style={[inputStyle, { minHeight: 70, textAlignVertical: 'top', textAlign: lang === 'ar' ? 'right' : 'left' }]} accessibilityLabel={t('settingsApp.noteForOps')} />
            <Txt v="xs" c="faint">{t('settingsApp.changedCount', { n: num(changed) })}</Txt>
          </Stack>
        </Card>
      ) : null}
    </Screen>
  );
}

/** Demo only: Operations approves or turns down the request. */
function DemoOps() {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      <Row gap={8}><Icon name="info" size={16} /><Txt v="sm" b>{t('settingsApp.demoOps')}</Txt></Row>
      <Row gap={8} wrap>
        <Button small kind="primary" icon="check" label={t('settings.approvePrices')} onPress={() => run(() => services().demo.reviewMyProvider('approvePrices'), t('settings.pricesApproved'))} />
        <Button small kind="danger" label={t('onboarding.reject')} onPress={async () => {
          const r = await ask({ title: t('onboarding.reject'), note: 'required', noteLabel: t('signup.demo.noteLabel'), danger: true, confirmLabel: t('onboarding.reject') });
          if (r) await run(() => services().demo.reviewMyProvider('rejectPrices', null, r.note));
        }} />
      </Row>
    </View>
  );
}
