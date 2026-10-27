import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { TripModalHost } from '@/components/trip/TripModal';
import { brand } from '@/config/brand';
import { COMING_SOON } from '@/config/nav';

const TITLES: Record<string, string> = {
  '/': 'Torre de control',
  '/mapa': 'Mapa',
  '/viajes/nuevo': 'Nuevo viaje',
  '/historial': 'Historial',
  '/alertas': 'Alertas',
  '/admin/reglas': 'Reglas de alertas',
  '/admin/usuarios': 'Usuarios y permisos',
  '/flota/unidades': 'Unidades',
  '/flota/operadores': 'Operadores y custodios',
  '/catalogos/geocercas': 'Geocercas',
};

/** Browser tab title per screen: "Alertas · PuertoTrack". */
export function usePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/consola')) {
      document.title = 'Consola · OvenLabs';
      return;
    }
    const title = TITLES[pathname] ?? COMING_SOON[pathname]?.title ?? 'Torre de control';
    document.title = `${title} · ${brand.name}`;
  }, [pathname]);
}

export function AppLayout() {
  usePageTitle();
  return (
    <div className="flex min-h-full min-w-[1280px] flex-col">
      <TopNav />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <TripModalHost />
    </div>
  );
}

/** Standard page padding + header (title, subtitle, right-side actions). */
export function PageHeader({
  title,
  badges,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  badges?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[18px] font-bold text-ink">{title}</h1>
          {badges}
        </div>
        {subtitle && <p className="mt-1 text-[11px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
