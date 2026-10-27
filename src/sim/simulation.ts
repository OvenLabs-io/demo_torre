import { DEMO } from '@/config/demo';
import { useStore } from '@/store/useStore';
import type { StopReason, Trip } from '@/types/domain';
import { pointAt } from '@/lib/geo';
import { getRoutePath } from '@/mocks/routes';
import { describePosition } from '@/mocks/places';
import { GEOFENCES } from '@/mocks/geofences';

/** Cruise speed per trip, captured at start, so speeds jitter around a stable value. */
const cruise = new Map<string, number>();
/** Last time each trip's position was advanced. */
const lastMove = new Map<string, number>();

function jitter(base: number): number {
  return Math.max(35, Math.min(92, Math.round(base + (Math.random() * 10 - 5))));
}

const ARRIVAL: Record<string, { reason: StopReason; phase: string }> = {
  terminal: { reason: 'at_terminal', phase: 'En terminal' },
  yard: { reason: 'at_yard', phase: 'En patio' },
  destination: { reason: 'at_client', phase: 'En cliente' },
};

function step(trip: Trip, now: number): Trip {
  if (trip.status !== 'active') return trip;
  const { reporting } = trip.live;
  if (reporting === 'silent') return trip;
  if (reporting === 'intermittent' && Math.random() > 0.3) return trip;

  if (!cruise.has(trip.id)) cruise.set(trip.id, trip.live.speedKmh);
  const base = cruise.get(trip.id)!;
  const elapsedS = (now - (lastMove.get(trip.id) ?? now)) / 1000;
  lastMove.set(trip.id, now);

  if (base <= 0) {
    return { ...trip, live: { ...trip.live, lastGpsAt: now, speedKmh: 0 } };
  }

  const path = getRoutePath(trip.live.routeId);
  const speed = jitter(base);
  if (!path || trip.live.routeProgressM === undefined) {
    return { ...trip, live: { ...trip.live, lastGpsAt: now, speedKmh: speed } };
  }

  const progress = trip.live.routeProgressM + (speed / 3.6) * elapsedS * DEMO.moveSpeedup;

  // Arrived at the end of the leg: park inside the destination geofence.
  if (progress >= path.length) {
    cruise.set(trip.id, 0);
    const toId = trip.live.routeId!.split('>')[1];
    const fence = GEOFENCES.find((g) => g.id === toId);
    const arrival = ARRIVAL[fence?.type ?? 'destination'] ?? ARRIVAL.destination;
    const end = pointAt(path, path.length);
    return {
      ...trip,
      phaseLabel: arrival.phase,
      live: {
        ...trip.live,
        position: end.pos,
        heading: end.heading,
        speedKmh: 0,
        lastGpsAt: now,
        routeProgressM: path.length,
        stoppedSince: now,
        stopReason: arrival.reason,
        locationLabel: fence?.name ?? describePosition(end.pos),
      },
    };
  }

  const p = pointAt(path, progress);
  return {
    ...trip,
    live: {
      ...trip.live,
      position: p.pos,
      heading: p.heading,
      speedKmh: speed,
      lastGpsAt: now,
      routeProgressM: progress,
      locationLabel: describePosition(p.pos),
    },
  };
}

let started = false;

/** Starts the fake GPS feed: runs one tick right away and then every DEMO.tickMs. */
export function startSimulation(): void {
  if (started) return;
  started = true;
  const tick = () => {
    const now = Date.now();
    useStore.getState().applyTick(now, (t) => step(t, now));
  };
  tick();
  setInterval(tick, DEMO.tickMs);
}
