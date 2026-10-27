import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { BellOff, Settings } from 'lucide-react';
import type { Alert, Severity } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { fmtAgo } from '@/lib/format';
import { SEVERITY_LABEL, SEVERITY_RANK, SEVERITY_STYLE } from '@/lib/severity';
import { mediumName, slaMeta, STATUS_LABEL, userName } from '@/lib/alerts';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Chip, Dot, SeverityChip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { AlertDetail } from './AlertDetail';

type InboxTab = 'all' | 'open' | 'in_progress' | 'closed';

const DAY = 24 * 3_600_000;

export function AlertsPage() {
  const alerts = useStore((s) => s.alerts);
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<InboxTab>('open');
  const [sev, setSev] = useState<'all' | Severity>('all');

  const closedToday = (a: Alert) => a.status === 'closed' && (a.closure?.at ?? 0) > now - DAY;
  const counts = {
    all: alerts.filter((a) => a.status !== 'closed').length,
    open: alerts.filter((a) => a.status === 'open').length,
    in_progress: alerts.filter((a) => a.status === 'in_progress').length,
    closed: alerts.filter(closedToday).length,
  };

  const list = useMemo(
    () =>
      alerts
        .filter((a) => (tab === 'all' ? a.status !== 'closed' : tab === 'closed' ? closedToday(a) : a.status === tab))
        .filter((a) => sev === 'all' || a.severity === sev)
        .sort((a, b) =>
          tab === 'closed'
            ? (b.closure?.at ?? 0) - (a.closure?.at ?? 0)
            : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.createdAt - b.createdAt,
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alerts, tab, sev],
  );

  const selectedId = params.get('alerta');
  const selected = alerts.find((a) => a.id === selectedId) ?? list[0];

  // Keep the URL in sync with the default selection.
  useEffect(() => {
    if (!selectedId && list[0]) setParams((p) => ({ ...Object.fromEntries(p), alerta: list[0].id }), { replace: true });
  }, [selectedId, list, setParams]);

  const select = (id: string) => setParams((p) => ({ ...Object.fromEntries(p), alerta: id }));

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-[700px] flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Alertas"
        badges={
          <>
            <Chip tone="crit" mono>
              {counts.open} {counts.open === 1 ? 'abierta' : 'abiertas'}
            </Chip>
            <Chip tone="warn" mono>
              {counts.in_progress} en atención
            </Chip>
          </>
        }
        subtitle="Bandeja operativa del monitorista. Las reglas que las generan viven en Admin → Reglas de alertas."
        actions={
          <Link to="/admin/reglas">
            <Button icon={<Settings size={14} />}>Reglas de alertas</Button>
          </Link>
        }
      />

      <div className="flex min-h-0 flex-1 gap-3.5">
        {/* Inbox */}
        <section className="flex w-[470px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line bg-surface-alt px-3 py-2.5">
            <Segmented<InboxTab>
              size="sm"
              value={tab}
              onChange={setTab}
              items={[
                { key: 'all', label: `Todas ${counts.all}` },
                { key: 'open', label: `Abiertas ${counts.open}` },
                { key: 'in_progress', label: `En atención ${counts.in_progress}` },
                { key: 'closed', label: `Cerradas hoy ${counts.closed}` },
              ]}
            />
            <div className="flex-1" />
            <Select
              className="w-[104px]"
              value={sev}
              onChange={(e) => setSev(e.target.value as 'all' | Severity)}
              aria-label="Severidad"
              options={[{ value: 'all', label: 'Severidad' }, ...(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))]}
            />
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {list.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center text-muted">
                <BellOff size={22} className="text-faint" />
                <p className="mt-2 text-[12px]">No hay alertas en esta bandeja.</p>
              </div>
            ) : (
              list.map((a) => <InboxItem key={a.id} alert={a} selected={a.id === selected?.id} onSelect={() => select(a.id)} now={now} />)
            )}
          </div>
        </section>

        {/* Detail */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white">
          {selected ? (
            <AlertDetail key={selected.id} alert={selected} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[12px] text-muted">Selecciona una alerta de la bandeja.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function InboxItem({ alert: a, selected, onSelect, now }: { alert: Alert; selected: boolean; onSelect: () => void; now: number }) {
  const users = useStore((s) => s.users);
  const sla = slaMeta(a, now);
  const meta =
    a.status === 'closed' ? (
      <span className="text-muted">Cerrada · {a.closure?.reason}</span>
    ) : a.status === 'in_progress' ? (
      <span className="text-body">{mediumName(userName(users, a.assigneeId))}</span>
    ) : (
      <span className={sla.overdue ? 'font-bold text-crit' : 'text-muted'}>{sla.text}</span>
    );
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex w-full flex-col gap-1 border-b border-line-soft border-l-[3px] px-3.5 py-3 text-left transition-colors',
        selected ? 'border-l-primary bg-crit-row' : 'border-l-transparent hover:bg-surface-alt',
      )}
    >
      <div className="flex items-center gap-2">
        <Dot className={SEVERITY_STYLE[a.severity].dot} size={10} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">{a.title}</span>
        <span className="shrink-0 text-[10px] text-muted">{fmtAgo(a.createdAt, now)}</span>
      </div>
      <p className="truncate pl-[18px] text-[11px] text-body">{a.context}</p>
      <div className="flex items-center gap-1.5 pl-[18px]">
        <SeverityChip severity={a.severity} className="text-[9px]" />
        <Chip tone={a.status === 'open' ? 'neutral' : a.status === 'in_progress' ? 'warn' : 'ok'} className="text-[9px]">
          {STATUS_LABEL[a.status]}
        </Chip>
        <span className="truncate font-mono text-[10px]">{meta}</span>
      </div>
    </button>
  );
}
