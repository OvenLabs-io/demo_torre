import { memo, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { CircleMarker, Marker, Polyline } from 'react-leaflet';
import { Download, Pause, Play, Rewind, FastForward, SkipBack, SkipForward } from 'lucide-react';
import type { Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { fmtDate, fmtTime, fmtTimeSec } from '@/lib/format';
import { compass } from '@/lib/geo';
import { buildTrack, sampleAt, type TrackRecord } from '@/lib/track';
import { downloadCsv } from '@/lib/csv';
import { describePosition } from '@/mocks/places';
import { BaseMap } from '@/components/map/BaseMap';
import { GEOFENCE_COLOR, ShapeView } from '@/components/map/layers';
import { unitIcon, type UnitState } from '@/components/map/unitIcon';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Segmented } from '@/components/ui/Tabs';

type Filter = 'all' | 'event' | 'stop' | 'position';
type Speed = '1' | '4' | '16';

const TONE_COLOR: Record<NonNullable<TrackRecord['tone']>, string> = {
  success: '#059669',
  info: '#1e3a5f',
  warning: '#b45309',
  high: '#c2410c',
  critical: '#dc2626',
  muted: '#d1d5db',
};

/** 1x = one minute of trip per second of playback. */
const MINUTE_PER_SECOND = 60_000;

export function TripHistoryTab({ trip, initialAt }: { trip: Trip; initialAt?: number }) {
  const alerts = useStore((s) => s.alerts);
  const geofences = useStore((s) => s.geofences);
  const unit = useStore((s) => s.units.find((u) => u.id === trip.unitId));
  // Built once when the tab opens, so playback isn't disturbed by the live feed.
  const [data] = useState(() => buildTrack(trip, alerts, geofences, Date.now()));
  const { records, samples, planned, start, end } = data;

  const firstEvent =
    records.find((r) => r.kind !== 'position' && r.label.startsWith('Salida'))?.at ??
    records.find((r) => r.kind !== 'position' && r.label.startsWith('Inicio'))?.at ??
    start;
  const [t, setT] = useState(() => Math.min(end, Math.max(start, initialAt ?? firstEvent)));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('4');
  const [follow, setFollow] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    if (initialAt) setT(Math.min(end, Math.max(start, initialAt)));
  }, [initialAt, start, end]);

  // Playback loop.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((prev) => {
        const next = prev + Number(speed) * MINUTE_PER_SECOND * 0.1;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed, end]);

  const now = sampleAt(samples, t);
  const currentIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < records.length; i++) if (records[i].at <= t) idx = i;
    return idx;
  }, [records, t]);
  const current = records[currentIndex];

  // Follow the unit (throttled).
  const lastPan = useRef(0);
  useEffect(() => {
    if (!map || !follow) return;
    const nowMs = performance.now();
    if (nowMs - lastPan.current < 400) return;
    lastPan.current = nowMs;
    if (!map.getBounds().pad(-0.25).contains(now.pos)) map.panTo(now.pos, { animate: true, duration: 0.4 });
  }, [map, follow, now.pos]);

  // Fit everything once.
  useEffect(() => {
    if (!map) return;
    const pts = [...planned.flat(), ...samples.map((s) => s.pos)];
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }, [map, planned, samples]);

  const visibleRecords = useMemo(() => (filter === 'all' ? records : records.filter((r) => r.kind === filter)), [records, filter]);
  const played = useMemo(() => samples.filter((s) => s.at <= t).map((s) => s.pos), [samples, t]);
  const marks = records.filter((r) => r.kind !== 'position');
  const origin = geofences.find((g) => g.id === trip.legs[0]?.geofenceId);
  const destination = geofences.find((g) => g.id === trip.legs[1]?.geofenceId);
  const lastPositionAt = samples[samples.length - 1]?.at ?? end;

  const seek = (ts: number) => {
    setPlaying(false);
    setT(Math.min(end, Math.max(start, ts)));
  };
  const stepEvent = (dir: 1 | -1) => {
    const list = dir === 1 ? marks.filter((m) => m.at > t + 500) : marks.filter((m) => m.at < t - 500).reverse();
    if (list[0]) seek(list[0].at);
  };

  const exportCsv = () =>
    downloadCsv(
      `${trip.id}-historial.csv`,
      ['Hora', 'Tipo', 'Registro', 'Velocidad (km/h)', 'Latitud', 'Longitud'],
      records.map((r) => [
        fmtTimeSec(r.at),
        r.kind === 'event' ? 'Evento' : r.kind === 'stop' ? 'Parada' : 'Posición',
        r.label,
        r.speedKmh < 0 ? '' : r.speedKmh,
        r.position[0].toFixed(5),
        r.position[1].toFixed(5),
      ]),
    );

  const ended = t >= lastPositionAt;
  const state: UnitState =
    now.speed > 0
      ? 'moving'
      : ended && trip.severity === 'critical'
        ? 'alert'
        : ended && trip.live.stopReason === 'no_signal'
          ? 'nosignal'
          : 'stopped';
  const label = unit?.economic ?? trip.unitId;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative isolate min-h-0 flex-1">
          <BaseMap onReady={setMap}>
            {origin && <ShapeView shape={origin.shape} style={{ color: GEOFENCE_COLOR[origin.type], weight: 1.5, dashArray: '4 3', fillOpacity: 0.12 }} tooltip={origin.name} />}
            {destination && (
              <ShapeView shape={destination.shape} style={{ color: GEOFENCE_COLOR[destination.type], weight: 1.5, dashArray: '4 3', fillOpacity: 0.12 }} tooltip={destination.name} />
            )}
            {planned.map((coords, i) => (
              <Polyline key={i} positions={coords} pathOptions={{ color: '#4b5563', weight: 3, dashArray: '6 6', opacity: 0.85 }} />
            ))}
            <Polyline positions={samples.map((s) => s.pos)} pathOptions={{ color: '#1e3a5f', weight: 4, opacity: 0.25 }} />
            {played.length > 1 && <Polyline positions={played} pathOptions={{ color: '#1e3a5f', weight: 4, opacity: 0.95 }} />}
            {marks.map((m) => (
              <CircleMarker
                key={m.id}
                center={m.position}
                radius={m.kind === 'stop' ? 6 : 4.5}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: TONE_COLOR[m.tone ?? 'info'], fillOpacity: 1 }}
                eventHandlers={{ click: () => seek(m.at) }}
              />
            ))}
            <Marker
              position={now.pos}
              zIndexOffset={1000}
              icon={unitIcon({
                state,
                heading: now.heading,
                label,
                speedText: `${now.speed} km/h`,
                showChip: true,
              })}
            />
          </BaseMap>

          <div className="absolute top-2.5 left-2.5 z-[500] flex items-center gap-3 rounded-[4px] border border-line bg-white px-3 py-1.5 text-[12px] text-body shadow-sm">
            <Legend color="#9ca3af" label="Ruta planeada" dashed />
            <Legend color="#1e3a5f" label={`Recorrido real (hasta ${fmtTime(lastPositionAt)})`} />
            <Legend color="#b45309" label="Paradas" dot />
            <Legend color="#dc2626" label="Eventos" dot />
          </div>

          <div className="absolute bottom-3 left-3 z-[500] rounded-[4px] bg-[#242c3a] px-3 py-2 text-white shadow-lg">
            <p className="font-mono text-[13px]">
              {fmtTime(t)} h · {label} · {now.speed} km/h · {compass(now.heading)}
            </p>
            <p className="mt-0.5 max-w-[320px] truncate text-[12px] text-white/70">{current?.kind === 'position' ? describePosition(now.pos) : current?.label}</p>
          </div>
        </div>

        {/* Playback bar */}
        <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <IconBtn label="Ir al inicio" onClick={() => seek(start)}>
              <SkipBack size={14} />
            </IconBtn>
            <IconBtn label="Evento anterior" onClick={() => stepEvent(-1)}>
              <Rewind size={14} />
            </IconBtn>
            <button
              type="button"
              aria-label={playing ? 'Pausa' : 'Reproducir'}
              onClick={() => {
                if (!playing && t >= end) setT(start);
                setPlaying((p) => !p);
              }}
              className="flex h-[34px] w-9 items-center justify-center rounded-[4px] bg-primary text-white hover:brightness-110"
            >
              {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
            <IconBtn label="Evento siguiente" onClick={() => stepEvent(1)}>
              <FastForward size={14} />
            </IconBtn>
            <IconBtn label="Ir al final" onClick={() => seek(end)}>
              <SkipForward size={14} />
            </IconBtn>
            <Segmented<Speed>
              className="ml-1"
              size="sm"
              value={speed}
              onChange={setSpeed}
              items={[
                { key: '1', label: '1x' },
                { key: '4', label: '4x' },
                { key: '16', label: '16x' },
              ]}
            />
            <div className="ml-2 flex min-w-0 flex-col leading-tight">
              <span className="font-mono text-[17px] font-bold whitespace-nowrap text-ink">{fmtTimeSec(t)} h</span>
              <span className="truncate text-[12px] text-muted">
                {fmtDate(t, true)} · posición {currentIndex + 1} de {records.length}
              </span>
            </div>
            <div className="flex-1" />
            <Checkbox checked={follow} onChange={setFollow} label={<span className="whitespace-nowrap">Seguir unidad</span>} />
            <Button icon={<Download size={14} />} onClick={exportCsv}>
              Exportar
            </Button>
          </div>
          <TimelineSlider start={start} end={end} t={t} marks={marks} onSeek={seek} />
        </div>
      </div>

      {/* Records */}
      <div className="flex w-[470px] shrink-0 flex-col border-l border-line bg-white">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Segmented<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { key: 'all', label: 'Todo' },
              { key: 'event', label: 'Eventos' },
              { key: 'stop', label: 'Paradas' },
              { key: 'position', label: 'Posiciones' },
            ]}
            className="border-0 p-0"
          />
          <div className="flex-1" />
          <span className="text-[12px] text-muted">{visibleRecords.length} registros</span>
        </div>
        <div className="grid grid-cols-[60px_1fr_70px] border-y border-line bg-surface-alt px-3 py-1.5 text-[11px] font-semibold tracking-[0.54px] text-muted uppercase">
          <span>Hora</span>
          <span>Registro</span>
          <span className="text-right">Vel.</span>
        </div>
        <RecordList records={visibleRecords} currentId={current?.id} onSeek={seek} playing={playing} />
        <p className="border-t border-line-soft px-3 py-2 text-[12px] text-faint">Clic en una fila mueve la reproducción a ese momento</p>
      </div>
    </div>
  );
}

const RecordList = memo(function RecordList({
  records,
  currentId,
  onSeek,
  playing,
}: {
  records: TrackRecord[];
  currentId?: string;
  onSeek: (t: number) => void;
  playing: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!currentId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${currentId}"]`);
    el?.scrollIntoView({ block: playing ? 'nearest' : 'center' });
  }, [currentId, playing]);

  return (
    <div ref={listRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {records.map((r) => (
        <RecordRow key={r.id} record={r} selected={r.id === currentId} onSeek={onSeek} />
      ))}
    </div>
  );
});

const RecordRow = memo(function RecordRow({ record: r, selected, onSeek }: { record: TrackRecord; selected: boolean; onSeek: (t: number) => void }) {
  const isPos = r.kind === 'position';
  return (
    <button
      type="button"
      data-id={r.id}
      onClick={() => onSeek(r.at)}
      className={clsx(
        'grid w-full grid-cols-[60px_1fr_70px] items-center border-b border-line-soft px-3 text-left text-[13px] hover:bg-surface-alt',
        isPos ? 'h-8' : 'h-9',
        selected && 'bg-primary-soft hover:bg-primary-soft',
      )}
    >
      <span className="font-mono text-muted">{fmtTime(r.at)}</span>
      <span className={clsx('flex min-w-0 items-center gap-2', isPos ? 'text-muted' : 'text-ink')}>
        <span className="shrink-0 rounded-full" style={{ background: TONE_COLOR[r.tone ?? 'info'], width: isPos ? 6 : 8, height: isPos ? 6 : 8 }} />
        <span className="truncate">{r.label}</span>
      </span>
      <span className="text-right font-mono text-muted">{r.speedKmh < 0 ? '—' : `${r.speedKmh} km/h`}</span>
    </button>
  );
});

function TimelineSlider({
  start,
  end,
  t,
  marks,
  onSeek,
}: {
  start: number;
  end: number;
  t: number;
  marks: TrackRecord[];
  onSeek: (t: number) => void;
}) {
  const span = end - start || 1;
  const pct = ((t - start) / span) * 100;
  const ticks = useMemo(() => {
    const step = span > 4 * 3_600_000 ? 3_600_000 : span > 2 * 3_600_000 ? 3_600_000 : 30 * 60_000;
    const first = Math.ceil(start / step) * step;
    const out: number[] = [];
    for (let x = first; x <= end; x += step) out.push(x);
    return out;
  }, [start, end, span]);

  return (
    <div className="relative mt-3 px-1 pb-4">
      <div className="pointer-events-none absolute top-[3px] right-1 left-1 h-0">
        {marks.map((m) => (
          <span
            key={m.id}
            className="absolute size-[6px] -translate-x-1/2 rounded-full ring-1 ring-white"
            style={{ left: `${((m.at - start) / span) * 100}%`, background: TONE_COLOR[m.tone ?? 'info'], top: -4 }}
          />
        ))}
      </div>
      <input
        type="range"
        min={start}
        max={end}
        step={1000}
        value={t}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Momento de la reproducción"
        className="track-range relative"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      <div className="relative mt-1 h-3">
        {ticks.map((x) => (
          <span key={x} className="absolute -translate-x-1/2 font-mono text-[11px] text-faint" style={{ left: `${((x - start) / span) * 100}%` }}>
            {fmtTime(x)}
          </span>
        ))}
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-[34px] items-center justify-center rounded-[4px] border border-input bg-white text-body hover:bg-surface-alt"
    >
      {children}
    </button>
  );
}

function Legend({ color, label, dashed, dot }: { color: string; label: string; dashed?: boolean; dot?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {dot ? (
        <span className="size-2 rounded-full" style={{ background: color }} />
      ) : (
        <span className="w-4 border-t-2" style={{ borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      )}
      {label}
    </span>
  );
}
