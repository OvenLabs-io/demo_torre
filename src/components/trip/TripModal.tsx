import { useEffect } from 'react';
import type { Trip } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { crewName } from '@/mocks/crew';
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
  const canHistory = useCan('history');
  const client = useStore((s) => s.clients.find((c) => c.id === trip.clientId));
  const driver = useStore((s) => s.crew.find((c) => c.id === trip.driverId));
  const unit = useStore((s) => s.units.find((u) => u.id === trip.unitId));
  const stop = stopSentence(trip, now);
  const c0 = trip.containers[0];
  const movement = movementLong(trip);
  const current: TripTab = tab === 'historial' && !canHistory ? 'bitacora' : tab;
  const context = client
    ? [client.name, c0?.shippingLine, trip.booking]
    : [trip.carrier, unit?.economic, driver ? crewName(driver) : undefined];

  const header = (
    <div className="shrink-0 border-b border-line px-5 pt-4">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-[20px] font-bold text-ink">{trip.id}</h2>
        {movement && (
          <Chip tone="primary" className="text-[11px] tracking-[0.3px]">
            {movement}
            {trip.modality === 'full' ? ' · FULL' : ''}
          </Chip>
        )}
        <span className="flex items-center gap-1.5 text-[14px] text-body">
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
        <span className="truncate text-[13px] text-muted">{context.filter(Boolean).join(' · ')}</span>
        <CloseButton onClick={onClose} />
      </div>
      <Tabs<TripTab>
        className="mt-3 border-b-0"
        value={current}
        onChange={(k) => open(trip.id, k)}
        items={[
          { key: 'bitacora', label: 'Bitácora', count: trip.log.length },
          { key: 'info', label: 'Información del viaje' },
          ...(canHistory ? [{ key: 'historial' as const, label: 'Historial del viaje' }] : []),
        ]}
      />
    </div>
  );

  return (
    <Modal open onClose={onClose} header={header} width={1240} height="min(880px, calc(100vh - 32px))" bodyClassName="p-0" label={`Viaje ${trip.id}`}>
      {current === 'bitacora' && (
        <div className="scrollbar-thin h-full overflow-auto bg-surface-alt p-5">
          <TripLogPanel trip={trip} />
        </div>
      )}
      {current === 'info' && (
        <div className="scrollbar-thin h-full overflow-auto bg-surface-alt p-5">
          <TripInfoForm key={trip.id} trip={trip} onClosed={onClose} />
        </div>
      )}
      {current === 'historial' && <TripHistoryTab key={trip.id} trip={trip} initialAt={at} />}
    </Modal>
  );
}
