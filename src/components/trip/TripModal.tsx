import { useEffect } from 'react';
import type { Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { SEVERITY_LABEL } from '@/lib/severity';
import { legText, movementLong, stopSentence } from '@/lib/tripView';
import { Modal, CloseButton } from '@/components/ui/Modal';
import { Chip, Dot, SeverityChip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { useTripModal, type TripTab } from './useTripModal';
import { TripLogPanel } from './TripLogPanel';
import { TripInfoForm } from './TripInfoForm';
import { TripHistoryTab } from './TripHistoryTab';

/** Renders the trip modal when the URL has ?viaje=… */
export function TripModalHost() {
  const { tripId, tab, close } = useTripModal();
  const trip = useStore((s) => (tripId ? s.trips.find((t) => t.id === tripId) : undefined));

  // Unknown or already-closed trip: drop the param.
  useEffect(() => {
    if (tripId && !trip) close();
  }, [tripId, trip, close]);

  if (!trip) return null;
  return <TripModal trip={trip} tab={tab} onClose={close} />;
}

function TripModal({ trip, tab, onClose }: { trip: Trip; tab: TripTab; onClose: () => void }) {
  const { open, at } = useTripModal();
  const now = useNow();
  const client = useStore((s) => s.clients.find((c) => c.id === trip.clientId));
  const openAlerts = useStore((s) => s.alerts.filter((a) => a.tripId === trip.id && a.status !== 'closed').length);
  const stop = stopSentence(trip, now);
  const c0 = trip.containers[0];

  const header = (
    <div className="shrink-0 border-b border-line px-5 pt-4">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-[18px] font-bold text-ink">{trip.id}</h2>
        <Chip tone="primary" className="text-[9px] tracking-[0.3px]">
          {movementLong(trip)}
          {trip.modality === 'full' ? ' · FULL' : ''}
        </Chip>
        <span className="flex items-center gap-1.5 text-[12px] text-body">
          <Dot className="bg-primary" size={7} />
          {trip.phaseLabel} · {legText(trip)}
        </span>
        {trip.severity !== 'ok' && (
          <SeverityChip severity={trip.severity}>
            {SEVERITY_LABEL[trip.severity]}
            {stop ? ` · ${stop}` : ''}
          </SeverityChip>
        )}
        <div className="flex-1" />
        <span className="truncate text-[11px] text-muted">
          {client?.name} · {c0?.shippingLine} · {trip.booking}
        </span>
        <CloseButton onClick={onClose} />
      </div>
      <Tabs<TripTab | 'eir' | 'docs' | 'escort' | 'alerts'>
        className="mt-3 border-b-0"
        value={tab}
        onChange={(k) => (k === 'bitacora' || k === 'historial') && open(trip.id, k)}
        items={[
          { key: 'bitacora', label: 'Bitácora e información', count: trip.log.length },
          { key: 'historial', label: 'Historial del viaje' },
          { key: 'eir', label: 'Contenedor y EIR', count: 1, disabled: true, title: 'Próximamente' },
          { key: 'docs', label: 'Documentos', count: 3, disabled: true, title: 'Próximamente' },
          { key: 'escort', label: 'Custodia', disabled: true, title: 'Próximamente' },
          { key: 'alerts', label: 'Alertas', count: openAlerts, disabled: true, title: 'Próximamente' },
        ]}
      />
    </div>
  );

  return (
    <Modal open onClose={onClose} header={header} width={1240} height="min(880px, calc(100vh - 32px))" bodyClassName="p-0" label={`Viaje ${trip.id}`}>
      {tab === 'bitacora' ? (
        <div className="flex h-full min-h-0">
          <div className="scrollbar-thin min-w-0 flex-1 overflow-auto bg-surface-alt p-5">
            <TripLogPanel trip={trip} />
          </div>
          <div className="scrollbar-thin w-[420px] shrink-0 overflow-auto border-l border-line bg-white p-5">
            <TripInfoForm key={trip.id} trip={trip} onClosed={onClose} />
          </div>
        </div>
      ) : (
        <TripHistoryTab key={trip.id} trip={trip} initialAt={at} />
      )}
    </Modal>
  );
}
