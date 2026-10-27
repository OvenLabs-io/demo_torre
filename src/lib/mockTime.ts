import { DEMO } from '@/config/demo';

/**
 * Mock data is written with the clock times drawn in Figma (designed at ~10:47).
 * Everything is shifted relative to the moment the app loads, so the demo is
 * always "live" on the real machine clock.
 */
export const T0 = Date.now();

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const DESIGN_NOW_MIN = toMinutes(DEMO.designNow);

/** Design clock time today ('10:41') → real timestamp, keeping the distance to "now". */
export function dt(hhmm: string): number {
  return T0 + (toMinutes(hhmm) - DESIGN_NOW_MIN) * MIN;
}

/** Minutes from now (negative = past). */
export function mins(n: number): number {
  return T0 + n * MIN;
}

/** Start of the local day `offsetDays` away from today. */
export function dayStart(offsetDays = 0): number {
  const d = new Date(T0);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
}

/** A wall-clock time `offsetDays` away from today ('07:10'). */
export function onDay(offsetDays: number, hhmm: string): number {
  return dayStart(offsetDays) + toMinutes(hhmm) * MIN;
}

/** End of the local day `offsetDays` away from today (used for free days / expirations). */
export function dayEnd(offsetDays: number): number {
  return dayStart(offsetDays + 1) - 1;
}

export { MIN, DAY };
