import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { usePrefs } from '@/store/prefs';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select } from '@/components/ui/Field';

/** Search + "Agrupar por" + "Solo con alertas" (shared by Lista and Mapa). */
export function TowerToolbar({ children }: { children?: ReactNode }) {
  const { query, setQuery, groupBy, setGroupBy, onlyAlerts, setOnlyAlerts } = usePrefs();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2.5">
      <div className="relative w-[380px]">
        <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar viaje, tracto, operador, contenedor…"
          aria-label="Buscar viaje, tracto, operador o contenedor"
          className="h-[34px] w-full rounded-[4px] border border-input bg-white pr-7 pl-8 text-[14px] placeholder:text-faint focus:border-primary focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-faint hover:text-ink"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <Select
        className="w-[260px]"
        value={groupBy}
        onChange={(e) => setGroupBy(e.target.value as 'group' | 'none')}
        aria-label="Agrupar por"
        options={[
          { value: 'group', label: 'Agrupar por: Grupo de viaje' },
          { value: 'none', label: 'Agrupar por: Sin agrupar' },
        ]}
      />
      <CheckPill checked={onlyAlerts} onChange={setOnlyAlerts} label="Solo con alertas" />
      {children}
    </div>
  );
}

export function CheckPill({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex h-[34px] items-center rounded-[4px] border bg-white px-2.5',
        checked ? 'border-primary/40' : 'border-input',
      )}
    >
      <Checkbox
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        label={<span className={clsx('text-[14px]', checked ? 'text-primary' : 'text-body')}>{label}</span>}
      />
    </div>
  );
}
