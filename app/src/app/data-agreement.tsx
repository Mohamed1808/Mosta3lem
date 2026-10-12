/**
 * The data processing agreement between the organisation and Mosta3lem: the organisation
 * decides which customers' data to send and has the legal basis for it; Mosta3lem processes
 * it only to carry out the organisation's requests. The Admin accepts it once per version;
 * until then no case goes to a provider (errors.dpaRequired).
 */
import { icm, services } from '@/backend/engine';
import { date, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { Button, Card, Loading, Notice, Stack, Txt } from '@/ui/core';
import { useAction } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const POINTS = ['dpa.point1', 'dpa.point2', 'dpa.point3', 'dpa.point4', 'dpa.point5', 'dpa.point6'];

export default function DataAgreement() {
  const t = useT();
  const { session } = useApp();
  const run = useAction();
  const admin = session?.user?.role === 'entity_admin';
  const org = useQuery<any>(() => services().entities.mine());
  const cfg = useQuery<any>(() => services().config.get());
  if (!org.data || !cfg.data) return <Screen title={t('dpa.title')} back><Loading /></Screen>;
  const P = icm().wf.privacy;
  const s = P.settings(cfg.data);
  const e = org.data;
  return (
    <Screen title={t('dpa.title')} sub={t('dpa.version', { v: P.DPA_VERSION })} back>
      {e.dpaCurrent ? <Notice tone="success" text={t('dpa.accepted', { date: date(e.dpa.at), name: e.dpa.byName || '-' })} />
        : <Notice tone="warning" icon="lock" text={admin ? t('dpa.needed') : t('dpa.adminOnly')} />}
      <Card>
        <Stack gap={12}>
          <Txt>{t('dpa.intro')}</Txt>
          {POINTS.map((k) => (
            <Txt key={k} v="sm">{'• ' + t(k, { photos: num(s.photosDays), personal: num(s.personalDays) })}</Txt>
          ))}
          <Txt v="xs" c="muted">{t('dpa.summaryNote')}</Txt>
        </Stack>
      </Card>
      {admin && !e.dpaCurrent ? (
        <Button kind="primary" block label={t('dpa.accept', { org: e.name })}
          onPress={() => run(() => services().entities.acceptDpa(), t('dpa.done'))} />
      ) : null}
    </Screen>
  );
}
