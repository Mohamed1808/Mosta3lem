/**
 * The phone's location for check-ins and visit photos. Asks for permission only while the
 * app is in use (never in the background). Returns a fix, or the reason there is none, so
 * the screen can explain what to do.
 */
import * as Location from 'expo-location';

export type Fix = { lat: number; lng: number; accuracyM: number | null; at: number };
export type FixResult = { fix: Fix } | { error: 'denied' | 'off' | 'unavailable' };

const TIMEOUT_MS = 15000;

function toFix(p: Location.LocationObject): Fix {
  return { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy == null ? null : Math.round(p.coords.accuracy), at: p.timestamp || Date.now() };
}

/** A fresh, precise location. Falls back to the last known one if the phone is slow to answer. */
export async function getFix(): Promise<FixResult> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return { error: 'denied' };
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { error: 'off' };
  } catch { /* not supported everywhere; try anyway */ }
  try {
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    if (p) return { fix: toFix(p) };
  } catch { /* fall through to the last known position */ }
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (last) return { fix: toFix(last) };
  } catch { /* ignore */ }
  return { error: 'unavailable' };
}

/** Accuracy worse than this (metres) is shown as a weak signal. */
export const WEAK_ACCURACY_M = 100;

/** A quick location for stamping photos: the last known one if recent, else a balanced fix. */
export async function getQuickFix(): Promise<Fix | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 });
    if (last) return toFix(last);
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ]);
    return p ? toFix(p) : null;
  } catch { return null; }
}
