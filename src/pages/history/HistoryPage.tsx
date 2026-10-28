import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { HistoryTrip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { dayStart } from '@/lib/mockTime';
import { fmtDate, fmtDateTime, fmtDuration, fmtMoney, fmtNumber, normalize } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { Pagination } from '@/components/ui/Pagination';
import { Dot } from '@/components/ui/Chip';
import { HistoryTripModal } from './HistoryTripModal';

const PAGE_SIZE = 20;
const TERMINALS = ['CONTECON', 'SSA México', 'TIMSA', 'OCUPA'];

const STATUS_META: Record<HistoryTrip['status'], { label: string; dot: string }> = {
  closed: { label: 'Cerrado', dot: 'bg-ok' },
  closed_incident: { label: 'Cerrado con incidencia', dot: 'bg-high' },
  cancelled: { label: 'Cancelado', dot: 'bg-faint' },
};

type RangeKey = '7' | '15' | '30';

function rangeStart(key: RangeKey): number {
  return dayStart(-(Number(key) - 1));
}

/** "1–18 mar 2026" / "28 sep–27 oct 2026" */
function rangeLabel(key: RangeKey): string {
  const a = new Date(rangeStart(key));
  const b = new Date();
  const end = fmtDate(b.getTime(), true);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${end}` : `${fmtDate(a.getTime())}–${end}`;
}

export function HistoryPage() {
  const history = useStore((s) => s.history);
  const clients = useStore((s) => s.clients);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeKey>('30');
  const [status, setStatus] = useState('');
  const [terminal, setTerminal] = useState('');
  const [client, setClient] = useState('');
  const [driver, setDriver] = useState('');
  const [incidents, setIncidents] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HistoryTrip | null>(null);

  const drivers = useMemo(() => [...new Set(history.map((h) => h.driverShort))].sort(), [history]);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const from = rangeStart(range);
    return history
      .filter((h) => h.closedAt >= from)
      .filter((h) => !status || h.status === status)
      .filter((h) => !terminal || h.terminal === terminal)
      .filter((h) => !client || h.clientId === client)
      .filter((h) => !driver || h.driverShort === driver)
      .filter((h) => !incidents || (incidents === 'yes' ? h.incidents > 0 : h.incidents === 0))
      .filter((h) => !q || normalize(`${h.id} ${h.container} ${h.unitEconomic}`).includes(q))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [history, query, range, status, terminal, client, driver, incidents]);

  useEffect(() => setPage(1), [query, range, status, terminal, client, driver, incidents]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => {
    const n = filtered.length || 1;
    const avgWait = filtered.reduce((s, h) => s + h.terminalWaitMin, 0) / n;
    const delivered = filtered.filter((h) => h.status !== 'cancelled');
    const onTime = delivered.length ? (delivered.filter((h) => h.onTime).length / delivered.length) * 100 : 0;
    return [
      { value: fmtNumber(filtered.length), label: 'Viajes cerrados en el periodo' },
      { value: fmtDuration(avgWait, true), label: 'Espera promedio en terminal' },
      { value: fmtNumber(filtered.filter((h) => h.incidents > 0).length), label: 'Viajes con incidencia' },
      { value: fmtMoney(filtered.reduce((s, h) => s + h.demurrageMxn, 0)), label: 'Demoras pagadas a navieras' },
      { value: `${onTime.toFixed(1)} %`, label: 'Entregas a tiempo' },
    ];
  }, [filtered]);

  const exportCsv = () => {
    downloadCsv(
      `historial-viajes-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Viaje', 'Tipo', 'Cliente', 'Contenedor', 'Terminal', 'Tracto', 'Operador', 'Inicio', 'Cierre', 'Espera terminal (min)', 'Incidencias', 'Estado', 'Demora naviera (MXN)', 'A tiempo'],
      filtered.map((h) => [
        h.id,
        h.movement ?? '—',
        clientName(h.clientId),
        h.container,
        h.terminal,
        h.unitEconomic,
        h.driverShort,
        fmtDateTime(h.startedAt),
        fmtDateTime(h.closedAt),
        h.terminalWaitMin,
        h.incidents,
        STATUS_META[h.status].label,
        h.demurrageMxn,
        h.onTime ? 'Sí' : 'No',
      ]),
    );
    toast.success('CSV exportado', { description: `${filtered.length} viajes con los filtros actuales.` });
  };

  const rangeOptions = (['7', '15', '30'] as RangeKey[]).map((k) => ({ value: k, label: `Fechas: ${rangeLabel(k)}` }));

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Historial"
        subtitle="Viajes cerrados y filtros por estado, terminal, cliente y fechas. Lo que no debe estorbar en la torre de control."
        actions={
          <Button icon={<Download size={14} />} onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-white p-2.5">
        <div className="relative w-[210px]">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar viaje, contenedor, tracto…"
            aria-label="Buscar viaje, contenedor o tracto"
            className="h-[34px] w-full rounded-[4px] border border-input bg-white pr-2 pl-8 text-[14px] placeholder:text-faint focus:border-primary focus:outline-none"
          />
        </div>
        <Select className="w-[200px]" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} options={rangeOptions} aria-label="Fechas" />
        <Select
          className="w-[160px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Estado"
          options={[{ value: '', label: 'Estado: Todos' }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: `Estado: ${v.label}` }))]}
        />
        <Select
          className="w-[150px]"
          value={terminal}
          onChange={(e) => setTerminal(e.target.value)}
          aria-label="Terminal"
          options={[{ value: '', label: 'Terminal: Todas' }, ...TERMINALS.map((t) => ({ value: t, label: `Terminal: ${t}` }))]}
        />
        <Select
          className="w-[180px]"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          aria-label="Cliente"
          options={[{ value: '', label: 'Cliente: Todos' }, ...clients.map((c) => ({ value: c.id, label: `Cliente: ${c.name}` }))]}
        />
        <Select
          className="w-[130px]"
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          aria-label="Operador"
          options={[{ value: '', label: 'Operador' }, ...drivers.map((d) => ({ value: d, label: d }))]}
        />
        <Select
          className="w-[145px]"
          value={incidents}
          onChange={(e) => setIncidents(e.target.value)}
          aria-label="Con incidencias"
          options={[
            { value: '', label: 'Con incidencias' },
            { value: 'yes', label: 'Solo con incidencias' },
            { value: 'no', label: 'Sin incidencias' },
          ]}
        />
        <div className="flex-1" />
        <span className="text-[13px] text-muted">
          {filtered.length} viajes · {page} de {pages}
        </span>
      </div>

      <KpiStrip items={kpis} />

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1540px] table-fixed border-collapse text-[14px] [&_td]:whitespace-nowrap">
            <thead>
              <tr>
                <th className="th w-[150px]">Viaje</th>
                <th className="th w-[60px]">Tipo</th>
                <th className="th w-[210px]">Cliente</th>
                <th className="th w-[130px]">Contenedor</th>
                <th className="th w-[110px]">Terminal</th>
                <th className="th w-[190px]">Tracto · operador</th>
                <th className="th w-[120px]">Inicio</th>
                <th className="th w-[120px]">Cierre</th>
                <th className="th w-[140px]">Espera terminal</th>
                <th className="th w-[110px]">Incidencias</th>
                <th className="th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-muted">
                    No hay viajes cerrados con estos filtros.
                  </td>
                </tr>
              )}
              {rows.map((h) => (
                <tr
                  key={h.id}
                  tabIndex={0}
                  onClick={() => setSelected(h)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(h)}
                  title="Ver detalle del viaje"
                  className="h-[42px] cursor-pointer border-b border-line-soft hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none"
                >
                  <td className="px-3 font-mono font-bold text-primary">{h.id}</td>
                  <td className="px-3 text-body">{h.movement ?? '—'}</td>
                  <td className="truncate px-3 text-ink">{clientName(h.clientId)}</td>
                  <td className="truncate px-3 font-mono text-[13px]">{h.container}</td>
                  <td className="px-3 text-body">{h.terminal}</td>
                  <td className="truncate px-3 text-body">
                    {h.unitEconomic} · {h.driverShort}
                  </td>
                  <td className="px-3 font-mono text-[13px] text-body">{fmtDateTime(h.startedAt)}</td>
                  <td className="px-3 font-mono text-[13px] text-body">{fmtDateTime(h.closedAt)}</td>
                  <td className={clsx('px-3 font-mono text-[13px]', h.terminalWaitMin > 180 ? 'font-bold text-crit' : 'text-body')}>
                    {fmtDuration(h.terminalWaitMin, true)}
                  </td>
                  <td className={clsx('px-3 font-mono', h.incidents > 0 ? 'font-bold text-high' : 'text-faint')}>{h.incidents}</td>
                  <td className="px-3">
                    <span className="flex items-center gap-1.5 text-body">
                      <Dot className={STATUS_META[h.status].dot} />
                      {STATUS_META[h.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line-soft bg-surface-alt px-3.5 py-2.5 text-[13px] text-muted">
          <span>
            Clic en un viaje para ver su detalle · Mostrando {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      </div>

      {selected && <HistoryTripModal trip={selected} statusMeta={STATUS_META[selected.status]} onClose={() => setSelected(null)} />}
    </div>
  );
}
