import type { LatLng } from '@/types/domain';

/**
 * Named places along the Manzanillo–Guadalajara–Bajío corridor.
 * Used for unit positions and for "nearest place" location labels.
 */
export const PLACES: Record<string, { label: string; pos: LatLng }> = {
  contecon: { label: 'Acceso CONTECON', pos: [19.0776, -104.2918] },
  ssa: { label: 'SSA México, Manzanillo', pos: [19.0593, -104.2987] },
  timsa: { label: 'TIMSA, Manzanillo', pos: [19.0668, -104.2905] },
  ocupa: { label: 'OCUPA, Manzanillo', pos: [19.0534, -104.3046] },
  patioCma: { label: 'Patio CMA CGM, Manzanillo', pos: [19.0958, -104.2862] },
  patioMaersk: { label: 'Patio Maersk Tapeixtles', pos: [19.1062, -104.2971] },
  jalipa: { label: 'Patio externo, Jalipa', pos: [19.1003, -104.2632] },
  manzanillo: { label: 'Manzanillo, Col.', pos: [19.0522, -104.3158] },
  cuyutlan: { label: 'Cuyutlán, Col.', pos: [18.9183, -104.0699] },
  tecoman: { label: 'Tecomán, Col.', pos: [18.9089, -103.8747] },
  colimaLib: { label: 'Libramiento de Colima', pos: [19.2683, -103.7031] },
  colima: { label: 'Colima, Col.', pos: [19.2433, -103.725] },
  tonila: { label: 'Tonila, Jal.', pos: [19.4253, -103.5328] },
  km112: { label: 'Autopista 54D, km 112', pos: [19.4925, -103.4983] },
  atenquique: { label: 'Atenquique, Jal.', pos: [19.5297, -103.4958] },
  tuxpan: { label: 'Tuxpan, Jal.', pos: [19.5553, -103.3772] },
  guzman: { label: 'Cd. Guzmán, Jal.', pos: [19.7047, -103.4614] },
  sayula: { label: 'Sayula, Jal.', pos: [19.8823, -103.5975] },
  gdlColima: { label: 'Autopista GDL–Colima', pos: [20.1564, -103.5662] },
  acatlan: { label: 'Acatlán de Juárez, Jal.', pos: [20.4237, -103.5961] },
  gdlIndustrial: { label: 'Zona Industrial, GDL', pos: [20.6224, -103.3713] },
  guadalajara: { label: 'Guadalajara, Jal.', pos: [20.6597, -103.3496] },
  zapopan: { label: 'Zapopan, Jal.', pos: [20.7214, -103.3918] },
  elSalto: { label: 'El Salto, Jal.', pos: [20.5197, -103.1808] },
  tepatitlan: { label: 'Tepatitlán, Jal.', pos: [20.817, -102.7633] },
  lagosRoad: { label: 'Carr. a Lagos de Moreno', pos: [21.2283, -102.1561] },
  lagos: { label: 'Lagos de Moreno, Jal.', pos: [21.3564, -101.9298] },
  leonLib: { label: 'Libramiento de León, Gto.', pos: [21.0845, -101.7432] },
  leon: { label: 'León, Gto.', pos: [21.1221, -101.6821] },
  silao: { label: 'Silao, Gto.', pos: [20.9439, -101.4278] },
  irapuato: { label: 'Irapuato, Gto.', pos: [20.6767, -101.3563] },
  celaya: { label: 'Celaya, Gto.', pos: [20.5235, -100.8157] },
  aguascalientes: { label: 'Aguascalientes, Ags.', pos: [21.8853, -102.2916] },
  slp: { label: 'San Luis Potosí, SLP', pos: [22.1565, -100.9855] },
  zamora: { label: 'Zamora, Mich.', pos: [19.9855, -102.2839] },
};

export function nearestPlaceLabel(pos: LatLng): string {
  return nearestPlace(pos).label;
}

function nearestPlace(pos: LatLng): { label: string; km: number } {
  let best = '';
  let bestD = Infinity;
  for (const p of Object.values(PLACES)) {
    const d = (p.pos[0] - pos[0]) ** 2 + (p.pos[1] - pos[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p.label;
    }
  }
  // ~111 km per degree is precise enough for a label.
  return { label: best, km: Math.sqrt(bestD) * 111 };
}

/** Towns/cities ("Sayula, Jal."), as opposed to road or site labels. */
const TOWNS = Object.values(PLACES).filter((p) => /, (Col|Jal|Gto|Ags|SLP|Mich)\.?$/.test(p.label));

/** Human location for a moving unit: the place itself, or "Cerca de <town>". */
export function describePosition(pos: LatLng): string {
  const { label, km } = nearestPlace(pos);
  if (km <= 4) return label;
  let town = TOWNS[0];
  let bestD = Infinity;
  for (const t of TOWNS) {
    const d = (t.pos[0] - pos[0]) ** 2 + (t.pos[1] - pos[1]) ** 2;
    if (d < bestD) {
      bestD = d;
      town = t;
    }
  }
  return `Cerca de ${town.label}`;
}
