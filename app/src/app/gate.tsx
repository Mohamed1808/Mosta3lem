/** Shown to signed-in people whose part of the app is not built yet (banks and platform staff). */
import { router } from 'expo-router';
import { View } from 'react-native';

import { useApp, useT } from '@/state/app';
import { space } from '@/theme';
import { Button, Icon, Stack, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Gate() {
  const t = useT();
  const { session, signOut } = useApp();
  const kind = session?.portal === 'admin' ? 'admin' : 'requester';
  return (
    <Screen title={t('app.name')}>
      <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <Stack style={{ alignItems: 'center', maxWidth: 420 }}>
          <Icon name={kind === 'requester' ? 'building' : 'shield'} size={40} />
          <Txt v="h2" center>{t('gate.' + kind + 'Title')}</Txt>
          <Txt c="muted" center>{t('gate.' + kind + 'Body')}</Txt>
          <Txt v="sm" c="faint" center>{session?.user?.name}</Txt>
          <Button label={t('more.signOut')} icon="logout" onPress={async () => { await signOut(); router.replace('/login'); }} />
        </Stack>
      </View>
    </Screen>
  );
}
