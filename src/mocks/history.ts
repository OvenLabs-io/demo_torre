import type { HistoryTrip } from '@/types/domain';
import { MIN, onDay } from '@/lib/mockTime';
import { createRng } from '@/lib/random';
import { withCheckDigit } from '@/lib/iso6346';
import { CLIENTS } from './clients';
import { CREW, crewShortName } from './crew';

const clientId = (name: string) => CLIENTS.find((c) => c.name === name)!.id;

type Row = [string, 'IMP' | 'EXP', string, string, string, string, string, number, string, number, string, number, number, HistoryTrip['status']];

/**
 * 8 rows verbatim from Figma 04 (dates shifted: the design "today" was 18 mar).
 * [id, mov, client, container, terminal, unit, driver, startDay, startTime, endDay, endTime, waitMin, incidents, status]
 */
const DESIGN_ROWS: Row[] = [
  ['0171', 'IMP', 'Empaques del Valle', 'MSKU4471920', 'CONTECON', 'T-108', 'R. Vázquez', -4, '07:10', -4, '19:40', 125, 0, 'closed'],
  ['0170', 'EXP', 'Calzado Horizonte', 'MSCU9018237', 'SSA México', 'T-111', 'R. Cárdenas', -4, '06:30', -4, '21:15', 70, 1, 'closed_incident'],
  ['0169', 'IMP', 'Tecnomaq Bajío', 'CMAU5510294', 'TIMSA', 'T-102', 'C. Méndez', -5, '09:00', -4, '08:20', 220, 2, 'closed_incident'],
  ['0168', 'IMP', 'Polímeros Potosinos', 'HLXU3382910', 'CONTECON', 'T-105', 'H. López', -5, '08:15', -5, '23:05', 55, 0, 'closed'],
  ['0167', 'EXP', 'Comercializadora Anáhuac', 'ONEU6629103', 'OCUPA', 'T-114', 'E. Zamora', -6, '10:40', -5, '15:30', 85, 0, 'closed'],
  ['0166', 'IMP', 'Automotriz del Centro', 'COSU8812034', 'SSA México', 'T-109', 'F. Orozco', -6, '07:00', -6, '20:10', 150, 0, 'closed'],
  ['0165', 'EXP', 'Empaques del Valle', 'MSKU1120394', 'CONTECON', 'T-101', 'J. L. Ramírez', -7, '08:00', -7, '19:00', 75, 0, 'cancelled'],
  ['0164', 'IMP', 'Calzado Horizonte', 'TCLU7720193', 'TIMSA', 'T-106', 'A. Salgado', -7, '06:20', -7, '22:45', 250, 3, 'closed_incident'],
];

const designTrips: HistoryTrip[] = DESIGN_ROWS.map(
  ([n, movement, client, container, terminal, unit, driver, sd, st, ed, et, wait, incidents, status]) => ({
    id: `SRV-2603-${n}`,
    movement,
    clientId: clientId(client),
    container,
    terminal,
    unitEconomic: unit,
    driverShort: driver,
    startedAt: onDay(sd, st),
    closedAt: onDay(ed, et),
    terminalWaitMin: wait,
    incidents,
    status,
    demurrageMxn: 0,
    onTime: true,
  }),
);

/** 140 generated rows (SRV-2603-0024…0163) so the period totals 148 trips. */
function generate(): HistoryTrip[] {
  const rng = createRng(2603);
  const prefixes = ['MSKU', 'MSCU', 'CMAU', 'HLXU', 'ONEU', 'COSU', 'TCLU'];
  const terminals = ['CONTECON', 'SSA México', 'TIMSA', 'OCUPA'];
  const drivers = CREW.filter((c) => c.role === 'driver');
  const rows: HistoryTrip[] = [];
  for (let i = 0; i < 140; i++) {
    const n = 24 + i;
    const day = -25 + Math.floor((i * 18) / 140);
    const driver = drivers[rng.int(0, drivers.length - 1)];
    const startH = rng.int(5, 10);
    const start = onDay(day, `${String(startH).padStart(2, '0')}:${String(rng.int(0, 5) * 10).padStart(2, '0')}`);
    const durationMin = rng.int(9 * 60, 26 * 60);
    const wait = Math.max(35, Math.round(45 + rng.next() * 80 + (rng.chance(0.12) ? 70 : 0)));
    rows.push({
      id: `SRV-2603-${String(n).padStart(4, '0')}`,
      movement: rng.chance(0.55) ? 'IMP' : 'EXP',
      clientId: rng.pick(CLIENTS).id,
      container: withCheckDigit(`${rng.pick(prefixes)}${String(rng.int(1000000, 9999999)).slice(0, 6)}`),
      terminal: rng.pick(terminals),
      unitEconomic: `T-${rng.int(101, 115)}`,
      driverShort: crewShortName(driver),
      startedAt: start,
      closedAt: start + durationMin * MIN,
      terminalWaitMin: wait,
      incidents: 0,
      status: 'closed',
      demurrageMxn: 0,
      onTime: true,
    });
  }
  // 8 more trips with incidents (11 in total with the design rows), 1 extra cancelled.
  [6, 19, 33, 47, 71, 88, 104, 126].forEach((idx, k) => {
    rows[idx].incidents = (k % 3) + 1;
    rows[idx].status = 'closed_incident';
  });
  rows[58].status = 'cancelled';
  // Demurrage paid to shipping lines: $34,200 in total.
  [3, 15, 27, 52, 66, 90, 111, 133].forEach((idx, k) => {
    rows[idx].demurrageMxn = [6200, 4800, 3600, 5400, 2900, 4100, 3800, 3400][k];
    rows[idx].terminalWaitMin += 90;
  });
  // 5 late deliveries → 96.6 % on time.
  [19, 47, 88, 104, 126].forEach((idx) => (rows[idx].onTime = false));
  return rows;
}

export const HISTORY: HistoryTrip[] = [...designTrips, ...generate().reverse()];
