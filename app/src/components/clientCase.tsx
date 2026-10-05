/**
 * What the client can do on one of its cases: accept a delivered report or ask for
 * rework, approve or reject a settlement, record its own decision on the customer,
 * recall or cancel. Rating the provider and raising disputes come with step 5.
 */
import { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { icm, services } from '@/backend/engine';
import { duration, listLabel, money } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Button, Card, Notice, Row, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';

const DECISION_TONE: Record<string, string> = { APPROVED: colors.ok, REJECTED: colors.bad, PENDING: colors.warn };

export function ClientActions({ d }: { d: any }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const c = d.case, a: string[] = d.actions || [];
  const go = (action: string, payload: any, success: string) => run(() => services().cases.transition(c.id, action, payload), success);
  const out: ReactNode[] = [];

  if (c.status === 'draft' || a.indexOf('send_offer') >= 0) {
    if (c.status === 'declined') {
      const reason = c.lastDecline ? listLabel('declineReasons', c.lastDecline.reason) : '-';
      out.push(<Notice key="declined" tone="warning" text={t('case.declinedNotice', { reason })} />);
    }
    if (c.status === 'expired') out.push(<Notice key="expired" tone="warning" text={t('case.expiredNotice')} />);
    out.push(<Notice key="next" tone="info" text={t('client.chooseProviderNext')} />);
  }
  if (c.status === 'awaiting_acceptance') {
    const name = d.provider ? d.provider.name : c.providerName || '';
    const left = d.offer ? ' ' + t('offers.expiresIn', { time: duration(Math.max(0, d.offer.remaining)) }) : '';
    out.push(<Notice key="awaiting" tone="info" icon="clock" text={t('case.awaitingNotice', { name }) + left} />);
  }
  if (a.indexOf('accept_report') >= 0) {
    out.push(<Button key="accept" kind="primary" icon="check" block label={t('action.accept_report')} onPress={async () => {
      if (await ask({ title: t('case.acceptReportTitle'), message: t('case.acceptReportBody'), confirmLabel: t('action.accept_report') })) await go('accept_report', {}, t('case.reportAccepted'));
    }} />);
    out.push(<Button key="rework" icon="repeat" block label={t('action.request_rework')} onPress={async () => {
      const v = await ask({ title: t('action.request_rework'), message: t('case.reworkBody'), note: 'required', noteLabel: t('case.reworkReasonLabel'), confirmLabel: t('action.request_rework') });
      if (v) await go('request_rework', { reason: v.note }, t('case.reworkSent'));
    }} />);
  }
  if (a.indexOf('approve_settlement') >= 0) {
    const s = (c.settlements || []).find((x: any) => x.status === 'pending');
    if (s) {
      out.push(
        <Notice key="settlement" tone="warning" icon="handshake">
          <Stack gap={4}>
            <Txt b>{s.kind === 'discount' ? t('settlement.discountText', { pct: s.discountPct }) : t('settlement.instalmentsText', { count: s.instalmentCount })}</Txt>
            {s.note ? <Txt v="sm">{s.note}</Txt> : null}
            {s.kind === 'discount' ? <Txt v="sm" c="muted">{t('settlement.newTarget', { amount: money(Math.round(c.overdueAmount * (1 - s.discountPct / 100))) })}</Txt> : null}
          </Stack>
        </Notice>
      );
    }
    out.push(<Button key="approveS" kind="primary" block label={t('action.approve_settlement')} onPress={async () => {
      const v = await ask({ title: t('action.approve_settlement'), message: t('settlement.approveBody'), note: 'optional', confirmLabel: t('action.approve_settlement') });
      if (v) await go('approve_settlement', { note: v.note }, t('settlement.approved'));
    }} />);
    out.push(<Button key="rejectS" block label={t('action.reject_settlement')} onPress={async () => {
      const v = await ask({ title: t('action.reject_settlement'), note: 'required', noteLabel: t('common.reason'), danger: true, confirmLabel: t('action.reject_settlement') });
      if (v) await go('reject_settlement', { reason: v.note }, t('settlement.rejected'));
    }} />);
  }
  if (c.service === 'investigation' && ['delivered', 'accepted_by_entity', 'closed'].indexOf(c.status) >= 0) out.push(<Decision key="decision" c={c} />);
  if (a.indexOf('recall') >= 0) {
    out.push(<Button key="recall" kind="danger" block label={t('action.recall')} onPress={async () => {
      const v = await ask({ title: t('action.recall'), message: t('case.recallBody'), note: 'required', noteLabel: t('common.reason'), danger: true, confirmLabel: t('action.recall') });
      if (v) await go('recall', { reason: v.note }, t('case.recalled'));
    }} />);
  }
  if (a.indexOf('cancel') >= 0) {
    out.push(<Button key="cancel" kind="danger" block label={t('action.cancel')} onPress={async () => {
      const v = await ask({ title: t('action.cancel'), message: t('case.cancelBody'), note: 'optional', noteLabel: t('common.reason'), danger: true, confirmLabel: t('action.cancel') });
      if (v) await go('cancel', { reason: v.note }, t('case.cancelled'));
    }} />);
  }
  if (!out.length) return null;
  return <Card title={t('caseScreen.actions')}><Stack gap={10}>{out}</Stack></Card>;
}

/** The client's own decision on the customer after reading the report (kept for its team and the Excel export). */
function Decision({ c }: { c: any }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const cur = c.clientDecision ? c.clientDecision.value : 'PENDING';
  const pick = async (dv: string) => {
    if (dv === cur) return;
    const v = await ask({ title: t('decision.setTitle', { decision: t('decision.' + dv) }), message: t('decision.setBody'), note: dv === 'REJECTED' ? 'required' : 'optional', danger: dv === 'REJECTED', confirmLabel: t('common.confirm') });
    if (v) await run(() => services().cases.setClientDecision(c.id, dv, v.note), t('decision.saved'));
  };
  return (
    <Stack gap={8}>
      <Txt v="sm" b c="muted">{t('decision.title')}</Txt>
      <Row gap={8}>
        {(icm().config.CLIENT_DECISIONS as string[]).map((dv) => {
          const on = cur === dv;
          return (
            <Pressable key={dv} onPress={() => pick(dv)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={t('decision.' + dv)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? DECISION_TONE[dv] : colors.border, backgroundColor: on ? colors.surface2 : colors.surface }}>
              <Txt b={on} style={{ color: on ? DECISION_TONE[dv] : colors.text2 }}>{t('decision.' + dv)}</Txt>
            </Pressable>
          );
        })}
      </Row>
      {c.clientDecision && c.clientDecision.note ? <Txt v="sm" c="muted">{c.clientDecision.note}</Txt> : null}
      <Txt v="xs" c="faint">{t('decision.hint')}</Txt>
    </Stack>
  );
}
