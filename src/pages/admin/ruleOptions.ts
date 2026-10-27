import type { NotifyChannel, ProtocolStep } from '@/types/domain';
import { TRIP_GROUPS } from '@/mocks/clients';

export const RECIPIENTS = [
  'Monitorista en turno',
  'Jefe de tráfico',
  'Seguridad',
  'Custodia asignada',
  'Cliente (link público)',
  'Ejecutivo de cuenta',
  'Proveedor GPS',
  'Tráfico',
  'Recursos humanos',
];

export const CHANNELS: { key: NotifyChannel; label: string }[] = [
  { key: 'app', label: 'En la app' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Correo' },
  { key: 'call', label: 'Llamada automática' },
];

export const SUBJECTS = [
  'Detenida',
  'En movimiento',
  'Sin posición',
  'Velocidad',
  'Distancia a la ruta',
  'Durante',
  'fuera de',
  'Dentro de',
  'Ignición',
  'Candado',
  'Botón de pánico',
  'Días libres restantes',
  'Licencia o apto médico',
];

export const OPERATORS = ['más de', 'menos de', 'es', 'geocercas tipo', 'menor o igual a', 'vence en'];

export const SLA_OPTIONS = [2, 5, 10, 15, 30, 60, 1440];
export const APPLIES_TO = ['Todos los grupos de viaje', ...TRIP_GROUPS];
export const SCHEDULES = ['24/7', 'Lunes a viernes', 'Nocturno (22:00–06:00)'];
export const REPEATS = ['No repetir', 'Cada 5 min', 'Cada 10 min', 'Cada 15 min', 'Cada 30 min', 'Cada 60 min', 'Cada día'];

export const OWNERS = ['Monitorista', 'Jefe de tráfico', 'Jefe de seguridad', 'Ejecutivo de cuenta'];
export const MAX_MINUTES = [1, 2, 3, 5, 10, 15, 20, 30, 60];
export const EVIDENCE: { key: ProtocolStep['evidence']; label: string }[] = [
  { key: 'note', label: 'Evidencia: nota' },
  { key: 'photo', label: 'Evidencia: foto' },
  { key: 'pdf_report', label: 'Evidencia: reporte PDF' },
  { key: 'auto', label: 'Automático al marcar' },
];

const SHORT: Record<string, string> = {
  'Monitorista en turno': 'monitorista',
  'Custodia asignada': 'custodia',
  'Cliente (link público)': 'cliente',
};

/** "Monitorista, jefe de tráfico, seguridad" for the rules table. */
export function recipientsText(list: string[]): string {
  const text = list.map((r) => SHORT[r] ?? r.toLowerCase()).join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Select options that always include the current value. */
export function withCurrent(list: string[], current: string) {
  const all = current && !list.includes(current) ? [current, ...list] : list;
  return all.map((v) => ({ value: v, label: v }));
}
