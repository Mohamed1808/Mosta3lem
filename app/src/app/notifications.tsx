/** Notifications for the signed-in person. Tapping one marks it read and opens what it is about. */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { dateTime, money } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Button, Divider, Empty, Grow, ListItem, Loading, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Notifications() {
  const t = useT();
  const q = useQuery<any[]>(() => services().notifications.list());
  const list = q.data || [];
  const open = async (n: any) => {
    await services().notifications.markRead(n.id);
    const m = /\/cases\/([^/?]+)/.exec(n.href || '') || /^case:(.+)$/.exec(n.link || '');
    if (m) router.push({ pathname: '/case/[id]', params: { id: m[1] } });
    else if (n.link === 'provider:profile') router.push('/settings');
    else if (n.link === 'provider:ratings') router.push('/ratings');
    else if (n.link === 'provider:earnings') router.push('/earnings');
    else if (/^dispute:/.test(n.link || '')) router.push({ pathname: '/dispute/[id]', params: { id: n.link.slice(8) } });
    else if (/^batch:/.test(n.link || '')) router.push({ pathname: '/batch/[id]', params: { id: n.link.slice(6) } });
    else if (n.link === 'entity:invoices') router.push('/invoices');
  };
  const text = (n: any) => {
    const p = Object.assign({}, n.params);
    // Dispute outcomes (upheld, partial, rejected) and collection outcomes share the param name.
    if (p.outcome) p.outcome = /^(upheld|partial|rejected)$/.test(p.outcome) ? t('dispute.outcome.' + p.outcome) : t('outcome.' + p.outcome);
    if (p.decision) p.decision = t('status.' + p.decision);
    if (p.level) p.level = t('enforcement.' + p.level);
    if (p.doc) p.doc = t('doc.' + p.doc);
    if (p.amount != null) p.amount = money(p.amount);
    return t(n.key, p);
  };
  return (
    <Screen title={t('more.notifications')} back
      right={list.some((n) => !n.read) ? <Button small kind="ghost" label={t('more.markAllRead')} onPress={() => services().notifications.markAllRead()} /> : undefined}>
      {q.loading && !q.data ? <Loading /> : list.length ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {list.map((n, i) => (
            <View key={n.id}>
              {i ? <Divider /> : null}
              <ListItem onPress={() => open(n)} chevron={false}
                left={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? 'transparent' : colors.accent }} />}
                title={<Grow><Txt v="sm" b={!n.read}>{text(n)}</Txt></Grow>} sub={dateTime(n.at)} />
            </View>
          ))}
        </View>
      ) : <Empty text={t('more.noNotifications')} icon="bell" />}
    </Screen>
  );
}
