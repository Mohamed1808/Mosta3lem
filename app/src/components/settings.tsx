/**
 * Shared pieces of the provider settings: the data hook, expiry badges and the alert shown
 * on Home when a commercial register or tax card is about to expire or has expired.
 */
import { router } from 'expo-router';
import { TextInput } from 'react-native';

import { icm, services } from '@/backend/engine';
import { date, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors } from '@/theme';
import { Badge, Button, Notice, Stack, Txt } from '@/ui/core';
import { inputStyle } from '@/ui/dialogs';

export type Settings = {
  provider: any; canEdit: boolean; limits: any; pricingConfig: any; zones: any[];
  documents: any[]; expired: string[]; priceRequest: any | null; lastPriceDecision: any | null;
};

/** The settings data, reloaded whenever anything changes. */
export function useSettings() {
  return useQuery<Settings>(() => services().providers.settings());
}

/** Owners of a company and individual providers manage settings; supervisors and agents do not. */
export function useCanManageSettings() {
  const { session } = useApp();
  const role = session?.user?.role;
  return role === 'provider_admin' || role === 'freelancer';
}

/** Badge for a document's expiry state, or its verification state when it does not expire. */
export function DocStateBadge({ doc }: { doc: any }) {
  const t = useT();
  const st = doc.expiry?.state;
  if (st === 'expired') return <Badge label={t('settings.state.expired')} tone="danger" />;
  if (st === 'expiring') return <Badge label={t('settings.state.expiring')} tone="warning" />;
  const s = doc.status === 'verified' ? 'verified' : doc.status === 'missing' ? 'rejected' : 'pending';
  return <Badge label={t('docStatus.' + s)} tone={s === 'verified' ? 'success' : s === 'rejected' ? 'danger' : 'pending'} />;
}

/** "Expires 12 Nov 2026 · 20 days left" or "Expired 3 Oct". */
export function expiryText(doc: any, t: (k: string, p?: any) => string) {
  if (!doc.expiresAt) return doc.expiring ? t('settings.state.none') : '';
  const base = t('settings.expires', { date: date(doc.expiresAt) });
  const d = doc.expiry?.daysLeft;
  if (doc.expiry?.state === 'expired') return base + ' · ' + t('settingsApp.expiredAgo');
  return d != null && d <= 60 ? base + ' · ' + t('settingsApp.daysLeft', { n: num(d) }) : base;
}

/** Home alert: expired or expiring documents, with a way to send the renewal. */
export function DocsAlert() {
  const t = useT();
  const can = useCanManageSettings();
  const q = useSettings();
  if (!can || !q.data) return null;
  const expired = q.data.documents.filter((d) => d.expiry?.state === 'expired' && !d.renewal);
  const expiring = q.data.documents.filter((d) => d.expiry?.state === 'expiring' && !d.renewal);
  const waiting = q.data.documents.filter((d) => d.renewal && d.expiry?.state === 'expired');
  const docs = (list: any[]) => list.map((d) => t('doc.' + d.type)).join(t('common.listSep'));
  const go = () => router.push('/settings/documents');
  if (expired.length) {
    return (
      <Notice tone="danger" icon="alert">
        <Stack gap={8}>
          <Txt v="sm" style={{ color: colors.bad }}>{t('settingsApp.alertExpired', { docs: docs(expired) })}</Txt>
          <Button small kind="danger" label={t('settingsApp.sendRenewal')} onPress={go} />
        </Stack>
      </Notice>
    );
  }
  if (waiting.length) return <Notice tone="warning" text={t('settingsApp.alertWaiting', { docs: docs(waiting) })} />;
  if (expiring.length) {
    const days = Math.min(...expiring.map((d) => d.expiry.daysLeft));
    return (
      <Notice tone="warning">
        <Stack gap={8}>
          <Txt v="sm" style={{ color: colors.warn }}>{t('settingsApp.alertExpiring', { docs: docs(expiring), n: num(days) })}</Txt>
          <Button small label={t('settingsApp.sendRenewal')} onPress={go} />
        </Stack>
      </Notice>
    );
  }
  return null;
}

/** Whole-number entry that keeps the text the person typed. */
export function NumberInput({ value, onChange, bad, label, decimals }: { value: string; onChange: (v: string) => void; bad?: boolean; label: string; decimals?: boolean }) {
  return (
    <TextInput value={value} onChangeText={(v) => onChange(v.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, ''))} keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      accessibilityLabel={label} style={[inputStyle, { minWidth: 90, textAlign: 'left', writingDirection: 'ltr', borderColor: bad ? colors.bad : colors.borderStrong }]} />
  );
}

/** Label of a list item (inquiry type, governorate) from the engine's config. */
export function listItemLabel(list: string, id: string) {
  const it = (icm().store.db.config.lists[list] || []).find((x: any) => x.id === id);
  return it ? icm().util.label(it) : id;
}
