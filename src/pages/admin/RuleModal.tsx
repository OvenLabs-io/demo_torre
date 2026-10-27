import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AlertRule, AlertSeverity, NotifyChannel } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { SEVERITY_LABEL } from '@/lib/severity';
import { fmtSla } from '@/mocks/rules';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Select } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { APPLIES_TO, CHANNELS, OPERATORS, RECIPIENTS, REPEATS, SCHEDULES, SLA_OPTIONS, SUBJECTS, withCurrent } from './ruleOptions';

type Draft = Omit<AlertRule, 'id' | 'fired30d' | 'conditionText'>;

const EMPTY: Draft = {
  active: true,
  name: '',
  clauses: [{ subject: 'Detenida', operator: 'más de', value: '30 min' }],
  severity: 'high',
  slaMinutes: 15,
  protocolId: null,
  notify: { recipients: ['Monitorista en turno'], channels: ['app'] },
  appliesTo: 'Todos los grupos de viaje',
  schedule: '24/7',
  repeat: 'Cada 30 min',
};

function conditionText(clauses: Draft['clauses']): string {
  return clauses.map((c) => `${c.subject} ${c.operator} ${c.value}`.trim()).join(' y ');
}

/** Rough "would have fired" number for the preview banner. */
function estimateFired(d: Draft): number {
  const seed = (d.name + JSON.stringify(d.clauses)).split('').reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7);
  return 3 + (seed % 38);
}

/** "Nueva regla de alerta" / edit modal (Figma 06m). */
export function RuleModal({ rule, onClose }: { rule: AlertRule | null; onClose: () => void }) {
  const { rules, protocols, upsertRule } = useStore();
  const [d, setD] = useState<Draft>(() => (rule ? structuredClone(rule) : structuredClone(EMPTY)));
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const fired = rule?.fired30d ?? estimateFired(d);
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = () => {
    const errs: string[] = [];
    if (!d.name.trim()) errs.push('Escribe el nombre de la regla.');
    if (d.clauses.some((c) => !c.value.trim())) errs.push('Completa el valor de cada condición.');
    if (!d.notify.recipients.length) errs.push('Elige al menos a quién notificar.');
    if (!d.notify.channels.length) errs.push('Elige al menos un canal.');
    setErrors(errs);
    if (errs.length) return;
    const nextNum = Math.max(...rules.map((r) => Number(r.id.slice(2)))) + 1;
    const saved: AlertRule = {
      ...d,
      name: d.name.trim(),
      id: rule?.id ?? `R-${String(nextNum).padStart(2, '0')}`,
      conditionText: rule && JSON.stringify(rule.clauses) === JSON.stringify(d.clauses) ? rule.conditionText : conditionText(d.clauses),
      fired30d: rule?.fired30d ?? null,
    };
    upsertRule(saved);
    toast.success(rule ? `Regla ${saved.id} actualizada` : `Regla ${saved.id} creada`, {
      description: `${saved.name} · ${saved.active ? 'activa' : 'inactiva'}`,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={840}
      title={rule ? `Editar regla · ${rule.id}` : 'Nueva regla de alerta'}
      subtitle="Condición → severidad → protocolo → a quién avisar"
      footer={
        <>
          <Toggle checked={d.active} onChange={(v) => set('active', v)} label={<span className="font-normal">Regla activa al guardar</span>} />
          <div className="flex-1 text-right text-[10px] text-crit">{errors[0]}</div>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Guardar regla
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre de la regla">
          <Input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Detención no autorizada" autoFocus />
        </Field>

        <div>
          <p className="label-section">Condición</p>
          <div className="mt-2 flex flex-col gap-2 rounded-[5px] bg-surface-alt p-2.5">
            {d.clauses.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-[30px] w-[178px] shrink-0 items-center gap-1.5 rounded-[4px] bg-line-soft px-2.5 text-[12px] whitespace-nowrap text-muted">
                  <Lock size={11} />
                  {i === 0 ? 'Cuando la unidad está' : 'y'}
                </span>
                <Select
                  className="w-[180px] shrink-0"
                  value={c.subject}
                  onChange={(e) => set('clauses', d.clauses.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))}
                  options={withCurrent(SUBJECTS, c.subject)}
                />
                <Select
                  className="w-[150px] shrink-0"
                  value={c.operator}
                  onChange={(e) => set('clauses', d.clauses.map((x, j) => (j === i ? { ...x, operator: e.target.value } : x)))}
                  options={withCurrent(OPERATORS, c.operator)}
                />
                <Input
                  mono
                  value={c.value}
                  onChange={(e) => set('clauses', d.clauses.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  placeholder="30 min"
                />
                {d.clauses.length > 1 && (
                  <button
                    type="button"
                    aria-label="Quitar condición"
                    onClick={() => set('clauses', d.clauses.filter((_, j) => j !== i))}
                    className="shrink-0 text-faint hover:text-crit"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('clauses', [...d.clauses, { subject: 'Ignición', operator: 'es', value: 'OFF o cualquiera' }])}
              className="w-fit text-[11px] font-medium text-primary hover:underline"
            >
              + agregar condición
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Severidad">
            <Select
              value={d.severity}
              onChange={(e) => set('severity', e.target.value as AlertSeverity)}
              options={(['critical', 'high', 'medium', 'low'] as AlertSeverity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] }))}
            />
          </Field>
          <Field label="SLA de atención">
            <Select
              value={String(d.slaMinutes)}
              onChange={(e) => set('slaMinutes', Number(e.target.value))}
              options={SLA_OPTIONS.map((m) => ({ value: String(m), label: fmtSla(m) }))}
            />
          </Field>
          <Field label="Protocolo de atención">
            <Select
              value={d.protocolId ?? ''}
              onChange={(e) => set('protocolId', e.target.value || null)}
              options={[
                { value: '', label: 'Sin protocolo' },
                ...protocols.map((p) => ({ value: p.id, label: `${p.shortName} (${p.steps.length} ${p.steps.length === 1 ? 'paso' : 'pasos'})` })),
              ]}
            />
          </Field>
          <Field label="Aplica a">
            <Select value={d.appliesTo} onChange={(e) => set('appliesTo', e.target.value)} options={withCurrent(APPLIES_TO, d.appliesTo)} />
          </Field>
          <Field label="Horario">
            <Select value={d.schedule} onChange={(e) => set('schedule', e.target.value)} options={withCurrent(SCHEDULES, d.schedule)} />
          </Field>
          <Field label="Repetir si sigue activa">
            <Select value={d.repeat} onChange={(e) => set('repeat', e.target.value)} options={withCurrent(REPEATS, d.repeat)} />
          </Field>
        </div>

        <div>
          <p className="label-section">Notificar</p>
          <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2">
            {RECIPIENTS.map((r) => (
              <Checkbox
                key={r}
                checked={d.notify.recipients.includes(r)}
                onChange={() => set('notify', { ...d.notify, recipients: toggleIn(d.notify.recipients, r) })}
                label={r}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="label-section">Canal</p>
          {CHANNELS.map((c) => (
            <Checkbox
              key={c.key}
              checked={d.notify.channels.includes(c.key)}
              onChange={() => set('notify', { ...d.notify, channels: toggleIn<NotifyChannel>(d.notify.channels, c.key) })}
              label={c.label}
            />
          ))}
        </div>

        <InfoBanner tone="warn">
          Vista previa: en los últimos 30 días esta regla habría disparado <b>{fired}</b> alertas (promedio {(fired / 30).toFixed(1)} por día).
        </InfoBanner>
      </div>
    </Modal>
  );
}
