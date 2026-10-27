import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  /** Orange frame: value differs from the base role (Usuarios y permisos). */
  highlight?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Checkbox({ checked, onChange, label, disabled, highlight, className, ...rest }: Props) {
  return (
    <label
      className={clsx(
        'inline-flex select-none items-center gap-2 text-[12px]',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={rest['aria-label']}
      />
      <span
        className={clsx(
          'flex size-[14px] shrink-0 items-center justify-center rounded-[3px] border peer-focus-visible:outline-2 peer-focus-visible:outline-primary',
          checked ? 'border-primary bg-primary text-white' : 'border-faint bg-white',
          highlight && 'outline-2 outline-offset-1 outline-high',
        )}
      >
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}
