import type { AlertRule, Client, CrewMember, Geofence, LatLng, LegKind, LogEntry, Movement, Trip, TripLeg, Unit, User } from '@/types/domain';
import { validateContainer, shippingLineFor } from './iso6346';
import { daysUntil, fmtDate, fmtDuration, fmtTime } from './format';
import { buildPath, distanceToPath, haversine, pointAt, type Path } from './geo';
import { ROUTES } from '@/mocks/routes.generated';
import { getRoutePath, routeId } from '@/mocks/routes';
import { RISK_ZONES, type RiskZone } from '@/mocks/mapLayers';
import { PLACES } from '@/mocks/places';
import { crewName } from '@/mocks/crew';
import { legLabel } from '@/mocks/trips';

export interface LegForm {
  id: string;
  kind: LegKind;
  geofenceId: string;
  window: string;
}

export interface ContainerForm {
  number: string;
  isoType: '20DC' | '40HC' | '40RF';
  seal: string;
}

export interface NewTripForm {
  movement: Movement;
  modality: 'single' | 'full';
  clientId: string;
  booking: string;
  clientRef: string;
  groupId: string;
  pickupAt: string;
  containers: ContainerForm[];
  grossWeightKg: string;
  shippingLine: string;
  terminalId: string;
  freeDaysEnd: string;
  cargo: string;
  legs: LegForm[];
  driverId: string;
  unitId: string;
  chassis: string;
  lockId: string;
  escortRequired: boolean;
  escortId: string;
  escortLegs: string;
  shareLink: boolean;
  contacts: string[];
}

export const LEG_KINDS: LegKind[] = ['terminal_pickup', 'empty_pickup', 'client_delivery', 'client_loading', 'empty_return', 'terminal_delivery'];

export const SHIPPING_LINES = ['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'ONE', 'COSCO', 'Evergreen'];
export const CARGO_TYPES = ['General · no peligrosa', 'Peligrosa (IMO)', 'Refrigerada', 'Sobredimensionada'];

const uid = () => crypto.randomUUID();

export function emptyForm(): NewTripForm {
  return {
    movement: 'IMP',
    modality: 'single',
    clientId: '',
    booking: '',
    clientRef: '',
    groupId: '',
    pickupAt: '',
    containers: [{ number: '', isoType: '40HC', seal: '' }],
    grossWeightKg: '',
    shippingLine: '',
    terminalId: '',
    freeDaysEnd: '',
    cargo: CARGO_TYPES[0],
    legs: [
      { id: uid(), kind: 'terminal_pickup', geofenceId: '', window: '' },
      { id: uid(), kind: 'client_delivery', geofenceId: '', window: '' },
    ],
    driverId: '',
    unitId: '',
    chassis: '',
    lockId: '',
    escortRequired: false,
    escortId: '',
    escortLegs: 'all',
    shareLink: true,
    contacts: [],
  };
}

export function newLeg(kind: LegKind = 'client_delivery'): LegForm {
  return { id: uid(), kind, geofenceId: '', window: '' };
}

/* ---------- Dates ---------- */

export function parseLocal(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** "27 oct · 07:30 h" */
export function windowText(ts: number): string {
  return `${fmtDate(ts)} · ${fmtTime(ts)} h`;
}

/* ---------- Leg estimates ---------- */

export interface LegEstimate {
  minutes: number;
  km?: number;
  text: string;
  path: LatLng[] | null;
  approx?: boolean;
}

const DWELL_MIN = 90;

export function centerOf(g: Pick<Geofence, 'shape'>): LatLng {
  const s = g.shape;
  if (s.kind === 'circle') return s.center;
  const pts = s.kind === 'polygon' ? s.points : s.path;
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
}

export function estimateLegs(legs: LegForm[], geofences: Geofence[]): LegEstimate[] {
  return legs.map((leg, i) => {
    if (i === 0) {
      const where = leg.kind === 'empty_pickup' ? 'en patio' : leg.kind === 'terminal_pickup' ? 'en terminal' : 'en sitio';
      return { minutes: DWELL_MIN, text: `${fmtDuration(DWELL_MIN)} ${where}`, path: null };
    }
    const prev = legs[i - 1].geofenceId;
    if (!prev || !leg.geofenceId) return { minutes: 0, text: '—', path: null };
    const data = ROUTES[routeId(prev, leg.geofenceId)] ?? ROUTES[routeId(leg.geofenceId, prev)];
    if (data) {
      // Heavy trucks: ~20 % slower than the car routing profile.
      const minutes = Math.round((data.durationS * 1.2) / 60);
      const km = Math.round(data.distanceM / 1000);
      return { minutes, km, text: `${fmtDuration(minutes)} · ${km} km`, path: getRoutePath(routeId(prev, leg.geofenceId))?.coords ?? null };
    }
    const a = geofences.find((g) => g.id === prev);
    const b = geofences.find((g) => g.id === leg.geofenceId);
    if (!a || !b) return { minutes: 0, text: '—', path: null };
    const km = Math.round((haversine(centerOf(a), centerOf(b)) * 1.3) / 1000);
    const minutes = Math.max(20, Math.round((km / 55) * 60));
    return { minutes, km, text: `${fmtDuration(minutes)} · ${km} km aprox.`, path: [centerOf(a), centerOf(b)], approx: true };
  });
}

const zonePaths = new Map<string, Path>();

function insideZone(zone: RiskZone, p: LatLng): boolean {
  const s = zone.shape;
  if (s.kind === 'circle') return haversine(p, s.center) < s.radiusM;
  if (s.kind === 'polygon') return s.points.some((z) => haversine(p, z) < 1500);
  let path = zonePaths.get(zone.id);
  if (!path) {
    path = buildPath(s.path);
    zonePaths.set(zone.id, path);
  }
  return distanceToPath(path, p) < s.widthM / 2;
}

/**
 * Risk zones each leg really drives through (≥ 3 km inside), reported once per
 * zone at the first leg that crosses it.
 */
export function riskCrossings(estimates: LegEstimate[]): { legIndex: number; zone: RiskZone }[] {
  const out: { legIndex: number; zone: RiskZone }[] = [];
  const seen = new Set<string>();
  estimates.forEach((e, i) => {
    if (!e.path || e.path.length < 2) return;
    const path = buildPath(e.path);
    for (const zone of RISK_ZONES) {
      if (seen.has(zone.id)) continue;
      let insideKm = 0;
      for (let d = 0; d <= path.length; d += 1000) if (insideZone(zone, pointAt(path, d).pos)) insideKm++;
      if (insideKm >= 3) {
        seen.add(zone.id);
        out.push({ legIndex: i, zone });
      }
    }
  });
  return out;
}

/* ---------- Validation ---------- */

export type CheckLevel = 'ok' | 'warn' | 'error';
export interface Check {
  level: CheckLevel;
  text: string;
}

export interface ValidationContext {
  units: Unit[];
  crew: CrewMember[];
  now: number;
}

export function containerError(c: ContainerForm): string | null {
  if (!c.number.trim()) return null;
  const v = validateContainer(c.number);
  if (v.ok) return null;
  if (v.reason === 'format') return 'Formato: 4 letras + 7 dígitos (ej. MSKU7731403)';
  return `Dígito de control inválido (debería terminar en ${v.expected})`;
}

export function validate(f: NewTripForm, ctx: ValidationContext): Check[] {
  const checks: Check[] = [];
  const err = (text: string) => checks.push({ level: 'error', text });
  const warn = (text: string) => checks.push({ level: 'warn', text });
  const ok = (text: string) => checks.push({ level: 'ok', text });

  // General data
  if (!f.clientId) err('Falta el cliente');
  if (!f.booking.trim()) err('Falta el BL / Booking');
  if (!f.pickupAt) err('Falta la cita de retiro en terminal');

  // Container(s)
  const containerProblems = f.containers.flatMap((c, i) => {
    const label = f.containers.length > 1 ? `Contenedor ${i + 1}` : 'Contenedor';
    if (!c.number.trim()) return [`${label}: falta el número`];
    const e = containerError(c);
    return e ? [`${label}: ${e.charAt(0).toLowerCase()}${e.slice(1)}`] : [];
  });
  containerProblems.forEach(err);
  if (!containerProblems.length) {
    const days = f.freeDaysEnd ? daysUntil(new Date(`${f.freeDaysEnd}T23:59`).getTime(), ctx.now) : null;
    if (days !== null && days < 0) err('Días libres vencidos: habrá cargo por demora');
    else if (days === 0) warn('Días libres vencen hoy');
    else ok('Contenedor válido y con días libres');
  }

  // Driver
  const driver = ctx.crew.find((c) => c.id === f.driverId);
  if (!driver) err('Falta asignar operador');
  else {
    const lic = daysUntil(driver.license.expiresOn, ctx.now);
    const med = driver.medicalExpiresOn !== undefined ? daysUntil(driver.medicalExpiresOn, ctx.now) : 999;
    if (driver.status !== 'available') err(`${crewName(driver)} ya tiene un viaje activo`);
    else if (lic < 0) err(`Licencia de ${crewName(driver)} vencida`);
    else if (med < 0) err(`Apto médico de ${crewName(driver)} vencido`);
    else {
      ok('Operador con licencia y examen médico vigentes');
      if (lic <= 15) warn(`Licencia de ${crewName(driver)} vence en ${lic} días`);
      if (med <= 15) warn(`Apto médico de ${crewName(driver)} vence en ${med} días`);
    }
  }

  // Unit
  const unit = ctx.units.find((u) => u.id === f.unitId);
  if (!unit) err('Falta asignar tracto');
  else if (unit.status === 'maintenance') err(`Tracto ${unit.economic} está en taller`);
  else if (unit.status === 'on_trip') err(`Tracto ${unit.economic} está en el viaje ${unit.currentTripId}`);
  else if (unit.gps.signal === 'offline') err(`Tracto ${unit.economic} sin señal GPS`);
  else {
    ok(`Tracto con GPS reportando (hace ${Math.max(1, Math.round((ctx.now - unit.gps.lastSignalAt) / 1000))} s)`);
    if (unit.maintenanceWarning) warn(`Tracto ${unit.economic}: ${unit.maintenanceWarning}`);
  }
  if (!f.chassis) err('Falta remolque / chasis');

  // Seal(s)
  if (f.containers.some((c) => !c.seal.trim())) err(f.containers.length > 1 ? 'Falta el sello de un contenedor' : 'Falta el sello del contenedor');

  // Route
  if (f.legs.length < 2) err('La ruta necesita al menos 2 tramos');
  f.legs.forEach((l, i) => !l.geofenceId && err(`Tramo ${i + 1} sin geocerca`));

  // Escort
  if (f.escortRequired && !f.escortId) warn('Custodia requerida sin proveedor asignado');

  const rank: Record<CheckLevel, number> = { ok: 0, warn: 1, error: 2 };
  return checks.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ---------- Rules that apply ---------- */

const RULE_CHIP: Record<string, string> = {
  'R-01': 'Detención',
  'R-02': 'Sin señal',
  'R-03': 'Candado',
  'R-05': 'Desvío',
  'R-07': 'Días libres',
  'R-09': 'Zona de riesgo',
};

export function applicableRules(f: NewTripForm, crossesRisk: boolean, rules: AlertRule[]): { rule: AlertRule; label: string }[] {
  const ids = ['R-01', 'R-02', 'R-05'];
  if (f.movement === 'IMP') ids.push('R-07');
  if (f.lockId) ids.push('R-03');
  if (crossesRisk) ids.push('R-09');
  return ids
    .map((id) => rules.find((r) => r.id === id))
    .filter((r): r is AlertRule => Boolean(r))
    .map((rule) => ({ rule, label: `${rule.id} ${RULE_CHIP[rule.id] ?? rule.name}` }));
}

/* ---------- Build ---------- */

export function nextTripId(ids: string[]): string {
  const max = Math.max(...ids.map((id) => Number(id.split('-').pop())));
  return `SRV-2603-${String(max + 1).padStart(4, '0')}`;
}

export function buildTrip(
  f: NewTripForm,
  ctx: {
    id: string;
    unit: Unit;
    user: User;
    client?: Client;
    estimates: LegEstimate[];
    warnings: string[];
    ruleIds: string[];
    escort?: CrewMember;
    escortProvider?: string;
  },
): Trip {
  const now = Date.now();
  const pickup = parseLocal(f.pickupAt) ?? now + 60 * 60_000;
  let t = pickup;
  const legs: TripLeg[] = f.legs.map((l, i) => {
    const e = ctx.estimates[i];
    const from = t;
    t += (e?.minutes ?? 0) * 60_000;
    return {
      index: i + 1,
      kind: l.kind,
      label: legLabel(l.kind),
      geofenceId: l.geofenceId,
      window: i === 0 ? { from: pickup } : { from, to: t },
      estimate: e ? { minutes: e.minutes, km: e.km } : undefined,
    };
  });
  const eta = pickup + ((ctx.estimates[0]?.minutes ?? 0) + (ctx.estimates[1]?.minutes ?? 0)) * 60_000;
  const basePos = ctx.unit.base === 'Guadalajara' ? PLACES.gdlIndustrial.pos : PLACES.patioMaersk.pos;
  const log: LogEntry[] = [
    ...ctx.warnings.map((w, i) => ({
      id: `${ctx.id}-w${i}`,
      at: now,
      kind: 'note' as const,
      title: `Advertencia al crear el viaje: ${w}`,
      author: 'Sistema',
      photos: [],
    })),
    { id: `${ctx.id}-created`, at: now, kind: 'note', title: 'Viaje creado', author: ctx.user.name, meta: `${ctx.user.title} · Nuevo viaje`, photos: [] },
  ];
  const freeEnd = f.freeDaysEnd ? new Date(`${f.freeDaysEnd}T23:59`).getTime() : undefined;
  return {
    id: ctx.id,
    movement: f.movement,
    modality: f.modality,
    clientId: f.clientId,
    booking: f.booking.trim().toUpperCase(),
    clientRef: f.clientRef.trim() || undefined,
    groupId: f.groupId || null,
    containers: f.containers.map((c) => ({
      number: c.number.trim().toUpperCase(),
      isoType: c.isoType,
      shippingLine: f.shippingLine || shippingLineFor(c.number),
      seal: c.seal.trim().toUpperCase(),
      grossWeightKg: Number(f.grossWeightKg.replace(/[^\d]/g, '')) || undefined,
      freeDaysEnd: freeEnd,
    })),
    unitId: ctx.unit.id,
    driverId: f.driverId,
    chassis: f.chassis,
    lock: { id: f.lockId || 'Sin candado', state: 'closed' },
    escort: f.escortRequired
      ? {
          required: true,
          escortId: ctx.escort?.id,
          provider: ctx.escort?.provider ?? ctx.escortProvider,
          legIndexes: f.escortLegs === 'all' ? legs.map((l) => l.index) : [Number(f.escortLegs)],
        }
      : { required: false },
    legs,
    currentLeg: 1,
    phaseLabel: 'Programado',
    eta,
    severity: 'ok',
    status: 'active',
    live: {
      position: basePos,
      heading: 0,
      speedKmh: 0,
      lastGpsAt: now,
      reporting: 'live',
      routeId: f.legs.length > 1 ? routeId(f.legs[0].geofenceId, f.legs[1].geofenceId) : undefined,
      routeProgressM: 0,
      locationLabel: `Base ${ctx.unit.base ?? 'Manzanillo'}`,
    },
    log,
    track: [],
    shareLink: { enabled: f.shareLink, contacts: f.contacts },
    ruleIds: ctx.ruleIds,
    createdAt: now,
  };
}
