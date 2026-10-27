import { memo, useMemo } from 'react';
import { Circle, Polygon, Polyline, Tooltip } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import buffer from '@turf/buffer';
import type { Geofence, GeofenceShape, LatLng } from '@/types/domain';
import { GEOFENCE_TYPE_LABEL } from '@/mocks/geofences';
import { RISK_ZONES, TRAFFIC } from '@/mocks/mapLayers';

export const GEOFENCE_COLOR: Record<Geofence['type'], string> = {
  terminal: '#1e3a5f',
  yard: '#1e3a5f',
  destination: '#059669',
  poi: '#b45309',
  avoid_zone: '#dc2626',
  authorized_stop: '#6b7280',
};

const corridorCache = new Map<string, LatLng[]>();

/** Corridor (polyline + width) → polygon ring, via turf buffer. */
export function corridorPolygon(path: LatLng[], widthM: number): LatLng[] {
  const key = `${widthM}|${path.map((p) => p.join(',')).join(';')}`;
  const hit = corridorCache.get(key);
  if (hit) return hit;
  if (path.length < 2) return path;
  const feature = buffer(
    { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path.map(([lat, lng]) => [lng, lat]) } },
    widthM / 2,
    { units: 'meters', steps: 4 },
  );
  const ring = (feature?.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : []) as [number, number][];
  const out = ring.map(([lng, lat]) => [lat, lng] as LatLng);
  corridorCache.set(key, out);
  return out;
}

/** Draws any geofence-like shape. */
export function ShapeView({
  shape,
  style,
  tooltip,
  onClick,
}: {
  shape: GeofenceShape;
  style: PathOptions;
  tooltip?: React.ReactNode;
  onClick?: () => void;
}) {
  const tip = tooltip ? (
    <Tooltip sticky className="light-tip">
      {tooltip}
    </Tooltip>
  ) : null;
  const eventHandlers = onClick ? { click: onClick } : undefined;
  if (shape.kind === 'circle')
    return (
      <Circle center={shape.center} radius={shape.radiusM} pathOptions={style} eventHandlers={eventHandlers}>
        {tip}
      </Circle>
    );
  if (shape.kind === 'polygon')
    return (
      <Polygon positions={shape.points} pathOptions={style} eventHandlers={eventHandlers}>
        {tip}
      </Polygon>
    );
  return (
    <Polygon positions={corridorPolygon(shape.path, shape.widthM)} pathOptions={style} eventHandlers={eventHandlers}>
      {tip}
    </Polygon>
  );
}

export const GeofenceLayer = memo(function GeofenceLayer({ geofences }: { geofences: Geofence[] }) {
  return (
    <>
      {geofences.map((g) => {
        const color = GEOFENCE_COLOR[g.type];
        return (
          <ShapeView
            key={g.id}
            shape={g.shape}
            style={{ color, weight: 1.5, dashArray: '4 3', fillColor: color, fillOpacity: 0.16 }}
            tooltip={
              <>
                <b>{g.name}</b>
                <br />
                {GEOFENCE_TYPE_LABEL[g.type]}
              </>
            }
          />
        );
      })}
    </>
  );
});

export const RiskZonesLayer = memo(function RiskZonesLayer() {
  return (
    <>
      {RISK_ZONES.map((z) => (
        <ShapeView
          key={z.id}
          shape={z.shape}
          style={{ color: '#dc2626', weight: 1, fillColor: '#dc2626', fillOpacity: 0.22 }}
          tooltip={
            <>
              <b>Zona de riesgo · {z.name}</b>
              <br />
              {z.detail}
            </>
          }
        />
      ))}
    </>
  );
});

const TRAFFIC_COLOR = { free: '#22c55e', slow: '#f59e0b', jam: '#dc2626' } as const;

export const TrafficLayer = memo(function TrafficLayer() {
  return (
    <>
      {TRAFFIC.map((s) => (
        <Polyline key={s.id} positions={s.coords} pathOptions={{ color: TRAFFIC_COLOR[s.level], weight: 5, opacity: 0.75 }} />
      ))}
    </>
  );
});

export function useTrafficLegend() {
  return useMemo(
    () => [
      { label: 'Fluido', color: TRAFFIC_COLOR.free },
      { label: 'Lento', color: TRAFFIC_COLOR.slow },
      { label: 'Detenido', color: TRAFFIC_COLOR.jam },
    ],
    [],
  );
}
