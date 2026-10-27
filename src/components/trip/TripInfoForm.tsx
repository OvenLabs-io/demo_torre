import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { daysUntil, fmtDate } from '@/lib/format';
import { CHASSIS, TRIP_GROUPS } from '@/mocks/clients';
import { crewName } from '@/mocks/crew';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Draft {
  movement: Trip['movement'];
  clientId: string;
  driverId: string;
  unitId: string;
  chassis: string;
  groupId: string;
  seal: string;
  originId: string;
  destinationId: string;
  lastLegId: string;
  escortRequired: boolean;
  escortId: string;
}

function toDraft(t: Trip): Draft {
  return {
    movement: t.movement,
    clientId: t.clientId,
    driverId: t.driverId,
    unitId: t.unitId,
    chassis: t.chassis ?? '',
    groupId: t.groupId ?? '',
    seal: t.containers[0]?.seal ?? '',
    originId: t.legs[0]?.geofenceId ?? '',
    destinationId: t.legs[1]?.geofenceId ?? '',
    lastLegId: t.legs[2]?.geofenceId ?? '',
    escortRequired: t.escort.required,
    escortId: t.escort.escortId ?? '',
  };
}

/** "Información del viaje" (editable) — right column of the trip modal. */
export function TripInfoForm({ trip, onClosed }: { trip: Trip; onClosed: () => void }) {
  const navigate = useNavigate();
  const now = useNow();
  const { clients, crew, units, geofences, updateTrip, closeTrip } = useStore();
  const [draft, setDraft] = useState<Draft>(() => toDraft(trip));
  const [confirmClose, setConfirmClose] = useState(false);
  const initial = useMemo(() => toDraft(trip), [trip]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const drivers = crew.filter((c) => c.role === 'driver');
  const escorts = crew.filter((c) => c.role === 'escort');
  const tractors = units.filter((u) => u.economic);
  const originFences = geofences.filter((g) => g.type === 'terminal' || g.type === 'yard');
  const destFences = geofences.filter((g) => g.type === 'destination');
  const c0 = trip.containers[0];
  const freeDays = c0?.freeDaysEnd !== undefined ? daysUntil(c0.freeDaysEnd, now) : null;
  const lastLegLabel = trip.movement === 'IMP' ? 'Devolución de vacío' : 'Entrega en terminal (geocerca)';
  const lastLegSuffix =
    trip.movement === 'IMP' && c0?.freeDaysEnd !== undefined && freeDays !== null
      ? ` · límite ${fmtDate(c0.freeDaysEnd)} (${freeDays >= 0 ? `${freeDays} ${freeDays === 1 ? 'día libre' : 'días libres'}` : `demora ${-freeDays} d`})`
      : '';

  const save = () => {
    const legs = trip.legs.map((l, i) => ({
      ...l,
      geofenceId: [draft.originId, draft.destinationId, draft.lastLegId][i] ?? l.geofenceId,
    }));
    updateTrip(trip.id, {
      movement: draft.movement,
      clientId: draft.clientId,
      driverId: draft.driverId,
      unitId: draft.unitId,
      chassis: draft.chassis,
      groupId: draft.groupId || null,
      containers: trip.containers.map((c, i) => (i === 0 ? { ...c, seal: draft.seal } : c)),
      legs,
      escort: draft.escortRequired
        ? {
            required: true,
            escortId: draft.escortId || undefined,
            provider: crew.find((c) => c.id === draft.escortId)?.provider,
            legIndexes: trip.escort.legIndexes ?? [trip.currentLeg],
          }
        : { required: false },
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

  const escortName = trip.escort.escortId ? crew.find((c) => c.id === trip.escort.escortId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">Información del viaje</h3>
        <Chip tone="warn" className="text-[9px]">
          Editable
        </Chip>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        <Field label="Folio">
          <Input value={trip.id} readOnly mono className="bg-surface-alt" />
        </Field>
        <Field label="Tipo">
          <Select
            value={draft.movement}
            onChange={(e) => set('movement', e.target.value as Trip['movement'])}
            options={[
              { value: 'IMP', label: 'Importación' },
              { value: 'EXP', label: 'Exportación' },
              { value: 'LOC', label: 'Reparto local' },
            ]}
          />
        </Field>
        <Field label="Cliente" className="col-span-2">
          <Select value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Operador">
          <Select
            value={draft.driverId}
            onChange={(e) => set('driverId', e.target.value)}
            options={drivers.map((d) => {
              const busy = d.id !== trip.driverId && d.status !== 'available';
              return { value: d.id, label: `${crewName(d)}${busy ? ' (en viaje)' : ''}`, disabled: busy };
            })}
          />
        </Field>
        <Field label="Tracto">
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
        <Field label="Remolque / chasis">
          <Select mono value={draft.chassis} onChange={(e) => set('chassis', e.target.value)} options={CHASSIS.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Grupo de viaje">
          <Select
            mono
            value={draft.groupId}
            onChange={(e) => set('groupId', e.target.value)}
            options={[{ value: '', label: 'Sin grupo' }, ...TRIP_GROUPS.map((g) => ({ value: g, label: g }))]}
          />
        </Field>
        <Field label="Contenedor">
          <Input
            value={trip.containers.map((c) => c.number).join(' + ') + (c0 ? ` · ${c0.isoType}` : '')}
            readOnly
            mono
            title="El contenedor se corrige desde Contenedor y EIR"
          />
        </Field>
        <Field label="Sello">
          <Input value={draft.seal} onChange={(e) => set('seal', e.target.value.toUpperCase())} mono />
        </Field>
        <Field label="Origen (geocerca)" className="col-span-2">
          <Select
            value={draft.originId}
            onChange={(e) => set('originId', e.target.value)}
            options={originFences.map((g) => ({ value: g.id, label: `${g.name} · ${g.locationLabel}` }))}
          />
        </Field>
        <Field label="Destino (geocerca)" className="col-span-2">
          <Select
            value={draft.destinationId}
            onChange={(e) => set('destinationId', e.target.value)}
            options={destFences.map((g) => ({ value: g.id, label: `${g.name}, ${g.locationLabel}` }))}
          />
        </Field>
        <Field label={lastLegLabel} className="col-span-2">
          <Select
            value={draft.lastLegId}
            onChange={(e) => set('lastLegId', e.target.value)}
            options={originFences.map((g) => ({ value: g.id, label: `${g.name}${lastLegSuffix}` }))}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[4px] bg-surface-alt px-3 py-2.5">
        <Toggle
          checked={draft.escortRequired}
          onChange={(v) => set('escortRequired', v)}
          label="Requiere custodia"
          description={
            draft.escortRequired
              ? escortName
                ? `${crewName(escortName)} · ${escortName.provider}`
                : trip.escort.provider
                  ? `${trip.escort.provider} · custodio por asignar`
                  : 'Custodio por asignar'
              : 'Sin custodia asignada · tramo de riesgo medio'
          }
        />
        {draft.escortRequired && (
          <Field label="Custodio">
            <Select
              value={draft.escortId}
              placeholder="Por asignar"
              onChange={(e) => set('escortId', e.target.value)}
              options={escorts.map((e) => {
                const busy = e.id !== trip.escort.escortId && e.status !== 'available';
                return { value: e.id, label: `${crewName(e)} · ${e.provider}${busy ? ' (en servicio)' : ''}`, disabled: busy };
              })}
            />
          </Field>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <Button variant="danger" onClick={() => setConfirmClose(true)}>
          Cerrar viaje
        </Button>
        <div className="flex-1" />
        <Button icon={<Link2 size={14} />} onClick={share}>
          Compartir link
        </Button>
        <Button variant="primary" disabled={!dirty} onClick={save}>
          Guardar cambios
        </Button>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title={`Cerrar el viaje ${trip.id}`}
        message={
          <>
            El viaje sale de la Torre de control y pasa al <b>Historial</b>. El tracto {units.find((u) => u.id === trip.unitId)?.economic} y el
            operador quedan disponibles, y sus alertas abiertas se cierran.
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
