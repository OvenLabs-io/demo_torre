import { ChevronDown, LayoutList, Map } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { Chip } from '@/components/ui/Chip';
import { PageHeader } from '@/components/layout/AppLayout';

/** Shared header of Torre de control (Lista / Mapa). */
export function TowerHeader({ view, subtitle }: { view: 'list' | 'map'; subtitle: string }) {
  const count = useStore((s) => s.trips.length);
  const lastTickAt = useStore((s) => s.lastTickAt);
  const now = useNow();
  const ago = Math.max(0, Math.round((now - lastTickAt) / 1000));
  const Icon = view === 'list' ? LayoutList : Map;

  return (
    <PageHeader
      title="Torre de control"
      badges={
        <>
          <Chip tone="ok" mono className="text-[10px]">
            {count} {count === 1 ? 'viaje activo' : 'viajes activos'}
          </Chip>
          <span className="flex items-center gap-1.5 text-[11px] text-body">
            <span className="size-2 animate-live-pulse rounded-full bg-live" />
            En vivo · actualizado hace {ago} s
          </span>
        </>
      }
      subtitle={subtitle}
      actions={
        <div className="flex h-[30px] items-center gap-2 rounded-[4px] border border-line bg-white px-3 text-[12px]">
          <Icon size={14} className="text-faint" />
          <span className="text-body">Vista: {view === 'list' ? 'Lista' : 'Mapa'}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-faint">
            · cambia desde Torre de control <ChevronDown size={10} />
          </span>
        </div>
      }
    />
  );
}
