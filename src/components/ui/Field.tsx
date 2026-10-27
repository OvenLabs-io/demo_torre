import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export function Field({
  label,
  required,
  extra,
  help,
  error,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  extra?: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1', className)}>
      <span className="flex items-center gap-1.5 text-[11px] text-body">
        {label}
        {required && <span className="text-crit">*</span>}
        {extra}
      </span>
      {children}
      {error ? (
        <span className="text-[10px] text-crit">{error}</span>
      ) : help ? (
        <span className="text-[10px] text-muted">{help}</span>
      ) : null}
    </div>
  );
}

const inputBase =
  'h-[30px] w-full min-w-0 rounded-[4px] border bg-white px-2.5 text-[12px] text-ink placeholder:text-faint focus:border-primary focus:outline-none disabled:bg-line-soft disabled:text-muted';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  valid?: boolean;
  mono?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, valid, mono, leading, trailing, className, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={clsx(
        inputBase,
        mono && 'font-mono',
        invalid ? 'border-crit bg-crit-bg' : valid ? 'border-[#6ee7b7]' : 'border-input',
        leading && 'pl-8',
        trailing && 'pr-8',
        className,
      )}
      {...rest}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative min-w-0">
      {leading && <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint">{leading}</span>}
      {input}
      {trailing && <span className="absolute top-1/2 right-2.5 -translate-y-1/2">{trailing}</span>}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
  invalid?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { mono, invalid, options, placeholder, className, value, ...rest },
  ref,
) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <select
        ref={ref}
        value={value}
        className={clsx(
          inputBase,
          'appearance-none pr-7',
          mono && 'font-mono',
          invalid ? 'border-crit bg-crit-bg' : 'border-input',
          value === '' && 'text-faint',
        )}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="" disabled={rest.required}>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" />
    </div>
  );
});
