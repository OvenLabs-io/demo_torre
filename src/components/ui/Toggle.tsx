import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** 'green' (default, Figma toggles) or 'primary' (Nuevo viaje). */
  color?: 'green' | 'primary';
  className?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, color = 'green', className }: Props) {
  return (
    <label className={clsx('inline-flex items-start gap-2.5', disabled ? 'opacity-50' : 'cursor-pointer', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-px h-4 w-7 shrink-0 rounded-full transition-colors',
          checked ? (color === 'green' ? 'bg-ok' : 'bg-primary') : 'bg-input',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-[left]',
            checked ? 'left-[14px]' : 'left-0.5',
          )}
        />
      </button>
      {(label || description) && (
        <span className="flex flex-col leading-tight">
          {label && <span className="text-[12px] font-medium text-ink">{label}</span>}
          {description && <span className="text-[10px] text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}
