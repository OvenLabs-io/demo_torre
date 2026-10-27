import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConsoleComingSoon, ConsoleLayout, CONSOLE_TABS } from '@/components/layout/ConsoleLayout';
import { COMING_SOON } from '@/config/nav';
import { TowerListPage } from '@/pages/tower/TowerListPage';
import { TowerMapPage } from '@/pages/tower/TowerMapPage';
import { HistoryPage } from '@/pages/history/HistoryPage';
import { AlertsPage } from '@/pages/alerts/AlertsPage';
import { RulesPage } from '@/pages/admin/RulesPage';
import { NewTripPage } from '@/pages/trips/NewTripPage';
import { UnitsPage } from '@/pages/fleet/UnitsPage';
import { CrewPage } from '@/pages/fleet/CrewPage';
import { GeofencesPage } from '@/pages/catalogs/GeofencesPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { CompaniesPage } from '@/pages/console/CompaniesPage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <TowerListPage /> },
      { path: '/mapa', element: <TowerMapPage /> },
      { path: '/viajes/nuevo', element: <NewTripPage /> },
      { path: '/historial', element: <HistoryPage /> },
      { path: '/alertas', element: <AlertsPage /> },
      { path: '/admin/reglas', element: <RulesPage /> },
      { path: '/admin/usuarios', element: <UsersPage /> },
      { path: '/flota/unidades', element: <UnitsPage /> },
      { path: '/flota/operadores', element: <CrewPage /> },
      { path: '/catalogos/geocercas', element: <GeofencesPage /> },
      ...Object.keys(COMING_SOON).map((path) => ({ path, element: <ComingSoonPage /> })),
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
