import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, MonitorCog } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/store/useStore';
import { useDismiss } from '@/components/ui/Popover';

export function UserMenu() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[4px] py-1 pr-1 pl-2.5 hover:bg-white/10"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{user.initials}</span>
        <span className="flex flex-col items-start leading-[1.3]">
          <span className="text-[11px] font-semibold">{user.name}</span>
          <span className="text-[9px] opacity-60">{user.title}</span>
        </span>
        <ChevronDown size={11} className="opacity-60" />
      </button>
      {open && (
        <div role="menu" className="absolute top-[44px] right-0 z-50 w-[240px] rounded-[5px] border border-line bg-white p-1.5 text-ink shadow-pop">
          <div className="border-b border-line-soft px-2.5 pt-1 pb-2">
            <p className="text-[12px] font-semibold">{user.name}</p>
            <p className="text-[10px] text-muted">{user.email}</p>
          </div>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/consola');
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-[3px] px-2.5 py-2 text-left text-[12px] hover:bg-line-soft"
          >
            <MonitorCog size={14} className="text-faint" />
            Cambiar a consola OvenLabs
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
