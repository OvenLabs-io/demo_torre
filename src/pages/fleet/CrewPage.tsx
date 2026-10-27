import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Phone, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { CrewMember } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { daysUntil, fmtDate, initials, normalize } from '@/lib/format';
import { crewName } from '@/mocks/crew';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Chip, Dot } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Field';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { Tabs } from '@/components/ui/Tabs';
import { useTripModal } from '@/components/trip/useTripModal';
import { CrewModal } from './CrewModal';
import { CREW_STATUS_META } from './fleetMeta';

type Tab = 'all' | 'driver' | 'escort';
type Expiry = 'ok' | 'soon' | 'expired';

function expiryState(ts: number | undefined, now: number): Expiry | null {
  if (ts === undefined) return null;
  const d = daysUntil(ts, now);
  return d < 0 ? 'expired' : d <= 15 ? 'soon' : 'ok';
}

function worstExpiry(m: CrewMember, now: number): Expiry {
  const states = [expiryState(m.license.expiresOn, now), expiryState(m.medicalExpiresOn, now)];
  return states.includes('expired') ? 'expired' : states.includes('soon') ? 'soon' : 'ok';
}

export function CrewPage() {
  const crew = useStore((s) => s.crew);
  const now = useNow();
  const { open: openTrip } = useTripModal();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [expiry, setExpiry] = useState('');
  const [availability, setAvailability] = useState('');
  const [editing, setEditing] = useState<CrewMember | 'new' | null>(null);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return crew
      .filter((m) => tab === 'all' || m.role === tab)
      .filter((m) => !role || m.role === role)
      .filter((m) => !expiry || worstExpiry(m, now) === expiry)
      .filter((m) => !availability || m.status === availability)
      .filter((m) => !q || normalize(`${crewName(m)} ${m.license.number} ${m.phone}`).includes(q));
  }, [crew, tab, role, expiry, availability, query, now]);

  const drivers = crew.filter((m) => m.role === 'driver');
  const escorts = crew.filter((m) => m.role === 'escort');
  const kpis = [
    { value: drivers.length, label: 'Operadores' },
    { value: escorts.length, label: 'Custodios' },
    { value: crew.filter((m) => worstExpiry(m, now) === 'soon').length, label: 'Con vigencia por vencer (≤ 15 d)', tone: 'warn' as const },
    { value: crew.filter((m) => worstExpiry(m, now) === 'expired').length, label: 'Con documento vencido', tone: 'crit' as const },
    { value: crew.filter((m) => m.status !== 'available').length, label: 'En viaje ahora' },
  ];

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Operadores y custodios"
        subtitle="Personal que acompaña la unidad: operadores (conducen) y custodios (escoltan). Vigencias y contacto para que la torre pueda llamarlos."
        actions={
          <>
            <Button icon={<Upload size={14} />} onClick={() => toast('Disponible próximamente', { description: 'Importar personal desde un CSV.' })}>
              Importar CSV
            </Button>
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setEditing('new')}>
              Agregar persona
            </Button>
          </>
        }
      />

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { key: 'all', label: `Todos (${crew.length})` },
          { key: 'driver', label: `Operadores (${drivers.length})` },
          { key: 'escort', label: `Custodios (${escorts.length})` },
        ]}
      />

      <KpiStrip items={kpis} />

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2.5">
        <div className="relative w-[260px]">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, licencia, teléfono…"
            aria-label="Buscar nombre, licencia o teléfono"
            className="h-[30px] w-full rounded-[4px] border border-input pr-2 pl-8 text-[12px] placeholder:text-faint focus:border-primary focus:outline-none"
          />
        </div>
        <Select
          className="w-[150px]"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Rol"
          options={[
            { value: '', label: 'Rol: Todos' },
            { value: 'driver', label: 'Rol: Operador' },
            { value: 'escort', label: 'Rol: Custodio' },
          ]}
        />
        <Select
          className="w-[180px]"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          aria-label="Vigencias"
          options={[
            { value: '', label: 'Vigencias: Todas' },
            { value: 'soon', label: 'Vigencias: Por vencer' },
            { value: 'expired', label: 'Vigencias: Vencidas' },
            { value: 'ok', label: 'Vigencias: Vigentes' },
          ]}
        />
        <Select
          className="w-[170px]"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label="Disponibilidad"
          options={[{ value: '', label: 'Disponibilidad' }, ...Object.entries(CREW_STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <div className="flex-1" />
        <span className="text-[11px] text-muted">{rows.length} personas</span>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1386px] table-fixed border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="th w-[46px]" aria-label="Avatar" />
                <th className="th w-[162px]">Nombre</th>
                <th className="th w-[80px]">Rol</th>
                <th className="th w-[110px]">Teléfono</th>
                <th className="th w-[168px]">Licencia / credencial</th>
                <th className="th w-[100px]">Vigencia</th>
                <th className="th w-[100px]">Apto médico</th>
                <th className="th w-[150px]">Proveedor</th>
                <th className="th w-[160px]">Estado</th>
                <th className="th w-[170px]">Unidad / viaje</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-muted">
                    Nadie coincide con los filtros.
                  </td>
                </tr>
              )}
              {rows.map((m) => {
                const st = CREW_STATUS_META[m.status];
                const driver = m.role === 'driver';
                const a = m.assignment;
                return (
                  <tr key={m.id} className="h-10 border-b border-line-soft hover:bg-surface-alt">
                    <td className="px-3">
                      <span className={clsx('flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-white', driver ? 'bg-primary' : 'bg-high')}>
                        {initials(crewName(m))}
                      </span>
                    </td>
                    <td className="truncate px-3 text-ink">{crewName(m)}</td>
                    <td className="px-3">
                      <Chip tone={driver ? 'primary' : 'high'}>{driver ? 'Operador' : 'Custodio'}</Chip>
                    </td>
                    <td className="px-3 font-mono text-[11px] whitespace-nowrap text-body">{m.phone}</td>
                    <td className="truncate px-3 text-body">
                      {m.license.kind} · <span className="font-mono text-[11px]">{m.license.number}</span>
                    </td>
                    <td className="px-3">
                      <ExpiryCell ts={m.license.expiresOn} now={now} />
                    </td>
                    <td className="px-3">
                      <ExpiryCell ts={m.medicalExpiresOn} now={now} />
                    </td>
                    <td className="truncate px-3 text-body">{m.provider}</td>
                    <td className={clsx('px-3', st.text)}>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Dot className={st.dot} />
                        {st.label}
                      </span>
                    </td>
                    <td className="truncate px-3 font-mono text-[10px] text-primary">
                      {a?.tripId ? (
                        <button type="button" onClick={() => openTrip(a.tripId!)} className="hover:underline">
                          {a.unitId ? `${a.unitId} · ` : ''}
                          {a.tripId}
                          {a.note ? ` · ${a.note}` : ''}
                        </button>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" icon={<Phone size={12} />} onClick={() => toast(`Llamando a ${crewName(m)}…`, { description: m.phone })}>
                          Llamar
                        </Button>
                        <Button size="sm" onClick={() => setEditing(m)}>
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InfoBanner>
        Pregunta de validación: ¿los custodios son personal propio o de un proveedor externo? Si son externos, aquí solo se registra el proveedor y el
        contacto del custodio asignado por viaje.
      </InfoBanner>

      {editing && <CrewModal member={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ExpiryCell({ ts, now }: { ts?: number; now: number }) {
  if (ts === undefined) return <span className="text-faint">—</span>;
  const s = expiryState(ts, now);
  const text = fmtDate(ts, true);
  if (s === 'expired') return <Chip tone="crit" mono>{text}</Chip>;
  if (s === 'soon') return <Chip tone="warn" mono>{text}</Chip>;
  return <span className="font-mono text-[11px] text-body">{text}</span>;
}
