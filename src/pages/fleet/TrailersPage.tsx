import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Trailer } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { normalize } from '@/lib/format';
import { trailerLabel, trailersInUse } from '@/mocks/trailers';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { Modal } from '@/components/ui/Modal';
import { useTripModal } from '@/components/trip/useTripModal';
import { FleetTabs } from './FleetTabs';

const KINDS: Trailer['kind'][] = ['Chasis', 'Caja seca', 'Plataforma'];
const SIZES: Trailer['size'][] = ['20 pies', '40 pies', '53 pies'];
const BASES: Trailer['base'][] = ['Manzanillo', 'Guadalajara'];

/** Flota → Remolques y chasis (no GPS: they're registered by hand). */
export function TrailersPage() {
  const trailers = useStore((s) => s.trailers);
  const trips = useStore((s) => s.trips);
  const upsertTrailer = useStore((s) => s.upsertTrailer);
  const canCreate = useCan('fleet', 'create');
  const canEdit = useCan('fleet', 'edit');
  const { open: openTrip } = useTripModal();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Trailer | 'new' | null>(null);

  const inUse = useMemo(() => trailersInUse(trips), [trips]);
  const stateOf = (t: Trailer) => (t.status === 'maintenance' ? 'maintenance' : inUse.has(trailerLabel(t)) ? 'on_trip' : 'available');

  const rows = trailers
    .filter((t) => !kind || t.kind === kind)
    .filter((t) => !status || stateOf(t) === status)
    .filter((t) => !query.trim() || normalize(`${t.id} ${t.plate}`).includes(normalize(query.trim())));

  const kpis = [
    { value: trailers.length, label: 'Remolques y chasis' },
    { value: trailers.filter((t) => stateOf(t) === 'on_trip').length, label: 'En viaje' },
    { value: trailers.filter((t) => stateOf(t) === 'available').length, label: 'Disponibles' },
    { value: trailers.filter((t) => stateOf(t) === 'maintenance').length, label: 'En taller', tone: 'warn' as const },
  ];

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Remolques y chasis"
        subtitle="No reportan GPS, se registran aquí. Al crear un viaje solo se pueden elegir los disponibles (hasta 2 por viaje)."
        actions={
          canCreate && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
              Agregar remolque
            </Button>
          )
        }
      />

      <FleetTabs value="remolques" />
      <KpiStrip items={kpis} />

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2.5">
        <div className="w-[260px]">
          <Input leading={<Search size={14} />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar número o placa…" aria-label="Buscar número o placa" />
        </div>
        <Select
          className="w-[170px]"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Tipo"
          options={[{ value: '', label: 'Tipo: Todos' }, ...KINDS.map((k) => ({ value: k, label: `Tipo: ${k}` }))]}
        />
        <Select
          className="w-[180px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Estado"
          options={[
            { value: '', label: 'Estado: Todos' },
            { value: 'on_trip', label: 'Estado: En viaje' },
            { value: 'available', label: 'Estado: Disponible' },
            { value: 'maintenance', label: 'Estado: En taller' },
          ]}
        />
        <div className="flex-1" />
        <span className="text-[13px] text-muted">{rows.length} remolques</span>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <table className="w-full table-fixed border-collapse text-[14px]">
          <thead>
            <tr>
              <th className="th w-[130px]">Número</th>
              <th className="th w-[150px]">Tipo</th>
              <th className="th w-[120px]">Tamaño</th>
              <th className="th w-[130px]">Placa</th>
              <th className="th w-[150px]">Base</th>
              <th className="th w-[170px]">Estado</th>
              <th className="th">Viaje actual</th>
              <th className="th w-[120px]" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted">
                  Ningún remolque coincide con los filtros.
                </td>
              </tr>
            )}
            {rows.map((t) => {
              const st = stateOf(t);
              const tripId = inUse.get(trailerLabel(t));
              return (
                <tr key={t.id} className="h-11 border-b border-line-soft hover:bg-surface-alt">
                  <td className="px-3 font-mono font-bold text-ink">{t.id}</td>
                  <td className="px-3 text-body">{t.kind}</td>
                  <td className="px-3 text-body">{t.size}</td>
                  <td className="px-3 font-mono text-body">{t.plate}</td>
                  <td className="px-3 text-body">{t.base}</td>
                  <td className="px-3">
                    <span className="flex items-center gap-1.5 text-body">
                      <Dot className={st === 'on_trip' ? 'bg-primary' : st === 'available' ? 'bg-ok' : 'bg-med'} />
                      {st === 'on_trip' ? 'En viaje' : st === 'available' ? 'Disponible' : 'En taller'}
                    </span>
                  </td>
                  <td className="px-3">
                    {tripId ? (
                      <button type="button" onClick={() => openTrip(tripId)} className="font-mono font-bold text-primary hover:underline">
                        {tripId}
                      </button>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    {canEdit && (
                      <Button size="sm" onClick={() => setEditing(t)}>
                        Editar
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <TrailerModal
          trailer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            upsertTrailer(t);
            setEditing(null);
            toast.success(editing === 'new' ? `Remolque ${t.id} agregado` : `Remolque ${t.id} actualizado`);
          }}
        />
      )}
    </div>
  );
}

function TrailerModal({ trailer, onClose, onSave }: { trailer: Trailer | null; onClose: () => void; onSave: (t: Trailer) => void }) {
  const trailers = useStore((s) => s.trailers);
  const [f, setF] = useState<Trailer>(trailer ?? { id: '', kind: 'Chasis', size: '40 pies', plate: '', base: 'Manzanillo', status: 'available' });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Trailer>(k: K, v: Trailer[K]) => setF((x) => ({ ...x, [k]: v }));
  const idError = !f.id.trim() ? 'Escribe el número' : !trailer && trailers.some((t) => t.id === f.id.trim()) ? 'Ya existe ese número' : null;
  const plateError = !f.plate.trim() ? 'Escribe la placa' : null;

  const save = () => {
    setTried(true);
    if (idError || plateError) return;
    onSave({ ...f, id: f.id.trim(), plate: f.plate.trim() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={trailer ? `Remolque ${trailer.id}` : 'Agregar remolque'}
      width={560}
      footer={
        <>
          <div className="flex-1" />
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Número" required error={tried ? idError : undefined}>
          <Input mono autoFocus value={f.id} disabled={Boolean(trailer)} invalid={tried && Boolean(idError)} onChange={(e) => set('id', e.target.value.toUpperCase())} placeholder="CH-217" />
        </Field>
        <Field label="Placa" required error={tried ? plateError : undefined}>
          <Input mono value={f.plate} invalid={tried && Boolean(plateError)} onChange={(e) => set('plate', e.target.value.toUpperCase())} placeholder="00-UF-00" />
        </Field>
        <Field label="Tipo">
          <Select value={f.kind} onChange={(e) => set('kind', e.target.value as Trailer['kind'])} options={KINDS.map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Tamaño">
          <Select value={f.size} onChange={(e) => set('size', e.target.value as Trailer['size'])} options={SIZES.map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Base">
          <Select value={f.base} onChange={(e) => set('base', e.target.value as Trailer['base'])} options={BASES.map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Estado">
          <Select
            value={f.status}
            onChange={(e) => set('status', e.target.value as Trailer['status'])}
            options={[
              { value: 'available', label: 'Operativo' },
              { value: 'maintenance', label: 'En taller' },
            ]}
          />
        </Field>
      </div>
    </Modal>
  );
}
