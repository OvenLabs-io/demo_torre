import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Download, LogIn, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Company } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { fmtAgo, fmtNumber, initials, normalize } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Chip, Dot } from '@/components/ui/Chip';
import { Input, Select } from '@/components/ui/Field';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { Toggle } from '@/components/ui/Toggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const PLAN_META: Record<Company['plan'], { label: string; tone: 'neutral' | 'primary' | 'warn' }> = {
  basic: { label: 'Básico', tone: 'neutral' },
  pro: { label: 'Pro', tone: 'neutral' },
  enterprise: { label: 'Enterprise', tone: 'primary' },
  trial: { label: 'Prueba', tone: 'warn' },
};

const STATUS_META: Record<Company['status'], { label: string; dot: string; text: string }> = {
  active: { label: 'Activa', dot: 'bg-ok', text: 'text-body' },
  integration_error: { label: 'Integración con falla', dot: 'bg-crit', text: 'text-crit' },
  plan_expiring: { label: 'Plan por vencer', dot: 'bg-med', text: 'text-med' },
  trial: { label: 'Prueba', dot: 'bg-faint', text: 'text-muted' },
  suspended: { label: 'Suspendida', dot: 'bg-crit', text: 'text-crit' },
};

const SYNC_DOT: Record<Company['sync']['status'], string> = { ok: 'bg-ok', delayed: 'bg-med', error: 'bg-crit', pending: 'bg-crit' };

/** The tenant that has demo data in this prototype. */
const DEMO_TENANT = 'co-tpa';

/** "TP" for "Transportes del Pacífico" (skips connectors). */
function companyInitials(name: string): string {
  return initials(
    name
      .split(/\s+/)
      .filter((w) => !['de', 'del', 'la', 'las', 'los', 'y'].includes(w.toLowerCase()))
      .join(' '),
  );
}

function gpsText(c: Company): string {
  if (!c.gps.provider) return 'Sin GPS';
  return c.gps.extras?.length ? `${c.gps.provider} + ${c.gps.extras.join(', ')}` : c.gps.provider;
}

function syncText(c: Company, now: number): string {
  return c.sync.label ?? (c.sync.at ? fmtAgo(c.sync.at, now) : '—');
}

export function CompaniesPage() {
  const companies = useStore((s) => s.companies);
  const liveTrips = useStore((s) => s.trips.length);
  const now = useNow();
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [gps, setGps] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState(DEMO_TENANT);

  // Transportes del Pacífico shows the live number of trips of the tower.
  const withLive = useMemo(() => companies.map((c) => (c.id === DEMO_TENANT ? { ...c, activeTrips: liveTrips } : c)), [companies, liveTrips]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return withLive
      .filter((c) => !q || normalize(`${c.name} ${c.rfc ?? ''} ${c.contacts.map((x) => x.name).join(' ')}`).includes(q))
      .filter((c) => !plan || c.plan === plan)
      .filter((c) => !gps || (gps === 'none' ? !c.gps.provider : c.gps.provider === gps))
      .filter((c) => !status || c.status === status);
  }, [withLive, query, plan, gps, status]);

  const kpis = [
    { value: withLive.filter((c) => c.status !== 'suspended').length, label: 'Empresas activas' },
    { value: fmtNumber(withLive.reduce((s, c) => s + c.units.used, 0)), label: 'Unidades monitoreadas' },
    { value: withLive.reduce((s, c) => s + c.activeTrips, 0), label: 'Viajes activos ahora' },
    { value: fmtNumber(withLive.reduce((s, c) => s + c.alerts30d, 0)), label: 'Alertas en 30 días' },
    { value: withLive.filter((c) => c.status === 'integration_error').length, label: 'Integraciones con falla', tone: 'crit' as const },
    { value: withLive.filter((c) => c.status === 'plan_expiring').length, label: 'Por vencer plan (≤ 15 d)', tone: 'warn' as const },
  ];

  const exportCsv = () => {
    downloadCsv(
      `empresas-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Empresa', 'Ciudad', 'RFC', 'Plan', 'Unidades', 'Límite unidades', 'Usuarios', 'GPS', 'Sincronización', 'Viajes activos', 'Alertas 30 d', 'Estado'],
      rows.map((c) => [
        c.name,
        c.city,
        c.rfc ?? '',
        PLAN_META[c.plan].label,
        c.units.used,
        c.units.limit,
        c.users.used,
        gpsText(c),
        syncText(c, now),
        c.activeTrips,
        c.alerts30d,
        c.statusDetail ?? STATUS_META[c.status].label,
      ]),
    );
    toast.success('CSV exportado', { description: `${rows.length} empresas.` });
  };

  const selected = withLive.find((c) => c.id === selectedId) ?? withLive[0];

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Empresas"
        subtitle="Transportistas que usan la torre de control. Cada empresa tiene su propia central de monitoreo; aquí la damos de alta, conectamos su GPS y vemos su salud."
        actions={
          <>
            <Button icon={<Download size={14} />} onClick={exportCsv}>
              Exportar
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => toast('Disponible próximamente', { description: 'Alta de una empresa nueva.' })}
            >
              Nueva empresa
            </Button>
          </>
        }
      />

      <KpiStrip items={kpis} />

      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-line bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-2.5">
            <div className="relative w-[230px]">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar empresa, RFC, contacto…"
                aria-label="Buscar empresa, RFC o contacto"
                className="h-[30px] w-full rounded-[4px] border border-input pr-2 pl-8 text-[12px] placeholder:text-faint focus:border-primary focus:outline-none"
              />
            </div>
            <Select
              className="w-[130px]"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              aria-label="Plan"
              options={[{ value: '', label: 'Plan: Todos' }, ...Object.entries(PLAN_META).map(([k, v]) => ({ value: k, label: `Plan: ${v.label}` }))]}
            />
            <Select
              className="w-[130px]"
              value={gps}
              onChange={(e) => setGps(e.target.value)}
              aria-label="GPS"
              options={[
                { value: '', label: 'GPS: Todos' },
                { value: 'Wialon', label: 'GPS: Wialon' },
                { value: 'Samsara', label: 'GPS: Samsara' },
                { value: 'Geotab', label: 'GPS: Geotab' },
                { value: 'none', label: 'GPS: Sin GPS' },
              ]}
            />
            <Select
              className="w-[190px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Estado"
              options={[{ value: '', label: 'Estado: Todos' }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: `Estado: ${v.label}` }))]}
            />
            <div className="flex-1" />
            <span className="text-[11px] text-muted">{rows.length} empresas</span>
          </div>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-collapse text-[11px] [&_td]:px-2.5! [&_th]:px-2.5!">
              <thead>
                <tr>
                  <th className="th w-[156px]">Empresa</th>
                  <th className="th w-[96px]">Ciudad</th>
                  <th className="th w-[70px]">Plan</th>
                  <th className="th w-[64px]">Unidades</th>
                  <th className="th w-[58px]">Usuarios</th>
                  <th className="th w-[96px]">GPS</th>
                  <th className="th w-[120px]">Sincronización</th>
                  <th className="th w-[72px]">Viajes act.</th>
                  <th className="th w-[80px]">Alertas 30 d</th>
                  <th className="th">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-muted">
                      Ninguna empresa coincide con los filtros.
                    </td>
                  </tr>
                )}
                {rows.map((c) => {
                  const sel = c.id === selected?.id;
                  const st = STATUS_META[c.status];
                  return (
                    <tr key={c.id} onClick={() => setSelectedId(c.id)} className={clsx('h-11 cursor-pointer border-b border-line-soft', sel ? 'bg-line-soft' : 'hover:bg-surface-alt')}>
                      <td className={clsx('truncate px-3 font-medium text-ink', sel && 'border-l-[3px] border-l-console-accent pl-[9px]')}>{c.name}</td>
                      <td className="truncate px-3 text-body">{c.city}</td>
                      <td className="px-3">
                        <Chip tone={PLAN_META[c.plan].tone}>{PLAN_META[c.plan].label}</Chip>
                      </td>
                      <td className="px-3 font-mono text-[11px] whitespace-nowrap text-body">
                        {c.units.used}/{c.units.limit}
                      </td>
                      <td className="px-3 font-mono text-[11px] text-body">{c.users.used}</td>
                      <td className={clsx('truncate px-3', c.gps.provider ? 'text-body' : 'text-faint')}>{gpsText(c)}</td>
                      <td className={clsx('px-3', c.sync.status === 'error' || c.sync.status === 'pending' ? 'text-crit' : 'text-body')}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Dot className={SYNC_DOT[c.sync.status]} />
                          {syncText(c, now)}
                        </span>
                      </td>
                      <td className="px-3 font-mono text-[11px] text-body">{c.activeTrips}</td>
                      <td className="px-3 font-mono text-[11px] text-body">{fmtNumber(c.alerts30d)}</td>
                      <td className={clsx('px-3', st.text)}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Dot className={st.dot} />
                          {c.statusDetail ?? st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selected && <CompanyPanel key={selected.id} company={selected} />}
      </div>
    </div>
  );
}

function CompanyPanel({ company: c }: { company: Company }) {
  const navigate = useNavigate();
  const now = useNow();
  const updateCompany = useStore((s) => s.updateCompany);
  const [modules, setModules] = useState(c.modules);
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(modules) !== JSON.stringify(c.modules);
  const suspended = c.status === 'suspended';
  const soon = (what: string) => toast('Disponible próximamente', { description: what });

  const enterAsSupport = () => {
    if (c.id !== DEMO_TENANT) return toast('Sin datos de demostración', { description: 'En el prototipo solo Transportes del Pacífico tiene una torre con datos.' });
    navigate('/');
    toast.success('Entraste como soporte', { description: `${c.name} · tus acciones quedan registradas como soporte OvenLabs.` });
  };

  return (
    <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3.5">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[6px] bg-primary text-[12px] font-bold text-white">{companyInitials(c.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{c.name}</p>
          <p className="text-[10px] text-muted">
            Cliente desde {c.customerSince} · Plan {PLAN_META[c.plan].label}
            {c.rfc ? ` · RFC ${c.rfc}` : ''}
          </p>
        </div>
        <Button size="sm" icon={<LogIn size={12} />} onClick={enterAsSupport}>
          Entrar como soporte
        </Button>
      </div>

      <div className="grid grid-cols-4 border-b border-line">
        {[
          ['Unidades', `${c.units.used} de ${c.units.limit}`],
          ['Usuarios', `${c.users.used} de ${c.users.limit}`],
          ['Viajes / mes', fmtNumber(c.tripsPerMonth ?? 0)],
          ['Alertas / día', (c.alertsPerDay ?? 0).toFixed(1)],
        ].map(([label, value], i) => (
          <div key={label} className={clsx('px-3 py-2.5', i > 0 && 'border-l border-line')}>
            <p className="text-[9px] font-semibold tracking-[0.5px] text-muted uppercase">{label}</p>
            <p className="mt-0.5 font-mono text-[13px] font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 py-3.5">
        <div>
          <p className="label-section">Integración GPS</p>
          <div className="mt-2 rounded-[5px] border border-line p-3">
            {c.gps.provider ? (
              <>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <Dot className={SYNC_DOT[c.sync.status]} />
                    {c.gps.provider} · {c.sync.status === 'error' ? 'con falla' : c.sync.status === 'delayed' ? 'con retraso' : 'conectado'}
                  </span>
                  <span className={clsx('text-[10px]', c.sync.status === 'error' ? 'text-crit' : 'text-muted')}>
                    {c.sync.at ? `Última sync ${fmtAgo(c.sync.at, now).toLowerCase()}` : c.sync.label}
                  </span>
                </div>
                {c.integration && (
                  <>
                    <div className="mt-2.5 flex gap-2">
                      <Input value={`Token: ${c.integration.tokenMasked}`} readOnly disabled mono />
                      <Button onClick={() => soon('Rotar el token de la integración.')}>Rotar</Button>
                      <Button onClick={() => soon('Probar la conexión con el proveedor GPS.')}>Probar</Button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Metric label="Posiciones / min" value={fmtNumber(c.integration.positionsPerMin)} />
                      <Metric label="Geocercas sincronizadas" value={`${c.integration.geofencesSynced[0]} / ${c.integration.geofencesSynced[1]}`} />
                      <Metric label="Errores 24 h" value={String(c.integration.errors24h)} crit={c.integration.errors24h > 0} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] text-crit">
                  <Dot className="bg-crit" /> Sin GPS conectado
                </span>
                <Button size="sm" onClick={() => soon('Conectar la plataforma GPS de la empresa.')}>
                  Conectar GPS
                </Button>
              </div>
            )}
            <button type="button" onClick={() => soon('Agregar integraciones de candados o telemetría.')} className="mt-3 text-[11px] font-medium text-primary hover:underline">
              + agregar integración (candados, telemetría de temperatura)
            </button>
          </div>
        </div>

        <div>
          <p className="label-section">Módulos activos</p>
          <div className="mt-2 flex flex-col gap-2">
            {modules.map((m) => (
              <Toggle
                key={m.key}
                checked={m.enabled}
                onChange={(v) => setModules((list) => list.map((x) => (x.key === m.key ? { ...x, enabled: v } : x)))}
                label={<span className={clsx('font-normal', m.enabled ? 'text-ink' : 'text-faint')}>{m.label}</span>}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="label-section">Contactos</p>
          <ul className="mt-2 flex flex-col gap-2">
            {c.contacts.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-[12px]">
                <span>
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="block text-[10px] text-muted">{p.role}</span>
                </span>
                <span className="font-mono text-[11px] text-body">{p.phone}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-surface-alt px-4 py-2.5">
        {suspended ? (
          <Button variant="primary" onClick={() => setConfirm(true)}>
            Reactivar
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Suspender
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={() => soon('Cambiar el plan de la empresa.')}>Cambiar plan</Button>
        <Button
          variant="primary"
          disabled={!dirty}
          onClick={() => {
            updateCompany(c.id, { modules });
            toast.success('Módulos actualizados', { description: c.name });
          }}
        >
          Guardar
        </Button>
      </div>

      <ConfirmDialog
        open={confirm}
        title={suspended ? `Reactivar ${c.name}` : `Suspender ${c.name}`}
        message={
          suspended
            ? 'La empresa vuelve a tener acceso a su torre de control y se reanuda la lectura del GPS.'
            : 'Sus usuarios ya no podrán entrar y se pausa la lectura del GPS. Los datos se conservan.'
        }
        confirmLabel={suspended ? 'Reactivar' : 'Suspender'}
        danger={!suspended}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          updateCompany(c.id, suspended ? { status: 'active', statusDetail: undefined } : { status: 'suspended', statusDetail: 'Suspendida (manual)' });
          setConfirm(false);
          toast.success(suspended ? 'Empresa reactivada' : 'Empresa suspendida', { description: c.name });
        }}
      />
    </aside>
  );
}

function Metric({ label, value, crit }: { label: string; value: string; crit?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold tracking-[0.5px] text-muted uppercase">{label}</p>
      <p className={clsx('font-mono text-[13px] font-bold', crit ? 'text-crit' : 'text-ink')}>{value}</p>
    </div>
  );
}
