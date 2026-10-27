import type { Alert, Geofence, LatLng, LogEntry, TrackPoint, Trip } from '@/types/domain';
import { bearing, offsetPoint, pointAt, projectOnPath, type Path } from './geo';
import { createRng } from './random';
import { fmtDuration } from './format';
import { stopInfo } from './tripView';
import { dt, T0 } from './mockTime';
import { getRoutePath, routeId } from '@/mocks/routes';
import { describePosition, PLACES } from '@/mocks/places';

export interface TrackRecord extends TrackPoint {
  id: string;
  /** -1 = no speed ("—"). */
  speedKmh: number;
}

export interface MoveSample {
  at: number;
  pos: LatLng;
  speed: number;
}

export interface TrackData {
  records: TrackRecord[];
  samples: MoveSample[];
  planned: LatLng[][];
  start: number;
  end: number;
}

interface Key {
  at: number;
  pos?: LatLng;
  dist?: number;
  speed: number;
}

const LOG_TONE: Record<LogEntry['kind'], TrackPoint['tone']> = {
  alert: 'critical',
  call: 'high',
  gps: 'muted',
  geofence: 'success',
  note: 'info',
  incident: 'warning',
};

function keyPos(k: Key, path: Path | null): LatLng {
  if (k.pos) return k.pos;
  return path ? pointAt(path, k.dist ?? 0).pos : [0, 0];
}

/** Position/speed at time t from keyframes (along the road when both keys have a distance). */
function sampleKeys(keys: Key[], t: number, path: Path | null): { pos: LatLng; moving: boolean; speed: number } {
  if (t <= keys[0].at) return { pos: keyPos(keys[0], path), moving: false, speed: keys[0].speed };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= b.at) {
      const f = (t - a.at) / (b.at - a.at || 1);
      if (path && a.dist !== undefined && b.dist !== undefined && !a.pos && !b.pos) {
        return { pos: pointAt(path, a.dist + (b.dist - a.dist) * f).pos, moving: b.dist !== a.dist, speed: b.speed };
      }
      const pa = keyPos(a, path);
      const pb = keyPos(b, path);
      const moving = pa[0] !== pb[0] || pa[1] !== pb[1];
      return { pos: [pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f], moving, speed: b.speed };
    }
  }
  const last = keys[keys.length - 1];
  return { pos: keyPos(last, path), moving: false, speed: last.speed };
}

function plannedRoutes(trip: Trip): LatLng[][] {
  const out: LatLng[][] = [];
  for (let i = 0; i < trip.legs.length - 1; i++) {
    const p = getRoutePath(routeId(trip.legs[i].geofenceId, trip.legs[i + 1].geofenceId));
    if (p) out.push(p.coords);
  }
  const current = getRoutePath(trip.live.routeId);
  if (current && !out.some((c) => c === current.coords)) out.unshift(current.coords);
  return out;
}

/** Builds the recorded history of a trip up to `now` (positions, stops and events). */
export function buildTrack(trip: Trip, alerts: Alert[], geofences: Geofence[], now: number): TrackData {
  return trip.id === 'SRV-2603-0186' ? buildDesignTrack(trip, alerts, now) : buildGenericTrack(trip, alerts, geofences, now);
}

function finalize(
  trip: Trip,
  keys: Key[],
  path: Path | null,
  events: Omit<TrackRecord, 'id'>[],
  stepMs: number,
  lastReport: number,
  cruise: number,
): TrackData {
  const rng = createRng(trip.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0));
  const start = Math.min(keys[0].at, ...events.map((e) => e.at));
  const samples: MoveSample[] = [];
  const records: Omit<TrackRecord, 'id'>[] = [...events];
  for (let t = keys[0].at; t <= lastReport; t += stepMs) {
    const s = sampleKeys(keys, t, path);
    const speed = s.moving ? Math.max(20, Math.round((s.speed || cruise) + rng.next() * 12 - 6)) : 0;
    samples.push({ at: t, pos: s.pos, speed });
    if (!events.some((e) => Math.abs(e.at - t) < stepMs / 2)) {
      records.push({ at: t, position: s.pos, speedKmh: speed, heading: 0, kind: 'position', label: `Posición · ${describePosition(s.pos)}`, tone: 'muted' });
    }
  }
  const lastSample = sampleKeys(keys, lastReport, path);
  samples.push({ at: lastReport, pos: lastSample.pos, speed: 0 });
  records.sort((a, b) => a.at - b.at || (a.kind === 'position' ? 1 : -1));
  const end = Math.max(lastReport, ...records.map((r) => r.at));
  return {
    records: records.map((r, i) => ({ ...r, id: `${trip.id}-r${i}` })),
    samples,
    planned: plannedRoutes(trip),
    start,
    end,
  };
}

function alertEvents(trip: Trip, alerts: Alert[], posAt: (t: number) => LatLng): Omit<TrackRecord, 'id'>[] {
  return alerts
    .filter((a) => a.tripId === trip.id)
    .map((a) => ({
      at: a.createdAt,
      position: posAt(a.createdAt),
      speedKmh: -1,
      heading: 0,
      kind: 'event' as const,
      label: `Alerta ${a.ruleId} generada · ${a.title}`,
      tone: 'critical' as const,
    }));
}

function logEvents(trip: Trip, posAt: (t: number) => LatLng, onlySince?: number): Omit<TrackRecord, 'id'>[] {
  return trip.log
    .filter((l) => onlySince === undefined || l.at >= onlySince)
    .map((l) => ({
      at: l.at,
      position: l.position ?? posAt(l.at),
      speedKmh: -1,
      heading: 0,
      kind: 'event' as const,
      label: l.photos.length ? `${l.title} (${l.photos.length} ${l.photos.length === 1 ? 'foto' : 'fotos'})` : l.title,
      tone: LOG_TONE[l.kind],
    }));
}

function buildGenericTrack(trip: Trip, alerts: Alert[], geofences: Geofence[], now: number): TrackData {
  const path = getRoutePath(trip.live.routeId);
  const progress = trip.live.routeProgressM ?? 0;
  const moving = trip.live.speedKmh > 0;
  const cruise = moving ? trip.live.speedKmh : 62;
  const lastReport = trip.live.reporting === 'silent' ? trip.live.lastGpsAt : now;
  const stoppedAt = moving ? now : Math.min(trip.live.stoppedSince ?? lastReport, lastReport);
  const travelMs = progress > 300 ? (progress / (cruise / 3.6)) * 1000 : 20 * 60_000;
  // If the log records the departure ("Salida de …"), the recorded track starts there.
  const loggedDeparture = trip.log
    .filter((l) => l.kind === 'geofence' && l.title.startsWith('Salida') && l.at < stoppedAt - 10 * 60_000)
    .sort((a, b) => a.at - b.at)[0];
  const depart = loggedDeparture?.at ?? stoppedAt - travelMs;

  const keys: Key[] = [
    { at: depart, dist: 0, speed: 0 },
    { at: stoppedAt, dist: progress, speed: cruise },
  ];
  if (!moving) keys.push({ at: Math.max(lastReport, stoppedAt + 1), pos: trip.live.position, speed: 0 });
  const posAt = (t: number) => sampleKeys(keys, t, path).pos;

  const fromId = trip.live.routeId?.split('>')[0];
  const fromName = geofences.find((g) => g.id === fromId)?.name ?? describePosition(posAt(depart));
  const events: Omit<TrackRecord, 'id'>[] = [
    ...(loggedDeparture
      ? []
      : [{ at: depart, position: posAt(depart), speedKmh: 0, heading: 0, kind: 'event' as const, label: `Inicio del viaje · salida de ${fromName}`, tone: 'success' as const }]),
    ...logEvents(trip, posAt),
    ...alertEvents(trip, alerts, posAt),
  ];
  const stop = stopInfo(trip, lastReport);
  if (stop && trip.live.stoppedSince) {
    events.push({
      at: trip.live.stoppedSince,
      position: trip.live.position,
      speedKmh: 0,
      heading: 0,
      kind: 'stop',
      label: `Parada · ${stop.reason.toLowerCase()} (${fmtDuration((lastReport - trip.live.stoppedSince) / 60_000)})`,
      tone: stop.alarm ? 'critical' : 'warning',
    });
  }
  if (trip.live.reporting === 'silent') {
    events.push({ at: lastReport, position: trip.live.position, speedKmh: 0, heading: 0, kind: 'event', label: `Última posición · ${trip.live.locationLabel}`, tone: 'critical' });
    if (now - lastReport > 30 * 60_000)
      events.push({ at: lastReport + 30 * 60_000, position: trip.live.position, speedKmh: -1, heading: 0, kind: 'event', label: 'Sin posición > 30 min', tone: 'critical' });
  }
  return finalize(trip, keys, path, events, 60_000, lastReport, cruise);
}

/** SRV-2603-0186: the exact story drawn in Figma 03b. */
function buildDesignTrack(trip: Trip, alerts: Alert[], now: number): TrackData {
  const path = getRoutePath(trip.live.routeId)!;
  const d = (pos: LatLng) => projectOnPath(path, pos);
  const atenquique = d(PLACES.atenquique.pos);
  const detour = pointAt(path, atenquique - 4000);
  const keys: Key[] = [
    { at: dt('07:33'), pos: PLACES.patioMaersk.pos, speed: 0 },
    { at: dt('07:48'), dist: 0, speed: 12 },
    { at: dt('09:13'), dist: 0, speed: 0 },
    { at: dt('09:14'), dist: 300, speed: 18 },
    { at: dt('09:22'), dist: d(PLACES.colimaLib.pos), speed: 71 },
    { at: dt('09:35'), dist: d(PLACES.colimaLib.pos) + 22_000, speed: 74 },
    { at: dt('09:48'), dist: d(PLACES.tonila.pos), speed: 66 },
    { at: dt('09:52'), pos: offsetPoint(detour.pos, detour.heading, 2100), speed: 54 },
    { at: dt('09:57'), pos: trip.live.position, speed: 0 },
  ];
  // The port entry key needs an explicit position (it follows a straight segment from the base).
  keys[1].pos = pointAt(path, 0).pos;
  const posAt = (t: number) => sampleKeys(keys, t, path).pos;
  const ev = (time: string, kind: TrackPoint['kind'], label: string, tone: TrackPoint['tone'], speed: number): Omit<TrackRecord, 'id'> => ({
    at: dt(time),
    position: posAt(dt(time)),
    speedKmh: speed,
    heading: 0,
    kind,
    label,
    tone,
  });
  const events = [
    ev('07:33', 'event', 'Inicio del viaje · salida de base Manzanillo', 'success', 0),
    ev('07:48', 'event', 'Entrada a geocerca CONTECON', 'info', 12),
    ev('07:56', 'stop', 'Parada en fila · puerta 3 (1 h 18 min)', 'warning', 0),
    ev('08:40', 'event', 'Nota del operador: fila ~40 min (2 fotos)', 'info', 0),
    ev('09:14', 'event', 'Salida de CONTECON · EIR sin daños', 'success', 18),
    ev('09:16', 'position', 'Posición · Autopista 54D km 41', 'muted', 62),
    ev('09:22', 'position', 'Posición · Libramiento de Colima', 'muted', 71),
    ev('09:35', 'position', 'Posición · Autopista 54D km 68', 'muted', 74),
    ev('09:48', 'position', 'Posición · Tonila', 'muted', 66),
    ev('09:52', 'event', 'Desvío de ruta · 2.1 km fuera de geocerca', 'high', 54),
    ev('09:57', 'event', 'Última posición · Atenquique · ignición OFF', 'critical', 0),
    ev('10:27', 'event', 'Sin posición > 30 min', 'critical', -1),
    ...alertEvents(trip, alerts, posAt),
    ev('10:47', 'event', 'Escalamiento: SLA vencido', 'critical', -1),
    // Events added live during the demo.
    ...logEvents(trip, posAt, T0 + 1),
  ];
  return finalize(trip, keys, path, events, 30_000, Math.min(dt('09:57'), now), 62);
}

/** Interpolated unit state at time t. */
export function sampleAt(samples: MoveSample[], t: number): { pos: LatLng; speed: number; heading: number } {
  if (!samples.length) return { pos: [0, 0], speed: 0, heading: 0 };
  if (t <= samples[0].at) return { pos: samples[0].pos, speed: samples[0].speed, heading: 0 };
  let lo = 0;
  let hi = samples.length - 1;
  if (t >= samples[hi].at) return { pos: samples[hi].pos, speed: 0, heading: headingNear(samples, hi) };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].at <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const f = (t - a.at) / (b.at - a.at || 1);
  return {
    pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * f, a.pos[1] + (b.pos[1] - a.pos[1]) * f],
    speed: a.speed,
    heading: headingNear(samples, hi),
  };
}

function headingNear(samples: MoveSample[], i: number): number {
  for (let j = i; j > 0; j--) {
    const a = samples[j - 1].pos;
    const b = samples[j].pos;
    if (a[0] !== b[0] || a[1] !== b[1]) return bearing(a, b);
  }
  return 0;
}
