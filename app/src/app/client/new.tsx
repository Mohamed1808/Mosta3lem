/** New request tab: pick the service (when the role covers both), then fill in the request. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { icm } from '@/backend/engine';
import { RequestForm } from '@/components/requestForm';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Grow, Icon, Row, Stack, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function NewRequest() {
  const t = useT();
  const { session } = useApp();
  const role = session?.user?.role || '';
  const covered = ['investigation', 'collection'].filter((s) => icm().wf.entityServes(role, s));
  const [picked, setPicked] = useState<string | null>(null);
  const service = covered.length === 1 ? covered[0] : picked;

  if (!service) {
    return (
      <Screen title={t('nav.newRequest')} sub={t('request.subtitle')}>
        <Stack>
          {covered.map((s) => (
            <Pressable key={s} onPress={() => setPicked(s)} accessibilityRole="button" accessibilityLabel={t('service.' + s)}
              style={({ pressed }) => ({ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, backgroundColor: pressed ? colors.surface2 : colors.surface })}>
              <Row gap={12}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s === 'investigation' ? 'search' : 'coins'} color={colors.accent} size={22} />
                </View>
                <Grow>
                  <Txt v="h3">{t('service.' + s)}</Txt>
                  <Txt v="sm" c="muted">{t('request.serviceHint.' + s)}</Txt>
                </Grow>
                <Icon name="chevronRight" />
              </Row>
            </Pressable>
          ))}
        </Stack>
      </Screen>
    );
  }
  return (
    <Screen title={t('request.newTitle', { service: t('service.' + service) })} sub={t('request.formSubtitle')}
      right={covered.length > 1 ? <Button small kind="ghost" label={t('request.changeService')} onPress={() => setPicked(null)} /> : undefined}>
      <RequestForm key={service} service={service} />
    </Screen>
  );
}
