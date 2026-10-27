import { forwardRef } from 'react';
import clsx from 'clsx';
import { Clock3, MapPin } from 'lucide-react';
import type { Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { fmtTime, fmtTimeH } from '@/lib/format';
import { freeDaysInfo, gpsTone, legText, movementTag, stopInfo } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';
import { Chip, Dot, SeverityChip } from '@/components/ui/Chip';

/** Card in the map side panel (Figma 02 / decision #19). */
export const TripMapCard = forwardRef<HTMLDivElement, { trip: Trip; selected: boolean; onSelect: () => void; onOpen: () => void }>(
  function TripMapCard({ trip, selected, onSelect, onOpen }, ref) {
    const now = useNow();
    const unit = useStore((s) => s.units.find((u) => u.id === trip.unitId));
    const driver = useStore((s) => s.crew.find((c) => c.id === trip.driverId));
    const client = useStore((s) => s.clients.find((c) => c.id === trip.clientId));
    const stop = stopInfo(trip, now);
    const free = freeDaysInfo(trip, now);
    const critical = trip.severity === 'critical';
    const lockOpen = trip.lock.state === 'open';

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
        title="Clic: centrar la unidad · Doble clic: abrir el viaje"
        className={clsx(
          'border-b border-line-soft px-3.5 py-3 text-[11px] transition-colors outline-none hover:bg-surface-alt focus-visible:bg-surface-alt',
          critical ? 'border-l-[3px] border-l-crit pl-[11px]' : 'border-l-[3px] border-l-transparent pl-[11px]',
          selected && (critical ? 'bg-crit-row' : 'bg-[#f5f8fc]'),
        )}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="font-mono text-[12px] font-bold text-primary hover:underline"
            title="Abrir el detalle del viaje"
          >
            {trip.id}
          </button>
          <span className="rounded-[2px] bg-line-soft px-1 text-[8px] font-medium tracking-[0.3px] text-muted">
            {movementTag(trip, ' · ')}
          </span>
          <div className="flex-1" />
          {trip.severity !== 'ok' && <SeverityChip severity={trip.severity} />}
          <span className="font-mono text-[11px] font-bold text-ink">ETA {fmtTimeH(trip.eta)}</span>
        </div>
        <p className="mt-1 text-body">{client?.name}</p>
        <p className="mt-1 text-body">
          <span className="font-mono font-bold text-ink">
            {unit?.economic} · {unit?.plate}
          </span>
          <span className="ml-1.5">{driver ? crewName(driver) : ''}</span>
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-body">{legText(trip)}</span>
          <div className="flex-1" />
          <span className={clsx('font-mono', trip.live.speedKmh === 0 ? 'text-muted' : 'text-ink')}>{trip.live.speedKmh} km/h</span>
          <Chip tone={gpsTone(trip, now)} mono className="text-[9px]">
            GPS {fmtTime(trip.live.lastGpsAt)}
          </Chip>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={clsx('flex items-center gap-1', stop?.alarm ? 'text-crit' : 'text-muted')}>
            <Clock3 size={11} className={stop?.alarm ? 'text-crit/60' : 'text-faint'} />
            {stop ? `${stop.duration} ${stop.reason === 'Sin señal GPS' ? '· sin señal GPS' : stop.reason.toLowerCase()}` : 'En movimiento'}
          </span>
          <span className={clsx('flex items-center gap-1', lockOpen ? 'text-crit' : 'text-body')}>
            <Dot className={lockOpen ? 'bg-crit' : 'bg-ok'} size={6} />
            {lockOpen ? 'Candado abierto' : 'Candado cerrado'}
          </span>
          {free && (
            <Chip tone={free.tone} mono className="text-[9px]">
              {free.label}
            </Chip>
          )}
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-muted">
          <MapPin size={11} className="text-faint" />
          {trip.live.locationLabel}
        </p>
      </div>
    );
  },
);
