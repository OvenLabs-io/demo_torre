import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { GripVertical, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Protocol, ProtocolStep } from '@/types/domain';
import { useCurrentUser, useStore } from '@/store/useStore';
import { fmtDate, normalize } from '@/lib/format';
import { fmtSla } from '@/mocks/rules';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Select } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { EVIDENCE, MAX_MINUTES, OWNERS, withCurrent } from './ruleOptions';

function nextProtocolId(list: Protocol[]): string {
  const n = Math.max(0, ...list.map((p) => Number(p.id.slice(2)))) + 1;
  return `P-${String(n).padStart(2, '0')}`;
}

function newStep(): ProtocolStep {
  return { id: crypto.randomUUID(), title: '', description: '', owner: 'Monitorista', maxMinutes: 5, evidence: 'note' };
}

/** Creates an empty protocol and returns a callback that selects it. */
export function useNewProtocol(onCreated: (id: string) => void) {
  const user = useCurrentUser();
  return () => {
    const { protocols, upsertProtocol } = useStore.getState();
    const id = nextProtocolId(protocols);
    upsertProtocol({
      id,
      name: 'Nuevo protocolo',
      shortName: 'Nuevo',
      slaMinutes: 15,
      steps: [newStep()],
      closure: { requireReason: true, requireEvidence: false, onlyTrafficManager: false },
      updatedAt: Date.now(),
      updatedBy: user.name,
    });
    onCreated(id);
    toast.success('Protocolo creado', { description: 'Ponle nombre y define sus pasos.' });
  };
}

/** "Protocolos de atención" tab (Figma 06b). */
export function ProtocolsTab() {
  const protocols = useStore((s) => s.protocols);
  const rules = useStore((s) => s.rules);
  const upsertProtocol = useStore((s) => s.upsertProtocol);
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Protocol>>({});

  const selectedId = params.get('p') ?? protocols[0]?.id;
  const select = (id: string) => setParams({ tab: 'protocolos', p: id });
  const saved = protocols.find((p) => p.id === selectedId);
  const draft = (selectedId && drafts[selectedId]) || saved;
  const dirty = Boolean(selectedId && drafts[selectedId] && JSON.stringify(drafts[selectedId]) !== JSON.stringify(saved));

  const filtered = useMemo(() => protocols.filter((p) => normalize(p.name).includes(normalize(query))), [protocols, query]);
  const usedBy = (id: string) => rules.filter((r) => r.protocolId === id).map((r) => r.id);

  const edit = (fn: (p: Protocol) => Protocol) => {
    if (!draft) return;
    setDrafts((d) => ({ ...d, [draft.id]: fn(structuredClone(draft)) }));
  };
  const editStep = (i: number, patch: Partial<ProtocolStep>) => edit((p) => ({ ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const discard = () => {
    if (!draft) return;
    setDrafts(({ [draft.id]: _omit, ...rest }) => rest);
  };

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim() || 'Protocolo sin nombre';
    const steps = draft.steps.filter((s) => s.title.trim());
    if (!steps.length) {
      toast.error('Agrega al menos un paso con título.');
      return;
    }
    upsertProtocol({ ...draft, name, shortName: draft.shortName === 'Nuevo' ? name.split(' ')[0] : draft.shortName, steps, updatedAt: Date.now(), updatedBy: user.name });
    discard();
    toast.success('Protocolo guardado', { description: 'Los cambios aplican a alertas nuevas.' });
  };

  const duplicate = () => {
    if (!draft) return;
    const id = nextProtocolId(protocols);
    upsertProtocol({
      ...structuredClone(draft),
      id,
      name: `Copia de ${draft.name}`,
      steps: draft.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
      updatedAt: Date.now(),
      updatedBy: user.name,
    });
    select(id);
    toast.success('Protocolo duplicado');
  };

  // Drag & drop reordering (handle-only).
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [handleIdx, setHandleIdx] = useState<number | null>(null);
  const move = (from: number, to: number) =>
    edit((p) => {
      const steps = [...p.steps];
      const [s] = steps.splice(from, 1);
      steps.splice(to, 0, s);
      return { ...p, steps };
    });

  return (
    <div className="flex min-h-[560px] gap-3.5">
      {/* List */}
      <div className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
        <div className="border-b border-line p-2.5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar protocolo…"
              aria-label="Buscar protocolo"
              className="h-[30px] w-full rounded-[4px] border border-input pr-2 pl-8 text-[12px] placeholder:text-faint focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {filtered.map((p) => {
            const ids = usedBy(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p.id)}
                className={clsx(
                  'flex w-full items-center gap-3 border-b border-line-soft border-l-[3px] px-3.5 py-2.5 text-left',
                  p.id === selectedId ? 'border-l-primary bg-line-soft' : 'border-l-transparent hover:bg-surface-alt',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-ink">
                    {p.name}
                    {drafts[p.id] && <span className="ml-1.5 text-[10px] font-normal text-high">· sin guardar</span>}
                  </p>
                  <p className="text-[10px] text-muted">
                    {p.steps.length} {p.steps.length === 1 ? 'paso' : 'pasos'} · SLA {fmtSla(p.slaMinutes)}
                  </p>
                </div>
                <div className="flex gap-1">
                  {ids.length ? (
                    ids.map((id) => (
                      <span key={id} className="rounded-[3px] bg-line-soft px-1.5 py-px font-mono text-[9px] text-body">
                        {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-faint">sin regla</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      {draft ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center gap-3 border-b border-line bg-surface-alt px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                <span className="shrink-0">Protocolo ·</span>
                <input
                  value={draft.name}
                  onChange={(e) => edit((p) => ({ ...p, name: e.target.value }))}
                  aria-label="Nombre del protocolo"
                  className="min-w-0 flex-1 rounded-[3px] bg-transparent px-1 py-0.5 hover:bg-white focus:bg-white focus:outline-1 focus:outline-input"
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted">
                {usedBy(draft.id).length ? `Usado por ${usedBy(draft.id).join(', ')}` : 'Aún no lo usa ninguna regla'} · última edición{' '}
                {fmtDate(draft.updatedAt, true)} · {draft.updatedBy}
              </p>
            </div>
            <Select
              className="w-[120px]"
              value={String(draft.slaMinutes)}
              onChange={(e) => edit((p) => ({ ...p, slaMinutes: Number(e.target.value) }))}
              aria-label="SLA"
              options={[2, 5, 10, 15, 30, 60, 1440].map((m) => ({ value: String(m), label: `SLA ${fmtSla(m)}` }))}
            />
            <Button onClick={duplicate}>Duplicar</Button>
            <Button onClick={() => toast('Disponible próximamente', { description: 'Historial de cambios del protocolo.' })}>Historial de cambios</Button>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
            <ol className="flex flex-col gap-2">
              {draft.steps.map((s, i) => (
                <li
                  key={s.id}
                  draggable={handleIdx === i}
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null && dragFrom !== i) move(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setHandleIdx(null);
                  }}
                  className={clsx('flex items-start gap-2.5 rounded-[5px] border bg-white px-3 py-2.5', dragFrom === i ? 'border-primary opacity-60' : 'border-line')}
                >
                  <span
                    onMouseDown={() => setHandleIdx(i)}
                    onMouseUp={() => setHandleIdx(null)}
                    className="mt-1.5 cursor-grab text-input active:cursor-grabbing"
                    title="Arrastra para reordenar"
                  >
                    <GripVertical size={16} />
                  </span>
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={s.title}
                      onChange={(e) => editStep(i, { title: e.target.value })}
                      placeholder="Título del paso"
                      className="h-7 w-full rounded-[3px] border border-transparent px-1.5 text-[12px] font-medium text-ink hover:border-line focus:border-input focus:outline-none"
                    />
                    <input
                      value={s.description}
                      onChange={(e) => editStep(i, { description: e.target.value })}
                      placeholder="Descripción"
                      className="h-6 w-full rounded-[3px] border border-transparent px-1.5 text-[11px] text-muted hover:border-line focus:border-input focus:outline-none"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1.5">
                      <Select
                        className="w-[230px]"
                        value={s.owner}
                        onChange={(e) => editStep(i, { owner: e.target.value })}
                        options={withCurrent(OWNERS, s.owner).map((o) => ({ ...o, label: `Responsable: ${o.label}` }))}
                      />
                      <Select
                        className="w-[165px]"
                        value={String(s.maxMinutes)}
                        onChange={(e) => editStep(i, { maxMinutes: Number(e.target.value) })}
                        options={withCurrent(MAX_MINUTES.map(String), String(s.maxMinutes)).map((o) => ({ ...o, label: `Tiempo máx.: ${o.label} min` }))}
                      />
                      <Select
                        className="w-[190px]"
                        value={s.evidence}
                        onChange={(e) => editStep(i, { evidence: e.target.value as ProtocolStep['evidence'] })}
                        options={EVIDENCE.map((x) => ({ value: x.key, label: x.label }))}
                      />
                      {s.evidence === 'auto' && (
                        <Toggle checked={Boolean(s.sendsMessage)} onChange={(v) => editStep(i, { sendsMessage: v })} label={<span className="text-[11px] font-normal">Envía mensaje al marcar</span>} />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Eliminar paso"
                    onClick={() => edit((p) => ({ ...p, steps: p.steps.filter((_, j) => j !== i) }))}
                    className="mt-1.5 text-faint hover:text-crit"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => edit((p) => ({ ...p, steps: [...p.steps, newStep()] }))}
              className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-input text-[12px] text-body hover:bg-surface-alt"
            >
              <Plus size={14} /> Agregar paso
            </button>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="label-section">Cierre de la alerta</p>
              <Checkbox checked={draft.closure.requireReason} onChange={(v) => edit((p) => ({ ...p, closure: { ...p.closure, requireReason: v } }))} label="Requiere motivo de cierre" />
              <Checkbox checked={draft.closure.requireEvidence} onChange={(v) => edit((p) => ({ ...p, closure: { ...p.closure, requireEvidence: v } }))} label="Requiere al menos 1 evidencia" />
              <Checkbox checked={draft.closure.onlyTrafficManager} onChange={(v) => edit((p) => ({ ...p, closure: { ...p.closure, onlyTrafficManager: v } }))} label="Solo puede cerrar el jefe de tráfico" />
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-surface-alt px-4 py-2.5">
            <p className="flex-1 text-[11px] text-muted">Los cambios aplican a alertas nuevas; las abiertas conservan su protocolo.</p>
            <Button onClick={discard} disabled={!dirty}>
              Descartar
            </Button>
            <Button variant="primary" onClick={save} disabled={!dirty}>
              Guardar protocolo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-md border border-line bg-white text-[12px] text-muted">Selecciona un protocolo.</div>
      )}
    </div>
  );
}
