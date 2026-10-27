import type { Alert, AlertStepProgress } from '@/types/domain';
import { dt } from '@/lib/mockTime';
import { fmtDate } from '@/lib/format';
import { PROTOCOLS } from './protocols';
import { RULES } from './rules';
import { CREW } from './crew';
import { PLACES } from './places';

/** Builds step progress for a rule's protocol: `done` = list of [time, note] for the first steps. */
function progress(ruleId: string, done: [string, string?][] = []): AlertStepProgress[] {
  const rule = RULES.find((r) => r.id === ruleId)!;
  const protocol = PROTOCOLS.find((p) => p.id === rule.protocolId);
  if (!protocol) return [];
  return protocol.steps.map((s, i) => ({
    stepId: s.id,
    done: i < done.length,
    doneAt: i < done.length ? dt(done[i][0]) : undefined,
    note: i < done.length ? done[i][1] : undefined,
  }));
}

function base(ruleId: string): Pick<Alert, 'ruleId' | 'severity' | 'slaMinutes'> {
  const rule = RULES.find((r) => r.id === ruleId)!;
  return { ruleId, severity: rule.severity, slaMinutes: rule.slaMinutes };
}

const oscar = CREW.find((c) => c.id === 'op-odp')!;

/** The 8 alerts in the Figma inbox (05). */
const ACTIVE: Alert[] = [
  {
    id: 'AL-2603-0412',
    ...base('R-01'),
    title: 'Detención no autorizada',
    headline: 'Detención no autorizada · fuera de geocerca',
    status: 'open',
    createdAt: dt('10:29'),
    tripId: 'SRV-2603-0186',
    unitId: 'T-103',
    context: 'T-103 · SRV-2603-0186 · Atenquique, Jal.',
    location: {
      label: 'Atenquique, Jal.',
      position: [PLACES.atenquique.pos[0] + 0.004, PLACES.atenquique.pos[1] + 0.006],
      detail: 'Autopista 54D km 78 · 2.1 km fuera de geocerca de ruta',
    },
    steps: progress('R-01', [
      ['10:31', 'sin respuesta'],
      ['10:38', 'custodia en camino, 25 min'],
    ]),
    timeline: [
      { at: dt('10:29'), text: 'Alerta generada por regla R-01' },
      { at: dt('10:31'), text: 'Llamada sin respuesta (2) · L. Ochoa' },
      { at: dt('10:38'), text: 'Custodia confirmada, ETA 25 min · L. Ochoa' },
      { at: dt('10:47'), text: 'Escalamiento automático: SLA vencido' },
    ],
  },
  {
    id: 'AL-2603-0410',
    ...base('R-02'),
    title: 'Pérdida de señal GPS',
    status: 'in_progress',
    createdAt: dt('10:19'),
    tripId: 'SRV-2603-0190',
    unitId: 'T-107',
    context: 'T-107 · SRV-2603-0190 · última pos. Atenquique',
    location: { label: 'Atenquique, Jal.', position: [PLACES.atenquique.pos[0] + 0.014, PLACES.atenquique.pos[1] - 0.05], detail: 'Última posición 09:48' },
    assigneeId: 'u-lgo',
    takenAt: dt('10:21'),
    steps: progress('R-02', [['10:24', 'operador no contesta']]),
    timeline: [
      { at: dt('10:19'), text: 'Alerta generada por regla R-02' },
      { at: dt('10:21'), text: 'Alerta tomada por L. Ochoa' },
      { at: dt('10:24'), text: 'Llamada sin respuesta · L. Ochoa' },
    ],
  },
  {
    id: 'AL-2603-0415',
    ...base('R-03'),
    title: 'Apertura de candado fuera de geocerca',
    status: 'open',
    createdAt: dt('10:44'),
    tripId: 'SRV-2603-0186',
    unitId: 'T-103',
    context: 'T-103 · SRV-2603-0186',
    location: { label: 'Atenquique, Jal.', position: [PLACES.atenquique.pos[0] + 0.004, PLACES.atenquique.pos[1] + 0.006], detail: 'Candado CND-0443 abierto' },
    steps: progress('R-03'),
    timeline: [{ at: dt('10:44'), text: 'Alerta generada por regla R-03' }],
  },
  {
    id: 'AL-2603-0411',
    ...base('R-06'),
    title: 'Espera excesiva en terminal',
    status: 'open',
    createdAt: dt('10:29'),
    tripId: 'SRV-2603-0188',
    unitId: 'T-105',
    context: 'T-105 · CONTECON · 1 h 14 min',
    location: { label: 'Acceso CONTECON', position: PLACES.contecon.pos, detail: 'Dentro de geocerca CONTECON · acceso y patio' },
    steps: progress('R-06'),
    timeline: [{ at: dt('10:29'), text: 'Alerta generada por regla R-06' }],
  },
  {
    id: 'AL-2603-0407',
    ...base('R-07'),
    title: 'Días libres por vencer',
    status: 'in_progress',
    createdAt: dt('10:06'),
    tripId: 'SRV-2603-0184',
    containerNumber: 'MSKU4821736',
    context: 'MSKU4821736 · vence mañana',
    location: { label: 'Patio externo, Jalipa', position: PLACES.jalipa.pos },
    assigneeId: 'u-kbe',
    takenAt: dt('10:12'),
    steps: progress('R-07'),
    timeline: [
      { at: dt('10:06'), text: 'Alerta generada por regla R-07' },
      { at: dt('10:12'), text: 'Alerta tomada por K. Benítez' },
    ],
  },
  {
    id: 'AL-2603-0413',
    ...base('R-05'),
    title: 'Desvío de ruta > 2 km',
    status: 'open',
    createdAt: dt('10:38'),
    tripId: 'SRV-2603-0194',
    unitId: 'T-111',
    context: 'T-111 · SRV-2603-0194 · Libramiento de León',
    location: { label: 'Libramiento de León, Gto.', position: PLACES.leonLib.pos, detail: '2.4 km fuera de la ruta planeada' },
    steps: progress('R-05'),
    timeline: [{ at: dt('10:38'), text: 'Alerta generada por regla R-05' }],
  },
  {
    id: 'AL-2603-0409',
    ...base('R-08'),
    title: 'Exceso de velocidad',
    status: 'in_progress',
    createdAt: dt('10:26'),
    tripId: 'SRV-2603-0195',
    unitId: 'T-112',
    context: 'T-112 · 98 km/h · Carr. a Lagos',
    location: { label: 'Carr. a Lagos de Moreno', position: PLACES.lagosRoad.pos, detail: '98 km/h durante 3 min' },
    assigneeId: 'u-ica',
    takenAt: dt('10:30'),
    steps: progress('R-08'),
    timeline: [
      { at: dt('10:26'), text: 'Alerta generada por regla R-08' },
      { at: dt('10:30'), text: 'Alerta tomada por I. Castañeda' },
    ],
  },
  {
    id: 'AL-2603-0401',
    ...base('R-10'),
    title: 'Licencia por vencer',
    status: 'open',
    createdAt: dt('08:47'),
    crewId: 'op-odp',
    context: `Óscar D. Peña · ${fmtDate(oscar.license.expiresOn, true)}`,
    steps: progress('R-10'),
    timeline: [{ at: dt('08:47'), text: 'Alerta generada por regla R-10' }],
  },
];

/** 12 alerts closed today (generated, "Cerradas hoy 12"). */
const CLOSED_SEED: [string, string, string, string, string, string, string][] = [
  // rule, title, context, created, closed, user, reason
  ['R-08', 'Exceso de velocidad', 'T-106 · 97 km/h · Autopista GDL–Colima', '01:12', '01:20', 'u-ica', 'Resuelta por el operador'],
  ['R-02', 'Pérdida de señal GPS', 'T-109 · SRV-2603-0192 · Cuesta de Sayula', '02:05', '02:31', 'u-ica', 'Resuelta'],
  ['R-05', 'Desvío de ruta > 2 km', 'T-104 · SRV-2603-0187 · Libramiento de Tepatitlán', '03:48', '04:10', 'u-ica', 'Resuelta por el operador'],
  ['R-01', 'Detención no autorizada', 'T-112 · SRV-2603-0195 · Acatlán de Juárez', '05:02', '05:30', 'u-ica', 'Falsa alarma'],
  ['R-08', 'Exceso de velocidad', 'T-102 · 96 km/h · Autopista 54D', '06:15', '06:22', 'u-lgo', 'Resuelta por el operador'],
  ['R-06', 'Espera excesiva en terminal', 'T-109 · CONTECON · 2 h 10 min', '06:40', '07:05', 'u-aru', 'Resuelta'],
  ['R-02', 'Pérdida de señal GPS', 'T-103 · SRV-2603-0186 · Tecomán', '07:20', '07:41', 'u-lgo', 'Resuelta'],
  ['R-07', 'Días libres por vencer', 'HLXU4829103 · vence hoy', '07:55', '08:30', 'u-kbe', 'Resuelta'],
  ['R-08', 'Exceso de velocidad', 'T-111 · 99 km/h · Autopista 80D', '08:12', '08:18', 'u-lgo', 'Resuelta por el operador'],
  ['R-01', 'Detención no autorizada', 'T-108 · SRV-2603-0191 · Zapotlanejo', '08:44', '09:10', 'u-kbe', 'Falsa alarma'],
  ['R-05', 'Desvío de ruta > 2 km', 'T-106 · SRV-2603-0189 · Sayula', '09:21', '09:35', 'u-lgo', 'Duplicada'],
  ['R-08', 'Exceso de velocidad', 'T-104 · 97 km/h · Libramiento de Colima', '09:50', '09:58', 'u-kbe', 'Resuelta por el operador'],
];

const CLOSED: Alert[] = CLOSED_SEED.map(([ruleId, title, context, created, closed, userId, reason], i) => ({
  id: `AL-2603-${String(380 + i).padStart(4, '0')}`,
  ...base(ruleId),
  title,
  status: 'closed',
  createdAt: dt(created),
  context,
  assigneeId: userId,
  takenAt: dt(created) + 120_000,
  steps: progress(ruleId).map((s) => ({ ...s, done: true, doneAt: dt(closed) })),
  timeline: [
    { at: dt(created), text: `Alerta generada por regla ${ruleId}` },
    { at: dt(closed), text: `Alerta cerrada · ${reason}` },
  ],
  closure: { reason, at: dt(closed), byUserId: userId },
}));

export const ALERTS: Alert[] = [...ACTIVE, ...CLOSED];

export const CLOSE_REASONS = ['Resuelta', 'Falsa alarma', 'Resuelta por el operador', 'Duplicada'];
