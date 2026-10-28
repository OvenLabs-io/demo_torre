import { Fragment, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Columns3, MapPin, NotebookPen } from 'lucide-react';
import type { Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { TOWER_COLUMNS, usePrefs, type TowerColumn } from '@/store/prefs';
import { useNow } from '@/sim/clock';
import { fmtAgo, fmtTime, fmtTimeH } from '@/lib/format';
import { SEVERITY_LABEL, SEVERITY_STYLE } from '@/lib/severity';
import { containersText, freeDaysInfo, gpsTone, legText, movementTag, stopInfo } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';
import { Chip, Dot, SeverityChip } from '@/components/ui/Chip';
import { Checkbox } from '@/components/ui/Checkbox';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { useTripModal } from '@/components/trip/useTripModal';
import { TowerHeader } from './TowerHeader';
import { CheckPill, TowerToolbar } from './TowerToolbar';
import { useTowerTrips } from './useTowerTrips';

export function TowerListPage() {
  const prefs = usePrefs();
  const { total, filtered, groups } = useTowerTrips(prefs.query);
  const grouped = prefs.groupBy === 'group' && prefs.showGroups;
  const visibleCols = TOWER_COLUMNS.filter((c) => prefs.columns[c.key]);
  const colCount = visibleCols.length + 1;

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <TowerHeader
        view="list"
        subtitle="Solo viajes activos. Para viajes cerrados o filtrar por estado y terminal ve a Historial."
      />

      <TowerToolbar>
        <CheckPill
          checked={prefs.showGroups && prefs.groupBy === 'group'}
          onChange={prefs.setShowGroups}
          disabled={prefs.groupBy !== 'group'}
          label="Mostrar grupos"
        />
        <div className="flex-1" />
        <span className="text-[13px] text-muted">
          Mostrando {filtered.length} de {total} · ordenado por severidad
        </span>
        <ColumnsPicker />
      </TowerToolbar>

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1720px] table-fixed border-collapse">
            <thead>
              <tr>
                <th className="th w-[150px]">Viaje</th>
                {visibleCols.map((c) => (
                  <th key={c.key} className={clsx('th', COL_WIDTH[c.key])}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-3 py-10 text-center text-[14px] text-muted">
                    Ningún viaje activo coincide con la búsqueda o el filtro.
                  </td>
                </tr>
              )}
              {grouped
                ? groups.map((g) => (
                    <Fragment key={g.key}>
                      <GroupRow
                        label={g.label}
                        count={g.trips.length}
                        severity={g.severity}
                        collapsed={prefs.collapsedGroups.includes(g.key)}
                        onToggle={() => prefs.toggleGroup(g.key)}
                        colSpan={colCount}
                      />
                      {!prefs.collapsedGroups.includes(g.key) &&
                        g.trips.map((t) => <TripRow key={t.id} trip={t} cols={visibleCols.map((c) => c.key)} />)}
                    </Fragment>
                  ))
                : filtered.map((t) => <TripRow key={t.id} trip={t} cols={visibleCols.map((c) => c.key)} />)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-3.5 py-2.5 text-[12px] text-muted">
          <div className="flex items-center gap-3">
            <span>Leyenda:</span>
            {(['critical', 'high', 'medium', 'ok'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-body">
                <Dot className={SEVERITY_STYLE[s].dot} />
                {SEVERITY_LABEL[s]}
              </span>
            ))}
          </div>
          <span>
            Clic en una fila abre el detalle del viaje · Último GPS: verde &lt; 5 min, ámbar &lt; 30 min, rojo &gt; 30 min
          </span>
        </div>
      </div>
    </div>
  );
}

const COL_WIDTH: Record<TowerColumn, string> = {
  unit: 'w-[100px]',
  driver: 'w-[190px]',
  containers: 'w-[150px]',
  leg: 'w-[200px]',
  eta: 'w-[90px]',
  gps: 'w-[100px]',
  speed: 'w-[86px]',
  stopped: 'w-[140px]',
  log: 'w-[84px]',
  lock: 'w-[96px]',
  freeDays: 'w-[106px]',
  location: 'w-[240px]',
};

function GroupRow({
  label,
  count,
  severity,
  collapsed,
  onToggle,
  colSpan,
}: {
  label: string;
  count: number;
  severity: Trip['severity'];
  collapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}) {
  return (
    <tr className="bg-line-soft">
      <td colSpan={colSpan} className="px-3 py-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex h-[34px] items-center gap-2 text-[13px]"
        >
          {collapsed ? <ChevronRight size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
          <span className="font-bold text-ink">GRUPO {label}</span>
          <span className="text-muted">
            {count} {count === 1 ? 'viaje' : 'viajes'}
          </span>
          {severity !== 'ok' && <SeverityChip severity={severity} />}
        </button>
      </td>
    </tr>
  );
}

function TripRow({ trip, cols }: { trip: Trip; cols: TowerColumn[] }) {
  const { open } = useTripModal();
  const critical = trip.severity === 'critical';
  return (
    <tr
      tabIndex={0}
      onClick={() => open(trip.id)}
      onKeyDown={(e) => e.key === 'Enter' && open(trip.id)}
      className={clsx(
        'h-12 cursor-pointer border-b border-line-soft text-[14px] transition-colors hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none',
        critical && 'bg-crit-row',
      )}
    >
      <td className={clsx('px-3 py-1.5 align-middle whitespace-nowrap', critical && 'border-l-[3px] border-l-crit pl-[9px]')}>
        <div className="font-mono text-[14px] leading-tight font-bold text-primary">{trip.id}</div>
        {movementTag(trip) && (
          <span className="mt-0.5 inline-block rounded-[2px] bg-primary-soft px-1 text-[10px] font-medium tracking-[0.3px] text-muted">
            {movementTag(trip)}
          </span>
        )}
      </td>
      {cols.map((c) => (
        <td key={c} className="overflow-hidden px-3 py-1.5 align-middle whitespace-nowrap">
          <Cell col={c} trip={trip} />
        </td>
      ))}
    </tr>
  );
}

function Cell({ col, trip }: { col: TowerColumn; trip: Trip }) {
  const now = useNow();
  const unit = useStore((s) => s.units.find((u) => u.id === trip.unitId));
  const driver = useStore((s) => s.crew.find((c) => c.id === trip.driverId));

  switch (col) {
    case 'unit':
      return (
        <Stack top={<span className="font-mono font-bold">{unit?.economic ?? trip.unitId}</span>} bottom={unit?.plate} mono />
      );
    case 'driver':
      return <span className="text-ink">{driver ? crewName(driver) : '—'}</span>;
    case 'containers': {
      const text = containersText(trip);
      return (
        <Stack
          top={
            <span className="block max-w-full truncate font-mono text-[13px]" title={text}>
              {text}
            </span>
          }
          bottom={trip.containers[0]?.isoType}
          mono
        />
      );
    }
    case 'leg':
      return <span className="whitespace-nowrap text-body">{legText(trip)}</span>;
    case 'eta':
      return <span className="font-mono font-bold whitespace-nowrap">{fmtTimeH(trip.eta)}</span>;
    case 'gps':
      return (
        <span title={fmtAgo(trip.live.lastGpsAt, now)}>
          <Chip tone={gpsTone(trip, now)} mono className="text-[13px]">
            {fmtTime(trip.live.lastGpsAt)}
          </Chip>
        </span>
      );
    case 'speed':
      return (
        <span className={clsx('font-mono whitespace-nowrap', trip.live.speedKmh === 0 ? 'text-muted' : 'text-ink')}>
          {trip.live.speedKmh} km/h
        </span>
      );
    case 'stopped': {
      const s = stopInfo(trip, now);
      if (!s) return <span className="text-[#ced1d7]">—</span>;
      return (
        <Stack
          top={<span className={clsx('font-mono font-bold whitespace-nowrap', s.alarm ? 'text-crit' : 'text-ink')}>{s.duration}</span>}
          bottom={<span className={s.alarm ? 'text-crit' : 'text-muted'}>{s.reason}</span>}
        />
      );
    }
    case 'log':
      return (
        <span className={clsx('flex items-center gap-1.5', trip.log.length === 0 ? 'text-faint' : 'text-ink')}>
          <NotebookPen size={13} className="text-faint" />
          {trip.log.length}
        </span>
      );
    case 'lock': {
      const open = trip.lock.state === 'open';
      return (
        <span className={clsx('flex items-center gap-1.5 whitespace-nowrap', open ? 'text-crit' : 'text-body')}>
          <Dot className={open ? 'bg-crit' : 'bg-ok'} />
          {open ? 'Abierto' : 'Cerrado'}
        </span>
      );
    }
    case 'freeDays': {
      const f = freeDaysInfo(trip, now);
      if (!f) return <span className="text-faint">—</span>;
      return (
        <Chip tone={f.tone} mono className="text-[13px]">
          {f.label}
        </Chip>
      );
    }
    case 'location':
      return (
        <span className="flex items-center gap-1.5 text-[13px] text-body">
          <MapPin size={12} className="shrink-0 text-faint" />
          <span className="truncate">{trip.live.locationLabel}</span>
        </span>
      );
  }
}

function Stack({ top, bottom, mono }: { top: ReactNode; bottom?: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <span>{top}</span>
      {bottom && <span className={clsx('mt-0.5 text-[11px] text-muted', mono && 'font-mono')}>{bottom}</span>}
    </div>
  );
}

function ColumnsPicker() {
  const { columns, setColumn, resetColumns } = usePrefs();
  return (
    <Popover
      align="right"
      panelClassName="w-[220px]"
      trigger={({ toggle, open }) => (
        <Button icon={<Columns3 size={14} />} onClick={toggle} aria-expanded={open}>
          Columnas
        </Button>
      )}
    >
      {() => (
        <div className="flex flex-col">
          <p className="label-section px-2 pt-1 pb-2">Columnas visibles</p>
          <div className="px-2 py-1">
            <Checkbox checked disabled onChange={() => {}} label="Viaje" />
          </div>
          {TOWER_COLUMNS.map((c) => (
            <div key={c.key} className="rounded-[3px] px-2 py-1 hover:bg-line-soft">
              <Checkbox checked={columns[c.key]} onChange={(v) => setColumn(c.key, v)} label={c.label} />
            </div>
          ))}
          <button
            type="button"
            onClick={resetColumns}
            className="mt-1 border-t border-line-soft px-2 pt-2 pb-1 text-left text-[13px] font-medium text-primary hover:underline"
          >
            Mostrar todas
          </button>
        </div>
      )}
    </Popover>
  );
}
