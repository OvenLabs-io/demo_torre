import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Trip } from '@/types/domain';
import { shortUserName, useCan, useStore } from '@/store/useStore';
import { maxSeverity, SEVERITY_RANK, SEVERITY_STYLE } from '@/lib/severity';
import { legText } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';
import { Button } from '@/components/ui/Button';
import { Chip, Dot, SeverityChip } from '@/components/ui/Chip';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTripModal } from '@/components/trip/useTripModal';
import { TowerHeader } from './TowerHeader';

const bySeverity = (a: Trip, b: Trip) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.id.localeCompare(b.id);

/** Torre de control → Grupos de viaje: create groups and move active trips between them. */
export function TowerGroupsPage() {
  const { trips, tripGroups, users, addTripGroup, deleteTripGroup } = useStore();
  const canEdit = useCan('trips', 'edit');
  const [name, setName] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const cleanName = name.trim().toUpperCase();
  const nameError = cleanName && tripGroups.includes(cleanName) ? 'Ya existe un grupo con ese nombre' : null;

  const groups = useMemo(
    () =>
      tripGroups.map((g) => {
        const list = trips.filter((t) => t.groupId === g).sort(bySeverity);
        return { name: g, trips: list, severity: maxSeverity(list.map((t) => t.severity)), viewers: users.filter((u) => u.active && u.groupIds.includes(g)) };
      }),
    [tripGroups, trips, users],
  );
  const ungrouped = trips.filter((t) => !t.groupId || !tripGroups.includes(t.groupId)).sort(bySeverity);

  const create = () => {
    if (!cleanName || nameError) return;
    addTripGroup(cleanName);
    setName('');
    toast.success(`Grupo ${cleanName} creado`, { description: 'Agrega viajes desde la tarjeta del grupo.' });
  };

  const deleting = groups.find((g) => g.name === toDelete);

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <TowerHeader view="groups" subtitle="Agrupa los viajes activos (por cliente, ruta o turno) para verlos juntos en la lista y el mapa, y limitar qué grupos ve cada usuario." />

      {canEdit && (
        <div className="flex flex-wrap items-start gap-2 rounded-md border border-line bg-white p-2.5">
          <div className="w-[300px]">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              invalid={Boolean(nameError)}
              placeholder="Nombre del grupo, ej. GDL-1803-G"
              aria-label="Nombre del grupo nuevo"
              mono
            />
            {nameError && <p className="mt-1 text-[12px] text-crit">{nameError}</p>}
          </div>
          <Button variant="primary" icon={<Plus size={15} />} disabled={!cleanName || Boolean(nameError)} onClick={create}>
            Crear grupo
          </Button>
          <div className="flex-1" />
          <span className="self-center text-[13px] text-muted">
            {tripGroups.length} grupos · {trips.length - ungrouped.length} de {trips.length} viajes activos agrupados
          </span>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(420px,1fr))] gap-3.5">
        {groups.map((g) => (
          <GroupCard
            key={g.name}
            name={g.name}
            trips={g.trips}
            severity={g.severity}
            viewers={g.viewers.map((u) => shortUserName(u.name))}
            canEdit={canEdit}
            candidates={trips.filter((t) => t.groupId !== g.name)}
            onDelete={() => setToDelete(g.name)}
          />
        ))}
        <GroupCard name="Sin grupo" trips={ungrouped} severity={maxSeverity(ungrouped.map((t) => t.severity))} canEdit={false} candidates={[]} />
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Eliminar el grupo ${toDelete}`}
        message={
          deleting?.trips.length
            ? `Sus ${deleting.trips.length} viajes siguen activos y pasan a "Sin grupo". Los usuarios que solo veían este grupo dejan de verlo.`
            : 'El grupo no tiene viajes activos.'
        }
        confirmLabel="Eliminar grupo"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          deleteTripGroup(toDelete!);
          toast.success(`Grupo ${toDelete} eliminado`);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function GroupCard({
  name,
  trips,
  severity,
  viewers,
  canEdit,
  candidates,
  onDelete,
}: {
  name: string;
  trips: Trip[];
  severity: Trip['severity'];
  viewers?: string[];
  canEdit: boolean;
  candidates: Trip[];
  onDelete?: () => void;
}) {
  const { open } = useTripModal();
  const assign = useStore((s) => s.assignTripsToGroup);
  const units = useStore((s) => s.units);
  const crew = useStore((s) => s.crew);
  const isReal = Boolean(onDelete);

  return (
    <section className={clsx('flex flex-col overflow-hidden rounded-md border bg-white', isReal ? 'border-line' : 'border-dashed border-input')}>
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <h2 className={clsx('text-[15px] font-bold text-ink', isReal && 'font-mono')}>{name}</h2>
        <Chip mono>
          {trips.length} {trips.length === 1 ? 'viaje' : 'viajes'}
        </Chip>
        {severity !== 'ok' && trips.length > 0 && <SeverityChip severity={severity} />}
        <div className="flex-1" />
        {canEdit && onDelete && (
          <button type="button" onClick={onDelete} title="Eliminar grupo" aria-label={`Eliminar grupo ${name}`} className="text-faint hover:text-crit">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {viewers && (
        <p className="flex items-center gap-1.5 px-4 pt-2.5 text-[12px] text-muted">
          <UsersRound size={13} className="shrink-0" />
          {viewers.length ? `Usuarios limitados a este grupo: ${viewers.join(', ')}` : 'Ningún usuario está limitado a este grupo'}
        </p>
      )}

      <ul className="flex flex-1 flex-col px-2 py-2">
        {trips.length === 0 && <li className="px-2 py-4 text-center text-[13px] text-muted">Sin viajes activos en este grupo.</li>}
        {trips.map((t) => {
          const unit = units.find((u) => u.id === t.unitId);
          const driver = crew.find((c) => c.id === t.driverId);
          return (
            <li key={t.id} className="group flex items-center gap-3 rounded-[4px] px-2 py-1.5 hover:bg-surface-alt">
              <Dot className={SEVERITY_STYLE[t.severity].dot} />
              <button type="button" onClick={() => open(t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="shrink-0 font-mono text-[14px] font-bold whitespace-nowrap text-primary">{t.id}</span>
                <span className="shrink-0 font-mono text-[13px] whitespace-nowrap text-ink">{unit?.economic ?? t.unitId}</span>
                <span className="truncate text-[13px] text-body">{driver ? crewName(driver) : '—'}</span>
                <span className="ml-auto shrink-0 text-[12px] whitespace-nowrap text-muted">{legText(t)}</span>
              </button>
              {canEdit && (
                <button
                  type="button"
                  title="Quitar del grupo"
                  aria-label={`Quitar ${t.id} del grupo`}
                  onClick={() => {
                    assign([t.id], null);
                    toast(`${t.id} quitado de ${name}`, { action: { label: 'Deshacer', onClick: () => assign([t.id], name) } });
                  }}
                  className="text-faint opacity-0 group-hover:opacity-100 hover:text-crit focus-visible:opacity-100"
                >
                  <X size={15} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && candidates.length > 0 && (
        <div className="border-t border-line-soft px-4 py-2.5">
          <Select
            value=""
            placeholder="+ Agregar viaje al grupo"
            aria-label={`Agregar viaje a ${name}`}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              assign([id], name);
              toast.success(`${id} agregado a ${name}`);
            }}
            options={candidates.map((t) => ({ value: t.id, label: `${t.id} · ${t.groupId ? `en ${t.groupId}` : 'sin grupo'}` }))}
          />
        </div>
      )}
    </section>
  );
}
