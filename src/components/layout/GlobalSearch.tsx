import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Container, Navigation, Search, Truck, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { normalize } from '@/lib/format';
import { crewName } from '@/mocks/crew';
import { useDismiss } from '@/components/ui/Popover';
import { useTripModal } from '@/components/trip/useTripModal';

type Kind = 'trip' | 'unit' | 'container' | 'driver';

interface Result {
  key: string;
  kind: Kind;
  primary: string;
  secondary: string;
  tripId: string;
}

const KIND_META: Record<Kind, { label: string; icon: typeof Search }> = {
  trip: { label: 'Viaje', icon: Navigation },
  unit: { label: 'Tracto', icon: Truck },
  container: { label: 'Contenedor', icon: Container },
  driver: { label: 'Operador', icon: User },
};

/** TopNav search: viaje, tracto, contenedor, operador → opens the trip modal. */
export function GlobalSearch() {
  const trips = useStore((s) => s.trips);
  const units = useStore((s) => s.units);
  const crew = useStore((s) => s.crew);
  const { open: openTrip } = useTripModal();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useDismiss(focused, () => setFocused(false));

  // "/" focuses the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    const out: Result[] = [];
    for (const t of trips) {
      const unit = units.find((u) => u.id === t.unitId);
      const driver = crew.find((c) => c.id === t.driverId);
      const dName = driver ? crewName(driver) : '';
      const tail = `${unit?.economic ?? t.unitId} · ${dName}`;
      if (normalize(t.id).includes(q)) out.push({ key: `t-${t.id}`, kind: 'trip', primary: t.id, secondary: tail, tripId: t.id });
      if (unit && (normalize(unit.economic ?? '').includes(q) || normalize(unit.plate).includes(q)))
        out.push({ key: `u-${t.id}`, kind: 'unit', primary: `${unit.economic} · ${unit.plate}`, secondary: `${t.id} · ${dName}`, tripId: t.id });
      for (const c of t.containers)
        if (normalize(c.number).includes(q))
          out.push({ key: `c-${t.id}-${c.number}`, kind: 'container', primary: c.number, secondary: `${t.id} · ${c.isoType}`, tripId: t.id });
      if (driver && normalize(dName).includes(q))
        out.push({ key: `d-${t.id}`, kind: 'driver', primary: dName, secondary: `${t.id} · ${unit?.economic ?? ''}`, tripId: t.id });
    }
    return out.slice(0, 8);
  }, [query, trips, units, crew]);

  useEffect(() => setCursor(0), [query]);

  const choose = (r: Result) => {
    openTrip(r.tripId);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const showPanel = focused && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-[300px] shrink">
      <div className="flex h-[30px] items-center gap-2 rounded-[4px] bg-white/10 px-2.5 focus-within:bg-white/15">
        <Search size={14} className="shrink-0 opacity-50" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && results[cursor]) {
              choose(results[cursor]);
            } else if (e.key === 'Escape') {
              setFocused(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Buscar viaje, tracto, contenedor, operador…"
          aria-label="Buscar viaje, tracto, contenedor u operador"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-white placeholder:text-white/60 focus:outline-none"
        />
        <kbd className="hidden rounded border border-white/20 px-1 font-mono text-[9px] text-white/50 xl:inline">/</kbd>
      </div>
      {showPanel && (
        <div className="absolute top-[36px] right-0 z-50 w-[380px] rounded-[5px] border border-line bg-white p-1.5 text-ink shadow-pop">
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-[11px] text-muted">Sin resultados entre los viajes activos.</p>
          ) : (
            results.map((r, i) => {
              const meta = KIND_META[r.kind];
              const Icon = meta.icon;
              return (
                <button
                  key={r.key}
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(r)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-1.5 text-left',
                    i === cursor && 'bg-line-soft',
                  )}
                >
                  <Icon size={14} className="shrink-0 text-faint" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-mono text-[11px] font-bold text-ink">{r.primary}</span>
                    <span className="truncate text-[10px] text-muted">{r.secondary}</span>
                  </span>
                  <span className="text-[9px] tracking-[0.5px] text-faint uppercase">{meta.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
