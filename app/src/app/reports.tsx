/**
 * Client reports: how each provider performs on the client's own cases (on-time,
 * turnaround, first-time acceptance or recovery, the client's average rating, SLA misses,
 * score; spend for the Admin), cases sent per month, and the Excel export of
 * investigations in the client's template columns.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { shareWorkbook } from '@/lib/excel';
import { errorText, money, num, pct } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Badge, Button, Card, Empty, Loading, Row, Stack, Txt, useDir } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Reports() {
  const t = useT();
  const { toast } = useDialog();
  const [busy, setBusy] = useState(false);
  const q = useQuery<any>(() => services().analytics.entityReports());
  const d = q.data;
  const exportExcel = async () => {
    setBusy(true);
    try {
      const sheets: any[] = await services().exports.investigations({});
      const now = new Date(icm().clock.now());
      const stamp = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      await shareWorkbook('investigations-' + stamp + '.xlsx', sheets.map((s) => ({ name: s.sheet, rows: [s.headers].concat(s.rows) })), t('client.exportExcel'));
      toast(t('client.exported', { n: num(sheets.reduce((a, s) => a + s.rows.length, 0)) }));
    } catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(false); }
  };
  return (
    <Screen title={t('nav.reports')} sub={t('reports.subtitle')} back>
      <Card>
        <Stack gap={8}>
          <Txt v="sm" c="muted">{t('client.exportHint')}</Txt>
          <Button icon="download" label={t('client.exportExcel')} onPress={exportExcel} busy={busy} />
        </Stack>
      </Card>
      {!d ? <Loading /> : !d.providers.length ? <Empty text={t('client.noReports')} icon="chart" /> : (
        <>
          <Volume months={d.months} volume={d.volume} />
          <Txt v="h3">{t('reports.comparison')}</Txt>
          {d.providers.map((r: any) => (
            <Card key={r.providerId}>
              <Stack gap={10}>
                <Row between>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Txt b>{r.name}</Txt>
                    <Txt v="xs" c="muted">{t('kind.' + r.kind)} · {t('client.casesN', { n: num(r.cases) })}</Txt>
                  </Stack>
                  {r.score != null ? <Badge label={t('score.label') + ' ' + num(r.score, 0)} tone="info" /> : null}
                </Row>
                <Row wrap gap={14}>
                  <Metric label={t('metric.onTime')} value={pct(r.onTimeRate)} />
                  <Metric label={t('reports.turnaround')} value={r.turnaroundHours == null ? '-' : t('time.hoursShort', { h: num(r.turnaroundHours, 1) })} />
                  <Metric label={t('metric.firstTime')} value={pct(r.firstTimeRate)} />
                  <Metric label={t('metric.recovery')} value={pct(r.recoveryRate)} />
                  <Metric label={t('reports.avgRating')} value={r.avgRating == null ? '-' : num(r.avgRating, 1)} />
                  <Metric label={t('reports.breaches')} value={num(r.breaches)} />
                  {r.spend != null ? <Metric label={t('reports.spend')} value={money(r.spend)} /> : null}
                </Row>
              </Stack>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Txt v="xs" c="faint">{label}</Txt>
      <Txt v="sm" b style={{ color: colors.text }}>{value}</Txt>
    </View>
  );
}

/** Cases sent per month, all providers together. */
function Volume({ months, volume }: { months: string[]; volume: { name: string; data: number[] }[] }) {
  const t = useT();
  const d = useDir();
  const totals = months.map((_, i) => volume.reduce((a, v) => a + (v.data[i] || 0), 0));
  const max = Math.max(1, ...totals);
  const H = 90;
  const lang = icm().i18n.lang() === 'ar' ? 'ar-EG' : 'en-GB';
  return (
    <Card title={t('client.monthly')}>
      <View style={{ flexDirection: d.row, alignItems: 'flex-end', justifyContent: 'space-between', height: H + 40 }}>
        {months.map((m, i) => {
          const [y, mo] = m.split('-').map(Number);
          return (
            <View key={m} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Txt v="xs" c="muted">{num(totals[i])}</Txt>
              <View style={{ width: 16, height: Math.max(2, (totals[i] / max) * H), backgroundColor: colors.accent, borderRadius: radius.sm }} />
              <Txt v="xs" c="muted">{new Intl.DateTimeFormat(lang, { month: 'short' }).format(new Date(y, mo - 1, 1))}</Txt>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
