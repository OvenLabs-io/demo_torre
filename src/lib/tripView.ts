import type { Alert, StopReason, Trip } from '@/types/domain';
import type { Tone } from '@/components/ui/Chip';
import { daysUntil, fmtDuration, gpsFreshness } from './format';

const STOP_REASON: Record<StopReason, { label: string; alarm: boolean }> = {
  outside_geofence: { label: 'Fuera de geocerca', alarm: true },
  no_signal: { label: 'Sin señal GPS', alarm: true },
  at_terminal: { label: 'En terminal', alarm: false },
  at_yard: { label: 'En patio', alarm: false },
  at_client: { label: 'En cliente', alarm: false },
};

export interface StopInfo {
  minutes: number;
  duration: string;
  reason: string;
  alarm: boolean;
}

/** Detention info, only for stopped units with a known reason. */
export function stopInfo(trip: Trip, now: number): StopInfo | null {
  const { stoppedSince, stopReason, speedKmh } = trip.live;
  if (!stoppedSince || !stopReason || speedKmh > 0) return null;
  const minutes = (now - stoppedSince) / 60_000;
  const r = STOP_REASON[stopReason];
  return { minutes, duration: fmtDuration(minutes), reason: r.label, alarm: r.alarm };
}

/** "detenida 3 h 14 min fuera de geocerca" (modal header) */
export function stopSentence(trip: Trip, now: number): string | null {
  const s = stopInfo(trip, now);
  if (!s) return null;
  return `detenida ${s.duration} ${s.reason.toLowerCase()}`;
}

export interface FreeDaysInfo {
  days: number;
  label: string;
  tone: Tone;
}

/** Free days of the container closest to expiring. ≥3 green, 1–2 amber, 0 / overdue red. */
export function freeDaysInfo(trip: Trip, now: number): FreeDaysInfo | null {
  const ends = trip.containers.map((c) => c.freeDaysEnd).filter((e): e is number => e !== undefined);
  if (!ends.length) return null;
  const days = daysUntil(Math.min(...ends), now);
  if (days < 0) return { days, label: `Demora ${-days} d`, tone: 'crit' };
  return { days, label: `${days} d`, tone: days === 0 ? 'crit' : days <= 2 ? 'warn' : 'ok' };
}

export function gpsTone(trip: Trip, now: number): Tone {
  const f = gpsFreshness(trip.live.lastGpsAt, now);
  return f === 'fresh' ? 'ok' : f === 'stale' ? 'warn' : 'crit';
}

/** "2/3 Entrega en cliente" */
export function legText(trip: Trip): string {
  const leg = trip.legs[trip.currentLeg - 1];
  return `${trip.currentLeg}/${trip.legs.length} ${leg?.label ?? ''}`;
}

/** "IMP", "EXP·FULL" ('' for trips without a movement type). */
export function movementTag(trip: Trip, sep = '·'): string {
  if (!trip.movement) return '';
  return trip.modality === 'full' ? `${trip.movement}${sep}FULL` : trip.movement;
}

export function movementLong(trip: Trip): string {
  if (!trip.movement) return '';
  return trip.movement === 'IMP' ? 'IMPORTACIÓN' : trip.movement === 'EXP' ? 'EXPORTACIÓN' : 'REPARTO LOCAL';
}

/** A trip "has alerts" when its severity isn't OK or it has unresolved alerts. */
export function tripHasAlerts(trip: Trip, alerts: Alert[]): boolean {
  return trip.severity !== 'ok' || alerts.some((a) => a.tripId === trip.id && a.status !== 'closed');
}

export function containersText(trip: Trip): string {
  return trip.containers.map((c) => c.number).join(' + ');
}
