import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppLayout';
import { Tabs } from '@/components/ui/Tabs';
import { TowerUsersPanel } from '@/pages/admin/UsersPage';
import { CrewPanel } from '@/pages/fleet/CrewPage';

type Tab = 'torre' | 'operadores' | 'custodios';

/** Usuarios: people of the tower (with permissions), operadores and custodios in one place. */
export function PeoplePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'operadores' || raw === 'custodios' ? raw : 'torre';
  const users = useStore((s) => s.users.length);
  const drivers = useStore((s) => s.crew.filter((c) => c.role === 'driver').length);
  const escorts = useStore((s) => s.crew.filter((c) => c.role === 'escort').length);

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader title="Usuarios" subtitle="Usuarios de la torre de control, operadores y custodios." />
      <Tabs<Tab>
        value={tab}
        onChange={(k) => setParams(k === 'torre' ? {} : { tab: k }, { replace: true })}
        items={[
          { key: 'torre', label: 'Usuarios de la torre', count: users },
          { key: 'operadores', label: 'Operadores', count: drivers },
          { key: 'custodios', label: 'Custodios', count: escorts },
        ]}
      />
      {tab === 'torre' && <TowerUsersPanel />}
      {tab === 'operadores' && <CrewPanel key="driver" role="driver" />}
      {tab === 'custodios' && <CrewPanel key="escort" role="escort" />}
    </div>
  );
}
