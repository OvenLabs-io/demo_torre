import type { GpsProvider, Unit } from '@/types/domain';
import { dt, mins } from '@/lib/mockTime';

const PROVIDERS: GpsProvider[] = ['Wialon', 'Samsara', 'Geotab'];
const PREFIX: Record<GpsProvider, string> = { Wialon: 'WIA', Samsara: 'SAM', Geotab: 'GEO' };

interface UnitSeed {
  n: number;
  plate: string;
  model: string;
  base: 'Manzanillo' | 'Guadalajara';
  odometer?: number;
  status: Unit['status'];
  tripId?: string;
  signal?: Unit['gps']['signal'];
  vin: string;
  notes?: string;
  maintenanceWarning?: string;
}

// T-101…T-115. Rows present in Figma 07 keep their exact values; T-105/106/108–111 are filled in.
const SEEDS: UnitSeed[] = [
  { n: 101, plate: '46-AX-7T', model: 'Kenworth T680 2022', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0184', vin: '1XKYD49X6NJ480412' },
  { n: 102, plate: '52-AY-3R', model: 'Freightliner Cascadia 2021', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0185', vin: '3AKJHHDR5MSMX0789' },
  { n: 103, plate: '81-BC-9N', model: 'International ProStar 2019', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0186', signal: 'intermittent', vin: '3HSDJAPR2KN611166' },
  { n: 104, plate: '37-AD-4K', model: 'Kenworth T680 2022', base: 'Guadalajara', status: 'on_trip', tripId: 'SRV-2603-0187', vin: '3AKJHHDR7231900MX', notes: 'Unidad asignada al grupo BAJÍO · revisión de frenos pendiente' },
  { n: 105, plate: '94-BE-2M', model: 'Freightliner Cascadia 2020', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0188', vin: '3AKJGLDR9LSLM1920' },
  { n: 106, plate: '28-AF-6P', model: 'Kenworth T680 2021', base: 'Guadalajara', status: 'on_trip', tripId: 'SRV-2603-0189', vin: '1XKYD49X4MJ482297' },
  { n: 107, plate: '63-BG-1S', model: 'International LT625 2022', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0190', signal: 'offline', vin: '3HSDZAPR8NN682674' },
  { n: 108, plate: '15-AH-8V', model: 'Freightliner Cascadia 2022', base: 'Guadalajara', status: 'on_trip', tripId: 'SRV-2603-0191', vin: '3AKJHHDR1NSNA3051' },
  { n: 109, plate: '72-BJ-5C', model: 'International LT625 2021', base: 'Guadalajara', status: 'on_trip', tripId: 'SRV-2603-0192', vin: '3HSDZAPR5MN683428' },
  { n: 110, plate: '49-AK-3D', model: 'Kenworth T680 2020', base: 'Manzanillo', status: 'on_trip', tripId: 'SRV-2603-0193', vin: '1XKYD49X2LJ483805' },
  { n: 111, plate: '86-BL-7F', model: 'Freightliner Cascadia 2023', base: 'Guadalajara', status: 'on_trip', tripId: 'SRV-2603-0194', vin: '3AKJHHDR3PSPB4182' },
  { n: 112, plate: '31-AM-9G', model: 'Kenworth T680 2023', base: 'Guadalajara', odometer: 445000, status: 'on_trip', tripId: 'SRV-2603-0195', vin: '1XKYD49X0PJ484559' },
  { n: 113, plate: '58-BN-2H', model: 'International LT625 2022', base: 'Manzanillo', status: 'maintenance', vin: '3HSDZAPR1NN684936', notes: 'En taller · servicio de frenos' },
  { n: 114, plate: '23-AP-6J', model: 'Freightliner Cascadia 2021', base: 'Manzanillo', status: 'available', vin: '3AKJHHDR6MSMC5313', maintenanceWarning: 'servicio de frenos vence en 3 días' },
  { n: 115, plate: '97-BR-4L', model: 'Kenworth T680 2023', base: 'Guadalajara', status: 'available', vin: '1XKYD49X9PJ485690' },
];

function buildUnit(s: UnitSeed): Unit {
  const idx = s.n - 101;
  const provider = PROVIDERS[idx % 3];
  const deviceNum = 880412 + 377 * idx;
  return {
    id: `T-${s.n}`,
    economic: `T-${s.n}`,
    plate: s.plate,
    base: s.base,
    notes: s.notes,
    gps: {
      provider,
      deviceId: `${PREFIX[provider]}-${deviceNum}`,
      signal: s.signal ?? 'online',
      lastSignalAt: s.signal === 'offline' ? dt('09:48') : s.signal === 'intermittent' ? dt('09:57') : mins(-1),
    },
    model: s.model,
    vin: s.vin,
    odometerKm: s.odometer ?? 182400 + 23870 * idx,
    status: s.status,
    currentTripId: s.tripId,
    maintenanceWarning: s.maintenanceWarning,
  };
}

export const UNITS: Unit[] = [
  ...SEEDS.map(buildUnit),
  {
    id: 'GPS-WIA-886021',
    economic: null,
    plate: '72-CD-1P',
    base: null,
    gps: { provider: 'Wialon', deviceId: 'WIA-886021', signal: 'online', lastSignalAt: mins(-2) },
    model: 'Kenworth T880 2024',
    vin: '1XKZD49X1RJ486021',
    odometerKm: 3120,
    status: 'new',
  },
  {
    id: 'GPS-WIA-886022',
    economic: null,
    plate: '19-CE-8Q',
    base: null,
    gps: { provider: 'Wialon', deviceId: 'WIA-886022', signal: 'online', lastSignalAt: mins(-2) },
    model: 'Kenworth T880 2024',
    vin: '1XKZD49X3RJ486022',
    odometerKm: 2870,
    status: 'new',
  },
];
