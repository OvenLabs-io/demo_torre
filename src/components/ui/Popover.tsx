import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

/** Calls `onOutside` on mousedown outside `ref` and on Escape. */
export function useDismiss(open: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onDismiss);
  cb.current = onDismiss;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cb.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return ref;
}

/** Click-to-open floating panel anchored under its trigger. */
export function Popover({
  trigger,
  children,
  align = 'left',
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={clsx(
            'absolute top-full z-50 mt-1 rounded-[5px] border border-line bg-white p-1.5 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
