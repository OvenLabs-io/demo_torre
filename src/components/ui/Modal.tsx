import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Custom header (replaces title/subtitle). */
  header?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  width?: number;
  height?: number | string;
  bodyClassName?: string;
  children: ReactNode;
  /** aria label when using a custom header. */
  label?: string;
}

/** Open modals, top-most last: only the top one reacts to Escape. */
const stack: symbol[] = [];

/** Centered modal with overlay. Esc and overlay click close it; focus is moved inside. */
export function Modal({ open, onClose, header, title, subtitle, footer, width = 620, height, bodyClassName, children, label }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    stack.push(id);
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      stack.splice(stack.indexOf(id), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(11,18,32,0.55)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        tabIndex={-1}
        className="flex max-h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-modal outline-none"
        style={{ maxWidth: width, height }}
      >
        {header ?? (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
            </div>
            <CloseButton onClick={onClose} />
          </div>
        )}
        <div className={clsx('min-h-0 flex-1 overflow-auto', bodyClassName ?? 'px-5 py-4')}>{children}</div>
        {footer && <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface-alt px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Cerrar"
      onClick={onClick}
      className="flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-line text-muted hover:bg-line-soft hover:text-ink"
    >
      <X size={14} />
    </button>
  );
}
