import type { GeofenceShape, LatLng } from '@/types/domain';
import { buildPath, distanceToPath, haversine } from './geo';
import { fmtNumber } from './format';

function pointInPolygon(p: LatLng, poly: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isInside(shape: GeofenceShape, p: LatLng): boolean {
  if (shape.kind === 'circle') return haversine(p, shape.center) <= shape.radiusM;
  if (shape.kind === 'polygon') return pointInPolygon(p, shape.points);
  return distanceToPath(buildPath(shape.path), p) <= shape.widthM / 2;
}

/** Planar area (km²) of a small lat/lng polygon. */
function polygonAreaKm2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const lat0 = (points.reduce((s, p) => s + p[0], 0) / points.length) * (Math.PI / 180);
  const xy = points.map(([lat, lng]) => [lng * 111.32 * Math.cos(lat0), lat * 110.57]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** "Polígono · 4 vértices · 2.4 km²" */
export function shapeSummary(shape: GeofenceShape): string {
  if (shape.kind === 'circle') return `Círculo · radio ${fmtNumber(Math.round(shape.radiusM))} m`;
  if (shape.kind === 'polygon') {
    const a = polygonAreaKm2(shape.points);
    return `Polígono · ${shape.points.length} vértices · ${a < 0.1 ? a.toFixed(2) : a.toFixed(1)} km²`;
  }
  const km = buildPath(shape.path).length / 1000;
  return `Corredor · ${km.toFixed(1)} km · ancho ${fmtNumber(shape.widthM)} m`;
}

export function shapeCenter(shape: GeofenceShape): LatLng {
  if (shape.kind === 'circle') return shape.center;
  const pts = shape.kind === 'polygon' ? shape.points : shape.path;
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

export function shapeBounds(shape: GeofenceShape): LatLng[] {
  if (shape.kind === 'circle') {
    const d = shape.radiusM / 111_320;
    const [lat, lng] = shape.center;
    const dl = d / Math.cos((lat * Math.PI) / 180);
    return [
      [lat - d, lng - dl],
      [lat + d, lng + dl],
    ];
  }
  return shape.kind === 'polygon' ? shape.points : shape.path;
}
