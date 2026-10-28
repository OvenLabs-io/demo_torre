import type { Trailer, Trip } from '@/types/domain';

/** Remolques y chasis. The label ("CH-201 · 40 pies") is what trips store. */
export const TRAILERS: Trailer[] = [
  ...Array.from({ length: 14 }, (_, i): Trailer => {
    const n = 201 + i;
    const size = [205, 207, 213].includes(n) ? '20 pies' : '40 pies';
    return {
      id: `CH-${n}`,
      kind: 'Chasis',
      size,
      plate: `${String(10 + ((n * 7) % 89)).padStart(2, '0')}-UF-${String((n * 13) % 100).padStart(2, '0')}`,
      base: n % 3 === 0 ? 'Guadalajara' : 'Manzanillo',
      status: 'available',
    };
  }),
  { id: 'CH-215', kind: 'Chasis', size: '40 pies', plate: '64-UF-21', base: 'Manzanillo', status: 'maintenance' },
  { id: 'CH-216', kind: 'Chasis', size: '20 pies', plate: '19-UF-87', base: 'Manzanillo', status: 'available' },
  { id: 'CS-301', kind: 'Caja seca', size: '53 pies', plate: '82-UG-40', base: 'Guadalajara', status: 'available' },
  { id: 'CS-302', kind: 'Caja seca', size: '53 pies', plate: '37-UG-12', base: 'Guadalajara', status: 'available' },
  { id: 'PL-401', kind: 'Plataforma', size: '40 pies', plate: '55-UH-03', base: 'Manzanillo', status: 'available' },
];

export function trailerLabel(t: Trailer): string {
  return `${t.id} · ${t.size}`;
}

/** Trailer label → active trip using it. */
export function trailersInUse(trips: Pick<Trip, 'id' | 'chassis' | 'trailers'>[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of trips) for (const label of t.trailers ?? (t.chassis ? [t.chassis] : [])) out.set(label, t.id);
  return out;
}
