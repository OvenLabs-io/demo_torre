import type { LatLng } from '@/types/domain';
import { buildPath, type Path } from '@/lib/geo';
import { ROUTES } from './routes.generated';
import { cachedRoadRoute } from '@/lib/roadRoutes';

const cache = new Map<string, Path>();

/** Road path for a route id "from>to" (falls back to the reversed route). */
export function getRoutePath(routeId: string | undefined): Path | null {
  if (!routeId) return null;
  const hit = cache.get(routeId);
  if (hit) return hit;
  let coords = ROUTES[routeId]?.coords as LatLng[] | undefined;
  if (!coords) {
    const [from, to] = routeId.split('>');
    const rev = ROUTES[`${to}>${from}`]?.coords as LatLng[] | undefined;
    coords = rev ? [...rev].reverse() : undefined;
    // Routes fetched at runtime for trips created in the app.
    const road = cachedRoadRoute(from, to);
    if (!coords && road && typeof road === 'object') coords = road.coords;
  }
  if (!coords) return null;
  const path = buildPath(coords);
  cache.set(routeId, path);
  return path;
}

export function routeId(from: string, to: string): string {
  return `${from}>${to}`;
}

export function hasRoute(from: string, to: string): boolean {
  return Boolean(ROUTES[`${from}>${to}`] ?? ROUTES[`${to}>${from}`]);
}
