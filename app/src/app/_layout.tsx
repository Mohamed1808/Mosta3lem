import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/state/app';
import { OfflineProvider } from '@/sync/offline';
import { colors } from '@/theme';
import { Loading, Txt } from '@/ui/core';
import { DialogProvider } from '@/ui/dialogs';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <OfflineProvider>
        <DialogProvider>
          <StatusBar style="dark" />
          <Navigator />
        </DialogProvider>
        </OfflineProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const { ready, error, session } = useApp();
  useEffect(() => { if (ready || error) SplashScreen.hideAsync().catch(() => undefined); }, [ready, error]);
  if (error) return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}><Txt c="bad">{error}</Txt></View>;
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><Loading /></View>;
  const signedIn = !!session;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="demo" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="application" />
        <Stack.Screen name="application-edit" />
        <Stack.Screen name="(provider)" />
        <Stack.Screen name="client" />
        <Stack.Screen name="request/[id]" />
        <Stack.Screen name="select/[id]" />
        <Stack.Screen name="bulk" />
        <Stack.Screen name="batches" />
        <Stack.Screen name="batch/[id]" />
        <Stack.Screen name="client-ratings" />
        <Stack.Screen name="rate-batch/[id]" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="gate" />
        <Stack.Screen name="case/[id]" />
        <Stack.Screen name="field/[id]" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="assign" />
        <Stack.Screen name="review-queue" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="ratings" />
        <Stack.Screen name="disputes" />
        <Stack.Screen name="dispute/[id]" />
        <Stack.Screen name="rate-clients" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="my-work" />
        <Stack.Screen name="sync" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/coverage" />
        <Stack.Screen name="settings/response" />
        <Stack.Screen name="settings/prices" />
        <Stack.Screen name="settings/documents" />
      </Stack.Protected>
    </Stack>
  );
}
