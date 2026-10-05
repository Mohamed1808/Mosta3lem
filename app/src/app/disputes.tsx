/**
 * Disputes the signed-in side is part of: clients raise them about cases, providers about
 * ratings. Each side sees the other party's name and which ones it raised.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { date } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Badge, Divider, Empty, ListItem, Loading, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Disputes() {
  const t = useT();
  const client = useApp().session?.portal === 'entity';
  const me = client ? 'entity' : 'provider';
  const q = useQuery<any[]>(() => services().disputes.list());
  const list = q.data || [];
  return (
    <Screen title={t('dispute.title')} sub={client ? t('client.disputesSub') : t('disputeApp.subtitle')} back>
      {q.loading && !q.data ? <Loading /> : list.length ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {list.map((d, i) => (
            <View key={d.id}>
              {i ? <Divider /> : null}
              <ListItem onPress={() => router.push({ pathname: '/dispute/[id]', params: { id: d.id } })}
                title={d.ref + ' · ' + t('dispute.kindLabel.' + d.kind)}
                sub={<Txt v="xs" c="muted" numberOfLines={2}>{t('dispute.reason.' + d.reason)} · {client ? d.providerName : d.entityName}{d.caseRef ? ' · ' + d.caseRef : ''} · {date(d.createdAt)}</Txt>}
                right={d.status === 'open'
                  ? <Badge label={d.raisedByParty === me ? t('disputeApp.youRaised') : t('disputeApp.raisedAgainst')} tone="warning" />
                  : <Badge label={t('dispute.outcome.' + d.outcome)} tone={d.outcome === 'rejected' ? 'muted' : 'info'} />} />
            </View>
          ))}
        </View>
      ) : <Empty text={t('dispute.none')} icon="scale" />}
    </Screen>
  );
}
