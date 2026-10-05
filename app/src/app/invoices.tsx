/**
 * The client's invoices (Admin only): one per provider per month, lines added as cases
 * close. Totals for outstanding, accruing and paid; tap an invoice for its lines and to
 * record payment (simulated, no money moves).
 */
import { useState } from 'react';
import { View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { date, money, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { Badge, Button, Card, Divider, Empty, Kpi, KeyValue, ListItem, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { Sheet, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const TONE: Record<string, any> = { draft: 'muted', issued: 'warning', paid: 'success' };

export default function Invoices() {
  const t = useT();
  const { session } = useApp();
  const admin = session?.user?.role === 'entity_admin';
  const q = useQuery<any[]>(() => (admin ? services().billing.invoices() : Promise.resolve([])), [admin]);
  const [open, setOpen] = useState<string | null>(null);
  if (!admin) return <Screen title={t('nav.invoices')} back><Notice tone="info" icon="lock" text={t('client.adminOnly')} /></Screen>;
  const list = q.data || [];
  const sum = (st: string) => list.filter((i) => i.status === st).reduce((a, i) => a + i.subtotal, 0);
  const inv = open ? list.find((i) => i.id === open) : null;
  const fmtMonth = (m: string) => icm().util.fmtMonth(m);
  return (
    <Screen title={t('nav.invoices')} sub={t('invoice.subtitle')} back>
      {q.loading && !q.data ? <Loading /> : (
        <>
          <Row wrap gap={10}>
            <Kpi label={t('invoice.outstanding')} value={money(sum('issued'))} tone={sum('issued') ? 'warn' : undefined} />
            <Kpi label={t('invoice.accruing')} value={money(sum('draft'))} sub={t('invoice.accruingSub')} />
            <Kpi label={t('invoice.paidTotal')} value={money(sum('paid'))} tone="ok" />
          </Row>
          {!list.length ? <Empty text={t('invoice.none')} icon="file" /> : (
            <Card pad={false}>
              {list.map((i, n) => (
                <View key={i.id}>
                  {n ? <Divider /> : null}
                  <ListItem onPress={() => setOpen(i.id)}
                    title={<Row between><Txt b numberOfLines={1} style={{ flex: 1 }}>{i.providerName}</Txt><Txt b>{money(i.subtotal)}</Txt></Row>}
                    sub={<Row between style={{ marginTop: 4 }}><Txt v="xs" c="muted">{i.ref} · {fmtMonth(i.month)} · {t('client.linesN', { n: num(i.lines.length) })}</Txt><Badge label={t('invoiceStatus.' + i.status)} tone={TONE[i.status]} /></Row>} />
                </View>
              ))}
            </Card>
          )}
          <Txt v="xs" c="faint">{t('client.etaNote')}</Txt>
        </>
      )}
      {inv ? <InvoiceSheet inv={inv} fmtMonth={fmtMonth} onClose={() => setOpen(null)} /> : null}
    </Screen>
  );
}

function InvoiceSheet({ inv, fmtMonth, onClose }: { inv: any; fmtMonth: (m: string) => string; onClose: () => void }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const pay = async () => {
    if (await ask({ title: t('invoice.markPaid'), message: t('invoice.payBody'), confirmLabel: t('invoice.markPaid') })) {
      if (await run(() => services().billing.markPaid(inv.id), t('invoice.paid'))) onClose();
    }
  };
  return (
    <Sheet visible title={t('invoice.title', { ref: inv.ref })} onClose={onClose}
      footer={inv.status === 'issued' ? <Button kind="primary" icon="check" block label={t('invoice.markPaid')} onPress={pay} /> : undefined}>
      <Stack gap={12}>
        <KeyValue rows={[
          [t('invoice.provider'), inv.providerName],
          [t('invoice.month'), fmtMonth(inv.month)],
          [t('common.status'), t('invoiceStatus.' + inv.status)],
          [t('invoice.total'), <Txt key="tot" v="sm" b>{money(inv.subtotal)}</Txt>],
        ]} />
        <Card pad={false}>
          {inv.lines.map((l: any, n: number) => (
            <View key={l.caseId + n}>
              {n ? <Divider /> : null}
              <ListItem chevron={false} title={l.caseRef} sub={t('service.' + l.service) + ' · ' + t('invoice.closed') + ' ' + date(l.closedAt) + (l.adjustment != null && l.adjustment !== 1 ? ' · ' + t('invoice.adjusted', { pct: Math.round(l.adjustment * 100) }) : '')}
                right={<Txt v="sm" b>{money(l.billed)}</Txt>} />
            </View>
          ))}
        </Card>
      </Stack>
    </Sheet>
  );
}
