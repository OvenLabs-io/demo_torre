import type { CrewMember } from '@/types/domain';
import { dayEnd } from '@/lib/mockTime';

/**
 * Operators (15) and escorts (6). Figma 08 rows keep their values; expiration
 * states (por vencer / vencido / vigente) are kept, with dates shifted relative
 * to today so they stay correct on the real clock.
 */
const D = (days: number) => dayEnd(days);

const FED_E = 'Federal E';
const SSP = 'Credencial SSP';

function driver(
  id: string,
  firstName: string,
  lastName: string,
  phone: string,
  license: string,
  licenseDays: number,
  medicalDays: number,
  extra: Partial<CrewMember> = {},
): CrewMember {
  return {
    id,
    role: 'driver',
    firstName,
    lastName,
    phone,
    emergencyPhone: phone.replace(/\d{2}$/, (m) => String((Number(m) + 50) % 100).padStart(2, '0')),
    license: { kind: FED_E, number: license, expiresOn: D(licenseDays) },
    medicalExpiresOn: D(medicalDays),
    provider: 'Propio',
    base: 'Manzanillo',
    appInvited: true,
    status: 'available',
    ...extra,
  };
}

function escort(
  id: string,
  firstName: string,
  lastName: string,
  phone: string,
  credential: string,
  credentialDays: number,
  provider: string,
  extra: Partial<CrewMember> = {},
): CrewMember {
  return {
    id,
    role: 'escort',
    firstName,
    lastName,
    phone,
    license: { kind: SSP, number: credential, expiresOn: D(credentialDays) },
    provider,
    status: 'available',
    ...extra,
  };
}

export const CREW: CrewMember[] = [
  driver('op-jlr', 'José Luis', 'Ramírez', '312 118 2201', 'E-2847193', 12, 9, {
    status: 'on_trip',
    usualUnitId: 'T-101',
    assignment: { unitId: 'T-101', tripId: 'SRV-2603-0184' },
  }),
  driver('op-cms', 'Carlos', 'Méndez Silva', '312 118 2202', 'E-3928014', 280, 190, {
    status: 'on_trip',
    usualUnitId: 'T-102',
    assignment: { unitId: 'T-102', tripId: 'SRV-2603-0185' },
  }),
  driver('op-mat', 'Miguel Ángel', 'Torres', '312 118 4402', 'E-1938472', -6, 2, {
    status: 'no_contact',
    usualUnitId: 'T-103',
    assignment: { unitId: 'T-103', tripId: 'SRV-2603-0186' },
  }),
  driver('op-rnc', 'Roberto', 'Navarro Cruz', '312 118 2204', 'E-3011842', 340, 210, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-104',
    assignment: { unitId: 'T-104', tripId: 'SRV-2603-0187' },
  }),
  driver('op-hil', 'Héctor Iván', 'López', '312 118 2205', 'E-2290471', 410, 160, {
    status: 'on_trip',
    usualUnitId: 'T-105',
    assignment: { unitId: 'T-105', tripId: 'SRV-2603-0188' },
  }),
  driver('op-asr', 'Arturo', 'Salgado Ruiz', '312 118 2206', 'E-3550218', 230, 300, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-106',
    assignment: { unitId: 'T-106', tripId: 'SRV-2603-0189' },
  }),
  driver('op-jal', 'Jorge Alberto', 'Luna', '312 118 2207', 'E-2718360', 520, 140, {
    status: 'on_trip',
    usualUnitId: 'T-107',
    assignment: { unitId: 'T-107', tripId: 'SRV-2603-0190' },
  }),
  driver('op-rvm', 'Ricardo', 'Vázquez Mora', '312 118 2208', 'E-3194027', 190, 260, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-108',
    assignment: { unitId: 'T-108', tripId: 'SRV-2603-0191' },
  }),
  driver('op-fod', 'Fernando', 'Orozco Díaz', '312 118 2209', 'E-2603915', 365, 120, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-109',
    assignment: { unitId: 'T-109', tripId: 'SRV-2603-0192' },
  }),
  driver('op-mar', 'Mario Alberto', 'Ríos', '312 118 2210', 'E-2971504', 450, 330, {
    status: 'on_trip',
    usualUnitId: 'T-110',
    assignment: { unitId: 'T-110', tripId: 'SRV-2603-0193' },
  }),
  driver('op-rcv', 'Raúl', 'Cárdenas Vega', '312 118 2211', 'E-4029183', 300, -8, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-111',
    assignment: { unitId: 'T-111', tripId: 'SRV-2603-0194' },
  }),
  driver('op-odp', 'Óscar Daniel', 'Peña', '312 118 2212', 'E-2847301', 8, -14, {
    status: 'on_trip',
    base: 'Guadalajara',
    usualUnitId: 'T-112',
    assignment: { unitId: 'T-112', tripId: 'SRV-2603-0195' },
  }),
  driver('op-avs', 'Andrés', 'Valdez Soto', '312 118 2215', 'E-3810294', 260, 330),
  driver('op-sob', 'Samuel', 'Ortega Brito', '312 118 2216', 'E-3302716', 395, 240, {
    usualUnitId: 'T-114',
  }),
  driver('op-ezg', 'Eduardo', 'Zamora Gil', '312 118 2214', 'E-2958830', 150, 70, {
    base: 'Guadalajara',
  }),

  escort('cu-gli', 'Gerardo', 'Luna Ibarra', '314 200 1180', 'C-10492', 120, 'Custodias del Pacífico', {
    status: 'on_service',
    assignment: { tripId: 'SRV-2603-0186', note: 'en camino' },
  }),
  escort('cu-pam', 'Pedro Antonio', 'Mora', '314 200 1181', 'C-10517', 11, 'Custodias del Pacífico'),
  escort('cu-sor', 'Samuel', 'Ortega Ruiz', '314 200 1190', 'C-11003', 95, 'Protección Bajío', {
    status: 'on_service',
    assignment: { tripId: 'SRV-2603-0192', note: 'tramo GDL–León' },
  }),
  escort('cu-ecp', 'Elena', 'Cruz Padilla', '314 200 1191', 'C-11044', 240, 'Protección Bajío'),
  escort('cu-mrh', 'Martín', 'Robles Haro', '314 200 1184', 'C-10633', 180, 'Custodias del Pacífico'),
  escort('cu-lmq', 'Laura', 'Medina Quiroz', '314 200 1195', 'C-11120', 300, 'Protección Bajío'),
];

export function crewName(m: CrewMember): string {
  return `${m.firstName} ${m.lastName}`;
}

/** "J. L. Ramírez" style short name used in Historial. */
export function crewShortName(m: CrewMember): string {
  const first = m.firstName
    .split(' ')
    .map((p) => `${p[0]}.`)
    .join(' ');
  return `${first} ${m.lastName.split(' ')[0]}`;
}
