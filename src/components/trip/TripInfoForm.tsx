import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Trip } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { fmtDateTime } from '@/lib/format';
import { crewName } from '@/mocks/crew';
import { trailerLabel, trailersInUse } from '@/mocks/trailers';
import { TENANT_NAME } from '@/config/brand';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Draft {
  movement: Trip['movement'];
  clientId: string;
  driverId: string;
  unitId: string;
  trailers: [string, string];
  groupId: string;
  carrier: string;
  seal: string;
  notes: string;
  legIds: string[];
}

function toDraft(t: Trip): Draft {
  const trailers = t.trailers ?? (t.chassis ? [t.chassis] : []);
  return {
    movement: t.movement,
    clientId: t.clientId,
    driverId: t.driverId,
    unitId: t.unitId,
    trailers: [trailers[0] ?? '', trailers[1] ?? ''],
    groupId: t.groupId ?? '',
    carrier: t.carrier ?? TENANT_NAME,
    seal: t.containers[0]?.seal ?? '',
    notes: t.notes ?? '',
    legIds: t.legs.map((l) => l.geofenceId),
  };
}

function windowLabel(w: Trip['legs'][number]['window']): string {
  if ('before' in w) return `Antes del ${fmtDateTime(w.before)}`;
  return w.to ? `${fmtDateTime(w.from)} → ${fmtDateTime(w.to)}` : `Desde ${fmtDateTime(w.from)}`;
}

/** Tab "Información del viaje": same sections as Nuevo viaje; read-only without edit permission. */
export function TripInfoForm({ trip, onClosed }: { trip: Trip; onClosed: () => void }) {
  const navigate = useNavigate();
  const { clients, crew, units, geofences, trips, trailers, tripGroups, updateTrip, closeTrip } = useStore();
  const canEdit = useCan('trips', 'edit');
  const [draft, setDraft] = useState<Draft>(() => toDraft(trip));
  const [confirmClose, setConfirmClose] = useState(false);
  const initial = useMemo(() => toDraft(trip), [trip]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const drivers = crew.filter((c) => c.role === 'driver');
  const driver = drivers.find((d) => d.id === draft.driverId);
  const tractors = units.filter((u) => u.economic);
  const places = geofences.filter((g) => g.type !== 'avoid_zone');
  const inUse = useMemo(() => trailersInUse(trips.filter((t) => t.id !== trip.id)), [trips, trip.id]);
  const hasCargo = Boolean(trip.clientId || trip.containers.length);
  const c0 = trip.containers[0];
  const escort = trip.escort.escortId ? crew.find((c) => c.id === trip.escort.escortId) : undefined;
  const sameTrailer = draft.trailers[0] && draft.trailers[0] === draft.trailers[1];

  const trailerOptions = (other: string) =>
    trailers.map((t) => {
      const label = trailerLabel(t);
      const busy = inUse.get(label);
      const why = t.status === 'maintenance' ? ' (en taller)' : busy ? ` (en ${busy})` : label === other ? ' (ya elegido)' : '';
      return { value: label, label: `${label} · ${t.kind}${why}`, disabled: Boolean(why) };
    });

  const save = () => {
    if (sameTrailer) return toast.error('El mismo remolque está elegido dos veces');
    const chosen = draft.trailers.filter(Boolean);
    updateTrip(trip.id, {
      movement: draft.movement,
      clientId: draft.clientId,
      driverId: draft.driverId,
      unitId: draft.unitId,
      trailers: chosen,
      chassis: chosen[0],
      groupId: draft.groupId || null,
      carrier: draft.carrier.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      containers: trip.containers.map((c, i) => (i === 0 ? { ...c, seal: draft.seal } : c)),
      legs: trip.legs.map((l, i) => ({ ...l, geofenceId: draft.legIds[i] ?? l.geofenceId })),
    });
    toast.success('Cambios guardados', { description: `Información del viaje ${trip.id} actualizada.` });
  };

  const share = async () => {
    const link = `${window.location.origin}/seguimiento/${trip.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard may be blocked; the toast still shows the link */
    }
    const client = clients.find((c) => c.id === trip.clientId);
    toast.success('Link público copiado', {
      description: `${link}${client ? ` · se comparte con ${client.contacts.join(', ')}` : ''}`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset disabled={!canEdit} className="grid grid-cols-2 gap-4">
        <Section title="Datos generales del viaje" className="col-span-2" right={!canEdit && <Chip tone="muted">Solo lectura</Chip>}>
          <div className="grid grid-cols-4 gap-x-3 gap-y-3.5">
            <Field label="Folio">
              <Input value={trip.id} readOnly mono className="bg-surface-alt" />
            </Field>
            <Field label="Unidad" required>
              <Select
                mono
                value={draft.unitId}
                onChange={(e) => set('unitId', e.target.value)}
                options={tractors.map((u) => {
                  const busy = u.id !== trip.unitId && u.status !== 'available';
                  const why = u.status === 'maintenance' ? ' (en taller)' : busy ? ' (en viaje)' : '';
                  return { value: u.id, label: `${u.economic} · ${u.plate}${why}`, disabled: busy };
                })}
              />
            </Field>
            <Field label="Grupo de viaje">
              <Select mono value={draft.groupId} onChange={(e) => set('groupId', e.target.value)} options={[{ value: '', label: 'Sin grupo' }, ...tripGroups.map((g) => ({ value: g, label: g }))]} />
            </Field>
            <Field label="Línea transportista">
              <Input value={draft.carrier} onChange={(e) => set('carrier', e.target.value)} placeholder="—" />
            </Field>
            <Field label="Remolque 1">
              <Select mono value={draft.trailers[0]} placeholder="Sin remolque" onChange={(e) => set('trailers', [e.target.value, draft.trailers[1]])} options={trailerOptions(draft.trailers[1])} />
            </Field>
            <Field label="Remolque 2" error={sameTrailer ? 'Ya está como remolque 1' : undefined}>
              <Select mono value={draft.trailers[1]} placeholder="Sin segundo remolque" onChange={(e) => set('trailers', [draft.trailers[0], e.target.value])} options={trailerOptions(draft.trailers[0])} />
            </Field>
            <Field label="Operador" required>
              <Select
                value={draft.driverId}
                onChange={(e) => set('driverId', e.target.value)}
                options={drivers.map((d) => {
                  const busy = d.id !== trip.driverId && d.status !== 'available';
                  return { value: d.id, label: `${crewName(d)}${busy ? ' (en viaje)' : ''}`, disabled: busy };
                })}
              />
            </Field>
            <Field label="Celular" help="Se cambia en Usuarios → Operadores">
              <Input value={driver?.phone || '—'} readOnly mono className="bg-surface-alt" />
            </Field>
          </div>
        </Section>

        <Section title="Notas del viaje" className={hasCargo ? '' : 'col-span-2'}>
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={hasCargo ? 6 : 3}
            placeholder="Sin notas"
            aria-label="Notas del viaje"
            className="w-full resize-y rounded-[4px] border border-input bg-white px-2.5 py-2 text-[14px] text-ink placeholder:text-faint focus:border-primary focus:outline-none disabled:bg-line-soft"
          />
        </Section>

        {hasCargo && (
          <Section title="Cliente y contenedor">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              <Field label="Cliente">
                <Select value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
              </Field>
              <Field label="Tipo">
                <Select
                  value={draft.movement ?? ''}
                  onChange={(e) => set('movement', e.target.value as Trip['movement'])}
                  options={[
                    { value: 'IMP', label: 'Importación' },
                    { value: 'EXP', label: 'Exportación' },
                    { value: 'LOC', label: 'Reparto local' },
                  ]}
                />
              </Field>
              <Field label="Contenedor">
                <Input value={trip.containers.map((c) => c.number).join(' + ') + (c0 ? ` · ${c0.isoType}` : '')} readOnly mono className="bg-surface-alt" />
              </Field>
              <Field label="Sello">
                <Input value={draft.seal} onChange={(e) => set('seal', e.target.value.toUpperCase())} mono />
              </Field>
              {trip.booking && (
                <Field label="BL / Booking">
                  <Input value={trip.booking} readOnly mono className="bg-surface-alt" />
                </Field>
              )}
              {trip.escort.required && (
                <Field label="Custodia">
                  <Input value={escort ? `${crewName(escort)} · ${escort.provider}` : (trip.escort.provider ?? 'Por asignar')} readOnly className="bg-surface-alt" />
                </Field>
              )}
            </div>
          </Section>
        )}

        <Section title="Ruta" className="col-span-2">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[36px_200px_1fr_300px] items-center gap-x-3">
              {['#', 'Tramo', 'Lugar (geocerca)', 'Horario'].map((h) => (
                <span key={h} className="text-[11px] font-semibold tracking-[0.54px] text-muted uppercase">
                  {h}
                </span>
              ))}
            </div>
            {trip.legs.map((l, i) => {
              const current = l.index === trip.currentLeg;
              return (
                <div key={l.index} className="grid grid-cols-[36px_200px_1fr_300px] items-center gap-x-3">
                  <span className={`flex size-7 items-center justify-center rounded-full font-mono text-[13px] ${current ? 'bg-primary text-white' : 'bg-line-soft text-body'}`}>{l.index}</span>
                  <span className="text-[14px] text-ink">
                    {l.label}
                    {current && <span className="ml-1.5 text-[12px] text-primary">· actual</span>}
                  </span>
                  <Select
                    value={draft.legIds[i]}
                    onChange={(e) => set('legIds', draft.legIds.map((x, j) => (j === i ? e.target.value : x)))}
                    options={places.map((g) => ({ value: g.id, label: `${g.name.split(' · ')[0]} · ${g.locationLabel}` }))}
                  />
                  <span className="font-mono text-[13px] text-body">{windowLabel(l.window)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      </fieldset>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button variant="danger" onClick={() => setConfirmClose(true)}>
            Cerrar viaje
          </Button>
          <div className="flex-1" />
          <Button icon={<Link2 size={15} />} onClick={share}>
            Compartir link
          </Button>
          {dirty && <Button onClick={() => setDraft(initial)}>Descartar cambios</Button>}
          <Button variant="primary" disabled={!dirty} onClick={save}>
            Guardar cambios
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title={`Cerrar el viaje ${trip.id}`}
        message={
          <>
            El viaje sale de la Torre de control y pasa al <b>Historial</b>. La unidad {units.find((u) => u.id === trip.unitId)?.economic} y el operador quedan
            disponibles, y sus alertas abiertas se cierran.
          </>
        }
        confirmLabel="Cerrar viaje"
        danger
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          onClosed();
          closeTrip(trip.id);
          toast.success(`Viaje ${trip.id} cerrado`, {
            description: 'Ya aparece en el Historial.',
            action: { label: 'Ver Historial', onClick: () => navigate('/historial') },
          });
        }}
      />
    </div>
  );
}

function Section({ title, right, className, children }: { title: string; right?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-md border border-line bg-white ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {right}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}
