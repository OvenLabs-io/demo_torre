import type { LegKind } from '@/types/domain';

export interface RouteTemplate {
  id: string;
  name: string;
  movement: 'IMP' | 'EXP';
  legs: { kind: LegKind; geofenceId: string; window?: string }[];
}

/** "Usar plantilla de ruta" — preloads the three legs. */
export const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: 'tpl-gdl',
    name: 'Importación · CONTECON → Empaques del Valle (Zapopan) → Patio CMA CGM',
    movement: 'IMP',
    legs: [
      { kind: 'terminal_pickup', geofenceId: 'gf-contecon' },
      { kind: 'client_delivery', geofenceId: 'gf-empaques', window: '13:00–15:00 h' },
      { kind: 'empty_return', geofenceId: 'gf-patio-cma' },
    ],
  },
  {
    id: 'tpl-leon',
    name: 'Importación · CONTECON → Calzado Horizonte (León) → Patio CMA CGM',
    movement: 'IMP',
    legs: [
      { kind: 'terminal_pickup', geofenceId: 'gf-contecon' },
      { kind: 'client_delivery', geofenceId: 'gf-calzado', window: '16:00–18:00 h' },
      { kind: 'empty_return', geofenceId: 'gf-patio-cma' },
    ],
  },
  {
    id: 'tpl-silao',
    name: 'Exportación · Patio Maersk → Tecnomaq Bajío (Silao) → TIMSA',
    movement: 'EXP',
    legs: [
      { kind: 'empty_pickup', geofenceId: 'gf-patio-maersk' },
      { kind: 'client_loading', geofenceId: 'gf-tecnomaq', window: '15:00–17:00 h' },
      { kind: 'terminal_delivery', geofenceId: 'gf-timsa' },
    ],
  },
];

/** Smart locks available for new trips. */
export const LOCKS = [
  { id: 'CND-0453', batteryPct: 92 },
  { id: 'CND-0454', batteryPct: 48 },
  { id: 'CND-0455', batteryPct: 77 },
  { id: 'CND-0456', batteryPct: 64 },
  { id: 'CND-0457', batteryPct: 86 },
  { id: 'CND-0458', batteryPct: 18 },
];
