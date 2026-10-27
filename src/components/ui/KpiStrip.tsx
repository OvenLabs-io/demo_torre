import clsx from 'clsx';

export interface Kpi {
  value: React.ReactNode;
  label: string;
  tone?: 'default' | 'crit' | 'warn';
}

/** White card with equal cells: big mono value + small label (Figma KPI strip). */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-line bg-white">
      {items.map((k, i) => (
        <div key={k.label} className={clsx('min-w-0 flex-1 px-4 py-3', i > 0 && 'border-l border-line')}>
          <div
            className={clsx(
              'font-mono text-[20px] leading-tight font-bold',
              k.tone === 'crit' ? 'text-crit' : k.tone === 'warn' ? 'text-med' : 'text-ink',
            )}
          >
            {k.value}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
