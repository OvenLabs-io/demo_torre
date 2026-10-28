import type { Action, Module, PermissionMatrix, RoleKey, User } from '@/types/domain';
import { mins, onDay } from '@/lib/mockTime';

export const MODULES: { key: Module; label: string }[] = [
  { key: 'tower', label: 'Torre de control' },
  { key: 'trips', label: 'Viajes' },
  { key: 'history', label: 'Historial' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'fleet', label: 'Flota (unidades, remolques)' },
  { key: 'catalogs', label: 'Geocercas y georutas' },
  { key: 'rules', label: 'Reglas y protocolos de alertas' },
  { key: 'users', label: 'Usuarios, operadores y custodios' },
];

export const ACTIONS: { key: Action; label: string }[] = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Crear' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Eliminar' },
  { key: 'export', label: 'Exportar' },
];

/** Compact matrix definition: per module, the letters of allowed actions (v c e d x). */
function matrix(def: Partial<Record<Module, string>>): PermissionMatrix {
  const out = {} as PermissionMatrix;
  for (const { key } of MODULES) {
    const letters = def[key] ?? '';
    out[key] = {
      view: letters.includes('v'),
      create: letters.includes('c'),
      edit: letters.includes('e'),
      delete: letters.includes('d'),
      export: letters.includes('x'),
    };
  }
  return out;
}

export const ROLES: Record<RoleKey, { label: string; permissions: PermissionMatrix }> = {
  admin: {
    label: 'Administrador',
    permissions: matrix({
      tower: 'vcedx',
      trips: 'vcedx',
      history: 'vcedx',
      alerts: 'vcedx',
      fleet: 'vcedx',
      catalogs: 'vcedx',
      rules: 'vcedx',
      users: 'vcedx',
    }),
  },
  traffic_manager: {
    label: 'Jefe de tráfico',
    permissions: matrix({
      tower: 'vex',
      trips: 'vcedx',
      history: 'vx',
      alerts: 'vcex',
      fleet: 'vcex',
      catalogs: 'vcex',
      rules: 'vce',
      users: 'vce',
    }),
  },
  monitor: {
    label: 'Monitorista',
    permissions: matrix({ tower: 'v', trips: 'vcx', history: 'vx', alerts: 'v', fleet: 'v', catalogs: 'v' }),
  },
  monitor_night: {
    label: 'Monitorista (nocturno)',
    permissions: matrix({ tower: 'v', trips: 'vcx', history: 'vx', alerts: 've', fleet: 'v', catalogs: 'v' }),
  },
  account_exec: {
    label: 'Ejecutivo de cuenta',
    permissions: matrix({ tower: 'v', trips: 'v', history: 'vx', alerts: 'v' }),
  },
};

function clone(m: PermissionMatrix): PermissionMatrix {
  return JSON.parse(JSON.stringify(m));
}

function user(
  id: string,
  name: string,
  initials: string,
  email: string,
  baseRole: RoleKey,
  scopeLabel: string,
  lastAccessAt: number | null,
  extra: Partial<User> = {},
): User {
  return {
    id,
    name,
    initials,
    email,
    title: ROLES[baseRole].label,
    baseRole,
    permissions: clone(ROLES[baseRole].permissions),
    groupIds: [],
    scopeLabel,
    lastAccessAt,
    active: true,
    notifications: { criticalWhatsapp: true, highInApp: true, dailyEmail: false },
    ...extra,
  };
}

const ochoaPermissions = clone(ROLES.monitor.permissions);
ochoaPermissions.trips.edit = true;
ochoaPermissions.alerts.edit = true;

export const USERS: User[] = [
  user('u-aru', 'Alejandro Ruiz', 'AR', 'aruiz@transpacifico.mx', 'traffic_manager', 'Todo', mins(0), { shift: 'turno matutino' }),
  user('u-dfu', 'Daniela Fuentes', 'DF', 'dfuentes@transpacifico.mx', 'admin', 'Todo', mins(-120), {
    title: 'Administradora',
    notifications: { criticalWhatsapp: true, highInApp: false, dailyEmail: true },
  }),
  user('u-lgo', 'Luis Gerardo Ochoa', 'LO', 'lochoa@transpacifico.mx', 'monitor', '2 grupos', mins(-6), {
    permissions: ochoaPermissions,
    groupIds: ['GDL-1803-A', 'GDL-1803-D'],
    shift: 'turno matutino',
  }),
  user('u-kbe', 'Karla Benítez', 'KB', 'kbenitez@transpacifico.mx', 'monitor', '2 grupos', mins(-14), {
    groupIds: ['BAJÍO-1803-B', 'PTO-1803-C'],
    shift: 'turno matutino',
  }),
  user('u-ica', 'Iván Castañeda', 'IC', 'icastaneda@transpacifico.mx', 'monitor_night', 'Todo', onDay(-1, '23:40'), {
    shift: 'turno nocturno',
  }),
  user('u-mtr', 'Mónica Trujillo', 'MT', 'mtrujillo@transpacifico.mx', 'account_exec', '3 clientes', mins(-1440), {
    notifications: { criticalWhatsapp: false, highInApp: true, dailyEmail: true },
  }),
  user('u-par', 'Pablo Arreola', 'PA', 'parreola@transpacifico.mx', 'account_exec', '1 cliente', null, {
    active: false,
    notifications: { criticalWhatsapp: false, highInApp: false, dailyEmail: false },
  }),
];

export const CURRENT_USER_ID = 'u-aru';
