import type { GeofenceShape, LatLng } from '@/types/domain';
import { haversine, projectOnPath, slicePath } from '@/lib/geo';
import { createRng } from '@/lib/random';
import { getRoutePath } from './routes';
import { PLACES } from './places';

/** "Zonas de riesgo" layer (dummy, for the demo). */
export interface RiskZone {
  id: string;
  name: string;
  detail: string;
  shape: GeofenceShape;
}

function corridorOnRoute(routeId: string, from: LatLng, to: LatLng): LatLng[] {
  const path = getRoutePath(routeId)!;
  return slicePath(path, projectOnPath(path, from), projectOnPath(path, to));
}

export const RISK_ZONES: RiskZone[] = [
  {
    id: 'rz-54d',
    name: 'Autopista 54D km 90–130',
    detail: 'Robo a transporte de carga · reportes recientes',
    shape: { kind: 'corridor', path: corridorOnRoute('gf-contecon>gf-automotriz', PLACES.tonila.pos, PLACES.guzman.pos), widthM: 2500 },
  },
  {
    id: 'rz-jalipa',
    name: 'Tramo Jalipa–Cuyutlán (nocturno)',
    detail: 'Evitar entre 22:00 y 06:00 h',
    shape: {
      kind: 'corridor',
      path: [
        [19.0985, -104.2565],
        [19.0412, -104.1876],
        [18.9183, -104.0699],
      ],
      widthM: 2500,
    },
  },
  {
    id: 'rz-celaya',
    name: 'Libramiento Celaya (bloqueo activo)',
    detail: 'Bloqueo carretero · tomar ruta alterna',
    shape: { kind: 'circle', center: [20.5462, -100.8564], radiusM: 4500 },
  },
  {
    id: 'rz-lagos',
    name: 'Carr. Lagos de Moreno–San Luis Potosí',
    detail: 'Asaltos reportados en horario nocturno',
    shape: { kind: 'corridor', path: corridorOnRoute('gf-patio-maersk>gf-polimeros', PLACES.lagos.pos, [21.75, -101.5]), widthM: 2500 },
  },
];

/** "Tráfico" layer (dummy): main corridors split into ~12 km chunks with a congestion level. */
export interface TrafficSegment {
  id: string;
  level: 'free' | 'slow' | 'jam';
  coords: LatLng[];
}

function buildTraffic(): TrafficSegment[] {
  const rng = createRng(54);
  const out: TrafficSegment[] = [];
  const drawn: LatLng[] = [];
  const routes = ['gf-contecon>gf-calzado', 'gf-patio-maersk>gf-polimeros', 'gf-contecon>gf-automotriz', 'gf-patio-cma>gf-tecnomaq'];
  for (const rid of routes) {
    const path = getRoutePath(rid);
    if (!path) continue;
    const chunk = 12_000;
    for (let d = 0; d < path.length; d += chunk) {
      const coords = slicePath(path, d, d + chunk);
      const mid = coords[Math.floor(coords.length / 2)];
      // Skip stretches already drawn by a previous corridor (shared highways).
      if (drawn.some((p) => haversine(p, mid) < 2500)) continue;
      drawn.push(mid);
      const r = rng.next();
      out.push({ id: `${rid}-${d}`, level: r < 0.72 ? 'free' : r < 0.9 ? 'slow' : 'jam', coords });
    }
  }
  return out;
}

export const TRAFFIC: TrafficSegment[] = buildTraffic();
