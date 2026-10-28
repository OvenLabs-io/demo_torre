import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import type { Severity, Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { MAP_LAYERS, usePrefs } from '@/store/prefs';
import { SEVERITY_LABEL, SEVERITY_RANK } from '@/lib/severity';
import { slicePath } from '@/lib/geo';
import { getRoutePath } from '@/mocks/routes';
import { BaseMap, MapZoomButtons } from '@/components/map/BaseMap';
import { GEOFENCE_COLOR, GeofenceLayer, RiskZonesLayer, TrafficLayer, useTrafficLegend } from '@/components/map/layers';
import { unitIcon, unitState, type UnitState } from '@/components/map/unitIcon';
import { Select } from '@/components/ui/Field';
import { SeverityChip } from '@/components/ui/Chip';
import { useTripModal } from '@/components/trip/useTripModal';
import { TowerHeader } from './TowerHeader';
import { TowerToolbar } from './TowerToolbar';
import { useTowerTrips } from './useTowerTrips';
import { TripMapCard } from './TripMapCard';

type SevFilter = 'all' | Severity;

export function TowerMapPage() {
  const prefs = usePrefs();
  const { filtered, groups } = useTowerTrips(prefs.query);
  const geofences = useStore((s) => s.geofences);
  const units = useStore((s) => s.units);
  const { open } = useTripModal();
  const [sev, setSev] = useState<SevFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const visible = useMemo(() => (sev === 'all' ? filtered : filtered.filter((t) => t.severity === sev)), [filtered, sev]);
  const visibleIds = useMemo(() => new Set(visible.map((t) => t.id)), [visible]);

  const fitAll = useCallback(() => {
    if (!map || visible.length === 0) return;
    map.fitBounds(L.latLngBounds(visible.map((t) => t.live.position)), { padding: [60, 60], maxZoom: 11 });
  }, [map, visible]);

  // Fit the corridor once the map is ready.
  const fitted = useRef(false);
  useEffect(() => {
    if (map && !fitted.current && visible.length) {
      fitted.current = true;
      fitAll();
    }
  }, [map, visible.length, fitAll]);

  const focus = (trip: Trip) => {
    setSelected(trip.id);
    map?.flyTo(trip.live.position, Math.max(map.getZoom(), 11), { duration: 0.8 });
  };

  const onMarker = (trip: Trip) => {
    setSelected(trip.id);
    cardRefs.current.get(trip.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const summary = useMemo(() => {
    const c: Record<UnitState, number> = { moving: 0, stopped: 0, alert: 0, nosignal: 0 };
    visible.forEach((t) => c[unitState(t)]++);
    return c;
  }, [visible]);

  const grouped = prefs.groupBy === 'group' && prefs.showGroups;
  const panelGroups = grouped
    ? groups.map((g) => ({ ...g, trips: g.trips.filter((t) => visibleIds.has(t.id)) })).filter((g) => g.trips.length)
    : [{ key: 'all', label: '', severity: 'ok' as Severity, trips: [...visible].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) }];

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-[680px] flex-col gap-3.5 px-6 py-5">
      <TowerHeader
        view="map"
        subtitle="Mismo conjunto de viajes activos que la lista. Las geocercas se visualizan, no se crean aquí."
      />

      <TowerToolbar>
        <div className="flex-1" />
        <span className="label-section mr-1">Capas</span>
        {MAP_LAYERS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={prefs.mapLayers[l.key]}
            onClick={() => prefs.toggleLayer(l.key)}
            className={clsx(
              'flex h-[34px] items-center gap-2 rounded-[4px] border px-3 text-[14px] transition-colors',
              prefs.mapLayers[l.key] ? 'border-primary bg-primary text-white' : 'border-input bg-white text-body hover:bg-surface-alt',
            )}
          >
            <span className={clsx('size-3 rounded-[2px] border', prefs.mapLayers[l.key] ? 'border-white/60 bg-white/25' : 'border-input bg-line-soft')} />
            {l.label}
          </button>
        ))}
      </TowerToolbar>

      <div className="flex min-h-0 flex-1 gap-3.5">
        {/* Map */}
        <div className="relative isolate min-w-0 flex-1 overflow-hidden rounded-md border border-line">
          <BaseMap onReady={setMap}>
            {prefs.mapLayers.traffic && <TrafficLayer />}
            {prefs.mapLayers.risk && <RiskZonesLayer />}
            {prefs.mapLayers.geofences && <GeofenceLayer geofences={geofences} />}
            {prefs.mapLayers.trail && visible.map((t) => <Trail key={t.id} trip={t} />)}
            {visible.map((t) => {
              const unit = units.find((u) => u.id === t.unitId);
              const state = unitState(t);
              const label = unit?.economic ?? t.unitId;
              return (
                <Marker
                  key={t.id}
                  position={t.live.position}
                  zIndexOffset={state === 'alert' ? 600 : t.id === selected ? 800 : 0}
                  icon={unitIcon({
                    state,
                    heading: t.live.heading,
                    label,
                    speedText: state === 'nosignal' ? 'sin señal' : `${t.live.speedKmh} km/h`,
                    selected: t.id === selected,
                    showChip: state !== 'stopped' || t.id === selected,
                  })}
                  eventHandlers={{ click: () => onMarker(t), dblclick: () => open(t.id) }}
                >
                  {state === 'stopped' && t.id !== selected && (
                    <Tooltip direction="top" offset={[0, -10]} className="light-tip">
                      <b>{label}</b> · detenida · {t.id}
                    </Tooltip>
                  )}
                </Marker>
              );
            })}
          </BaseMap>

          {prefs.mapLayers.geofences && <GeofenceLegend />}
          {prefs.mapLayers.traffic && <TrafficLegend />}

          <div className="absolute bottom-2.5 left-2.5 z-[500] flex flex-col gap-1">
            <div className="flex items-center gap-3 rounded-[4px] border border-line bg-white px-3 py-1.5 text-[13px] text-body shadow-sm">
              <SummaryItem color="bg-ok" count={summary.moving} label="en movimiento" />
              <SummaryItem color="bg-med" count={summary.stopped} label={summary.stopped === 1 ? 'detenida' : 'detenidas'} />
              <SummaryItem color="bg-crit" count={summary.alert} label="con alerta" />
              <SummaryItem color="bg-faint" count={summary.nosignal} label="sin señal" />
            </div>
            <span className="px-1 text-[11px] text-muted">Datos GPS simulados · se actualizan cada 5 s</span>
          </div>
          <MapZoomButtons map={map} onFit={fitAll} />
        </div>

        {/* Side panel */}
        <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center gap-3 border-b border-line px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-ink">Viajes activos</h2>
              <p className="text-[12px] text-muted">
                {visible.length} visibles en el mapa · clic centra la unidad, doble clic abre el viaje
              </p>
            </div>
            <Select
              className="w-[118px]"
              value={sev}
              onChange={(e) => setSev(e.target.value as SevFilter)}
              aria-label="Filtrar por severidad"
              options={[
                { value: 'all', label: 'Severidad' },
                ...(['critical', 'high', 'medium', 'ok'] as Severity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] })),
              ]}
            />
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 && <p className="px-4 py-10 text-center text-[14px] text-muted">Ningún viaje coincide con los filtros.</p>}
            {panelGroups.map((g) => (
              <Fragment key={g.key}>
                {grouped && (
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line-soft bg-line-soft px-3.5 py-1.5 text-[12px]">
                    <span className="font-bold text-ink">GRUPO {g.label}</span>
                    <span className="text-muted">
                      {g.trips.length} {g.trips.length === 1 ? 'viaje' : 'viajes'}
                    </span>
                    {g.severity !== 'ok' && <SeverityChip severity={g.severity} className="text-[11px]" />}
                  </div>
                )}
                {g.trips.map((t) => (
                  <TripMapCard
                    key={t.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(t.id, el);
                      else cardRefs.current.delete(t.id);
                    }}
                    trip={t}
                    selected={t.id === selected}
                    onSelect={() => focus(t)}
                    onOpen={() => open(t.id)}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Trail({ trip }: { trip: Trip }) {
  const path = getRoutePath(trip.live.routeId);
  const progress = trip.live.routeProgressM ?? 0;
  if (!path || progress < 200) return null;
  return <Polyline positions={slicePath(path, 0, progress)} pathOptions={{ color: '#1e3a5f', weight: 3, opacity: 0.55 }} />;
}

function SummaryItem({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={clsx('size-2 rounded-full', color)} />
      {count} {label}
    </span>
  );
}

function GeofenceLegend() {
  const items: [string, string][] = [
    ['Terminal / patio', GEOFENCE_COLOR.terminal],
    ['Destino de cliente', GEOFENCE_COLOR.destination],
    ['Punto de interés', GEOFENCE_COLOR.poi],
    ['Parada autorizada', GEOFENCE_COLOR.authorized_stop],
    ['Zona a evitar', GEOFENCE_COLOR.avoid_zone],
  ];
  return (
    <div className="absolute top-2.5 left-2.5 z-[500] w-[230px] rounded-[4px] border border-line bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">Geocercas (solo lectura)</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map(([label, color]) => (
          <li key={label} className="flex items-center gap-2 text-[13px] text-body">
            <span className="size-3 rounded-[2px] border" style={{ borderColor: color, background: `${color}33` }} />
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-faint">Se crean en el menú Geocercas y se sincronizan con la plataforma GPS</p>
    </div>
  );
}

function TrafficLegend() {
  const items = useTrafficLegend();
  return (
    <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-3 rounded-[4px] border border-line bg-white px-3 py-1.5 text-[13px] text-body shadow-sm">
      <span className="text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">Tráfico (simulado)</span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
