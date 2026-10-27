/** Domain model for the mock data. UI copy is Spanish; code is English. */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'ok';
export type AlertSeverity = Exclude<Severity, 'ok'>;
export type LatLng = [number, number];
export type GpsProvider = 'Wialon' | 'Samsara' | 'Geotab';

export interface Client {
  id: string;
  name: string;
  contacts: string[];
}

/** Viaje → Trip */
export interface Container {
  number: string;
  isoType: '20DC' | '40HC' | '40RF';
  /** Derived from the owner prefix (MSKU → Maersk…). */
  shippingLine: string;
  seal?: string;
  grossWeightKg?: number;
  /** End of free days (ms). Undefined when it doesn't apply. */
  freeDaysEnd?: number;
}

export type LegKind =
  | 'terminal_pickup'
  | 'client_delivery'
  | 'client_loading'
  | 'terminal_delivery'
  | 'empty_pickup'
  | 'empty_return';

/** Tramo → TripLeg */
export interface TripLeg {
  index: number;
  kind: LegKind;
  label: string;
  geofenceId: string;
  window: { from: number; to?: number } | { before: number };
  estimate?: { minutes: number; km?: number };
}

export type LogKind = 'alert' | 'call' | 'gps' | 'geofence' | 'note' | 'incident';

/** Evento de bitácora */
export interface LogEntry {
  id: string;
  at: number;
  kind: LogKind;
  reason?: string;
  title: string;
  author: string;
  meta?: string;
  /** url = local preview of a chosen file; no url = mock thumbnail. size in bytes. */
  photos: { id: string; url?: string; size?: number }[];
  position?: LatLng;
}

/** Historial del viaje (tabla + reproducción) */
export interface TrackPoint {
  at: number;
  position: LatLng;
  speedKmh: number;
  heading: number;
  kind: 'event' | 'stop' | 'position';
  label: string;
  tone?: 'success' | 'info' | 'warning' | 'high' | 'critical' | 'muted';
}

export type StopReason = 'outside_geofence' | 'no_signal' | 'at_terminal' | 'at_yard' | 'at_client';
export type TripStatus = 'active' | 'closed' | 'closed_incident' | 'cancelled';

/** IMP = importación, EXP = exportación, LOC = reparto local. */
export type Movement = 'IMP' | 'EXP' | 'LOC';

export interface Trip {
  id: string;
  movement: Movement;
  modality: 'single' | 'full';
  clientId: string;
  booking?: string;
  clientRef?: string;
  groupId: string | null;
  containers: Container[];
  unitId: string;
  driverId: string;
  chassis?: string;
  lock: { id: string; state: 'closed' | 'open'; batteryPct?: number };
  escort: { required: boolean; escortId?: string; provider?: string; legIndexes?: number[] };
  legs: TripLeg[];
  currentLeg: number;
  /** "En cliente", "En tránsito"… */
  phaseLabel: string;
  eta: number;
  /** Base severity, as drawn in Figma. */
  severity: Severity;
  status: TripStatus;
  live: {
    position: LatLng;
    heading: number;
    speedKmh: number;
    lastGpsAt: number;
    /** live = reports every tick · intermittent = sometimes · silent = stopped reporting. */
    reporting: 'live' | 'intermittent' | 'silent';
    routeId?: string;
    routeProgressM?: number;
    stoppedSince?: number;
    stopReason?: StopReason;
    locationLabel: string;
  };
  log: LogEntry[];
  track: TrackPoint[];
  shareLink: { enabled: boolean; contacts: string[] };
  ruleIds: string[];
  createdAt: number;
}

/** Fila de Historial (viaje cerrado, resumen ligero) */
export interface HistoryTrip {
  id: string;
  movement: Movement;
  clientId: string;
  container: string;
  terminal: string;
  unitEconomic: string;
  driverShort: string;
  startedAt: number;
  closedAt: number;
  terminalWaitMin: number;
  incidents: number;
  status: Exclude<TripStatus, 'active'>;
  demurrageMxn: number;
  onTime: boolean;
}

/** Unidad (tracto, viene del GPS) */
export interface Unit {
  id: string;
  economic: string | null;
  plate: string;
  base: 'Manzanillo' | 'Guadalajara' | null;
  notes?: string;
  gps: {
    provider: GpsProvider;
    deviceId: string;
    signal: 'online' | 'intermittent' | 'offline';
    lastSignalAt: number;
  };
  model: string;
  vin: string;
  odometerKm: number;
  status: 'on_trip' | 'available' | 'maintenance' | 'new';
  currentTripId?: string;
  maintenanceWarning?: string;
}

/** Operador / custodio */
export interface CrewMember {
  id: string;
  role: 'driver' | 'escort';
  firstName: string;
  lastName: string;
  phone: string;
  emergencyPhone?: string;
  email?: string;
  license: { kind: string; number: string; expiresOn: number };
  medicalExpiresOn?: number;
  provider: string;
  base?: string;
  usualUnitId?: string;
  appInvited?: boolean;
  status: 'on_trip' | 'available' | 'on_service' | 'no_contact';
  assignment?: { unitId?: string; tripId?: string; note?: string };
}

export interface AlertStepProgress {
  stepId: string;
  done: boolean;
  doneAt?: number;
  note?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  /** Longer title for the detail band ("Detención no autorizada · fuera de geocerca"). */
  headline?: string;
  severity: AlertSeverity;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: number;
  slaMinutes: number;
  tripId?: string;
  unitId?: string;
  crewId?: string;
  containerNumber?: string;
  context: string;
  location?: { label: string; position: LatLng; detail?: string };
  assigneeId?: string;
  takenAt?: number;
  steps: AlertStepProgress[];
  timeline: { at: number; text: string }[];
  /** Actions registered by the monitor (count as evidence for closing). */
  actions?: { at: number; text: string; byUserId: string }[];
  closure?: { reason: string; comment?: string; at: number; byUserId: string };
}

export type NotifyChannel = 'app' | 'whatsapp' | 'email' | 'call';

/** Regla */
export interface AlertRule {
  id: string;
  active: boolean;
  name: string;
  conditionText: string;
  clauses: { subject: string; operator: string; value: string }[];
  severity: AlertSeverity;
  slaMinutes: number;
  protocolId: string | null;
  notify: { recipients: string[]; channels: NotifyChannel[] };
  appliesTo: string;
  schedule: string;
  repeat: string;
  fired30d: number | null;
}

export interface ProtocolStep {
  id: string;
  title: string;
  description: string;
  owner: string;
  maxMinutes: number;
  evidence: 'note' | 'pdf_report' | 'photo' | 'auto';
  sendsMessage?: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  /** Short name used in the rules table ("Detención"). */
  shortName: string;
  slaMinutes: number;
  steps: ProtocolStep[];
  closure: { requireReason: boolean; requireEvidence: boolean; onlyTrafficManager: boolean };
  updatedAt: number;
  updatedBy: string;
}

export type GeofenceType = 'terminal' | 'yard' | 'destination' | 'poi' | 'authorized_stop' | 'avoid_zone';

export type GeofenceShape =
  | { kind: 'circle'; center: LatLng; radiusM: number }
  | { kind: 'polygon'; points: LatLng[] }
  | { kind: 'corridor'; path: LatLng[]; widthM: number };

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  clientId: string | null;
  locationLabel: string;
  shape: GeofenceShape;
  toleranceM: number;
  validity: 'permanent' | 'temporary';
  ruleIds: string[];
  syncToGps: boolean;
  /** local = not sent to the GPS platform (detected on our server). */
  syncStatus: 'synced' | 'pending' | 'syncing' | 'local';
}

export type Module =
  | 'tower'
  | 'trips'
  | 'history'
  | 'alerts'
  | 'fleet'
  | 'catalogs'
  | 'rules'
  | 'users'
  | 'integrations';
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'export';
export type PermissionMatrix = Record<Module, Record<Action, boolean>>;
export type RoleKey = 'traffic_manager' | 'admin' | 'monitor' | 'monitor_night' | 'account_exec';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  title: string;
  baseRole: RoleKey;
  permissions: PermissionMatrix;
  groupIds: string[];
  scopeLabel: string;
  lastAccessAt: number | null;
  active: boolean;
  shift?: string;
  notifications: { criticalWhatsapp: boolean; highInApp: boolean; dailyEmail: boolean };
}

/** Empresa (consola OvenLabs) */
export interface Company {
  id: string;
  name: string;
  city: string;
  rfc?: string;
  plan: 'basic' | 'pro' | 'enterprise' | 'trial';
  units: { used: number; limit: number };
  users: { used: number; limit: number };
  gps: { provider: GpsProvider | null; extras?: string[] };
  sync: { status: 'ok' | 'delayed' | 'error' | 'pending'; at?: number; label?: string };
  activeTrips: number;
  alerts30d: number;
  status: 'active' | 'integration_error' | 'plan_expiring' | 'trial' | 'suspended';
  statusDetail?: string;
  customerSince?: string;
  tripsPerMonth?: number;
  alertsPerDay?: number;
  integration?: {
    tokenMasked: string;
    positionsPerMin: number;
    geofencesSynced: [number, number];
    errors24h: number;
  };
  modules: { key: string; label: string; enabled: boolean }[];
  contacts: { name: string; role: string; phone: string }[];
}
