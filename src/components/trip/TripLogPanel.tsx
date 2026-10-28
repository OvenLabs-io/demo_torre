import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Download, FileText, ImageIcon, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LogEntry, LogKind, Trip } from '@/types/domain';
import { useCan, useCurrentUser, useStore } from '@/store/useStore';
import { fmtBytes, fmtDate, fmtDateTime, fmtTimeH } from '@/lib/format';
import { buildPdf, downloadBlob, type PdfLine } from '@/lib/pdf';
import { legText } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';
import { TENANT_NAME } from '@/config/brand';
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

/** Photos and the documents usually attached (remisión, carta porte, EIR…). */
const EVIDENCE_ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt';
const MAX_EVIDENCE = 8;
const MAX_BYTES = 15 * 1024 * 1024;

type Evidence = LogEntry['photos'][number];

export function TripLogPanel({ trip }: { trip: Trip }) {
  const canWrite = useCan('trips', 'edit');
  return (
    <div className="flex flex-col gap-4">
      {canWrite && <NewEventCard trip={trip} />}
      <LogList trip={trip} />
    </div>
  );
}

function NewEventCard({ trip }: { trip: Trip }) {
  const user = useCurrentUser();
  const addLogEntry = useStore((s) => s.addLogEntry);
  const [reason, setReason] = useState(REASONS[0].label);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<Evidence[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((s, p) => s + (p.size ?? 0), 0);

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const all = [...list];
    const tooBig = all.filter((f) => f.size > MAX_BYTES);
    const ok = all.filter((f) => f.size <= MAX_BYTES).slice(0, MAX_EVIDENCE - files.length);
    if (tooBig.length) toast.error(`${tooBig.length === 1 ? 'Un archivo pesa' : `${tooBig.length} archivos pesan`} más de 15 MB`, { description: tooBig.map((f) => f.name).join(', ') });
    if (all.length - tooBig.length > ok.length) toast(`Máximo ${MAX_EVIDENCE} evidencias por evento`);
    setFiles((p) => [
      ...p,
      ...ok.map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), size: f.size, name: f.name, kind: f.type.startsWith('image/') ? ('image' as const) : ('document' as const) })),
    ]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const publish = () => {
    const r = REASONS.find((x) => x.label === reason)!;
    addLogEntry(trip.id, {
      id: crypto.randomUUID(),
      at: Date.now(),
      kind: r.kind,
      reason,
      title: r.kind === 'incident' ? `${reason} · ${text.trim()}` : text.trim(),
      author: user.name,
      meta: `${user.title} · ${trip.live.locationLabel}`,
      photos: files,
      position: trip.live.position,
    });
    setText('');
    setFiles([]);
    toast.success('Evento publicado en la bitácora', { description: `${trip.id} · ${reason}` });
  };

  return (
    <section className="rounded-md border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Nuevo evento de operación</h3>
        <span className="text-[12px] text-muted">Queda con autor, hora y posición GPS</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Select
          className="w-[260px] shrink-0"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Motivo"
          options={REASONS.map((r) => ({ value: r.label, label: `Motivo: ${r.label}` }))}
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && text.trim() && publish()}
          placeholder="Describe qué pasó…"
          aria-label="Descripción"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept={EVIDENCE_ACCEPT} multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <Button icon={<Paperclip size={15} />} onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_EVIDENCE} title="Fotos o documentos (PDF, Word, Excel) · máx. 15 MB c/u">
          Adjuntar evidencias
        </Button>
        {files.map((f) => (
          <EvidenceThumb key={f.id} item={f} onRemove={() => setFiles((list) => list.filter((x) => x.id !== f.id))} />
        ))}
        {files.length > 0 ? (
          <span className="text-[12px] text-muted">
            {files.length} {files.length === 1 ? 'evidencia' : 'evidencias'} · {fmtBytes(totalSize)}
          </span>
        ) : (
          <span className="text-[12px] text-faint">Fotos o documentos (PDF, Word, Excel)</span>
        )}
        <div className="flex-1" />
        <Button variant="primary" disabled={!text.trim()} title={!text.trim() ? 'Escribe la descripción del evento' : undefined} onClick={publish}>
          Publicar en bitácora
        </Button>
      </div>
    </section>
  );
}

function EvidenceThumb({ item, onRemove }: { item: Evidence; onRemove?: () => void }) {
  const isDoc = item.kind === 'document';
  const body = isDoc ? (
    <span className="flex h-10 max-w-[180px] items-center gap-1.5 rounded-[3px] border border-line bg-surface-alt px-2 text-[12px] text-body">
      <FileText size={15} className="shrink-0 text-primary" />
      <span className="truncate">{item.name ?? 'Documento'}</span>
    </span>
  ) : item.url ? (
    <span className="block h-10 w-14 overflow-hidden rounded-[3px] bg-line">
      <img src={item.url} alt={item.name ?? 'Evidencia'} className="size-full object-cover" />
    </span>
  ) : (
    <span className="flex h-10 w-14 items-center justify-center rounded-[3px] bg-line text-faint" title="Foto (mock)">
      <ImageIcon size={15} />
    </span>
  );
  return (
    <span className="group relative">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" download={isDoc ? item.name : undefined} title={item.name}>
          {body}
        </a>
      ) : (
        body
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Quitar ${item.name ?? 'evidencia'}`}
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 hidden size-[18px] items-center justify-center rounded-full bg-ink text-white group-hover:flex"
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

function LogList({ trip }: { trip: Trip }) {
  const { open } = useTripModal();
  const canExport = useCan('trips', 'export');
  const canHistory = useCan('history');
  const [filter, setFilter] = useState<'all' | LogKind>('all');
  const entries = [...trip.log].sort((a, b) => b.at - a.at).filter((e) => filter === 'all' || e.kind === filter);
  const withEvidence = trip.log.filter((e) => e.photos.length > 0).length;
  const download = useLogDownload(trip);

  // Kinds present in this trip's log (keeps the filter short).
  const kinds = (Object.keys(KIND_META) as LogKind[]).filter((k) => trip.log.some((e) => e.kind === k));

  useEffect(() => {
    if (filter !== 'all' && !kinds.includes(filter)) setFilter('all');
  }, [filter, kinds]);

  return (
    <section className="rounded-md border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
        <h3 className="text-[15px] font-semibold text-ink">Bitácora del viaje</h3>
        <Chip mono className="text-[11px]">
          {trip.log.length} {trip.log.length === 1 ? 'evento' : 'eventos'} · {withEvidence} con evidencias
        </Chip>
        <div className="flex-1" />
        {kinds.length > 1 && (
          <Select
            className="w-[170px]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | LogKind)}
            aria-label="Filtrar por tipo"
            options={[{ value: 'all', label: 'Todos los tipos' }, ...kinds.map((k) => ({ value: k, label: KIND_META[k].filter }))]}
          />
        )}
        {canExport && (
          <Button icon={<Download size={15} />} onClick={download} disabled={trip.log.length === 0} title="Descarga la bitácora completa en PDF">
            Descargar bitácora
          </Button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-10 text-center text-[14px] text-muted">
          {trip.log.length === 0 ? 'Aún no hay eventos en la bitácora de este viaje.' : 'No hay eventos de este tipo.'}
        </p>
      ) : (
        <ol>
          {entries.map((e) => (
            <LogItem key={e.id} entry={e} onMap={canHistory ? () => open(trip.id, 'historial', e.at) : undefined} />
          ))}
        </ol>
      )}
    </section>
  );
}

function LogItem({ entry, onMap }: { entry: LogEntry; onMap?: () => void }) {
  const meta = KIND_META[entry.kind];
  const shown = entry.photos.slice(0, 6);
  const extra = entry.photos.length - shown.length;
  return (
    <li className="flex gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
      <span className="w-[60px] shrink-0 pt-px font-mono text-[13px] text-muted">{fmtTimeH(entry.at)}</span>
      <Dot className={clsx(meta.dot, 'mt-1.5')} size={8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="mt-px shrink-0 rounded-[2px] bg-line-soft px-1 py-px text-[10px] font-medium tracking-[0.3px] text-body">{meta.tag}</span>
          <span className="text-[14px] text-ink">{entry.title}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          {entry.author}
          {entry.meta ? ` · ${entry.meta}` : ''}
        </p>
        {entry.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shown.map((p) => (
              <EvidenceThumb key={p.id} item={p} />
            ))}
            {extra > 0 && <span className="flex h-10 w-14 items-center justify-center rounded-[3px] bg-line-soft text-[13px] text-muted">+{extra}</span>}
          </div>
        )}
      </div>
      {onMap && entry.position && (
        <button type="button" onClick={onMap} className="h-fit shrink-0 text-[12px] font-medium text-primary hover:underline">
          Ver en mapa
        </button>
      )}
    </li>
  );
}

/** "Descargar bitácora" → real PDF with the whole log, oldest first. */
function useLogDownload(trip: Trip) {
  const user = useCurrentUser();
  const { units, crew, clients, geofences } = useStore();
  return () => {
    const unit = units.find((u) => u.id === trip.unitId);
    const driver = crew.find((c) => c.id === trip.driverId);
    const client = clients.find((c) => c.id === trip.clientId);
    const route = trip.legs.map((l) => geofences.find((g) => g.id === l.geofenceId)?.name.split(' · ')[0] ?? l.label).join(' -> ');
    const lines: PdfLine[] = [
      { text: `Bitácora del viaje ${trip.id}`, size: 18, bold: true },
      { text: `${TENANT_NAME} · descargada el ${fmtDateTime(Date.now())} por ${user.name}`, size: 9, muted: true, gapBefore: 2 },
      { text: 'Datos del viaje', size: 12, bold: true, gapBefore: 14, rule: true },
      { text: `Unidad: ${unit ? `${unit.economic} · ${unit.plate}` : trip.unitId}`, gapBefore: 2 },
      { text: `Operador: ${driver ? `${crewName(driver)} · ${driver.phone}` : '—'}` },
      ...(trip.carrier ? [{ text: `Línea transportista: ${trip.carrier}` }] : []),
      ...(client ? [{ text: `Cliente: ${client.name}` }] : []),
      ...(trip.containers.length ? [{ text: `Contenedor: ${trip.containers.map((c) => c.number).join(' + ')}` }] : []),
      ...((trip.trailers ?? (trip.chassis ? [trip.chassis] : [])).length ? [{ text: `Remolques: ${(trip.trailers ?? [trip.chassis!]).join(', ')}` }] : []),
      { text: `Ruta: ${route}` },
      { text: `Estado: ${trip.phaseLabel} · ${legText(trip)} · ubicación ${trip.live.locationLabel}` },
      ...(trip.notes ? [{ text: `Notas: ${trip.notes}` }] : []),
      { text: `Eventos (${trip.log.length})`, size: 12, bold: true, gapBefore: 14, rule: true },
    ];
    let day = '';
    for (const e of [...trip.log].sort((a, b) => a.at - b.at)) {
      const d = fmtDate(e.at, true);
      if (d !== day) {
        day = d;
        lines.push({ text: d, bold: true, size: 10, gapBefore: 8, muted: true });
      }
      lines.push({ text: `${fmtTimeH(e.at)}   [${KIND_META[e.kind].tag}]  ${e.title}`, gapBefore: 4 });
      lines.push({ text: `${e.author}${e.meta ? ` · ${e.meta}` : ''}`, size: 9, muted: true, indent: 52 });
      if (e.photos.length) {
        const names = e.photos.map((p, i) => p.name ?? `${p.kind === 'document' ? 'documento' : 'foto'} ${i + 1}`);
        lines.push({ text: `Evidencias (${e.photos.length}): ${names.join(', ')}`, size: 9, muted: true, indent: 52 });
      }
    }
    downloadBlob(`bitacora-${trip.id}.pdf`, buildPdf(lines, `Bitácora ${trip.id}`));
    toast.success('Bitácora descargada', { description: `bitacora-${trip.id}.pdf · ${trip.log.length} eventos` });
  };
}
