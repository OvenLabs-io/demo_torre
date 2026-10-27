import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, LogOut, RadioTower } from 'lucide-react';
import { toast } from 'sonner';
import { brand } from '@/config/brand';
import { useDismiss } from '@/components/ui/Popover';
import { usePageTitle } from './AppLayout';

export const CONSOLE_TABS = [
  { to: '/consola', label: 'Empresas', end: true },
  { to: '/consola/usuarios', label: 'Usuarios globales' },
  { to: '/consola/integraciones', label: 'Integraciones GPS' },
  { to: '/consola/planes', label: 'Planes y facturación' },
  { to: '/consola/salud', label: 'Salud del sistema' },
  { to: '/consola/soporte', label: 'Soporte' },
];

/** OvenLabs super-admin console (Figma 12): its own dark header. */
export function ConsoleLayout() {
  usePageTitle();
  return (
    <div className="flex min-h-full min-w-[1280px] flex-col">
      <ConsoleHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

function ConsoleHeader() {
  return (
    <header className="sticky top-0 z-[500] flex h-[52px] shrink-0 items-center gap-1 bg-console px-5 text-white">
      <Link to="/consola" className="flex shrink-0 items-center gap-2 pr-5">
        <span className="flex size-[26px] items-center justify-center rounded-[5px] bg-console-accent text-[10px] font-bold">OL</span>
        <span className="flex flex-col leading-[1.3]">
          <span className="text-[13px] font-bold">OvenLabs · Consola</span>
          <span className="text-[9px] opacity-60">Administración de clientes de la torre de control</span>
        </span>
      </Link>
      <nav className="flex h-full items-center" aria-label="Consola">
        {CONSOLE_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              clsx('relative flex h-[52px] items-center px-3 text-[12px] whitespace-nowrap', isActive ? 'font-semibold' : 'font-medium opacity-70 hover:opacity-100')
            }
          >
            {({ isActive }) => (
              <>
                {t.label}
                <span className={clsx('absolute right-3 bottom-[1px] left-3 h-0.5 bg-console-accent', isActive ? 'opacity-100' : 'opacity-0')} />
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <span className="mr-2 rounded-[3px] bg-console-accent px-1.5 py-0.5 text-[9px] font-semibold">Super-admin</span>
      <ConsoleUserMenu />
    </header>
  );
}

function ConsoleUserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-[4px] py-1 pr-1 pl-2 hover:bg-white/10">
        <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">OB</span>
        <span className="text-[11px] font-semibold">Omar Ballesteros</span>
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <div role="menu" className="absolute top-[44px] right-0 z-50 w-[250px] rounded-[5px] border border-line bg-white p-1.5 text-ink shadow-pop">
          <button
            role="menuitem"
            type="button"
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2 rounded-[3px] px-2.5 py-2 text-left text-[12px] hover:bg-line-soft"
          >
            <RadioTower size={14} className="text-faint" />
            Volver a la torre ({brand.name})
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              toast('Sesión de demostración', { description: 'En el prototipo no hay inicio de sesión.' });
            }}
            className="flex w-full items-center gap-2 rounded-[3px] px-2.5 py-2 text-left text-[12px] hover:bg-line-soft"
          >
            <LogOut size={14} className="text-faint" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

/** Console tabs without a design yet. */
export function ConsoleComingSoon() {
  const { pathname } = useLocation();
  const tab = CONSOLE_TABS.find((t) => t.to === pathname);
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-[420px] flex-col items-center rounded-lg border border-line bg-white px-10 py-10 text-center">
        <span className="text-[10px] font-semibold tracking-[0.6px] text-muted uppercase">Próximamente</span>
        <h1 className="mt-1 text-[18px] font-bold text-ink">{tab?.label ?? 'Consola'}</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">Esta sección de la consola todavía no tiene diseño. Se agregará en una siguiente iteración del prototipo.</p>
        <Link to="/consola" className="mt-6 rounded-[4px] bg-console px-3 py-1.5 text-[12px] font-medium text-white">
          Volver a Empresas
        </Link>
      </div>
    </div>
  );
}
