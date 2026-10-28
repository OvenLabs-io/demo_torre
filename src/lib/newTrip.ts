import type { CrewMember, Geofence, LatLng, LogEntry, Trip, TripLeg, Unit, User } from '@/types/domain';
import { daysUntil, fmtDuration, normalize } from './format';
import { haversine } from './geo';
import { ROUTES } from '@/mocks/routes.generated';
import { getRoutePath, routeId } from '@/mocks/routes';
import { crewName } from '@/mocks/crew';
import { legLabel } from '@/mocks/trips';
import { TENANT_NAME } from '@/config/brand';

/** Parada intermedia: geocerca + hora de entrega en esa parada. */
export interface StopForm {
  id: string;
  geofenceId: string;
  at: string;
}

/** "Nuevo viaje", reduced to what the user knows when the trip is booked. */
export interface NewTripForm {
  /** Optional: empty = automatic folio. */
  folio: string;
  unitId: string;
  groupId: string;
  /** Up to 2 trailers (labels "CH-201 · 40 pies"); '' = not chosen. */
  trailers: string[];
  carrier: string;
  driverName: string;
  driverPhone: string;
  notes: string;
  georouteId: string;
  departureId: string;
  departureAt: string;
  arrivalId: string;
  arrivalAt: string;
  stops: StopForm[];
}

export const MAX_TRAILERS = 2;

/** Carriers seen in previous trips (the user can type a new one). */
export const CARRIERS = [TENANT_NAME, 'Fletes de Occidente', 'Autotransportes del Bajío', 'Logística Colima'];

const uid = () => crypto.randomUUID();

export function emptyForm(): NewTripForm {
  return {
    folio: '',
    unitId: '',
    groupId: '',
    trailers: [''],
    carrier: TENANT_NAME,
    driverName: '',
    driverPhone: '',
    notes: '',
    georouteId: '',
    departureId: '',
    departureAt: '',
    arrivalId: '',
    arrivalAt: '',
    stops: [],
  };
}

export function newStop(): StopForm {
  return { id: uid(), geofenceId: '', at: '' };
}

/* ---------- Dates ---------- */

export function parseLocal(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** ms → value for <input type="datetime-local"> */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------- Route ---------- */

/** Geofence ids in order: salida → paradas → destino (blank ones skipped). */
export function routeStops(f: Pick<NewTripForm, 'departureId' | 'stops' | 'arrivalId'>): string[] {
  return [f.departureId, ...f.stops.map((s) => s.geofenceId), f.arrivalId].filter(Boolean);
}

export interface SegmentEstimate {
  minutes: number;
  km: number;
  path: LatLng[];
  /** No stored road route: straight line × 1.3. */
  approx: boolean;
}

export function centerOf(g: Pick<Geofence, 'shape'>): LatLng {
  const s = g.shape;
  if (s.kind === 'circle') return s.center;
  const pts = s.kind === 'polygon' ? s.points : s.path;
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

/** Driving estimate between two geofences: road route when we have it, straight line otherwise. */
export function segmentEstimate(fromId: string, toId: string, geofences: Geofence[]): SegmentEstimate | null {
  const data = ROUTES[routeId(fromId, toId)] ?? ROUTES[routeId(toId, fromId)];
  if (data) {
    // Heavy trucks: ~20 % slower than the car routing profile.
    return {
      minutes: Math.round((data.durationS * 1.2) / 60),
      km: Math.round(data.distanceM / 1000),
      path: getRoutePath(routeId(fromId, toId))?.coords ?? [],
      approx: false,
    };
  }
  const a = geofences.find((g) => g.id === fromId);
  const b = geofences.find((g) => g.id === toId);
  if (!a || !b) return null;
  const km = Math.round((haversine(centerOf(a), centerOf(b)) * 1.3) / 1000);
  return { minutes: Math.max(20, Math.round((km / 55) * 60)), km, path: [centerOf(a), centerOf(b)], approx: true };
}

export function estimateRoute(stops: string[], geofences: Geofence[]): SegmentEstimate[] {
  const out: SegmentEstimate[] = [];
  for (let i = 1; i < stops.length; i++) {
    const e = segmentEstimate(stops[i - 1], stops[i], geofences);
    if (e) out.push(e);
  }
  return out;
}

/* ---------- Driver ---------- */

export function findDriver(name: string, crew: CrewMember[]): CrewMember | undefined {
  const q = normalize(name.trim());
  return q ? crew.find((c) => c.role === 'driver' && normalize(crewName(c)) === q) : undefined;
}

export const phoneDigits = (p: string) => p.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');

/* ---------- Validation ---------- */

export type CheckLevel = 'ok' | 'warn' | 'error';
export interface Check {
  level: CheckLevel;
  text: string;
  /** Field the check points to (to scroll / highlight it). */
  field?: string;
}

export interface ValidationContext {
  units: Unit[];
  crew: CrewMember[];
  geofences: Geofence[];
  usedIds: string[];
  /** Trailer label → trip using it. */
  trailersInUse: Map<string, string>;
  now: number;
}

export function validate(f: NewTripForm, ctx: ValidationContext): Check[] {
  const checks: Check[] = [];
  const err = (text: string, field?: string) => checks.push({ level: 'error', text, field });
  const warn = (text: string, field?: string) => checks.push({ level: 'warn', text, field });
  const ok = (text: string, field?: string) => checks.push({ level: 'ok', text, field });

  // Folio
  const folio = f.folio.trim().toUpperCase();
  if (folio && ctx.usedIds.includes(folio)) err(`Ya existe un viaje con el folio ${folio}`, 'folio');

  // Unit
  const unit = ctx.units.find((u) => u.id === f.unitId);
  if (!unit) err('Falta la unidad', 'unit');
  else if (unit.status === 'maintenance') err(`La unidad ${unit.economic} está en taller`, 'unit');
  else if (unit.status === 'on_trip') err(`La unidad ${unit.economic} ya está en el viaje ${unit.currentTripId}`, 'unit');
  else if (unit.gps.signal === 'offline') err(`La unidad ${unit.economic} no tiene señal GPS`, 'unit');
  else {
    ok(`Unidad ${unit.economic} con GPS reportando`, 'unit');
    if (unit.maintenanceWarning) warn(`Unidad ${unit.economic}: ${unit.maintenanceWarning}`, 'unit');
  }

  // Trailers
  const chosen = f.trailers.filter(Boolean);
  if (new Set(chosen).size !== chosen.length) err('El mismo remolque está elegido dos veces', 'trailers');
  chosen.forEach((t) => {
    const trip = ctx.trailersInUse.get(t);
    if (trip) err(`El remolque ${t.split(' · ')[0]} está en el viaje ${trip}`, 'trailers');
  });

  // Carrier & driver
  if (!f.carrier.trim()) err('Falta la línea transportista', 'carrier');
  if (!f.driverName.trim()) err('Falta el nombre del operador', 'driver');
  else {
    const driver = findDriver(f.driverName, ctx.crew);
    if (driver) {
      const lic = daysUntil(driver.license.expiresOn, ctx.now);
      if (driver.status !== 'available') err(`${crewName(driver)} ya tiene un viaje activo (${driver.assignment?.tripId ?? ''})`, 'driver');
      else if (lic < 0) err(`La licencia de ${crewName(driver)} está vencida`, 'driver');
      else {
        ok(`${crewName(driver)} disponible y con licencia vigente`, 'driver');
        if (lic <= 15) warn(`La licencia de ${crewName(driver)} vence en ${lic} días`, 'driver');
      }
    } else if (f.driverName.trim().split(/\s+/).length < 2) {
      err('Escribe nombre y apellido del operador', 'driver');
    } else {
      warn(`${f.driverName.trim()} es un operador nuevo: se agregará en Usuarios → Operadores`, 'driver');
    }
  }
  const digits = phoneDigits(f.driverPhone);
  if (f.driverPhone.trim() && digits.length !== 10) err('El celular debe tener 10 dígitos', 'phone');

  // Route
  const dep = parseLocal(f.departureAt);
  const arr = parseLocal(f.arrivalAt);
  if (!f.departureId) err('Falta la salida', 'departure');
  if (!dep) err('Falta la hora de inicio', 'departureAt');
  else if (dep < ctx.now - 60 * 60_000) warn('La hora de inicio ya pasó', 'departureAt');
  if (!f.arrivalId) err('Falta el destino', 'arrival');
  if (!arr) err('Falta la hora de entrega', 'arrivalAt');

  let prev = dep;
  f.stops.forEach((s, i) => {
    const n = i + 1;
    if (!s.geofenceId) err(`Parada ${n}: falta elegir el lugar`, `stop${i}`);
    const at = parseLocal(s.at);
    if (!at) err(`Parada ${n}: falta la hora de entrega`, `stop${i}At`);
    else if (prev && at <= prev) err(`Parada ${n}: la hora de entrega debe ser después de ${i === 0 ? 'la hora de inicio' : `la parada ${i}`}`, `stop${i}At`);
    if (at) prev = at;
  });
  if (arr && prev && arr <= prev) err(`La hora de entrega debe ser después de ${f.stops.length ? 'la última parada' : 'la hora de inicio'}`, 'arrivalAt');

  const stops = routeStops(f);
  for (let i = 1; i < stops.length; i++) if (stops[i] === stops[i - 1]) err('Hay dos puntos seguidos en el mismo lugar', 'route');

  if (dep && arr && arr > dep && f.departureId && f.arrivalId) {
    const minutes = estimateRoute(stops, ctx.geofences).reduce((s, e) => s + e.minutes, 0);
    const available = (arr - dep) / 60_000;
    if (minutes > 0 && available < minutes) warn(`La ruta toma ~${fmtDuration(minutes)} y solo hay ${fmtDuration(available)} entre inicio y entrega`, 'arrivalAt');
    else if (minutes > 0) ok(`Ruta de ~${fmtDuration(minutes)}: llega a tiempo`, 'route');
  }

  const rank: Record<CheckLevel, number> = { error: 0, warn: 1, ok: 2 };
  return checks.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ---------- Build ---------- */

export function nextTripId(ids: string[]): string {
  const nums = ids.map((id) => Number(id.split('-').pop())).filter((n) => !Number.isNaN(n));
  return `SRV-2603-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
}

export function buildTrip(
  f: NewTripForm,
  ctx: { id: string; unit: Unit; driverId: string; user: User; geofences: Geofence[]; warnings: string[] },
): Trip {
  const now = Date.now();
  const dep = parseLocal(f.departureAt) ?? now;
  const arr = parseLocal(f.arrivalAt) ?? dep;
  const points = [
    { kind: 'departure' as const, geofenceId: f.departureId, at: dep },
    ...f.stops.map((s) => ({ kind: 'stop' as const, geofenceId: s.geofenceId, at: parseLocal(s.at) ?? dep })),
    { kind: 'arrival' as const, geofenceId: f.arrivalId, at: arr },
  ];
  const legs: TripLeg[] = points.map((p, i) => {
    const e = i > 0 ? segmentEstimate(points[i - 1].geofenceId, p.geofenceId, ctx.geofences) : null;
    return {
      index: i + 1,
      kind: p.kind,
      label: legLabel(p.kind),
      geofenceId: p.geofenceId,
      window: i === 0 ? { from: p.at } : { from: points[i - 1].at, to: p.at },
      estimate: e ? { minutes: e.minutes, km: e.km } : undefined,
    };
  });
  const departure = ctx.geofences.find((g) => g.id === f.departureId);
  const trailers = f.trailers.filter(Boolean);
  const log: LogEntry[] = [
    ...ctx.warnings.map((w, i) => ({
      id: `${ctx.id}-w${i}`,
      at: now,
      kind: 'note' as const,
      title: `Advertencia al crear el viaje: ${w}`,
      author: 'Sistema',
      photos: [],
    })),
    ...(f.notes.trim()
      ? [{ id: `${ctx.id}-notes`, at: now, kind: 'note' as const, title: `Notas del viaje: ${f.notes.trim()}`, author: ctx.user.name, meta: ctx.user.title, photos: [] }]
      : []),
    { id: `${ctx.id}-created`, at: now, kind: 'note', title: 'Viaje creado', author: ctx.user.name, meta: `${ctx.user.title} · Nuevo viaje`, photos: [] },
  ];
  return {
    id: ctx.id,
    modality: 'single',
    clientId: '',
    groupId: f.groupId || null,
    containers: [],
    unitId: ctx.unit.id,
    driverId: ctx.driverId,
    chassis: trailers[0],
    trailers,
    carrier: f.carrier.trim(),
    notes: f.notes.trim() || undefined,
    georouteId: f.georouteId || undefined,
    lock: { id: 'Sin candado', state: 'closed' },
    escort: { required: false },
    legs,
    currentLeg: 1,
    phaseLabel: 'Programado',
    eta: arr,
    severity: 'ok',
    status: 'active',
    live: {
      position: departure ? centerOf(departure) : [19.0522, -104.3158],
      heading: 0,
      speedKmh: 0,
      lastGpsAt: now,
      reporting: 'live',
      routeId: points.length > 1 ? routeId(points[0].geofenceId, points[1].geofenceId) : undefined,
      routeProgressM: 0,
      locationLabel: departure ? departure.name : `Base ${ctx.unit.base ?? 'Manzanillo'}`,
    },
    log,
    track: [],
    shareLink: { enabled: false, contacts: [] },
    ruleIds: ['R-01', 'R-02', 'R-05'],
    createdAt: now,
  };
}
