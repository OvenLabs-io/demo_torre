import { create } from 'zustand';
import type {
  Alert,
  AlertRule,
  Client,
  Company,
  CrewMember,
  Geofence,
  HistoryTrip,
  LogEntry,
  Protocol,
  Trip,
  Unit,
  User,
} from '@/types/domain';
import { TRIPS } from '@/mocks/trips';
import { UNITS } from '@/mocks/units';
import { CREW, crewShortName } from '@/mocks/crew';
import { CLIENTS } from '@/mocks/clients';
import { GEOFENCES } from '@/mocks/geofences';
import { ALERTS } from '@/mocks/alerts';
import { RULES } from '@/mocks/rules';
import { PROTOCOLS } from '@/mocks/protocols';
import { USERS, CURRENT_USER_ID } from '@/mocks/users';
import { COMPANIES } from '@/mocks/companies';
import { HISTORY } from '@/mocks/history';
import { T0 } from '@/lib/mockTime';

export interface AppState {
  /** Last simulated GPS feed tick (drives "actualizado hace X s"). */
  lastTickAt: number;
  trips: Trip[];
  history: HistoryTrip[];
  units: Unit[];
  crew: CrewMember[];
  clients: Client[];
  geofences: Geofence[];
  alerts: Alert[];
  rules: AlertRule[];
  protocols: Protocol[];
  users: User[];
  companies: Company[];
  currentUserId: string;

  /** "Nuevo viaje" draft saved with "Guardar borrador". */
  tripDraft: { data: unknown; savedAt: number } | null;

  applyTick: (now: number, update: (trip: Trip) => Trip) => void;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  addLogEntry: (tripId: string, entry: LogEntry) => void;
  closeTrip: (id: string) => void;
  createTrip: (trip: Trip) => void;
  saveTripDraft: (data: unknown) => void;
  clearTripDraft: () => void;

  takeAlert: (id: string) => void;
  completeAlertStep: (alertId: string, stepId: string) => void;
  addAlertAction: (alertId: string, text: string) => void;
  escalateAlert: (alertId: string) => void;
  closeAlert: (alertId: string, reason: string, comment?: string) => void;

  upsertRule: (rule: AlertRule) => void;
  toggleRule: (id: string) => void;
  upsertProtocol: (protocol: Protocol) => void;

  /** Last "Sincronizar ahora" of units with the GPS platform. */
  unitsSyncedAt: number;
  updateUnit: (id: string, patch: Partial<Unit>) => void;
  syncUnits: () => void;
  upsertCrew: (member: CrewMember) => void;

  geofencesSyncedAt: number;
  /** Saves a geofence; when it syncs to GPS it goes pending → synced after 2 s. */
  saveGeofence: (g: Geofence) => void;
  deleteGeofence: (id: string) => void;

  updateUser: (id: string, patch: Partial<User>) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
}

/** "L. Ochoa" from "Luis Gerardo Ochoa". */
export function shortUserName(name: string): string {
  const parts = name.split(' ');
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function currentUserOf(s: AppState): User {
  return s.users.find((u) => u.id === s.currentUserId)!;
}

/** Acting on an unassigned alert assigns it to the current user. */
function takeIfOpen(a: Alert, s: AppState, now: number): Alert {
  if (a.status !== 'open') return a;
  return {
    ...a,
    status: 'in_progress',
    assigneeId: s.currentUserId,
    takenAt: now,
    timeline: [...a.timeline, { at: now, text: `Alerta tomada por ${shortUserName(currentUserOf(s).name)}` }],
  };
}

export const useStore = create<AppState>()((set, get) => {
  /** Applies `fn` to one alert. */
  const patchAlert = (id: string, fn: (a: Alert, s: AppState) => Alert) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? fn(a, s) : a)) }));

  return {
    lastTickAt: T0,
    trips: TRIPS,
    history: HISTORY,
    units: UNITS,
    crew: CREW,
    clients: CLIENTS,
    geofences: GEOFENCES,
    alerts: ALERTS,
    rules: RULES,
    protocols: PROTOCOLS,
    users: USERS,
    companies: COMPANIES,
    currentUserId: CURRENT_USER_ID,
    tripDraft: null,

    applyTick: (now, update) =>
      set((s) => {
        const trips = s.trips.map(update);
        const lastGpsByUnit = new Map(trips.map((t) => [t.unitId, t.live.lastGpsAt]));
        const units = s.units.map((u) => {
          // Units without a trip keep reporting too (unless their GPS is offline).
          const last = lastGpsByUnit.get(u.id) ?? (u.gps.signal === 'online' ? now : undefined);
          return last && last !== u.gps.lastSignalAt ? { ...u, gps: { ...u.gps, lastSignalAt: last } } : u;
        });
        return { trips, units, lastTickAt: now };
      }),

    updateTrip: (id, patch) =>
      set((s) => {
        const prev = s.trips.find((t) => t.id === id);
        if (!prev) return {};
        const next = { ...prev, ...patch };
        let units = s.units;
        let crew = s.crew;
        // Keep unit / driver assignments consistent when they change.
        if (patch.unitId && patch.unitId !== prev.unitId) {
          units = units.map((u) =>
            u.id === prev.unitId
              ? { ...u, status: 'available', currentTripId: undefined }
              : u.id === patch.unitId
                ? { ...u, status: 'on_trip', currentTripId: id }
                : u,
          );
        }
        if (patch.driverId && patch.driverId !== prev.driverId) {
          crew = crew.map((c) =>
            c.id === prev.driverId
              ? { ...c, status: 'available', assignment: undefined }
              : c.id === patch.driverId
                ? { ...c, status: 'on_trip', assignment: { unitId: next.unitId, tripId: id } }
                : c,
          );
        }
        return { trips: s.trips.map((t) => (t.id === id ? next : t)), units, crew };
      }),

    addLogEntry: (tripId, entry) =>
      set((s) => ({
        trips: s.trips.map((t) => (t.id === tripId ? { ...t, log: [entry, ...t.log] } : t)),
      })),

    closeTrip: (id) => {
      const { trips, units, crew } = get();
      const trip = trips.find((t) => t.id === id);
      if (!trip) return;
      const now = Date.now();
      const driver = crew.find((c) => c.id === trip.driverId);
      const incidents = trip.log.filter((l) => l.kind === 'alert' || l.kind === 'incident').length;
      const terminalStop = trip.live.stopReason === 'at_terminal' && trip.live.stoppedSince;
      const row: HistoryTrip = {
        id: trip.id,
        movement: trip.movement,
        clientId: trip.clientId,
        container: trip.containers.map((c) => c.number).join(' + '),
        terminal: 'CONTECON',
        unitEconomic: units.find((u) => u.id === trip.unitId)?.economic ?? trip.unitId,
        driverShort: driver ? crewShortName(driver) : '—',
        startedAt: trip.createdAt,
        closedAt: now,
        terminalWaitMin: terminalStop ? Math.round((now - (trip.live.stoppedSince ?? now)) / 60000) : 85,
        incidents,
        status: incidents > 0 ? 'closed_incident' : 'closed',
        demurrageMxn: 0,
        onTime: now <= trip.eta + 30 * 60000,
      };
      set((s) => ({
        trips: s.trips.filter((t) => t.id !== id),
        history: [row, ...s.history],
        units: s.units.map((u) => (u.id === trip.unitId ? { ...u, status: 'available', currentTripId: undefined } : u)),
        crew: s.crew.map((c) =>
          c.id === trip.driverId || c.assignment?.tripId === id ? { ...c, status: 'available', assignment: undefined } : c,
        ),
        alerts: s.alerts.map((a) =>
          a.tripId === id && a.status !== 'closed'
            ? {
                ...a,
                status: 'closed',
                closure: { reason: 'Viaje cerrado', at: now, byUserId: s.currentUserId },
                timeline: [...a.timeline, { at: now, text: 'Alerta cerrada · viaje cerrado' }],
              }
            : a,
        ),
      }));
    },

    createTrip: (trip) =>
      set((s) => ({
        trips: [trip, ...s.trips],
        units: s.units.map((u) => (u.id === trip.unitId ? { ...u, status: 'on_trip', currentTripId: trip.id } : u)),
        crew: s.crew.map((c) =>
          c.id === trip.driverId
            ? { ...c, status: 'on_trip', assignment: { unitId: trip.unitId, tripId: trip.id } }
            : c.id === trip.escort.escortId
              ? { ...c, status: 'on_service', assignment: { tripId: trip.id, note: 'asignado' } }
              : c,
        ),
        tripDraft: null,
      })),
    saveTripDraft: (data) => set({ tripDraft: { data, savedAt: Date.now() } }),
    clearTripDraft: () => set({ tripDraft: null }),

    /* ---------- Alerts ---------- */
    takeAlert: (id) => patchAlert(id, (a, s) => takeIfOpen(a, s, Date.now())),

    completeAlertStep: (alertId, stepId) =>
      patchAlert(alertId, (a, s) => {
        const now = Date.now();
        const taken = takeIfOpen(a, s, now);
        const protocol = s.protocols.find((p) => p.id === s.rules.find((r) => r.id === a.ruleId)?.protocolId);
        const index = protocol?.steps.findIndex((st) => st.id === stepId) ?? -1;
        const step = protocol?.steps[index];
        return {
          ...taken,
          steps: taken.steps.map((st) =>
            st.stepId === stepId ? { ...st, done: true, doneAt: now, note: step?.sendsMessage ? 'mensaje enviado' : undefined } : st,
          ),
          timeline: [...taken.timeline, { at: now, text: `Paso ${index + 1} hecho · ${step?.title ?? ''} · ${shortUserName(currentUserOf(s).name)}` }],
        };
      }),

    addAlertAction: (alertId, text) => {
      const s = get();
      const alert = s.alerts.find((a) => a.id === alertId);
      const user = currentUserOf(s);
      const now = Date.now();
      patchAlert(alertId, (a, st) => {
        const taken = takeIfOpen(a, st, now);
        return {
          ...taken,
          actions: [...(taken.actions ?? []), { at: now, text, byUserId: user.id }],
          timeline: [...taken.timeline, { at: now, text: `${text} · ${shortUserName(user.name)}` }],
        };
      });
      if (alert?.tripId) {
        s.addLogEntry(alert.tripId, {
          id: crypto.randomUUID(),
          at: now,
          kind: 'note',
          title: text,
          author: user.name,
          meta: `${user.title} · atención de alerta ${alert.ruleId}`,
          photos: [],
        });
      }
    },

    escalateAlert: (alertId) =>
      patchAlert(alertId, (a, s) => {
        const now = Date.now();
        const taken = takeIfOpen(a, s, now);
        return {
          ...taken,
          timeline: [...taken.timeline, { at: now, text: `Escalada a seguridad por ${shortUserName(currentUserOf(s).name)}` }],
        };
      }),

    closeAlert: (alertId, reason, comment) =>
      patchAlert(alertId, (a, s) => {
        const now = Date.now();
        return {
          ...a,
          status: 'closed',
          assigneeId: a.assigneeId ?? s.currentUserId,
          takenAt: a.takenAt ?? now,
          closure: { reason, comment, at: now, byUserId: s.currentUserId },
          timeline: [...a.timeline, { at: now, text: `Alerta cerrada · ${reason} · ${shortUserName(currentUserOf(s).name)}` }],
        };
      }),

    /* ---------- Rules & protocols ---------- */
    upsertRule: (rule) =>
      set((s) => ({
        rules: s.rules.some((r) => r.id === rule.id) ? s.rules.map((r) => (r.id === rule.id ? rule : r)) : [...s.rules, rule],
      })),
    toggleRule: (id) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) })),
    upsertProtocol: (protocol) =>
      set((s) => ({
        protocols: s.protocols.some((p) => p.id === protocol.id)
          ? s.protocols.map((p) => (p.id === protocol.id ? protocol : p))
          : [...s.protocols, protocol],
      })),

    /* ---------- Fleet ---------- */
    unitsSyncedAt: T0 - 5 * 60_000,
    updateUnit: (id, patch) => set((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
    syncUnits: () => set({ unitsSyncedAt: Date.now() }),
    upsertCrew: (member) =>
      set((s) => ({
        crew: s.crew.some((c) => c.id === member.id) ? s.crew.map((c) => (c.id === member.id ? member : c)) : [...s.crew, member],
      })),

    /* ---------- Geofences ---------- */
    geofencesSyncedAt: T0 - 12 * 60_000,
    saveGeofence: (g) => {
      const status: Geofence['syncStatus'] = g.syncToGps ? 'pending' : 'local';
      const saved = { ...g, syncStatus: status };
      set((s) => ({
        geofences: s.geofences.some((x) => x.id === g.id) ? s.geofences.map((x) => (x.id === g.id ? saved : x)) : [...s.geofences, saved],
      }));
      if (g.syncToGps) {
        setTimeout(() => {
          set((s) => ({
            geofences: s.geofences.map((x) => (x.id === g.id && x.syncStatus === 'pending' ? { ...x, syncStatus: 'synced' } : x)),
            geofencesSyncedAt: Date.now(),
          }));
        }, 2000);
      }
    },
    deleteGeofence: (id) => set((s) => ({ geofences: s.geofences.filter((g) => g.id !== id) })),

    /* ---------- Users ---------- */
    updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
    updateCompany: (id, patch) => set((s) => ({ companies: s.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  };
});

/* ---------- Lookups ---------- */

export function useCurrentUser(): User {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId)!);
}

export const byId = <T extends { id: string }>(list: T[], id: string | null | undefined): T | undefined =>
  id ? list.find((x) => x.id === id) : undefined;
