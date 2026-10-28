import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Unit } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { fmtNumber, fmtTime, normalize } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Chip, Dot } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Field';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { useTripModal } from '@/components/trip/useTripModal';
import { EditUnitModal } from './EditUnitModal';
import { SIGNAL_META } from './fleetMeta';
import { FleetTabs } from './FleetTabs';

const STATUS_META: Record<Exclude<Unit['status'], 'new'>, { label: string; dot: string }> = {
  on_trip: { label: 'En viaje', dot: 'bg-primary' },
  available: { label: 'Disponible', dot: 'bg-ok' },
  maintenance: { label: 'En taller', dot: 'bg-med' },
};

export function UnitsPage() {
  const units = useStore((s) => s.units);
  const syncedAt = useStore((s) => s.unitsSyncedAt);
  const syncUnits = useStore((s) => s.syncUnits);
  const { open: openTrip } = useTripModal();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [signal, setSignal] = useState('');
  const [base, setBase] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const canEdit = useCan('fleet', 'edit');

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return units
      .filter((u) => !q || normalize(`${u.economic ?? ''} ${u.plate} ${u.gps.deviceId}`).includes(q))
      .filter((u) => !status || u.status === status)
      .filter((u) => !signal || u.gps.signal === signal)
      .filter((u) => !base || (base === 'none' ? !u.base : u.base === base))
      .sort((a, b) => (a.economic ? 0 : 1) - (b.economic ? 0 : 1) || (a.economic ?? a.plate).localeCompare(b.economic ?? b.plate));
  }, [units, query, status, signal, base]);

  const kpis = [
    { value: units.length, label: 'Tractos sincronizados' },
    { value: units.filter((u) => u.status === 'on_trip').length, label: 'En viaje' },
    { value: units.filter((u) => u.status === 'available').length, label: 'Disponibles' },
    { value: units.filter((u) => u.status === 'maintenance').length, label: 'En taller' },
    { value: units.filter((u) => u.gps.signal !== 'online').length, label: 'GPS con falla o sin señal', tone: 'crit' as const },
    { value: units.filter((u) => u.status === 'new').length, label: 'Nuevas en el GPS sin económico', tone: 'warn' as const },
  ];

  const sync = () => {
    setSyncing(true);
    setTimeout(() => {
      syncUnits();
      setSyncing(false);
      toast.success('Sincronización completa', { description: `${units.length} unidades leídas de Wialon, Samsara y Geotab · sin cambios de placa ni VIN.` });
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Unidades"
        subtitle="No se dan de alta una por una: se consumen de la API del proveedor GPS. Aquí solo se completan datos operativos (económico, base, estado)."
        actions={
          <>
            <span className="mr-2 flex items-center gap-1.5 text-[13px] text-body">
              <Dot className="bg-ok" />
              Última sincronización: hoy {fmtTime(syncedAt)} h · Wialon
            </span>
            <Button icon={<RefreshCw size={14} className={clsx(syncing && 'animate-spin')} />} onClick={sync} disabled={syncing}>
              {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Button>
          </>
        }
      />

      <FleetTabs value="tractos" />

      <KpiStrip items={kpis} />

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2.5">
        <div className="relative w-[260px]">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar económico, placa, ID GPS…"
            aria-label="Buscar económico, placa o ID GPS"
            className="h-[34px] w-full rounded-[4px] border border-input pr-2 pl-8 text-[14px] placeholder:text-faint focus:border-primary focus:outline-none"
          />
        </div>
        <Select
          className="w-[170px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Estado"
          options={[
            { value: '', label: 'Estado: Todos' },
            { value: 'on_trip', label: 'Estado: En viaje' },
            { value: 'available', label: 'Estado: Disponible' },
            { value: 'maintenance', label: 'Estado: En taller' },
            { value: 'new', label: 'Estado: Nueva' },
          ]}
        />
        <Select
          className="w-[170px]"
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
          aria-label="Señal"
          options={[{ value: '', label: 'Señal: Todas' }, ...Object.entries(SIGNAL_META).map(([k, v]) => ({ value: k, label: `Señal: ${v.label}` }))]}
        />
        <Select
          className="w-[170px]"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          aria-label="Base"
          options={[
            { value: '', label: 'Base: Todas' },
            { value: 'Manzanillo', label: 'Base: Manzanillo' },
            { value: 'Guadalajara', label: 'Base: Guadalajara' },
            { value: 'none', label: 'Base: Sin asignar' },
          ]}
        />
        <div className="flex-1" />
        <span className="text-[13px] text-muted">{rows.length} unidades</span>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="th w-[110px]">Económico</th>
              <th className="th w-[110px]">Placa</th>
              <th className="th w-[220px]">Origen GPS</th>
              <th className="th w-[120px]">Señal</th>
              <th className="th w-[240px]">Marca / modelo</th>
              <th className="th w-[170px]">Estado</th>
              <th className="th w-[170px]">Viaje actual</th>
              <th className="th w-[110px]">Base</th>
              <th className="th w-[110px]">Odómetro</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted">
                  Ninguna unidad coincide con los filtros.
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const sig = SIGNAL_META[u.gps.signal];
              const isNew = u.status === 'new';
              return (
                <tr key={u.id} className={clsx('h-10 border-b border-line-soft', isNew ? 'bg-[#fffdf5]' : 'hover:bg-surface-alt')}>
                  <td className={clsx('px-3 font-mono font-bold', u.economic ? 'text-ink' : 'text-faint')}>{u.economic ?? '—'}</td>
                  <td className="px-3 font-mono">{u.plate}</td>
                  <td className="truncate px-3 text-body">
                    {u.gps.provider} · <span className="font-mono text-[13px]">{u.gps.deviceId}</span>
                  </td>
                  <td className={clsx('px-3', sig.text)}>
                    <span className="flex items-center gap-1.5">
                      <Dot className={sig.dot} />
                      {sig.label}
                    </span>
                  </td>
                  <td className="truncate px-3 text-body">{u.model}</td>
                  <td className="px-3">
                    {isNew ? (
                      <Chip tone="warn">Nueva · sin económico</Chip>
                    ) : (
                      <span className="flex items-center gap-1.5 text-body">
                        <Dot className={STATUS_META[u.status as keyof typeof STATUS_META].dot} />
                        {STATUS_META[u.status as keyof typeof STATUS_META].label}
                      </span>
                    )}
                  </td>
                  <td className="px-3">
                    {u.currentTripId ? (
                      <button type="button" onClick={() => openTrip(u.currentTripId!)} className="font-mono font-bold whitespace-nowrap text-primary hover:underline">
                        {u.currentTripId}
                      </button>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className={clsx('px-3', u.base ? 'text-body' : 'text-faint')}>{u.base ?? '—'}</td>
                  <td className="px-3 font-mono text-[13px] text-body">{fmtNumber(u.odometerKm)} km</td>
                  <td className="px-3 text-right">
                    {canEdit && (
                      <Button size="sm" variant={isNew ? 'primary' : 'secondary'} onClick={() => setEditing(u)}>
                        {isNew ? 'Completar datos' : 'Editar datos'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InfoBanner>
        Solo son editables: número económico, base, estado operativo y notas. Placa, VIN, ID del dispositivo y telemetría vienen del proveedor GPS y se
        actualizan en cada sincronización. Integraciones soportadas en el prototipo: Wialon, Samsara, Geotab (validar con el cliente cuál usa).
      </InfoBanner>

      {editing && <EditUnitModal unit={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
