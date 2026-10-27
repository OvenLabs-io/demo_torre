import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { Severity } from '@/types/domain';
import { SEVERITY_LABEL, SEVERITY_STYLE } from '@/lib/severity';

export type Tone = 'neutral' | 'primary' | 'ok' | 'warn' | 'high' | 'crit' | 'muted';

const TONES: Record<Tone, string> = {
  neutral: 'bg-line-soft text-body',
  primary: 'bg-primary-soft text-primary',
  ok: 'bg-ok-bg text-ok-text',
  warn: 'bg-med-bg text-med',
  high: 'bg-high-bg text-high',
  crit: 'bg-crit-bg text-crit',
  muted: 'bg-line-soft text-muted',
};

export function Chip({
  tone = 'neutral',
  mono,
  className,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-px text-[10px] font-medium leading-[1.4]',
        mono && 'font-mono',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityChip({ severity, children, className }: { severity: Severity; children?: ReactNode; className?: string }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-px text-[10px] font-medium leading-[1.4]',
        s.bg,
        s.text,
        className,
      )}
    >
      {children ?? SEVERITY_LABEL[severity]}
    </span>
  );
}

export function Dot({ className, size = 8 }: { className?: string; size?: number }) {
  return <span className={clsx('inline-block shrink-0 rounded-full', className)} style={{ width: size, height: size }} />;
}
