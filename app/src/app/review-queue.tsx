/** Reports waiting for this supervisor (only their own agents' reports). */
import { router } from 'expo-router';

import { services } from '@/backend/engine';
import { CaseList } from '@/components/case';
import { useQuery, useT } from '@/state/app';
import { Loading, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function ReviewQueue() {
  const t = useT();
  const q = useQuery<any[]>(() => services().cases.reviewQueue());
  return (
    <Screen title={t('nav.reviewQueue')} back>
      <Txt v="sm" c="muted">{t('review.subtitle')}</Txt>
      {q.loading && !q.data ? <Loading /> : <CaseList rows={q.data || []} empty={t('review.empty')} onOpen={(c) => router.push({ pathname: '/review/[id]', params: { id: c.id } })} />}
    </Screen>
  );
}
