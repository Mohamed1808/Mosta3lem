/**
 * One case. Shows what the viewer may see (customer details stay hidden from providers
 * until the offer is accepted) and the actions their role allows: for providers accept or
 * decline an offer, assign, review, open field work and the collection actions; for the
 * client the decisions in ClientActions.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useState } from 'react';

import { icm, services } from '@/backend/engine';
import { CheckInLine, PhotoGrid, priceText, ReportView, SlaBadge, Timeline } from '@/components/case';
import { ClientActions } from '@/components/clientCase';
import { useLocate } from '@/components/locate';
import { AgentPicker, FormSheet } from '@/components/sheets';
import { addressLine, bucket, dateTime, duration, money, types } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { Badge, Button, Card, KeyValue, Loading, Notice, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const ALLOWED_BY: Record<string, string> = { call: 'calls', sms: 'messages', whatsapp: 'messages', field_visit: 'visits' };

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const client = useApp().session?.portal === 'entity';
  const q = useQuery<any>(() => services().cases.get(id), [id]);
  if (!q.data) return <Screen title={t('nav.cases')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  const c = q.data.case;
  return (
    <Screen title={c.ref} sub={client ? c.providerName || undefined : c.entityName || (q.data.entity && q.data.entity.name)} back>
      <Row wrap gap={6}><StatusBadge status={c.status} /><SlaBadge c={c} /><Badge label={t('service.' + c.service)} tone={c.service === 'investigation' ? 'accent' : 'pending'} />{c.disputed ? <Badge label={t('dispute.flag')} tone="danger" /> : null}</Row>
      {client ? <ClientActions d={q.data} /> : <Actions d={q.data} />}
      <Card title={t('caseScreen.request')}><RequestDetails d={q.data} /></Card>
      {Object.keys(c.addresses || {}).length ? (
        <Card title={t('caseScreen.addresses')}>
          <KeyValue rows={Object.keys(c.addresses).map((k) => [t('address.' + k), c.addresses[k].street ? addressLine(c.addresses[k]) : t('mask.hidden')] as [string, ReactNode])} />
        </Card>
      ) : null}
      {c.service === 'investigation' && (c.checkIn || (c.photos || []).length || Object.keys(c.report || {}).length) ? (
        <Card title={t('caseScreen.evidence')}>
          <Stack>
            <CheckInLine ci={c.checkIn} />
            {(c.photos || []).length ? <PhotoGrid photos={c.photos} /> : null}
            <ReportView c={c} />
          </Stack>
        </Card>
      ) : null}
      {c.service === 'collection' && !c.masked ? <Card title={t('collection.balance')}><Balance c={c} /></Card> : null}
      <Card title={t('caseScreen.timeline')}><Timeline c={c} /></Card>
    </Screen>
  );
}

function RequestDetails({ d }: { d: any }) {
  const t = useT();
  const c = d.case, cu = c.customer || {};
  const hidden = t('mask.hidden');
  const rows: [string, ReactNode][] = [
    [t('case.customerName'), cu.name || hidden],
    [t('case.nationalId'), cu.nationalId ? <Txt v="sm" mono ltr>{cu.nationalId}</Txt> : hidden],
    [t('case.mobiles'), cu.mobiles && cu.mobiles.length ? <Txt v="sm" mono ltr>{cu.mobiles.join(', ')}</Txt> : hidden],
  ];
  if (cu.telephone) rows.push([t('forms.investigationRequest.telephone'), <Txt key="tel" v="sm" mono ltr>{cu.telephone}</Txt>]);
  if (c.service === 'investigation') {
    rows.push([t('case.inquiryTypes'), types(c.inquiryTypes)]);
    if (c.accountNumber !== undefined) rows.push([t('forms.investigationRequest.accountNumber'), c.accountNumber || (c.masked ? hidden : '-')]);
    if ((c.inquiryTypes || []).indexOf('employment') >= 0) rows.push([t('forms.investigationRequest.employerName'), c.employerName || hidden]);
    if ((c.inquiryTypes || []).indexOf('business') >= 0) rows.push([t('forms.investigationRequest.businessName'), c.businessName || hidden]);
    if (c.guarantor) rows.push([t('case.guarantor'), c.guarantor.name]);
    rows.push([t('case.deadline'), dateTime(c.deadline || c.dueAt)]);
  } else {
    rows.push([t('case.product'), icm().util.label((icm().store.db.config.lists.productTypes || []).find((p: any) => p.id === c.productType) || { en: c.productType, ar: c.productType })]);
    rows.push([t('case.dpd'), (c.dpd != null ? c.dpd + ' · ' : '') + bucket(c.bucket)]);
    if (c.masked) rows.push([t('case.amountRange'), c.amountRange ? t('amountRange.' + c.amountRange) : '-']);
    else { rows.push([t('case.originalAmount'), money(c.originalAmount)]); rows.push([t('case.overdueAmount'), money(c.overdueAmount)]); }
    if (c.collateral) rows.push([t('case.collateral'), c.collateral.make + ' ' + c.collateral.model + (c.collateral.plate ? ' · ' + c.collateral.plate : '')]);
    const aa = c.allowedActions || {};
    rows.push([t('case.allowedActions'), ['calls', 'messages', 'visits'].filter((k) => aa[k]).map((k) => t('forms.collectionRequest.allowed.' + k)).join(t('common.listSep')) || '-']);
    rows.push([t('case.periodEnd'), dateTime(c.periodEnd || c.dueAt)]);
  }
  // Field agents get no price (the engine leaves it out for them).
  if (c.price != null) rows.push([t('caseScreen.price'), priceText(c, t)]);
  if (c.agentName) rows.push([t('caseScreen.agent'), c.agentName]);
  rows.push([t('case.instructions'), c.instructions === null && c.masked ? hidden : c.instructions || '-']);
  return <Stack>{c.masked ? <Notice tone="info" icon="lock" text={t('caseScreen.masked')} /> : null}<KeyValue rows={rows} /></Stack>;
}

function Balance({ c }: { c: any }) {
  const t = useT();
  const wf = icm().wf;
  const promises = c.promises || [];
  return (
    <Stack>
      <KeyValue rows={[
        [t('case.overdueAmount'), money(c.settledTarget || c.overdueAmount)],
        [t('collection.recovered'), money(wf.collection.recovered(c))],
        [t('collection.outstanding'), money(wf.collection.outstanding(c))],
        [t('collection.promises'), String(promises.length)],
      ]} />
      {promises.filter((p: any) => p.status === 'pending').map((p: any) => <Txt key={p.id} v="xs" c="muted">{t('collection.promise')}: {money(p.amount)} · {icm().util.fmtDate(p.dueDate)}</Txt>)}
    </Stack>
  );
}

function Actions({ d }: { d: any }) {
  const t = useT();
  const { session } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const [sheet, setSheet] = useState<string | null>(null);
  const locate = useLocate();
  const c = d.case, a: string[] = d.actions || [];
  const role = session?.user?.role;
  const manager = icm().wf.PROVIDER_MANAGER_ROLES.indexOf(role) >= 0;
  const mine = session?.user?.agentId && session.user.agentId === c.agentId;
  const C = icm().config, wf = icm().wf;
  const out: ReactNode[] = [];

  if (c.status === 'awaiting_acceptance' && d.offer && manager) {
    out.push(<Notice key="offer" tone="info" icon="inbox" text={t('offers.openOffer') + ' ' + t('offers.expiresIn', { time: duration(Math.max(0, d.offer.remaining)) })} />);
    out.push(<Row key="offerBtns" gap={10}>
      <Button label={t('action.decline')} kind="danger" onPress={async () => {
        const reasons = (icm().store.db.config.lists.declineReasons || []).map((r: any) => ({ value: r.id, label: icm().util.label(r) }));
        const v = await ask({ title: t('offers.declineTitle'), message: t('offers.declineBody'), danger: true, options: reasons, optionLabel: t('common.reason'), note: 'optional', confirmLabel: t('action.decline') });
        if (v && await run(() => services().offers.decline(d.offer.id, v.option, v.note), t('offers.declined'))) router.back();
      }} />
      <Button label={t('action.accept')} kind="primary" icon="check" onPress={async () => {
        if (await ask({ title: t('offers.acceptTitle'), message: t('offers.acceptBody', { n: 1 }), confirmLabel: t('action.accept') })) await run(() => services().offers.accept(d.offer.id), t('offers.accepted'));
      }} />
    </Row>);
  }
  if (a.indexOf('assign') >= 0 && role !== 'freelancer') {
    out.push(<Button key="assign" icon="user" kind={c.agentId ? 'secondary' : 'primary'} block label={c.agentId ? (c.status === 'rework_requested' ? t('assign.sendBack') : t('assign.reassign')) : t('assign.title')} onPress={() => setSheet('assign')} />);
  }
  if (a.indexOf('assign') >= 0 && role === 'freelancer' && c.status === 'rework_requested') {
    out.push(<Button key="self" kind="primary" block label={t('assign.takeBack')} onPress={() => run(() => services().cases.assign([c.id], session?.user?.agentId))} />);
  }
  if (a.indexOf('approve') >= 0 || a.indexOf('return_to_agent') >= 0) {
    out.push(<Button key="review" kind="primary" icon="checkSquare" block label={t('review.open')} onPress={() => router.push({ pathname: '/review/[id]', params: { id: c.id } })} />);
  }
  if (c.service === 'investigation' && mine && ['assigned', 'in_field', 'returned_to_agent'].indexOf(c.status) >= 0) {
    out.push(<Button key="field" kind="primary" icon="smartphone" block label={t('caseScreen.openFieldWork')} onPress={() => router.push({ pathname: '/field/[id]', params: { id: c.id } })} />);
  }
  if (d.canOperate) {
    out.push(<Row key="ops" wrap gap={8}>
      <Button small icon="phone" label={t('collection.logAction')} onPress={() => setSheet('action')} />
      <Button small icon="calendar" label={t('collection.promise')} onPress={() => setSheet('promise')} />
      <Button small icon="banknote" label={t('collection.payment')} onPress={() => setSheet('payment')} />
    </Row>);
    if (c.status === 'active' && c.settlementAuthority && c.settlementAuthority.mode !== 'none') out.push(<Button key="settle" icon="handshake" block label={t('settlement.request')} onPress={() => setSheet('settlement')} />);
  }
  if (c.status === 'awaiting_entity_approval') out.push(<Notice key="wait" tone="warning" icon="clock" text={t('settlement.waitingEntity')} />);
  if (a.indexOf('close') >= 0 && c.service === 'collection') out.push(<Button key="close" kind="danger" block label={t('collection.closeCase')} onPress={() => setSheet('close')} />);
  if (!out.length) return null;

  const outstanding = wf.collection && c.service === 'collection' && !c.masked ? wf.collection.outstanding(c) : 0;
  const auth = c.settlementAuthority || { mode: 'none' };
  const allowed = c.allowedActions || {};
  return (
    <Card title={t('caseScreen.actions')}>
      <Stack gap={10}>{out}</Stack>
      {sheet === 'assign' ? <AgentPicker visible caseIds={[c.id]} service={c.service} governorate={c.governorate} places={c.place ? [c.place] : undefined} currentAgentId={c.agentId} onClose={() => setSheet(null)} /> : null}
      {sheet === 'action' ? <FormSheet visible title={t('collection.logAction')} def={C.COLLECTION_FORMS.action}
        intro={<Txt v="sm" c="muted">{t('collection.allowedIntro', { list: ['calls', 'messages', 'visits'].filter((k) => allowed[k]).map((k) => t('forms.collectionRequest.allowed.' + k)).join(t('common.listSep')) || '-' })}</Txt>}
        validate={(v) => (ALLOWED_BY[v.type] && !allowed[ALLOWED_BY[v.type]] ? { type: 'wf.err.actionNotAllowed' } : {})}
        submit={async (v) => {
          const payload: any = { type: v.type, note: v.note };
          if (v.type === 'field_visit') {
            // A field visit records where the agent was: the phone's location, or a simulated one in the demo.
            const fix = await locate();
            if (!fix) throw new Error(t('gps.noFixTitle'));
            payload.checkIn = await services().cases.simulateFieldVisit(c.id, fix === 'demo' ? undefined : fix);
          }
          return services().cases.logAction(c.id, payload);
        }} success={t('collection.actionLogged')} onClose={() => setSheet(null)} /> : null}
      {sheet === 'promise' ? <FormSheet visible title={t('collection.recordPromise')} def={C.COLLECTION_FORMS.promise} initial={{ amount: outstanding ? String(Math.round(outstanding * 0.3)) : '' }}
        intro={<Txt v="sm" c="muted">{t('collection.promiseIntro', { amount: money(outstanding) })}</Txt>}
        submit={(v) => services().cases.addPromise(c.id, v)} success={t('collection.promiseRecorded')} onClose={() => setSheet(null)} /> : null}
      {sheet === 'payment' ? <FormSheet visible title={t('collection.recordPayment')} def={C.COLLECTION_FORMS.payment}
        intro={<Txt v="sm" c="muted">{t('collection.paymentIntro', { amount: money(outstanding) })}</Txt>}
        validate={(v) => (+v.amount > outstanding ? { amount: 'wf.err.amountAboveOutstanding' } : {})}
        submit={(v) => services().cases.addPayment(c.id, v)} success={t('collection.paymentRecorded')} onClose={() => setSheet(null)} /> : null}
      {sheet === 'settlement' ? <FormSheet visible title={t('settlement.request')} def={C.COLLECTION_FORMS.settlement} initial={{ kind: auth.mode }}
        intro={<Notice tone="info" text={auth.mode === 'discount' ? t('settlement.authorityDiscount', { pct: auth.maxDiscountPct }) : t('settlement.authorityInstalments')} />}
        validate={(v) => (v.kind !== auth.mode ? { kind: 'wf.err.settlementKindNotAllowed' } : v.kind === 'discount' && +v.discountPct > auth.maxDiscountPct ? { discountPct: 'wf.err.discountAboveAuthority' } : {})}
        submit={(v) => services().cases.requestSettlement(c.id, v)} success={t('settlement.sent')} onClose={() => setSheet(null)} /> : null}
      {sheet === 'close' ? <FormSheet visible title={t('collection.closeCase')} def={C.COLLECTION_FORMS.close} danger submitLabel={t('collection.closeCase')}
        intro={<Notice tone="warning" text={t('collection.closeIntro')} />}
        submit={(v) => services().cases.closeCollection(c.id, v)} success={t('collection.closed')} onClose={() => setSheet(null)} /> : null}
    </Card>
  );
}
