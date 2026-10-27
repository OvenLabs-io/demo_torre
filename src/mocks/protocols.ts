import type { Protocol, ProtocolStep } from '@/types/domain';
import { onDay } from '@/lib/mockTime';

let stepSeq = 0;
function step(
  title: string,
  description: string,
  owner: string,
  maxMinutes: number,
  evidence: ProtocolStep['evidence'],
  sendsMessage?: boolean,
): ProtocolStep {
  stepSeq += 1;
  return { id: `st-${stepSeq}`, title, description, owner, maxMinutes, evidence, sendsMessage };
}

const DEFAULT_CLOSURE = { requireReason: true, requireEvidence: true, onlyTrafficManager: false };

/**
 * P-01 is verbatim from Figma 06b. The rest are written to match the step
 * counts shown in the rules table (approved: complete with generated data).
 */
export const PROTOCOLS: Protocol[] = [
  {
    id: 'P-01',
    name: 'Detención no autorizada',
    shortName: 'Detención',
    slaMinutes: 5,
    steps: [
      step('Llamar al operador', '2 intentos · si contesta, registrar motivo y cerrar o continuar', 'Monitorista', 3, 'note'),
      step('Contactar custodia o segundo número', 'Custodio asignado al viaje o contacto de emergencia del operador', 'Monitorista', 5, 'note'),
      step('Notificar al cliente y al jefe de tráfico', 'Plantilla WhatsApp "Unidad detenida" con ubicación y hora', 'Monitorista', 5, 'auto', true),
      step('Escalar a seguridad y levantar reporte', 'Reporte con posición, fotos de bitácora y línea de tiempo; aviso a autoridad si aplica', 'Jefe de seguridad', 15, 'pdf_report'),
    ],
    closure: DEFAULT_CLOSURE,
    updatedAt: onDay(-6, '16:20'),
    updatedBy: 'Daniela Fuentes',
  },
  {
    id: 'P-02',
    name: 'Sin señal GPS',
    shortName: 'Sin señal',
    slaMinutes: 5,
    steps: [
      step('Llamar al operador', 'Confirmar ubicación y estado de la unidad', 'Monitorista', 3, 'note'),
      step('Reportar al proveedor GPS', 'Abrir ticket con el ID del dispositivo y la última posición', 'Monitorista', 5, 'note'),
      step('Activar seguimiento alterno', 'Ubicación por la app del operador o custodia cada 15 min', 'Monitorista', 15, 'note'),
    ],
    closure: DEFAULT_CLOSURE,
    updatedAt: onDay(-12, '11:05'),
    updatedBy: 'Daniela Fuentes',
  },
  {
    id: 'P-03',
    name: 'Apertura de candado',
    shortName: 'Candado',
    slaMinutes: 5,
    steps: [
      step('Verificar ubicación contra geocercas', 'Confirmar que la unidad no está en cliente, terminal o patio autorizado', 'Monitorista', 2, 'note'),
      step('Llamar al operador', 'Pedir motivo de la apertura y foto del sello', 'Monitorista', 3, 'photo'),
      step('Avisar a custodia y seguridad', 'Compartir ubicación en vivo y hora de apertura', 'Monitorista', 5, 'auto', true),
      step('Levantar reporte de incidente', 'Fotos del sello, posición y línea de tiempo del candado', 'Jefe de seguridad', 20, 'pdf_report'),
    ],
    closure: DEFAULT_CLOSURE,
    updatedAt: onDay(-20, '09:40'),
    updatedBy: 'Daniela Fuentes',
  },
  {
    id: 'P-04',
    name: 'Botón de pánico',
    shortName: 'Pánico',
    slaMinutes: 2,
    steps: [
      step('Confirmar alerta con el operador', 'Llamada inmediata; si no contesta, continuar sin esperar', 'Monitorista', 1, 'note'),
      step('Avisar a custodia asignada', 'Enviar ubicación en vivo y ruta', 'Monitorista', 2, 'auto', true),
      step('Avisar a seguridad y jefe de tráfico', 'Llamada y mensaje con la ubicación', 'Monitorista', 2, 'auto', true),
      step('Contactar a la autoridad', 'Número de emergencia de la zona con placa y ubicación', 'Jefe de seguridad', 5, 'note'),
      step('Levantar reporte', 'Línea de tiempo completa, grabaciones y fotos', 'Jefe de seguridad', 30, 'pdf_report'),
    ],
    closure: { ...DEFAULT_CLOSURE, onlyTrafficManager: true },
    updatedAt: onDay(-30, '13:15'),
    updatedBy: 'Alejandro Ruiz',
  },
  {
    id: 'P-05',
    name: 'Desvío de ruta',
    shortName: 'Desvío',
    slaMinutes: 15,
    steps: [
      step('Llamar al operador', 'Confirmar motivo del desvío (tráfico, bloqueo, error)', 'Monitorista', 5, 'note'),
      step('Validar ruta alterna', 'Revisar zonas de riesgo y tiempo adicional', 'Monitorista', 5, 'note'),
      step('Notificar al jefe de tráfico', 'Si el desvío no se justifica o aumenta la ETA > 30 min', 'Monitorista', 5, 'auto', true),
    ],
    closure: DEFAULT_CLOSURE,
    updatedAt: onDay(-9, '18:02'),
    updatedBy: 'Alejandro Ruiz',
  },
  {
    id: 'P-06',
    name: 'Espera en terminal',
    shortName: 'Terminal',
    slaMinutes: 15,
    steps: [
      step('Consultar estado de la cita', 'Revisar fila y turno con la terminal', 'Jefe de tráfico', 10, 'note'),
      step('Avisar al ejecutivo de cuenta', 'Informar nueva hora estimada al cliente', 'Jefe de tráfico', 10, 'auto', true),
    ],
    closure: { ...DEFAULT_CLOSURE, requireEvidence: false },
    updatedAt: onDay(-15, '10:30'),
    updatedBy: 'Daniela Fuentes',
  },
  {
    id: 'P-07',
    name: 'Vacíos por vencer',
    shortName: 'Vacíos',
    slaMinutes: 15,
    steps: [
      step('Programar devolución de vacío', 'Asignar unidad y cita en el patio de la naviera', 'Jefe de tráfico', 30, 'note'),
      step('Avisar al ejecutivo de cuenta', 'Posible cargo por demora con la naviera', 'Jefe de tráfico', 15, 'auto', true),
    ],
    closure: { ...DEFAULT_CLOSURE, requireEvidence: false },
    updatedAt: onDay(-15, '10:42'),
    updatedBy: 'Daniela Fuentes',
  },
  {
    id: 'P-08',
    name: 'Exceso de velocidad',
    shortName: 'Velocidad',
    slaMinutes: 30,
    steps: [step('Llamar al operador', 'Pedir que reduzca la velocidad y registrar la llamada', 'Monitorista', 5, 'note')],
    closure: { ...DEFAULT_CLOSURE, requireEvidence: false },
    updatedAt: onDay(-40, '08:55'),
    updatedBy: 'Alejandro Ruiz',
  },
  {
    id: 'P-09',
    name: 'Zona de riesgo',
    shortName: 'Riesgo',
    slaMinutes: 10,
    steps: [
      step('Confirmar ubicación y ruta', 'Verificar si la unidad puede salir de la zona', 'Monitorista', 3, 'note'),
      step('Avisar a custodia', 'Solicitar acompañamiento o punto de encuentro', 'Monitorista', 5, 'auto', true),
      step('Seguimiento cada 5 min', 'Registrar posición hasta salir de la zona', 'Monitorista', 30, 'note'),
    ],
    closure: DEFAULT_CLOSURE,
    updatedAt: onDay(-25, '17:10'),
    updatedBy: 'Daniela Fuentes',
  },
];
