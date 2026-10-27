import type { Client } from '@/types/domain';

export const CLIENTS: Client[] = [
  { id: 'empaques', name: 'Empaques del Valle', contacts: ['logistica@empaquesdelvalle.mx', '+52 33 1820 4471'] },
  { id: 'calzado', name: 'Calzado Horizonte', contacts: ['trafico@calzadohorizonte.mx', '+52 477 210 3390'] },
  { id: 'automotriz', name: 'Automotriz del Centro', contacts: ['recibo@automotrizdelcentro.mx', '+52 449 185 6620'] },
  { id: 'tecnomaq', name: 'Tecnomaq Bajío', contacts: ['embarques@tecnomaqbajio.mx', '+52 462 118 4053'] },
  { id: 'polimeros', name: 'Polímeros Potosinos', contacts: ['logistica@polimerospotosinos.mx', '+52 444 817 2290'] },
  { id: 'anahuac', name: 'Comercializadora Anáhuac', contacts: ['operaciones@coanahuac.mx', '+52 33 3615 7742'] },
];

export const TRIP_GROUPS = [
  'GDL-1803-A',
  'BAJÍO-1803-B',
  'PTO-1803-C',
  'GDL-1803-D',
  'FULL-1803-E',
  'BAJÍO-1803-F',
];

export const CHASSIS = [
  'CH-201 · 40 pies',
  'CH-202 · 40 pies',
  'CH-203 · 40 pies',
  'CH-204 · 40 pies',
  'CH-205 · 20 pies',
  'CH-206 · 40 pies',
  'CH-207 · 20 pies',
  'CH-208 · 40 pies',
  'CH-209 · 40 pies',
  'CH-210 · 40 pies',
  'CH-211 · 40 pies',
  'CH-212 · 40 pies',
  'CH-213 · 20 pies',
  'CH-214 · 40 pies',
];
