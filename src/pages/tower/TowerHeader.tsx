import { useNavigate } from 'react-router-dom';
import { LayoutList, Map, UsersRound } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { Chip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/AppLayout';

export type TowerView = 'list' | 'map' | 'groups';

const VIEW_PATH: Record<TowerView, string> = { list: '/', map: '/mapa', groups: '/torre/grupos' };

/** Shared header of Torre de control with the Lista / Mapa / Grupos switch. */
export function TowerHeader({ view, subtitle }: { view: TowerView; subtitle: string }) {
  const navigate = useNavigate();
  const count = useStore((s) => s.trips.length);
  const groups = useStore((s) => s.tripGroups.length);
  const lastTickAt = useStore((s) => s.lastTickAt);
  const now = useNow();
  const ago = Math.max(0, Math.round((now - lastTickAt) / 1000));

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Torre de control"
        badges={
          <>
            <Chip tone="ok" mono className="text-[12px]">
              {count} {count === 1 ? 'viaje activo' : 'viajes activos'}
            </Chip>
            <span className="flex items-center gap-1.5 text-[13px] text-body">
              <span className="size-2 animate-live-pulse rounded-full bg-live" />
              En vivo · actualizado hace {ago} s
            </span>
          </>
        }
        subtitle={subtitle}
      />
      <Tabs<TowerView>
        value={view}
        onChange={(v) => navigate(VIEW_PATH[v])}
        items={[
          { key: 'list', label: <TabLabel icon={<LayoutList size={15} />} text="Lista" /> },
          { key: 'map', label: <TabLabel icon={<Map size={15} />} text="Mapa" /> },
          { key: 'groups', label: <TabLabel icon={<UsersRound size={15} />} text="Grupos de viaje" />, count: groups },
        ]}
      />
    </div>
  );
}

function TabLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}
