/**
 * Client home: the organisation's open work, what needs a decision and the last six
 * months. Each role sees only the services it covers (Investigations, Collections, or
 * both for Admin and Operations). Spending is shown to the Admin only.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CaseList } from '@/components/case';
import { money, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Badge, Card, Kpi, Loading, Row, Stack, Txt, useDir } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function ClientHome() {
  const t = useT();
  const { session } = useApp();
  const q = useQuery<any>(() => services().analytics.entityDashboard());
  const d = q.data;
  const admin = session?.user?.role === 'entity_admin';
  const inv = d && d.services.indexOf('investigation') >= 0;
  const col = d && d.services.indexOf('collection') >= 0;
  const waiting = d ? (d.statusCounts.delivered || 0) + (d.statusCounts.awaiting_entity_approval || 0) : 0;
  return (
    <Screen title={t('home.hello', { name: (session?.user?.name || '').split(' ')[0] })} sub={session?.entity?.name}>
      {!d ? <Loading /> : (
        <>
          <Row wrap gap={6}>
            <Txt v="sm" c="muted">{t('client.services')}</Txt>
            {d.services.map((s: string) => <Badge key={s} label={t('service.' + s)} tone="info" />)}
          </Row>
          <Row wrap gap={10}>
            <Kpi label={t('kpi.openCases')} value={num(d.open)} />
            <Kpi label={t('client.waitingDecision')} value={num(waiting)} tone={waiting ? 'warn' : undefined} />
            <Kpi label={t('kpi.slaAtRisk')} value={num(d.atRisk)} tone={d.atRisk ? 'warn' : undefined} sub={t('kpi.slaAtRiskSub')} />
            <Kpi label={t('kpi.slaBreached')} value={num(d.breached)} tone={d.breached ? 'bad' : undefined} />
            {inv ? <Kpi label={t('kpi.deliveredMonth')} value={num(d.deliveredThisMonth)} /> : null}
            {inv ? <Kpi label={t('kpi.turnaround')} value={d.avgTurnaroundHours != null ? t('time.hoursShort', { h: num(d.avgTurnaroundHours, 1) }) : '-'} sub={t('kpi.turnaroundSub')} /> : null}
            {col ? <Kpi label={t('kpi.recoveredMonth')} value={money(d.recoveredThisMonth)} tone="ok" /> : null}
            {admin ? <Kpi label={t('kpi.spendMonth')} value={money(d.spendThisMonth)} /> : null}
            <Kpi label={t('kpi.ratingsPending')} value={num(d.pendingRatings)} tone={d.pendingRatings ? 'warn' : undefined} />
          </Row>
          <Stack gap={8}>
            <Txt v="h3">{t('entity.dashboard.attention')}</Txt>
            <CaseList rows={d.attention} empty={t('entity.dashboard.nothingPending')} showAgent={false}
              onOpen={(c) => router.push({ pathname: '/case/[id]', params: { id: c.id } })} />
          </Stack>
          <Trend series={d.series} />
        </>
      )}
    </Screen>
  );
}

/** Cases sent and closed per month, as paired bars. */
function Trend({ series }: { series: { month: string; created: number; closed: number }[] }) {
  const t = useT();
  const d = useDir();
  const max = Math.max(1, ...series.map((m) => Math.max(m.created, m.closed)));
  const H = 96;
  return (
    <Card title={t('client.trend')}>
      <View style={{ flexDirection: d.row, alignItems: 'flex-end', justifyContent: 'space-between', height: H + 36 }}>
        {series.map((m) => (
          <View key={m.month} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
            <View style={{ flexDirection: d.row, alignItems: 'flex-end', gap: 3, height: H }}>
              <View style={{ width: 10, height: Math.max(2, (m.created / max) * H), backgroundColor: colors.accent, borderRadius: radius.sm }} />
              <View style={{ width: 10, height: Math.max(2, (m.closed / max) * H), backgroundColor: colors.ok, borderRadius: radius.sm }} />
            </View>
            <Txt v="xs" c="muted">{monthLabel(m.month)}</Txt>
          </View>
        ))}
      </View>
      <Row gap={16} style={{ marginTop: 8 }}>
        <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.accent }} /><Txt v="xs" c="muted">{t('client.sent')}</Txt></Row>
        <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.ok }} /><Txt v="xs" c="muted">{t('client.closed')}</Txt></Row>
      </Row>
    </Card>
  );
}

/** "2026-09" as a short month name in the current language. */
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(icm().i18n.lang() === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short' }).format(new Date(y, m - 1, 1));
}
