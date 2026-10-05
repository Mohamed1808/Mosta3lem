import { Redirect } from 'expo-router';

import { useApp } from '@/state/app';

/**
 * Sends each person to their part of the app: providers and agents to the provider app,
 * organisation staff to the client app,
 * applicants to their application, platform staff to a gate.
 */
export default function Index() {
  const { session } = useApp();
  if (!session) return <Redirect href="/login" />;
  if (session.portal === 'provider' || session.portal === 'agent') return <Redirect href="/home" />;
  if (session.portal === 'applicant') return <Redirect href="/application" />;
  if (session.portal === 'entity') return <Redirect href="/client" />;
  return <Redirect href="/gate" />;
}
