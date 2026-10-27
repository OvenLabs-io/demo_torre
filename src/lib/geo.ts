import type { LatLng } from '@/types/domain';

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing a → b in degrees (0 = north, clockwise). */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export function compass(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8];
}

export interface Path {
  coords: LatLng[];
  /** Cumulative distance (m) at each vertex. */
  cum: number[];
  length: number;
}

export function buildPath(coords: LatLng[]): Path {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  return { coords, cum, length: cum[cum.length - 1] ?? 0 };
}

/** Position and heading at `dist` meters along the path. */
export function pointAt(path: Path, dist: number): { pos: LatLng; heading: number } {
  const { coords, cum } = path;
  if (coords.length === 1) return { pos: coords[0], heading: 0 };
  const d = Math.max(0, Math.min(dist, path.length));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = coords[i - 1];
  const b = coords[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / seg;
  return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], heading: bearing(a, b) };
}

/** Distance along the path of the point closest to `pos` (projected on segments). */
export function projectOnPath(path: Path, pos: LatLng): number {
  const { coords, cum } = path;
  let best = 0;
  let bestD = Infinity;
  const kx = Math.cos(rad(pos[0]));
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const ax = a[1] * kx;
    const ay = a[0];
    const bx = b[1] * kx;
    const by = b[0];
    const px = pos[1] * kx;
    const py = pos[0];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const dd = (px - qx) ** 2 + (py - qy) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = cum[i - 1] + t * (cum[i] - cum[i - 1]);
    }
  }
  return best;
}

/** Shortest distance (m) from a point to a path. */
export function distanceToPath(path: Path, pos: LatLng): number {
  return haversine(pos, pointAt(path, projectOnPath(path, pos)).pos);
}

/** Sub-path between two distances (meters). */
export function slicePath(path: Path, from: number, to: number): LatLng[] {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(path.length, Math.max(from, to));
  const out: LatLng[] = [pointAt(path, a).pos];
  for (let i = 0; i < path.coords.length; i++) if (path.cum[i] > a && path.cum[i] < b) out.push(path.coords[i]);
  out.push(pointAt(path, b).pos);
  return out;
}

/** Point offset perpendicular to the heading (meters; positive = right). */
export function offsetPoint(pos: LatLng, headingDeg: number, meters: number): LatLng {
  const ang = rad(headingDeg + 90);
  const dLat = (meters * Math.cos(ang)) / 111_320;
  const dLng = (meters * Math.sin(ang)) / (111_320 * Math.cos(rad(pos[0])));
  return [pos[0] + dLat, pos[1] + dLng];
}
