/**
 * Earnings after the platform fee, following the team structure: the owner and an
 * individual provider see everything, a supervisor sees only the agents they supervise.
 * Field agents never reach this screen (they see My completed work, without amounts).
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { date, money, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Card, Divider, Empty, Grow, Kpi, ListItem, Loading, Notice, Row, Segmented, Stack, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Earnings() {
  const t = useT();
  const { session, service, setService } = useApp();
  const svcs: string[] = session?.provider?.services || [];
  const svc = service || svcs[0] || 'investigation';
  const q = useQuery<any>(() => services().billing.earnings(svc), [svc]);
  const d = q.data;
  const team = d?.scope === 'team';
  return (
    <Screen title={team ? t('earnings.teamTitle') : t('nav.earnings')} sub={d ? t('earnings.subtitle', { pct: d.feePct }) : undefined} back>
      {svcs.length > 1 ? <Segmented items={svcs.map((s) => ({ id: s, label: t('service.' + s) }))} value={svc} onChange={setService} /> : null}
      {q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : !d ? <Loading /> : (
        <>
          {team ? <Notice tone="info" text={t('earnings.teamOnly')} /> : null}
          <Row wrap gap={10}>
            <Kpi label={t('earnings.monthNet')} value={money(d.thisMonthNet)} sub={t('earnings.afterFee')} />
            <Kpi label={t('earnings.monthGross')} value={money(d.thisMonthGross)} />
            <Kpi label={t('earnings.accruing')} value={money(d.accruing)} sub={t('earnings.accruingSub')} />
            <Kpi label={t('earnings.pending')} value={money(d.pending)} sub={t('earnings.pendingSub')} tone={d.pending ? 'warn' : undefined} />
            <Kpi label={t('earnings.paidOut')} value={money(d.paidOut)} tone="ok" />
          </Row>
          {d.byAgent.length ? (
            <Card title={t('earnings.byAgent')} pad={false}>
              {d.byAgent.map((a: any, i: number) => (
                <View key={a.agentId || 'none'}>
                  {i ? <Divider /> : null}
                  <ListItem chevron={false}
                    title={(a.name || t('earnings.noAgent')) + (a.owner ? ' ' + t('team.ownerTag') : '')}
                    sub={(d.scope === 'all' && a.supervisorName ? a.supervisorName + ' · ' : '') + t('earnings.casesMonth') + ': ' + num(a.casesThisMonth) + ' · ' + t('earnings.allTime') + ': ' + money(a.net)}
                    right={<Txt b>{money(a.netThisMonth)}</Txt>} />
                </View>
              ))}
            </Card>
          ) : null}
          <Card title={t('earnings.perCase')} pad={false}>
            {d.rows.length ? d.rows.map((r: any, i: number) => (
              <View key={r.caseId + r.invoiceRef}>
                {i ? <Divider /> : null}
                <ListItem onPress={() => router.push({ pathname: '/case/[id]', params: { id: r.caseId } })}
                  title={<Row gap={8} wrap><Txt v="sm" b mono>{r.caseRef}</Txt><Badge label={t('payout.' + r.payout)} tone={r.payout === 'paid_out' ? 'success' : r.payout === 'pending' ? 'warning' : 'neutral'} /></Row>}
                  sub={<Stack gap={2}>
                    <Txt v="xs" c="muted">{r.entityName} · {date(r.closedAt)}{r.agentName ? ' · ' + r.agentName : ''}</Txt>
                    {r.adjusted ? <Txt v="xs" c="warn">{t('earnings.adjusted')}</Txt> : null}
                  </Stack>}
                  right={<View style={{ alignItems: 'flex-end' }}><Txt b>{money(r.net)}</Txt><Txt v="xs" c="faint">{t('earnings.gross')} {money(r.gross)}</Txt></View>} />
              </View>
            )) : <Empty text={t('earnings.none')} icon="wallet" />}
          </Card>
          <View style={{ padding: space.sm, borderRadius: radius.md, backgroundColor: colors.surface2 }}>
            <Grow><Txt v="xs" c="faint">{t('earningsApp.privacy')}</Txt></Grow>
          </View>
        </>
      )}
    </Screen>
  );
}
