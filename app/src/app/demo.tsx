/** Demo accounts: sign in as any provider-side user without a code (testing only). */
import { router } from 'expo-router';

import { services } from '@/backend/engine';
import { useApp, useQuery, useT } from '@/state/app';
import { Avatar, Card, Divider, ListItem, Loading, Notice, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

const ORDER = ['provider_admin', 'provider_supervisor', 'freelancer', 'agent', 'entity_admin', 'entity_credit', 'entity_operations', 'entity_collections'];

export default function Demo() {
  const t = useT();
  const { signIn } = useApp();
  const q = useQuery<any[]>(() => services().auth.listDemoUsers());
  const users = (q.data || []).filter((u) => u.portal !== 'admin');
  const groups: Record<string, any[]> = {};
  users.forEach((u) => { (groups[u.orgName] = groups[u.orgName] || []).push(u); });
  const orgs = Object.keys(groups).sort((a, b) => {
    const pa = groups[a][0].portal === 'entity' ? 1 : 0, pb = groups[b][0].portal === 'entity' ? 1 : 0;
    return pa - pb || a.localeCompare(b);
  });
  const go = async (id: string) => { await signIn(id); router.replace('/'); };
  return (
    <Screen title={t('login.demoAccounts')} back>
      <Notice tone="info" text={t('login.providersOnly')} />
      {q.loading && !q.data ? <Loading /> : orgs.map((org) => (
        <Card key={org} title={org} pad={false}>
          {groups[org].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role)).map((u, i) => (
            <Divided key={u.id} first={i === 0}>
              <ListItem left={<Avatar name={u.name} />} title={u.name} sub={t('role.' + u.role)} onPress={() => go(u.id)} />
            </Divided>
          ))}
        </Card>
      ))}
      <Txt v="xs" c="faint" center>{t('more.simulated')}</Txt>
    </Screen>
  );
}

function Divided({ first, children }: { first: boolean; children: React.ReactNode }) {
  return <>{first ? null : <Divider />}{children}</>;
}
