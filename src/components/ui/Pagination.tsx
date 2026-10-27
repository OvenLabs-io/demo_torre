import clsx from 'clsx';

/** ‹ 1 2 3 … 8 › pager with 24px squares. */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const items: (number | '…')[] = [];
  const add = (p: number) => !items.includes(p) && items.push(p);
  add(1);
  const from = Math.max(2, Math.min(page - 1, pages - 3));
  const to = Math.min(pages - 1, Math.max(page + 1, 3));
  for (let p = from; p <= to; p++) {
    if (p > (items[items.length - 1] as number) + 1) items.push('…');
    add(p);
  }
  if (pages > 1) {
    if (pages > (items[items.length - 1] as number) + 1) items.push('…');
    add(pages);
  }
  const btn = 'flex size-6 items-center justify-center rounded-[3px] border text-[11px] font-mono';
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => onChange(page - 1)} className={clsx(btn, 'border-line bg-white text-body disabled:opacity-40')}>
        ‹
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`e${i}`} className="w-4 text-center text-[11px] text-muted">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            aria-current={it === page ? 'page' : undefined}
            className={clsx(btn, it === page ? 'border-primary bg-primary text-white' : 'border-line bg-white text-body hover:bg-surface-alt')}
          >
            {it}
          </button>
        ),
      )}
      <button type="button" aria-label="Página siguiente" disabled={page === pages} onClick={() => onChange(page + 1)} className={clsx(btn, 'border-line bg-white text-body disabled:opacity-40')}>
        ›
      </button>
    </div>
  );
}
