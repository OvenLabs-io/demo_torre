import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  count?: number | string;
  disabled?: boolean;
  title?: string;
}

/** Underlined tabs (Figma: active semibold primary + 2px underline). */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={clsx('flex items-end gap-6 border-b border-line', className)}>
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={t.disabled}
            title={t.title}
            onClick={() => onChange(t.key)}
            className={clsx(
              'relative -mb-px flex h-9 items-center gap-1.5 border-b-2 text-[12px] whitespace-nowrap transition-colors',
              active ? 'border-primary font-semibold text-primary' : 'border-transparent font-medium text-muted hover:text-body',
              t.disabled && 'cursor-not-allowed opacity-50 hover:text-muted',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-[3px] bg-line-soft px-1 text-[9px] font-medium text-body">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control (Figma: Alertas tabs, Operador/Custodio, playback speed). */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
  size = 'md',
  tone = 'primary',
  className,
}: {
  items: { key: K; label: ReactNode }[];
  value: K;
  onChange: (key: K) => void;
  size?: 'sm' | 'md';
  /** primary = navy active pill · light = white raised pill on grey (forms). */
  tone?: 'primary' | 'light';
  className?: string;
}) {
  return (
    <div className={clsx('inline-flex rounded-[5px] border p-0.5', tone === 'light' ? 'border-line bg-line-soft' : 'border-line bg-white', className)}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={it.key === value}
          className={clsx(
            'rounded-[3px] font-medium whitespace-nowrap transition-colors',
            size === 'sm' ? 'h-[22px] px-2 text-[11px]' : tone === 'light' ? 'h-[28px] px-3 text-[12px]' : 'h-[26px] px-3 text-[11px]',
            it.key === value
              ? tone === 'light'
                ? 'bg-white text-ink shadow-sm'
                : 'bg-primary text-white'
              : tone === 'light'
                ? 'text-muted hover:text-body'
                : 'text-body hover:bg-line-soft',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
