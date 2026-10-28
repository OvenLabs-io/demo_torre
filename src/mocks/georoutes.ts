import type { Georoute } from '@/types/domain';
import { mins } from '@/lib/mockTime';

/** Georutas: routes already personalized for recurring trips. */
export const GEOROUTES: Georoute[] = [
  {
    id: 'GR-01',
    name: 'CONTECON → Empaques del Valle (Zapopan)',
    stops: ['gf-contecon', 'gf-empaques'],
    widthM: 2000,
    notes: 'Por Autopista 54D y Libramiento de Colima.',
    updatedAt: mins(-3 * 24 * 60),
  },
  {
    id: 'GR-02',
    name: 'Patio CMA CGM → Calzado Horizonte (León)',
    stops: ['gf-patio-cma', 'gf-calzado'],
    widthM: 2500,
    updatedAt: mins(-6 * 24 * 60),
  },
  {
    id: 'GR-03',
    name: 'Patio Maersk → Tecnomaq Bajío (Silao) → TIMSA',
    stops: ['gf-patio-maersk', 'gf-tecnomaq', 'gf-timsa'],
    widthM: 2000,
    notes: 'Carga en cliente y entrega en terminal el mismo día.',
    updatedAt: mins(-9 * 24 * 60),
  },
  {
    id: 'GR-04',
    name: 'CONTECON → Polímeros Potosinos → Patio CMA CGM',
    stops: ['gf-contecon', 'gf-polimeros', 'gf-patio-cma'],
    widthM: 3000,
    updatedAt: mins(-14 * 24 * 60),
  },
];
