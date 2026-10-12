/**
 * The morning summary email (organisation users): turn it on or off, and see what it would
 * say right now. The server sends it each morning; it carries reference numbers and counts,
 * never customers' names.
 */
import { services } from '@/backend/engine';
import { useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Loading, Notice, Stack, Txt } from '@/ui/core';
import { useAction } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function DailySummary() {
  const t = useT();
  const run = useAction();
  const q = useQuery<any>(() => services().digest.mine());
  if (!q.data) return <Screen title={t('summary.title')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  const d = q.data;
  return (
    <Screen title={t('summary.title')} sub={t('summary.sub')} back>
      <Card>
        <Stack>
          <Txt>{d.enabled ? t('summary.on', { email: d.email }) : t('summary.off')}</Txt>
          <Button kind={d.enabled ? 'secondary' : 'primary'} block label={d.enabled ? t('summary.turnOff') : t('summary.turnOn')}
            onPress={() => run(() => services().digest.setEnabled(!d.enabled), d.enabled ? t('summary.turnedOff') : t('summary.turnedOn'))} />
        </Stack>
      </Card>
      <Card title={t('summary.preview')}>
        {d.text ? (
          <Txt v="sm" style={{ backgroundColor: colors.surface2, borderRadius: radius.md, padding: space.md }}>{d.text}</Txt>
        ) : <Txt v="sm" c="muted">{t('summary.nothing')}</Txt>}
      </Card>
    </Screen>
  );
}
