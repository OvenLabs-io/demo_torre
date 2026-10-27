import type { Alert, AlertRule, Protocol, ProtocolStep, User } from '@/types/domain';
import { fmtSla } from '@/mocks/rules';

export interface SlaState {
  overdue: boolean;
  elapsedMin: number;
}

export function slaState(a: Alert, now: number): SlaState {
  const end = a.status === 'closed' && a.closure ? a.closure.at : now;
  const elapsedMin = Math.max(0, Math.floor((end - a.createdAt) / 60_000));
  return { overdue: elapsedMin > a.slaMinutes, elapsedMin };
}

/** Inbox meta: "SLA 5 min · vencido" / "SLA 15 min · 6 min" */
export function slaMeta(a: Alert, now: number): { text: string; overdue: boolean } {
  const s = slaState(a, now);
  return { text: `SLA ${fmtSla(a.slaMinutes)} · ${s.overdue ? 'vencido' : `${s.elapsedMin} min`}`, overdue: s.overdue };
}

/** "Luis G. Ochoa" from "Luis Gerardo Ochoa". */
export function mediumName(name: string): string {
  const p = name.split(' ');
  return p.length >= 3 ? `${p[0]} ${p[1][0]}. ${p.slice(2).join(' ')}` : name;
}

export function userName(users: User[], id?: string): string {
  return users.find((u) => u.id === id)?.name ?? '—';
}

export interface ProtocolStepView {
  stepId: string;
  index: number;
  step?: ProtocolStep;
  done: boolean;
  doneAt?: number;
  note?: string;
}

/** Joins the alert's step progress with the protocol definition. */
export function alertSteps(a: Alert, rules: AlertRule[], protocols: Protocol[]): { protocol?: Protocol; steps: ProtocolStepView[] } {
  const protocol = protocols.find((p) => p.id === rules.find((r) => r.id === a.ruleId)?.protocolId);
  return {
    protocol,
    steps: a.steps.map((s, i) => ({
      stepId: s.stepId,
      index: i + 1,
      step: protocol?.steps.find((ps) => ps.id === s.stepId),
      done: s.done,
      doneAt: s.doneAt,
      note: s.note,
    })),
  };
}

export const STATUS_LABEL: Record<Alert['status'], string> = {
  open: 'Abierta',
  in_progress: 'En atención',
  closed: 'Cerrada',
};
