import { Redirect } from 'expo-router';

import { useApp } from '@/state/app';

/** Sends each person to their part of the app: providers and agents to the provider app, others to a gate. */
export default function Index() {
  const { session } = useApp();
  if (!session) return <Redirect href="/login" />;
  if (session.portal === 'provider' || session.portal === 'agent') return <Redirect href="/home" />;
  return <Redirect href="/gate" />;
}
