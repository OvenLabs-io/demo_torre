import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import type { Action, Module } from '@/types/domain';
import { useCan } from '@/store/useStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConsoleComingSoon, ConsoleLayout, CONSOLE_TABS } from '@/components/layout/ConsoleLayout';
import { TowerListPage } from '@/pages/tower/TowerListPage';
import { TowerMapPage } from '@/pages/tower/TowerMapPage';
import { TowerGroupsPage } from '@/pages/tower/TowerGroupsPage';
import { HistoryPage } from '@/pages/history/HistoryPage';
import { AlertsPage } from '@/pages/alerts/AlertsPage';
import { RulesPage } from '@/pages/admin/RulesPage';
import { NewTripPage } from '@/pages/trips/NewTripPage';
import { UnitsPage } from '@/pages/fleet/UnitsPage';
import { TrailersPage } from '@/pages/fleet/TrailersPage';
import { PeoplePage } from '@/pages/users/PeoplePage';
import { GeofencesPage } from '@/pages/catalogs/GeofencesPage';
import { GeoroutesPage } from '@/pages/catalogs/GeoroutesPage';
import { CompaniesPage } from '@/pages/console/CompaniesPage';

/** Screens the user has no permission for redirect to the tower. */
function Guard({ module, action = 'view', children }: { module: Module; action?: Action; children: ReactNode }) {
  const can = useCan(module, action);
  return can ? children : <Navigate to="/" replace />;
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <TowerListPage /> },
      { path: '/mapa', element: <TowerMapPage /> },
      { path: '/torre/grupos', element: <TowerGroupsPage /> },
      { path: '/viajes/nuevo', element: <Guard module="trips" action="create"><NewTripPage /></Guard> },
      { path: '/historial', element: <Guard module="history"><HistoryPage /></Guard> },
      { path: '/alertas', element: <Guard module="alerts"><AlertsPage /></Guard> },
      { path: '/admin/reglas', element: <Guard module="rules"><RulesPage /></Guard> },
      { path: '/flota/unidades', element: <Guard module="fleet"><UnitsPage /></Guard> },
      { path: '/flota/remolques', element: <Guard module="fleet"><TrailersPage /></Guard> },
      { path: '/usuarios', element: <Guard module="users"><PeoplePage /></Guard> },
      { path: '/geocercas', element: <Guard module="catalogs"><GeofencesPage /></Guard> },
      { path: '/georutas', element: <Guard module="catalogs"><GeoroutesPage /></Guard> },
      // Old URLs (shared links from the first demo).
      { path: '/admin/usuarios', element: <Navigate to="/usuarios" replace /> },
      { path: '/flota/operadores', element: <Navigate to="/usuarios?tab=operadores" replace /> },
      { path: '/catalogos/geocercas', element: <Navigate to="/geocercas" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  {
    // OvenLabs super-admin console: own layout and header.
    path: '/consola',
    element: <ConsoleLayout />,
    children: [
      { index: true, element: <CompaniesPage /> },
      ...CONSOLE_TABS.filter((t) => t.to !== '/consola').map((t) => ({ path: t.to.replace('/consola/', ''), element: <ConsoleComingSoon /> })),
      { path: '*', element: <Navigate to="/consola" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
