import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Tabs } from '@/components/ui/Tabs';

/** Flota: only the fleet itself (tractos and remolques). */
export function FleetTabs({ value }: { value: 'tractos' | 'remolques' }) {
  const navigate = useNavigate();
  const units = useStore((s) => s.units.length);
  const trailers = useStore((s) => s.trailers.length);
  return (
    <Tabs
      value={value}
      onChange={(k) => navigate(k === 'tractos' ? '/flota/unidades' : '/flota/remolques')}
      items={[
        { key: 'tractos', label: 'Tractos', count: units },
        { key: 'remolques', label: 'Remolques y chasis', count: trailers },
      ]}
    />
  );
}
