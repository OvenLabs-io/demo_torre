import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Bell, ChevronDown } from 'lucide-react';
import { brand, TENANT_NAME } from '@/config/brand';
import { NAV, type NavItem } from '@/config/nav';
import { useStore } from '@/store/useStore';
import { useDismiss } from '@/components/ui/Popover';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';

export function TopNav() {
  const location = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navRef = useDismiss(openKey !== null, () => setOpenKey(null));
  const openAlerts = useStore((s) => s.alerts.filter((a) => a.status === 'open').length);

  // Close dropdowns when navigating.
  useEffect(() => setOpenKey(null), [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-[500] flex h-[52px] shrink-0 items-center gap-1 bg-primary px-5 text-white">
      <Link to="/" className="flex shrink-0 items-center gap-2 pr-5" aria-label={`${brand.name} · inicio`}>
        <span className="flex size-[26px] items-center justify-center rounded-[5px] bg-white/15 text-[10px] font-bold">
          {brand.initials}
        </span>
        <span className="flex flex-col leading-[1.3]">
          <span className="text-[13px] font-bold">{brand.name}</span>
          <span className="text-[9px] opacity-60">{TENANT_NAME}</span>
        </span>
      </Link>

      <nav ref={navRef} className="flex h-full items-center" aria-label="Menú principal">
        {NAV.map((item) => (
          <TopNavItem
            key={item.key}
            item={item}
            active={item.match(location.pathname)}
            open={openKey === item.key}
            anyOpen={openKey !== null}
            setOpen={(o) => setOpenKey(o ? item.key : null)}
            badge={item.badge === 'alerts' ? openAlerts : undefined}
            currentPath={location.pathname + location.search}
          />
        ))}
      </nav>

      <div className="min-w-4 flex-1" />

      <GlobalSearch />

      <div className="flex shrink-0 items-center gap-1.5 px-3" title="Datos GPS en vivo">
        <span className="size-2 animate-live-pulse rounded-full bg-live-nav" />
        <span className="text-[11px] font-semibold">En vivo</span>
      </div>

      <Link
        to="/alertas"
        className="relative flex size-[30px] shrink-0 items-center justify-center rounded-[4px] text-white/70 hover:bg-white/10 hover:text-white"
        aria-label={`Alertas abiertas: ${openAlerts}`}
        title="Alertas"
      >
        <Bell size={16} />
        {openAlerts > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-crit ring-2 ring-primary" />}
      </Link>

      <UserMenu />
    </header>
  );
}

function TopNavItem({
  item,
  active,
  open,
  anyOpen,
  setOpen,
  badge,
  currentPath,
}: {
  item: NavItem;
  active: boolean;
  open: boolean;
  anyOpen: boolean;
  setOpen: (open: boolean) => void;
  badge?: number;
  currentPath: string;
}) {
  const navigate = useNavigate();
  const content = (
    <>
      <span className={clsx('text-[12px]', active ? 'font-semibold opacity-100' : 'font-medium opacity-75 group-hover:opacity-100')}>
        {item.label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-lg bg-crit px-[5px] py-px text-[9px] leading-[1.3] font-bold">{badge}</span>
      )}
      {item.children && <ChevronDown size={11} className="opacity-60" />}
      <span className={clsx('absolute right-3 bottom-[1px] left-3 h-0.5 bg-white', active ? 'opacity-100' : 'opacity-0')} />
    </>
  );
  const cls = 'group relative flex h-[52px] items-center gap-1.5 px-3 whitespace-nowrap';

  if (!item.children) {
    return (
      <Link to={item.to!} className={cls} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => anyOpen && !open && setOpen(true)}>
      <button type="button" className={cls} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        {content}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-[48px] left-0 z-50 flex min-w-[240px] flex-col gap-0.5 rounded-[5px] border border-line bg-white p-1.5 text-ink shadow-pop"
        >
          {item.children.map((child) => {
            const isCurrent = child.to === currentPath || (child.to === '/' && currentPath === '/' && child.label === 'Vista Lista');
            const Icon = child.icon;
            return (
              <button
                key={child.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(child.to);
                }}
                className={clsx(
                  'flex items-center gap-2 rounded-[3px] px-2.5 py-2 text-left text-[12px] hover:bg-line-soft',
                  isCurrent && 'bg-line-soft font-medium',
                )}
              >
                <Icon size={14} className="shrink-0 text-faint" />
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
