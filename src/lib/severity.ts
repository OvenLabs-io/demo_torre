import type { Severity } from '@/types/domain';

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  ok: 4,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  ok: 'OK',
};

/** Tailwind classes per severity: dot/solid, chip text, chip background. */
export const SEVERITY_STYLE: Record<Severity, { dot: string; text: string; bg: string }> = {
  critical: { dot: 'bg-crit', text: 'text-crit', bg: 'bg-crit-bg' },
  high: { dot: 'bg-high', text: 'text-high', bg: 'bg-high-bg' },
  medium: { dot: 'bg-med', text: 'text-med', bg: 'bg-med-bg' },
  low: { dot: 'bg-muted', text: 'text-muted', bg: 'bg-line-soft' },
  ok: { dot: 'bg-ok', text: 'text-ok-text', bg: 'bg-ok-bg' },
};

export function maxSeverity(list: Severity[]): Severity {
  return list.reduce<Severity>((acc, s) => (SEVERITY_RANK[s] < SEVERITY_RANK[acc] ? s : acc), 'ok');
}
