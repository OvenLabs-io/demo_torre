import { create } from 'zustand';
import type { LatLng } from '@/types/domain';

/**
 * Road routes fetched at runtime from the public OSRM server for pairs that are
 * not in routes.generated.ts (any geofence → geofence the user picks). Cached in
 * memory and in this browser; if OSRM can't be reached the caller falls back to
 * a straight line.
 */
export interface RoadRoute {
  distanceM: number;
  durationS: number;
  coords: LatLng[];
}

type Entry = RoadRoute | 'loading' | 'failed';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const STORAGE_KEY = 'torre-road-routes';

function loadStored(): Record<string, RoadRoute> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function store(routes: Record<string, Entry>) {
  try {
    const ok = Object.fromEntries(Object.entries(routes).filter(([, v]) => typeof v === 'object'));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ok));
  } catch {
    /* storage full or blocked: the in-memory cache still works */
  }
}

/** Keeps one point every ~150 m: enough to draw the road, light to store. */
function thin(coords: LatLng[]): LatLng[] {
  const out: LatLng[] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const [a, b] = out[out.length - 1];
    if (Math.abs(coords[i][0] - a) + Math.abs(coords[i][1] - b) > 0.0015) out.push(coords[i]);
  }
  out.push(coords[coords.length - 1]);
  return out;
}

export const useRoadRoutes = create<{ routes: Record<string, Entry> }>()(() => ({ routes: loadStored() }));

const keyOf = (fromId: string, toId: string) => `${fromId}>${toId}`;

/** Cached road route (either direction), or undefined while unknown. */
export function cachedRoadRoute(fromId: string, toId: string): Entry | undefined {
  const { routes } = useRoadRoutes.getState();
  const direct = routes[keyOf(fromId, toId)];
  if (direct) return direct;
  const rev = routes[keyOf(toId, fromId)];
  return typeof rev === 'object' ? { ...rev, coords: [...rev.coords].reverse() } : rev;
}

/** Asks OSRM for the road route once per pair; components re-render through useRoadRoutes. */
export function requestRoadRoute(fromId: string, toId: string, from: LatLng, to: LatLng) {
  if (cachedRoadRoute(fromId, toId)) return;
  const key = keyOf(fromId, toId);
  const set = (entry: Entry) => {
    useRoadRoutes.setState((s) => ({ routes: { ...s.routes, [key]: entry } }));
    if (entry !== 'loading') store(useRoadRoutes.getState().routes);
  };
  set('loading');
  fetch(`${OSRM}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => {
      const route = data.routes?.[0];
      if (!route) throw new Error('sin ruta');
      const coords = (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as LatLng);
      set({ distanceM: route.distance, durationS: route.duration, coords: thin(coords) });
    })
    .catch(() => set('failed'));
}
