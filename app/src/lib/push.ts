/**
 * Push notifications with the real API: after signing in, the phone asks for permission and
 * registers its Expo push token with the server; signing out removes it.
 *
 * Push needs a real phone, a development or store build (Expo Go on Android cannot receive
 * remote push) and the EAS project id (app.json: expo.extra.eas.projectId). Without any of
 * these the app simply skips push: email and SMS still reach the person.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { icm, remoteMode } from '@/backend/engine';

let registered: string | null = null;

// Show notifications that arrive while the app is open, too.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

function projectId(): string | null {
  const extra: any = Constants.expoConfig?.extra;
  return (extra && extra.eas && extra.eas.projectId) || (Constants as any).easConfig?.projectId || null;
}

/** Register this phone for push. Quietly does nothing where push cannot work. */
export async function registerForPush(): Promise<void> {
  if (!remoteMode() || Platform.OS === 'web' || !Device.isDevice || !projectId()) return;
  try {
    if (Platform.OS === 'android') {
      // Android needs a channel before it shows the permission prompt or gives a token.
      await Notifications.setNotificationChannelAsync('default', { name: 'Mosta3lem', importance: Notifications.AndroidImportance.HIGH });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() as string });
    await icm().remote.session.registerDevice(data, Platform.OS);
    registered = data;
  } catch {
    // No push this time (no connection, Expo Go, refused): try again at the next sign-in.
  }
}

/** Before signing out: stop pushes to this phone. */
export async function unregisterPush(): Promise<void> {
  if (!registered) return;
  try { await icm().remote.session.unregisterDevice(registered); } catch { /* signing out removes it anyway */ }
  registered = null;
}
