import { DEMO } from '@/config/demo';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 10:41 */
export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 09:14:32 */
export function fmtTimeSec(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 11:01 h */
export function fmtTimeH(ts: number): string {
  return `${fmtTime(ts)} h`;
}

/** 14 mar · with year: 14 mar 2026 */
export function fmtDate(ts: number, withYear = false): string {
  const d = new Date(ts);
  const base = `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

/** 14 mar 07:10 */
export function fmtDateTime(ts: number): string {
  return `${fmtDate(ts)} ${fmtTime(ts)}`;
}

/** 3 h 06 min · 55 min · (padHours) 0 h 55 min */
export function fmtDuration(minutes: number, padHours = false): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0 && !padHours) return `${r} min`;
  return `${h} h ${pad(r)} min`;
}

/** Hace 12 min · Hace 2 h · Hace 8 s */
export function fmtAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `Hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
}

/** 24,800 */
export function fmtNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** $34,200 */
export function fmtMoney(n: number): string {
  return `$${fmtNumber(n)}`;
}

/** 2.4 MB */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type GpsFreshness = 'fresh' | 'stale' | 'lost';

/** Green < 5 min, amber < 30 min, red otherwise. */
export function gpsFreshness(lastGpsAt: number, now: number): GpsFreshness {
  const min = (now - lastGpsAt) / 60_000;
  if (min < DEMO.gpsFreshMin) return 'fresh';
  if (min < DEMO.gpsStaleMin) return 'stale';
  return 'lost';
}

/** Calendar days from today to `end` (0 = today, negative = overdue). */
export function daysUntil(end: number, now: number): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Strips accents and lowercases, for search. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}
