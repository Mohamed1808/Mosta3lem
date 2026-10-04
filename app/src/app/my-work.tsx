/**
 * A field agent's completed work: how many cases they finished, on-time rate, and each case
 * with its status. No amounts: what the bank pays is for the owner (and supervisors, for
 * their own team) only.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { date, num, pct, types } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { Card, Divider, Empty, Kpi, ListItem, Loading, Notice, Row, StatusBadge, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function MyWork() {
  const t = useT();
  const q = useQuery<any>(() => services().billing.myWork(null));
  const d = q.data;
  return (
    <Screen title={t('earningsApp.myWork')} sub={t('earningsApp.myWorkSub')} back>
      {q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : !d ? <Loading /> : (
        <>
          <Row wrap gap={10}>
            <Kpi label={t('earningsApp.doneThisMonth')} value={num(d.thisMonth)} />
            <Kpi label={t('earningsApp.doneTotal')} value={num(d.total)} />
            <Kpi label={t('metric.onTime')} value={pct(d.onTimeRate)} tone={d.onTimeRate != null && d.onTimeRate < 0.8 ? 'warn' : undefined} />
            <Kpi label={t('earningsApp.openNow')} value={num(d.open)} />
          </Row>
          <Card title={t('earningsApp.completedCases')} pad={false}>
            {d.rows.length ? d.rows.map((r: any, i: number) => (
              <View key={r.caseId}>
                {i ? <Divider /> : null}
                <ListItem onPress={() => router.push({ pathname: '/case/[id]', params: { id: r.caseId } })}
                  title={<Txt v="sm" b mono>{r.caseRef}</Txt>}
                  sub={<Txt v="xs" c="muted">{(r.inquiryTypes ? types(r.inquiryTypes) + ' · ' : '') + r.entityName + ' · ' + date(r.doneAt) + (r.onTime === false ? ' · ' + t('earningsApp.late') : '')}</Txt>}
                  right={<StatusBadge status={r.status} />} />
              </View>
            )) : <Empty text={t('earningsApp.noneDone')} icon="checkSquare" />}
          </Card>
        </>
      )}
    </Screen>
  );
}
