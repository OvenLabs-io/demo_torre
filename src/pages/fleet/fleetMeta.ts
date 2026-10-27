import type { CrewMember, Unit } from '@/types/domain';

export const SIGNAL_META: Record<Unit['gps']['signal'], { label: string; dot: string; text: string }> = {
  online: { label: 'En línea', dot: 'bg-ok', text: 'text-body' },
  intermittent: { label: 'Intermitente', dot: 'bg-med', text: 'text-body' },
  offline: { label: 'Sin señal', dot: 'bg-crit', text: 'text-crit' },
};

export const CREW_STATUS_META: Record<CrewMember['status'], { label: string; dot: string; text: string }> = {
  on_trip: { label: 'En viaje', dot: 'bg-primary', text: 'text-body' },
  on_service: { label: 'En servicio', dot: 'bg-primary', text: 'text-body' },
  available: { label: 'Disponible', dot: 'bg-ok', text: 'text-body' },
  no_contact: { label: 'En viaje · sin contacto', dot: 'bg-crit', text: 'text-crit' },
};

export const PROVIDERS = ['Propio', 'Custodias del Pacífico', 'Protección Bajío'];
export const DRIVER_LICENSES = ['Federal tipo E', 'Federal tipo B', 'Estatal tipo C'];
