/**
 * Get the phone's location for a check-in or a field visit. When there is none (permission
 * refused, location off, no signal), explain what to do. While the app runs on simulated
 * data, the person may continue with a simulated location instead; that choice is recorded.
 */
import { useCallback } from 'react';

import { Fix, getFix, WEAK_ACCURACY_M } from '@/lib/location';
import { useT } from '@/state/app';
import { useDialog } from '@/ui/dialogs';

/** Resolves to a fix, 'demo' (use a simulated location), or null (cancelled). */
export function useLocate() {
  const t = useT();
  const { ask, toast } = useDialog();
  return useCallback(async (): Promise<Fix | 'demo' | null> => {
    const r = await getFix();
    if ('fix' in r) {
      if (r.fix.accuracyM != null && r.fix.accuracyM > WEAK_ACCURACY_M) toast(t('gps.weak', { n: r.fix.accuracyM }), 'danger');
      return r.fix;
    }
    const ok = await ask({ title: t('gps.noFixTitle'), message: t('gps.err.' + r.error) + '\n\n' + t('gps.demoBody'), confirmLabel: t('gps.useDemo') });
    return ok ? 'demo' : null;
  }, [ask, toast, t]);
}
