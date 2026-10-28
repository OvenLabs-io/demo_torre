import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { AlertRule } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { fmtSla } from '@/mocks/rules';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { SeverityChip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { Toggle } from '@/components/ui/Toggle';
import { RuleModal } from './RuleModal';
import { ProtocolsTab, useNewProtocol } from './ProtocolsTab';
import { recipientsText } from './ruleOptions';

type Tab = 'reglas' | 'protocolos';

export function RulesPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'protocolos' ? 'protocolos' : 'reglas';
  const rules = useStore((s) => s.rules);
  const protocols = useStore((s) => s.protocols);
  const toggleRule = useStore((s) => s.toggleRule);
  const [editing, setEditing] = useState<AlertRule | null | 'new'>(null);
  const newProtocol = useNewProtocol((id) => setParams({ tab: 'protocolos', p: id }));

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Reglas de alertas"
        subtitle={
          tab === 'reglas'
            ? 'Reglas de negocio que generan las alertas. Cada regla apunta a un protocolo de atención (pestaña Protocolos). Se crean y editan en una modal para no salir de la página.'
            : 'Protocolos: la lista de pasos que sigue el monitorista cuando salta una alerta. Cada regla usa uno.'
        }
        actions={
          tab === 'reglas' ? (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setEditing('new')}>
              Nueva regla
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={14} />} onClick={newProtocol}>
              Nuevo protocolo
            </Button>
          )
        }
      />

      <Tabs<Tab>
        value={tab}
        onChange={(k) => setParams(k === 'reglas' ? {} : { tab: k })}
        items={[
          { key: 'reglas', label: `Reglas de alertas (${rules.length})` },
          { key: 'protocolos', label: `Protocolos de atención (${protocols.length})` },
        ]}
      />

      {tab === 'reglas' ? (
        <div className="overflow-hidden rounded-md border border-line bg-white">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1300px] table-fixed border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="th w-[52px]" aria-label="Activa" />
                  <th className="th w-[64px]">ID</th>
                  <th className="th w-[220px]">Regla</th>
                  <th className="th w-[300px]">Condición</th>
                  <th className="th w-[90px]">Severidad</th>
                  <th className="th w-[90px]">SLA</th>
                  <th className="th w-[180px]">Protocolo</th>
                  <th className="th w-[230px]">Notificar a</th>
                  <th className="th w-[120px] text-right">Disparos 30 d</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const p = protocols.find((x) => x.id === r.protocolId);
                  return (
                    <tr key={r.id} className="h-12 border-b border-line-soft hover:bg-surface-alt">
                      <td className="px-3">
                        <Toggle
                          checked={r.active}
                          onChange={() => {
                            toggleRule(r.id);
                            toast.success(`Regla ${r.id} ${r.active ? 'desactivada' : 'activada'}`, { description: r.name });
                          }}
                        />
                      </td>
                      <td className="px-3 font-mono font-bold text-primary">{r.id}</td>
                      <td className={clsx('px-3 text-[14px] font-medium', r.active ? 'text-ink' : 'text-faint')}>{r.name}</td>
                      <td className="px-3 py-1.5 text-body">{r.conditionText}</td>
                      <td className="px-3">
                        <SeverityChip severity={r.severity} />
                      </td>
                      <td className="px-3 font-mono whitespace-nowrap text-body">{fmtSla(r.slaMinutes)}</td>
                      <td className="px-3 text-body">{p ? `${p.shortName} (${p.steps.length} ${p.steps.length === 1 ? 'paso' : 'pasos'})` : '—'}</td>
                      <td className="px-3 text-body">{recipientsText(r.notify.recipients)}</td>
                      <td className="px-3 text-right font-mono text-body">{r.fired30d ?? '—'}</td>
                      <td className="px-3 text-right">
                        <Button size="sm" onClick={() => setEditing(r)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ProtocolsTab />
      )}

      {editing && <RuleModal rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
