import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Camera, FileText, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LogEntry, LogKind, Trip } from '@/types/domain';
import { useCurrentUser, useStore } from '@/store/useStore';
import { fmtBytes, fmtTimeH } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Chip, Dot } from '@/components/ui/Chip';
import { Input, Select } from '@/components/ui/Field';
import { useTripModal } from './useTripModal';

const KIND_META: Record<LogKind, { tag: string; dot: string; filter: string }> = {
  alert: { tag: 'ALERTA', dot: 'bg-crit', filter: 'Alertas' },
  call: { tag: 'LLAMADA', dot: 'bg-high', filter: 'Llamadas' },
  gps: { tag: 'GPS', dot: 'bg-muted', filter: 'GPS' },
  geofence: { tag: 'GEOCERCA', dot: 'bg-ok', filter: 'Geocercas' },
  note: { tag: 'NOTA', dot: 'bg-primary', filter: 'Notas' },
  incident: { tag: 'INCIDENCIA', dot: 'bg-med', filter: 'Incidencias' },
};

/** Motivos for a manual event → bitácora kind. */
const REASONS: { label: string; kind: LogKind }[] = [
  { label: 'Parada no autorizada', kind: 'incident' },
  { label: 'Llamada al operador', kind: 'call' },
  { label: 'Nota de operación', kind: 'note' },
  { label: 'Incidencia mecánica', kind: 'incident' },
];

export function TripLogPanel({ trip }: { trip: Trip }) {
  return (
    <div className="flex flex-col gap-4">
      <NewEventCard trip={trip} />
      <LogList trip={trip} />
    </div>
  );
}

interface Draft {
  id: string;
  url: string;
  size: number;
}

function NewEventCard({ trip }: { trip: Trip }) {
  const user = useCurrentUser();
  const addLogEntry = useStore((s) => s.addLogEntry);
  const [reason, setReason] = useState(REASONS[0].label);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Draft[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalSize = photos.reduce((s, p) => s + p.size, 0);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...files]
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 8 - photos.length)
      .map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), size: f.size }));
    setPhotos((p) => [...p, ...next]);
  };

  const publish = () => {
    const r = REASONS.find((x) => x.label === reason)!;
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      at: Date.now(),
      kind: r.kind,
      reason,
      title: r.kind === 'incident' ? `${reason} · ${text.trim()}` : text.trim(),
      author: user.name,
      meta: `${user.title} · ${trip.live.locationLabel}`,
      photos: photos.map((p) => ({ id: p.id, url: p.url, size: p.size })),
      position: trip.live.position,
    };
    addLogEntry(trip.id, entry);
    setText('');
    setPhotos([]);
    toast.success('Evento publicado en la bitácora', { description: `${trip.id} · ${reason}` });
  };

  return (
    <section className="rounded-md border border-line bg-white p-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-ink">Nuevo evento de operación</h3>
        <span className="text-[10px] text-muted">Queda con autor, hora y posición GPS</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Select
          className="w-[210px] shrink-0"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Motivo"
          options={REASONS.map((r) => ({ value: r.label, label: `Motivo: ${r.label}` }))}
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && text.trim() && publish()}
          placeholder="Descripción breve…"
          aria-label="Descripción breve"
        />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <Button icon={<Camera size={14} />} onClick={() => fileRef.current?.click()}>
          Adjuntar fotos
        </Button>
        {photos.map((p) => (
          <span key={p.id} className="group relative size-[34px] overflow-hidden rounded-[3px] bg-line">
            <img src={p.url} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Quitar foto"
              onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
              className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {photos.length > 0 && (
          <span className="text-[10px] text-muted">
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} · {fmtBytes(totalSize)}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" disabled={!text.trim()} onClick={publish}>
          Publicar en bitácora
        </Button>
      </div>
    </section>
  );
}

function LogList({ trip }: { trip: Trip }) {
  const { open } = useTripModal();
  const [filter, setFilter] = useState<'all' | LogKind>('all');
  const entries = [...trip.log].sort((a, b) => b.at - a.at).filter((e) => filter === 'all' || e.kind === filter);
  const withPhotos = trip.log.filter((e) => e.photos.length > 0).length;

  // Kinds present in this trip's log (keeps the filter short).
  const kinds = (Object.keys(KIND_META) as LogKind[]).filter((k) => trip.log.some((e) => e.kind === k));

  useEffect(() => {
    if (filter !== 'all' && !kinds.includes(filter)) setFilter('all');
  }, [filter, kinds]);

  return (
    <section className="rounded-md border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line-soft px-3.5 py-2.5">
        <h3 className="text-[12px] font-semibold text-ink">Bitácora del viaje</h3>
        <Chip mono className="text-[9px]">
          {trip.log.length} {trip.log.length === 1 ? 'evento' : 'eventos'} · {withPhotos} con fotos
        </Chip>
        <div className="flex-1" />
        <Select
          className="w-[150px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | LogKind)}
          aria-label="Filtrar por tipo"
          options={[{ value: 'all', label: 'Todos los tipos' }, ...kinds.map((k) => ({ value: k, label: KIND_META[k].filter }))]}
        />
        <Button
          icon={<FileText size={14} />}
          onClick={() => toast('Disponible próximamente', { description: 'Exportar la bitácora a PDF.' })}
        >
          PDF
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-[12px] text-muted">
          {trip.log.length === 0 ? 'Aún no hay eventos en la bitácora de este viaje.' : 'No hay eventos de este tipo.'}
        </p>
      ) : (
        <ol>
          {entries.map((e) => (
            <LogItem key={e.id} entry={e} onMap={() => open(trip.id, 'historial', e.at)} />
          ))}
        </ol>
      )}
    </section>
  );
}

function LogItem({ entry, onMap }: { entry: LogEntry; onMap: () => void }) {
  const meta = KIND_META[entry.kind];
  const shown = entry.photos.slice(0, 5);
  const extra = entry.photos.length - shown.length;
  return (
    <li className="flex gap-3 border-b border-line-soft px-3.5 py-3 last:border-b-0">
      <span className="w-[52px] shrink-0 pt-px font-mono text-[11px] text-muted">{fmtTimeH(entry.at)}</span>
      <Dot className={clsx(meta.dot, 'mt-1')} size={7} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="mt-px shrink-0 rounded-[2px] bg-line-soft px-1 py-px text-[8px] font-medium tracking-[0.3px] text-body">
            {meta.tag}
          </span>
          <span className="text-[12px] text-ink">{entry.title}</span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted">
          {entry.author}
          {entry.meta ? ` · ${entry.meta}` : ''}
        </p>
        {entry.photos.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {shown.map((p) =>
              p.url ? (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block h-10 w-14 overflow-hidden rounded-[3px] bg-line">
                  <img src={p.url} alt="Foto de bitácora" className="size-full object-cover" />
                </a>
              ) : (
                <span key={p.id} className="flex h-10 w-14 items-center justify-center rounded-[3px] bg-line text-faint" title="Foto (mock)">
                  <ImageIcon size={14} />
                </span>
              ),
            )}
            {extra > 0 && (
              <span className="flex h-10 w-14 items-center justify-center rounded-[3px] bg-line-soft text-[11px] text-muted">+{extra}</span>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={onMap} className="h-fit shrink-0 text-[10px] font-medium text-primary hover:underline">
        Ver en mapa
      </button>
    </li>
  );
}
