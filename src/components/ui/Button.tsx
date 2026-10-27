import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:brightness-110 disabled:bg-faint',
  secondary: 'bg-white text-body border border-input hover:bg-surface-alt disabled:text-faint',
  danger: 'bg-crit text-white hover:brightness-110 disabled:opacity-50',
  ghost: 'text-body hover:bg-line-soft disabled:text-faint',
  link: 'text-primary hover:underline px-0! h-auto! disabled:text-faint',
};

const SIZES: Record<Size, string> = {
  sm: 'h-6 px-2 text-[11px] gap-1',
  md: 'h-[30px] px-3 text-[12px] gap-1.5',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[4px] font-medium transition-[background,filter] disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});
