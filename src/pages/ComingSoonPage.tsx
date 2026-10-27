import { Link, useLocation } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { COMING_SOON } from '@/config/nav';
import { Button } from '@/components/ui/Button';

/** Screens that are in the menu but don't have a design yet. */
export function ComingSoonPage() {
  const { pathname } = useLocation();
  const meta = COMING_SOON[pathname];
  const Icon = meta?.icon ?? Clock3;
  return (
    <CenteredNotice
      icon={<Icon size={22} />}
      eyebrow="Próximamente"
      title={meta?.title ?? 'Sección en preparación'}
      text="Esta sección ya forma parte del menú, pero todavía no tiene diseño. Se agregará en una siguiente iteración del prototipo."
    />
  );
}

function CenteredNotice({ icon, eyebrow, title, text }: { icon: React.ReactNode; eyebrow: string; title: string; text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-[420px] flex-col items-center rounded-lg border border-line bg-white px-10 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
        <span className="mt-4 text-[10px] font-semibold tracking-[0.6px] text-muted uppercase">{eyebrow}</span>
        <h1 className="mt-1 text-[18px] font-bold text-ink">{title}</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">{text}</p>
        <Link to="/" className="mt-6">
          <Button variant="primary">Volver a la Torre de control</Button>
        </Link>
      </div>
    </div>
  );
}
