import type { LucideIcon } from 'lucide-react';
import { Bell, FileStack, ListChecks, Truck } from 'lucide-react';
import type { Action, Module } from '@/types/domain';

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
  /** Hidden when the current user lacks this permission. */
  module: Module;
  action?: Action;
}

/**
 * Top menu. Only screens that exist and that the user may use are listed:
 * nothing "próximamente", nothing the user can't open.
 */
export const NAV: NavItem[] = [
  {
    key: 'tower',
    label: 'Torre de control',
    to: '/',
    module: 'tower',
    match: (p) => p === '/' || p.startsWith('/mapa') || p.startsWith('/torre'),
  },
  { key: 'new-trip', label: 'Nuevo viaje', to: '/viajes/nuevo', module: 'trips', action: 'create', match: (p) => p.startsWith('/viajes') },
  { key: 'history', label: 'Historial', to: '/historial', module: 'history', match: (p) => p.startsWith('/historial') },
  { key: 'alerts', label: 'Alertas', to: '/alertas', module: 'alerts', match: (p) => p.startsWith('/alertas'), badge: 'alerts' },
  {
    key: 'fleet',
    label: 'Flota',
    module: 'fleet',
    match: (p) => p.startsWith('/flota'),
    children: [
      { label: 'Unidades (desde GPS)', to: '/flota/unidades', icon: Truck },
      { label: 'Remolques y chasis', to: '/flota/remolques', icon: FileStack },
    ],
  },
  { key: 'users', label: 'Usuarios', to: '/usuarios', module: 'users', match: (p) => p.startsWith('/usuarios') },
  { key: 'geofences', label: 'Geocercas', to: '/geocercas', module: 'catalogs', match: (p) => p.startsWith('/geocercas') },
  { key: 'georoutes', label: 'Georutas', to: '/georutas', module: 'catalogs', match: (p) => p.startsWith('/georutas') },
  {
    key: 'admin',
    label: 'Admin',
    module: 'rules',
    match: (p) => p.startsWith('/admin'),
    children: [
      { label: 'Reglas de alertas', to: '/admin/reglas', icon: Bell },
      { label: 'Protocolos de atención', to: '/admin/reglas?tab=protocolos', icon: ListChecks },
    ],
  },
];
