import clsx from 'clsx';
import { AlertTriangle, Info } from 'lucide-react';

/** Info (navy tint) or warning (amber) banner. */
export function InfoBanner({ tone = 'info', children, className }: { tone?: 'info' | 'warn'; children: React.ReactNode; className?: string }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info;
  return (
    <div
      className={clsx(
        'flex items-start gap-2 rounded-[4px] border px-3 py-2 text-[13px] leading-relaxed',
        tone === 'warn' ? 'border-med-border bg-med-bg text-med' : 'border-info-border bg-primary-soft text-body',
        className,
      )}
    >
      <Icon size={14} className={clsx('mt-px shrink-0', tone === 'warn' ? 'text-med' : 'text-primary/70')} />
      <div>{children}</div>
    </div>
  );
}
