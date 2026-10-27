import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  Container,
  FileStack,
  KeyRound,
  LayoutList,
  Lock,
  Map,
  MapPinned,
  Plug,
  Plus,
  Route,
  Ship,
  Truck,
  Users,
  UsersRound,
  Warehouse,
  ListChecks,
  Navigation,
} from 'lucide-react';

export interface NavLink {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavItem {
  key: string;
  label: string;
  /** Direct link (no dropdown). */
  to?: string;
  children?: NavLink[];
  /** Path prefixes that mark this item active. */
  match: (path: string) => boolean;
  badge?: 'alerts';
}

/** Top menu from Figma frame 11. */
export const NAV: NavItem[] = [
  {
    key: 'tower',
    label: 'Torre de control',
    match: (p) => p === '/' || p.startsWith('/mapa') || p.startsWith('/torre'),
    children: [
      { label: 'Vista Lista', to: '/', icon: LayoutList },
      { label: 'Vista Mapa', to: '/mapa', icon: Map },
      { label: 'Mis grupos de viaje', to: '/torre/grupos', icon: UsersRound },
    ],
  },
  {
    key: 'trips',
    label: 'Viajes',
    match: (p) => p.startsWith('/viajes'),
    children: [
      { label: 'Nuevo viaje', to: '/viajes/nuevo', icon: Plus },
      { label: 'Viajes activos', to: '/', icon: Navigation },
      { label: 'Contenedores y días libres', to: '/viajes/contenedores', icon: Container },
      { label: 'Plantillas de ruta', to: '/viajes/plantillas', icon: Route },
    ],
  },
  { key: 'history', label: 'Historial', to: '/historial', match: (p) => p.startsWith('/historial') },
  { key: 'alerts', label: 'Alertas', to: '/alertas', match: (p) => p.startsWith('/alertas'), badge: 'alerts' },
  {
    key: 'fleet',
    label: 'Flota',
    match: (p) => p.startsWith('/flota'),
    children: [
      { label: 'Unidades (desde GPS)', to: '/flota/unidades', icon: Truck },
      { label: 'Remolques y chasis', to: '/flota/remolques', icon: FileStack },
      { label: 'Candados', to: '/flota/candados', icon: Lock },
      { label: 'Operadores y custodios', to: '/flota/operadores', icon: Users },
    ],
  },
  {
    key: 'catalogs',
    label: 'Catálogos',
    match: (p) => p.startsWith('/catalogos'),
    children: [
      { label: 'Geocercas (crear y sincronizar)', to: '/catalogos/geocercas', icon: MapPinned },
      { label: 'Terminales y patios', to: '/catalogos/terminales', icon: Warehouse },
      { label: 'Navieras', to: '/catalogos/navieras', icon: Ship },
      { label: 'Rutas frecuentes', to: '/catalogos/rutas', icon: Route },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    match: (p) => p.startsWith('/admin'),
    children: [
      { label: 'Reglas de alertas', to: '/admin/reglas', icon: Bell },
      { label: 'Protocolos de atención', to: '/admin/reglas?tab=protocolos', icon: ListChecks },
      { label: 'Usuarios y permisos', to: '/admin/usuarios', icon: KeyRound },
      { label: 'Integraciones (GPS, candados)', to: '/admin/integraciones', icon: Plug },
      { label: 'Mi empresa', to: '/admin/mi-empresa', icon: Building2 },
    ],
  },
];

/** Screens that are in the menu but have no design yet (handoff: "Próximamente"). */
export const COMING_SOON: Record<string, { title: string; icon: LucideIcon }> = {
  '/torre/grupos': { title: 'Mis grupos de viaje', icon: UsersRound },
  '/viajes/contenedores': { title: 'Contenedores y días libres', icon: Container },
  '/viajes/plantillas': { title: 'Plantillas de ruta', icon: Route },
  '/flota/remolques': { title: 'Remolques y chasis', icon: FileStack },
  '/flota/candados': { title: 'Candados', icon: Lock },
  '/catalogos/terminales': { title: 'Terminales y patios', icon: Warehouse },
  '/catalogos/navieras': { title: 'Navieras', icon: Ship },
  '/catalogos/rutas': { title: 'Rutas frecuentes', icon: Route },
  '/admin/integraciones': { title: 'Integraciones (GPS, candados)', icon: Plug },
  '/admin/mi-empresa': { title: 'Mi empresa', icon: Building2 },
};
