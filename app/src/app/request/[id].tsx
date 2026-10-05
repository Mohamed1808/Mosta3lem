/** Edit a saved draft request, then continue to provider selection. */
import { useLocalSearchParams } from 'expo-router';

import { services } from '@/backend/engine';
import { RequestForm } from '@/components/requestForm';
import { useQuery, useT } from '@/state/app';
import { Loading, Notice } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function EditDraft() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const q = useQuery<any>(() => services().cases.get(id), [id]);
  const c = q.data && q.data.case;
  return (
    <Screen title={c ? t('request.editDraft', { ref: c.ref }) : t('nav.newRequest')} sub={t('request.formSubtitle')} back>
      {!c ? <Loading /> : c.status !== 'draft' ? <Notice tone="warning" text={t('errors.notEditable')} /> : <RequestForm service={c.service} draft={c} />}
    </Screen>
  );
}
