import type { Container, LegKind, LogEntry, Trip, TripLeg } from '@/types/domain';
import { dayEnd, dt, mins } from '@/lib/mockTime';
import { shippingLineFor } from '@/lib/iso6346';
import { pointAt, projectOnPath } from '@/lib/geo';
import { PLACES } from './places';
import { CLIENTS } from './clients';
import { getRoutePath, routeId } from './routes';

const LEG_LABEL: Record<LegKind, string> = {
  terminal_pickup: 'Retiro en terminal',
  client_delivery: 'Entrega en cliente',
  client_loading: 'Carga en cliente',
  terminal_delivery: 'Entrega en terminal',
  empty_pickup: 'Retiro de vacío',
  empty_return: 'Devolución de vacío',
};

export function legLabel(kind: LegKind): string {
  return LEG_LABEL[kind];
}

function container(number: string, isoType: Container['isoType'], seal: string, freeDays?: number, grossWeightKg = 24800): Container {
  return {
    number,
    isoType,
    shippingLine: shippingLineFor(number),
    seal,
    grossWeightKg,
    freeDaysEnd: freeDays === undefined ? undefined : dayEnd(freeDays),
  };
}

/** IMP: terminal → client → empty return. EXP: empty pickup → client loading → terminal. */
function legs(movement: 'IMP' | 'EXP', geofenceIds: [string, string, string], etaMin: number): TripLeg[] {
  const kinds: LegKind[] =
    movement === 'IMP'
      ? ['terminal_pickup', 'client_delivery', 'empty_return']
      : ['empty_pickup', 'client_loading', 'terminal_delivery'];
  return kinds.map((kind, i) => ({
    index: i + 1,
    kind,
    label: LEG_LABEL[kind],
    geofenceId: geofenceIds[i],
    window:
      i === 0
        ? { from: mins(-360) }
        : i === 1
          ? { from: mins(etaMin - 30), to: mins(etaMin + 90) }
          : { before: dayEnd(2) },
    estimate: i === 0 ? { minutes: 90 } : { minutes: 290, km: 298 },
  }));
}

let logSeq = 0;
function log(
  at: number,
  kind: LogEntry['kind'],
  title: string,
  author: string,
  meta?: string,
  photos = 0,
): LogEntry {
  logSeq += 1;
  return {
    id: `log-${logSeq}`,
    at,
    kind,
    title,
    author,
    meta,
    photos: Array.from({ length: photos }, (_, i) => ({ id: `ph-${logSeq}-${i}`, size: 620_000 + i * 85_000 })),
  };
}

const clientId = (name: string) => CLIENTS.find((c) => c.name === name)!.id;

interface TripSeed {
  n: string;
  movement: 'IMP' | 'EXP';
  full?: boolean;
  client: string;
  group: string | null;
  containers: Container[];
  unit: string;
  driver: string;
  chassis: string;
  lock: Trip['lock'];
  geofences: [string, string, string];
  currentLeg: number;
  phase: string;
  etaMin: number;
  severity: Trip['severity'];
  place: keyof typeof PLACES;
  offset?: [number, number];
  heading: number;
  speed: number;
  gps: string;
  reporting?: Trip['live']['reporting'];
  stoppedSince?: string;
  stopReason?: Trip['live']['stopReason'];
  booking: string;
  escort?: Trip['escort'];
  log: LogEntry[];
  /** Road route the unit is on ("from>to"); defaults to the current leg. */
  route?: string;
}

const SEEDS: TripSeed[] = [
  {
    n: '0184',
    movement: 'IMP',
    client: 'Empaques del Valle',
    group: 'GDL-1803-A',
    containers: [container('MSKU4821736', '40HC', 'CMX820131', 1)],
    unit: 'T-101',
    driver: 'op-jlr',
    chassis: 'CH-201 · 40 pies',
    lock: { id: 'CND-0441', state: 'closed', batteryPct: 74 },
    geofences: ['gf-contecon', 'gf-empaques', 'gf-patio-maersk'],
    currentLeg: 1,
    phase: 'En patio externo',
    etaMin: 14,
    severity: 'critical',
    place: 'jalipa',
    heading: 90,
    speed: 0,
    gps: '10:41',
    stoppedSince: '07:41',
    stopReason: 'outside_geofence',
    booking: 'BKG-MX-681652',
    route: 'jalipa>gf-contecon',
    log: [
      log(dt('10:12'), 'alert', 'Unidad detenida fuera de geocerca · 2 h 31 min', 'Sistema', 'Patio externo, Jalipa'),
      log(dt('08:05'), 'note', 'Operador espera turno en patio externo para retiro', 'José L. Ramírez', 'App operador · Jalipa', 1),
      log(dt('07:41'), 'gps', 'Unidad detenida · ignición ON', 'Sistema'),
    ],
  },
  {
    n: '0185',
    movement: 'EXP',
    client: 'Calzado Horizonte',
    group: 'GDL-1803-A',
    containers: [container('MSCU7149205', '40HC', 'CMX820144', 4)],
    unit: 'T-102',
    driver: 'op-cms',
    chassis: 'CH-202 · 40 pies',
    lock: { id: 'CND-0442', state: 'closed', batteryPct: 91 },
    geofences: ['gf-patio-cma', 'gf-calzado', 'gf-ssa'],
    currentLeg: 2,
    phase: 'En tránsito',
    etaMin: 48,
    severity: 'ok',
    place: 'km112',
    heading: 20,
    speed: 72,
    gps: '10:39',
    booking: 'BKG-MX-681660',
    log: [log(dt('09:02'), 'geofence', 'Salida de Patio CMA CGM · vacío cargado', 'Sistema', 'Carlos Méndez (App operador)')],
  },
  {
    n: '0186',
    movement: 'IMP',
    client: 'Automotriz del Centro',
    group: 'BAJÍO-1803-B',
    containers: [container('CMAU3817294', '20DC', 'CMX820174', 2, 18400)],
    unit: 'T-103',
    driver: 'op-mat',
    chassis: 'CH-203 · 40 pies',
    lock: { id: 'CND-0443', state: 'open', batteryPct: 63 },
    geofences: ['gf-contecon', 'gf-automotriz', 'gf-patio-cma'],
    currentLeg: 2,
    phase: 'En cliente',
    etaMin: 92,
    severity: 'critical',
    place: 'atenquique',
    offset: [0.004, 0.006],
    heading: 35,
    speed: 0,
    gps: '09:57',
    reporting: 'silent',
    stoppedSince: '07:33',
    stopReason: 'outside_geofence',
    booking: 'BKG-MX-681694',
    log: [
      log(dt('10:47'), 'alert', 'Unidad detenida fuera de geocerca · 3 h 14 min', 'Sistema', 'Atenquique, Jal. · alerta tomada por Luis G. Ochoa'),
      log(dt('10:31'), 'call', 'Operador no contesta (2 intentos)', 'Luis G. Ochoa', 'Monitorista'),
      log(dt('09:57'), 'gps', 'Última posición recibida · 0 km/h, ignición OFF', 'Sistema'),
      log(dt('09:14'), 'geofence', 'Salida de CONTECON · EIR de salida sin daños', 'Sistema', 'Miguel Á. Torres (App operador)', 6),
      log(dt('08:40'), 'note', 'Operador reporta fila en puerta 3, ~40 min', 'Miguel Á. Torres', 'App operador · Puerta 3 CONTECON', 2),
    ],
  },
  {
    n: '0187',
    movement: 'EXP',
    full: true,
    client: 'Tecnomaq Bajío',
    group: 'BAJÍO-1803-B',
    containers: [container('HLXU6294018', '40RF', 'CMX820152', 3, 21300), container('ONEU5591027', '40RF', 'CMX820153', 3, 20900)],
    unit: 'T-104',
    driver: 'op-rnc',
    chassis: 'CH-204 · 40 pies',
    lock: { id: 'CND-0444', state: 'closed', batteryPct: 88 },
    geofences: ['gf-patio-maersk', 'gf-tecnomaq', 'gf-timsa'],
    currentLeg: 3,
    phase: 'En tránsito',
    etaMin: 30,
    severity: 'medium',
    place: 'colimaLib',
    heading: 215,
    speed: 61,
    gps: '10:36',
    booking: 'BKG-MX-681671',
    log: [
      log(dt('09:40'), 'note', 'Parada autorizada en Gasolinera km 112 · 20 min', 'Roberto Navarro', 'App operador · Autopista 54D'),
      log(dt('03:35'), 'geofence', 'Salida de Tecnomaq Bajío · planta Silao · 2 contenedores sellados', 'Sistema', 'Roberto Navarro (App operador)'),
    ],
  },
  {
    n: '0188',
    movement: 'IMP',
    client: 'Polímeros Potosinos',
    group: 'PTO-1803-C',
    containers: [container('ONEU2847193', '40HC', 'CMX820165', 1)],
    unit: 'T-105',
    driver: 'op-hil',
    chassis: 'CH-205 · 20 pies',
    lock: { id: 'CND-0445', state: 'closed', batteryPct: 79 },
    geofences: ['gf-contecon', 'gf-polimeros', 'gf-patio-cma'],
    currentLeg: 1,
    phase: 'En terminal',
    etaMin: 8,
    severity: 'high',
    place: 'contecon',
    heading: 0,
    speed: 0,
    gps: '10:34',
    stoppedSince: '09:33',
    stopReason: 'at_terminal',
    booking: 'BKG-MX-681688',
    log: [],
  },
  {
    n: '0189',
    movement: 'EXP',
    client: 'Empaques del Valle',
    group: 'PTO-1803-C',
    containers: [container('COSU7182940', '40HC', 'CMX820170', 5)],
    unit: 'T-106',
    driver: 'op-asr',
    chassis: 'CH-206 · 40 pies',
    lock: { id: 'CND-0446', state: 'closed', batteryPct: 95 },
    geofences: ['gf-patio-cma', 'gf-empaques', 'gf-ocupa'],
    currentLeg: 2,
    phase: 'En tránsito',
    etaMin: 130,
    severity: 'ok',
    place: 'gdlColima',
    heading: 350,
    speed: 78,
    gps: '10:40',
    booking: 'BKG-MX-681699',
    log: [log(dt('08:15'), 'geofence', 'Salida de Patio CMA CGM · vacío asignado', 'Sistema', 'Arturo Salgado (App operador)')],
  },
  {
    n: '0190',
    movement: 'IMP',
    client: 'Empaques del Valle',
    group: 'GDL-1803-D',
    containers: [container('MSKU3928174', '20DC', 'CMX820178', 2, 17600)],
    unit: 'T-107',
    driver: 'op-jal',
    chassis: 'CH-207 · 20 pies',
    lock: { id: 'CND-0447', state: 'closed', batteryPct: 52 },
    geofences: ['gf-timsa', 'gf-empaques', 'gf-patio-maersk'],
    currentLeg: 1,
    phase: 'Sin señal',
    etaMin: 84,
    severity: 'high',
    place: 'atenquique',
    offset: [0.014, -0.05],
    heading: 30,
    speed: 0,
    gps: '09:48',
    reporting: 'silent',
    stoppedSince: '09:52',
    stopReason: 'no_signal',
    booking: 'BKG-MX-681703',
    log: [
      log(dt('10:07'), 'gps', 'Sin posición > 15 min', 'Sistema', 'Proveedor GPS notificado'),
      log(dt('09:48'), 'gps', 'Última posición recibida · Atenquique', 'Sistema'),
    ],
  },
  {
    n: '0191',
    movement: 'EXP',
    client: 'Comercializadora Anáhuac',
    group: 'GDL-1803-D',
    containers: [container('TCLU8294017', '40RF', 'CMX820181', 6, 22100)],
    unit: 'T-108',
    driver: 'op-rvm',
    chassis: 'CH-208 · 40 pies',
    lock: { id: 'CND-0448', state: 'closed', batteryPct: 83 },
    geofences: ['gf-patio-maersk', 'gf-anahuac', 'gf-contecon'],
    currentLeg: 3,
    phase: 'En tránsito',
    etaMin: 37,
    severity: 'ok',
    place: 'acatlan',
    heading: 190,
    speed: 66,
    gps: '10:38',
    booking: 'BKG-MX-681710',
    log: [],
  },
  {
    n: '0192',
    movement: 'IMP',
    full: true,
    client: 'Calzado Horizonte',
    group: null,
    containers: [container('CMAU5182039', '40HC', 'CMX820186', 0), container('HLXU4829103', '40HC', 'CMX820187', 0)],
    unit: 'T-109',
    driver: 'op-fod',
    chassis: 'CH-209 · 40 pies',
    lock: { id: 'CND-0449', state: 'closed', batteryPct: 70 },
    geofences: ['gf-contecon', 'gf-calzado', 'gf-patio-cma'],
    currentLeg: 2,
    phase: 'En tránsito',
    etaMin: 178,
    severity: 'medium',
    place: 'gdlIndustrial',
    heading: 60,
    speed: 48,
    gps: '10:37',
    booking: 'BKG-MX-681716',
    escort: { required: true, escortId: 'cu-sor', provider: 'Protección Bajío', legIndexes: [2] },
    log: [
      log(dt('10:20'), 'note', 'Custodia se incorpora en Zona Industrial GDL · tramo GDL–León', 'Samuel Ortega R.', 'Protección Bajío'),
      log(dt('10:05'), 'alert', 'Días libres vencen hoy · CMAU5182039 y HLXU4829103', 'Sistema'),
      log(dt('06:05'), 'geofence', 'Salida de CONTECON · EIR sin daños (2 contenedores)', 'Sistema', 'Fernando Orozco (App operador)', 2),
      log(dt('05:20'), 'note', 'Fila en puerta 3 · ~35 min', 'Fernando Orozco', 'App operador · Puerta 3 CONTECON'),
    ],
  },
  {
    n: '0193',
    movement: 'EXP',
    client: 'Tecnomaq Bajío',
    group: null,
    containers: [container('ONEU7391028', '40HC', 'CMX820190')],
    unit: 'T-110',
    driver: 'op-mar',
    chassis: 'CH-210 · 40 pies',
    lock: { id: 'CND-0450', state: 'closed', batteryPct: 97 },
    geofences: ['gf-patio-cma', 'gf-tecnomaq', 'gf-ssa'],
    currentLeg: 1,
    phase: 'En patio',
    etaMin: 71,
    severity: 'ok',
    place: 'patioCma',
    heading: 0,
    speed: 0,
    gps: '10:35',
    stoppedSince: '10:24',
    stopReason: 'at_yard',
    booking: 'BKG-MX-681721',
    log: [],
  },
  {
    n: '0194',
    movement: 'IMP',
    client: 'Calzado Horizonte',
    group: null,
    containers: [container('COSU2948173', '40HC', 'CMX820193', -1)],
    unit: 'T-111',
    driver: 'op-rcv',
    chassis: 'CH-211 · 40 pies',
    lock: { id: 'CND-0451', state: 'closed', batteryPct: 81 },
    geofences: ['gf-ssa', 'gf-calzado', 'gf-patio-cma'],
    currentLeg: 3,
    phase: 'En tránsito',
    etaMin: 213,
    severity: 'medium',
    place: 'leonLib',
    heading: 235,
    speed: 64,
    gps: '10:40',
    booking: 'BKG-MX-681728',
    log: [log(dt('10:38'), 'alert', 'Desvío de ruta > 2 km · Libramiento de León', 'Sistema')],
  },
  {
    n: '0195',
    movement: 'EXP',
    client: 'Polímeros Potosinos',
    group: null,
    containers: [container('MSCU5829104', '40HC', 'CMX820197', 4)],
    unit: 'T-112',
    driver: 'op-odp',
    chassis: 'CH-212 · 40 pies',
    lock: { id: 'CND-0452', state: 'closed', batteryPct: 66 },
    geofences: ['gf-patio-maersk', 'gf-polimeros', 'gf-contecon'],
    currentLeg: 2,
    phase: 'En tránsito',
    etaMin: 263,
    severity: 'medium',
    place: 'lagosRoad',
    heading: 45,
    speed: 69,
    gps: '10:31',
    reporting: 'intermittent',
    booking: 'BKG-MX-681735',
    log: [
      log(dt('10:26'), 'alert', 'Exceso de velocidad · 98 km/h', 'Sistema', 'Carr. a Lagos de Moreno'),
      log(dt('08:10'), 'note', 'Carga de diésel · estación Acatlán', 'Óscar D. Peña', 'App operador', 1),
      log(dt('04:40'), 'geofence', 'Salida de Patio Maersk Tapeixtles · vacío 40HC', 'Sistema', 'Óscar D. Peña (App operador)'),
    ],
  },
];

/** Route of the current leg: previous leg's geofence → current leg's geofence. */
export function defaultRouteId(geofenceIds: string[], currentLeg: number): string {
  return currentLeg >= 2
    ? routeId(geofenceIds[currentLeg - 2], geofenceIds[currentLeg - 1])
    : routeId(geofenceIds[0], geofenceIds[1]);
}

function buildTrip(s: TripSeed): Trip {
  const place = PLACES[s.place];
  const [dLat, dLng] = s.offset ?? [0, 0];
  const client = CLIENTS.find((c) => c.name === s.client)!;
  const rid = s.route ?? defaultRouteId(s.geofences, s.currentLeg);
  const path = getRoutePath(rid);
  let position: [number, number] = [place.pos[0] + dLat, place.pos[1] + dLng];
  let heading = s.heading;
  let progress: number | undefined;
  if (path) {
    progress = projectOnPath(path, position);
    // Moving units are snapped onto the road; parked ones keep their exact spot.
    if (s.speed > 0) {
      const p = pointAt(path, progress);
      position = p.pos;
      heading = p.heading;
    }
  }
  return {
    id: `SRV-2603-${s.n}`,
    movement: s.movement,
    modality: s.full ? 'full' : 'single',
    clientId: clientId(s.client),
    booking: s.booking,
    clientRef: `OC-${88000 + Number(s.n)}`,
    groupId: s.group,
    containers: s.containers,
    unitId: s.unit,
    driverId: s.driver,
    chassis: s.chassis,
    lock: s.lock,
    escort: s.escort ?? { required: false },
    legs: legs(s.movement, s.geofences, s.etaMin),
    currentLeg: s.currentLeg,
    phaseLabel: s.phase,
    eta: mins(s.etaMin),
    severity: s.severity,
    status: 'active',
    live: {
      position,
      heading,
      speedKmh: s.speed,
      lastGpsAt: dt(s.gps),
      reporting: s.reporting ?? 'live',
      routeId: rid,
      routeProgressM: progress,
      stoppedSince: s.stoppedSince ? dt(s.stoppedSince) : undefined,
      stopReason: s.stopReason,
      locationLabel: place.label,
    },
    log: s.log,
    track: [],
    shareLink: { enabled: true, contacts: client.contacts },
    ruleIds: ['R-01', 'R-02', 'R-05', 'R-07'],
    createdAt: mins(-420),
  };
}

export const TRIPS: Trip[] = SEEDS.map(buildTrip);
