/**
 * Provider settings overview: coverage, response times, prices and documents, each with a
 * one-line summary and the screen that changes it.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { DocsAlert, DocStateBadge, expiryText, listItemLabel, useSettings } from '@/components/settings';
import { coverageText, dateTime } from '@/lib/format';
import { useT } from '@/state/app';
import { Badge, Card, Divider, Icon, ListItem, Loading, Notice, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function SettingsHome() {
  const t = useT();
  const q = useSettings();
  if (!q.data) return <Screen title={t('settingsApp.title')} back><Loading /></Screen>;
  const s = q.data;
  const p = s.provider;
  const inv = p.services.indexOf('investigation') >= 0;
  const sla = inv
    ? Object.keys(p.sla.investigation || {}).map((k) => listItemLabel('inquiryTypes', k) + ' ' + t('settingsApp.hoursShort', { n: p.sla.investigation[k] })).join(t('common.listSep'))
    : t('settingsApp.hoursShort', { n: p.sla.collectionFirstContactHours });
  return (
    <Screen title={t('settingsApp.title')} sub={p.name} back>
      <DocsAlert />
      {s.lastPriceDecision && !s.lastPriceDecision.approved && !s.priceRequest ? (
        <Notice tone="warning" text={t('notif.price_change_rejected', { note: s.lastPriceDecision.note })} />
      ) : null}
      <Card pad={false}>
        <ListItem left={<Icon name="pin" />} title={t('settingsApp.coverage')} sub={coverageText(p.coverageCities, 3)} onPress={() => router.push('/settings/coverage')} />
        <Divider />
        <ListItem left={<Icon name="clock" />} title={t('settingsApp.responseTimes')} sub={sla} onPress={() => router.push('/settings/response')} />
        <Divider />
        <ListItem left={<Icon name="coins" />} title={t('settingsApp.prices')}
          sub={s.priceRequest ? t('settingsApp.priceWaitingShort', { date: dateTime(s.priceRequest.at) }) : t('settingsApp.pricesSub')}
          right={s.priceRequest ? <Badge label={t('status.pending')} tone="pending" /> : undefined} onPress={() => router.push('/settings/prices')} />
      </Card>
      <Card title={t('profile.documents')} pad={false}>
        {s.documents.map((d, i) => (
          <View key={d.type}>
            {i ? <Divider /> : null}
            <ListItem title={t('doc.' + d.type)} sub={d.renewal ? t('settings.renewalWaiting') : expiryText(d, t) || undefined}
              right={<DocStateBadge doc={d} />} onPress={() => router.push('/settings/documents')} />
          </View>
        ))}
      </Card>
      {!s.canEdit ? <Txt v="xs" c="faint" center>{t('settingsApp.ownerOnly')}</Txt> : null}
    </Screen>
  );
}
