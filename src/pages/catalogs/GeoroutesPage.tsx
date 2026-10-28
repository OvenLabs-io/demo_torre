import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { Marker, Polygon, Polyline } from 'react-leaflet';
import { ArrowDown, ArrowUp, Plus, Route, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Georoute } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { fmtDate, fmtDuration, fmtNumber } from '@/lib/format';
import { centerOf, estimateRoute } from '@/lib/newTrip';
import { PageHeader } from '@/components/layout/AppLayout';
import { BaseMap } from '@/components/map/BaseMap';
import { corridorPolygon } from '@/components/map/layers';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const WIDTHS = [1000, 2000, 3000, 5000];

type Draft = Pick<Georoute, 'name' | 'stops' | 'widthM' | 'notes'> & { id: string | null };

function nextId(list: Georoute[]): string {
  const max = Math.max(0, ...list.map((g) => Number(g.id.replace(/\D/g, '')) || 0));
  return `GR-${String(max + 1).padStart(2, '0')}`;
}

/** Georutas: routes already personalized for some trips (salida → paradas → destino + corridor). */
export function GeoroutesPage() {
  const { georoutes, geofences, trips, upsertGeoroute, deleteGeoroute } = useStore();
  const canCreate = useCan('catalogs', 'create');
  const canEdit = useCan('catalogs', 'edit');
  const canDelete = useCan('catalogs', 'delete');
  const [selectedId, setSelectedId] = useState<string | null>(georoutes[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);

  const selected = georoutes.find((g) => g.id === selectedId) ?? null;
  const shown = draft ?? selected;
  const stops = (shown?.stops ?? []).filter(Boolean);
  const estimates = useMemo(() => estimateRoute(stops, geofences), [stops.join('|'), geofences]); // eslint-disable-line react-hooks/exhaustive-deps
  const path = estimates.flatMap((e) => e.path);
  const places = geofences.filter((g) => g.type !== 'avoid_zone');
  const placeName = (id: string) => geofences.find((g) => g.id === id)?.name.split(' · ')[0] ?? '—';

  useEffect(() => {
    const pts = [...path, ...stops.map((id) => geofences.find((g) => g.id === id)).filter(Boolean).map((g) => centerOf(g!))];
    if (map && pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
  }, [map, stops.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = draft
    ? {
        name: !draft.name.trim() ? 'Escribe un nombre' : georoutes.some((g) => g.id !== draft.id && g.name.trim().toLowerCase() === draft.name.trim().toLowerCase()) ? 'Ya hay una georuta con ese nombre' : null,
        stops: draft.stops.some((s) => !s) ? 'Elige la geocerca de cada punto' : draft.stops.some((s, i) => i > 0 && s === draft.stops[i - 1]) ? 'Hay dos puntos seguidos iguales' : null,
      }
    : { name: null, stops: null };

  const startNew = () => {
    setTried(false);
    setDraft({ id: null, name: '', stops: ['', ''], widthM: 2000, notes: '' });
  };
  const startEdit = (g: Georoute) => {
    setTried(false);
    setDraft({ id: g.id, name: g.name, stops: [...g.stops], widthM: g.widthM, notes: g.notes ?? '' });
  };
  const setStops = (fn: (s: string[]) => string[]) => setDraft((d) => (d ? { ...d, stops: fn(d.stops) } : d));

  const save = () => {
    setTried(true);
    if (!draft || errors.name || errors.stops) return;
    const id = draft.id ?? nextId(georoutes);
    upsertGeoroute({ id, name: draft.name.trim(), stops: draft.stops, widthM: draft.widthM, notes: draft.notes?.trim() || undefined, updatedAt: Date.now() });
    setSelectedId(id);
    setDraft(null);
    toast.success(draft.id ? `Georuta ${id} actualizada` : `Georuta ${id} creada`, { description: 'Disponible en Nuevo viaje → Usar georuta.' });
  };

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-[720px] flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Georutas"
        subtitle="Rutas ya personalizadas para algunos viajes: salida, paradas y destino con un corredor permitido. Si la unidad sale del corredor se genera la alerta de desvío (R-05)."
        actions={
          canCreate &&
          !draft && (
            <Button variant="primary" icon={<Plus size={16} />} onClick={startNew}>
              Nueva georuta
            </Button>
          )
        }
      />

      <div className="flex min-h-0 flex-1 gap-3.5">
        {/* List / editor */}
        <aside className="flex w-[480px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
          {draft ? (
            <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-ink">{draft.id ? `Editar ${draft.id}` : 'Nueva georuta'}</h2>
                <button type="button" aria-label="Cancelar" onClick={() => setDraft(null)} className="text-faint hover:text-ink">
                  <X size={18} />
                </button>
              </div>
              <Field label="Nombre" required error={tried ? errors.name : undefined}>
                <Input autoFocus value={draft.name} invalid={tried && Boolean(errors.name)} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. CONTECON → Cliente (ciudad)" />
              </Field>
              <div>
                <p className="text-[13px] text-body">
                  Puntos de la ruta <span className="text-crit">*</span>
                </p>
                <ol className="mt-1.5 flex flex-col gap-2">
                  {draft.stops.map((s, i) => {
                    const last = i === draft.stops.length - 1;
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <span className={clsx('w-[78px] shrink-0 text-[12px] font-medium', i === 0 ? 'text-primary' : last ? 'text-ok-text' : 'text-muted')}>
                          {i === 0 ? 'Salida' : last ? 'Destino' : `Parada ${i}`}
                        </span>
                        <Select
                          className="flex-1"
                          value={s}
                          placeholder="Elige la geocerca"
                          invalid={tried && !s}
                          onChange={(e) => setStops((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                          options={places.map((g) => ({ value: g.id, label: `${g.name.split(' · ')[0]} · ${g.locationLabel}` }))}
                        />
                        <span className="flex shrink-0 items-center gap-1">
                          <IconBtn label="Subir" disabled={i === 0} onClick={() => setStops((l) => swap(l, i, i - 1))} icon={<ArrowUp size={14} />} />
                          <IconBtn label="Bajar" disabled={last} onClick={() => setStops((l) => swap(l, i, i + 1))} icon={<ArrowDown size={14} />} />
                          <IconBtn label="Quitar punto" disabled={draft.stops.length <= 2} onClick={() => setStops((l) => l.filter((_, j) => j !== i))} icon={<X size={14} />} />
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {tried && errors.stops && <p className="mt-1 text-[12px] text-crit">{errors.stops}</p>}
                <Button size="sm" className="mt-2" icon={<Plus size={14} />} onClick={() => setStops((l) => [...l.slice(0, -1), '', l[l.length - 1]])}>
                  Agregar parada
                </Button>
              </div>
              <Field label="Corredor permitido" help="Distancia máxima a la ruta antes de alertar desvío">
                <Select
                  value={String(draft.widthM)}
                  onChange={(e) => setDraft({ ...draft, widthM: Number(e.target.value) })}
                  options={WIDTHS.map((w) => ({ value: String(w), label: `± ${fmtNumber(w / 2000, 1)} km de cada lado` }))}
                />
              </Field>
              <Field label="Notas">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={3}
                  placeholder="Por dónde ir, casetas, horarios… (opcional)"
                  className="w-full resize-y rounded-[4px] border border-input px-2.5 py-2 text-[14px] placeholder:text-faint focus:border-primary focus:outline-none"
                />
              </Field>
              <div className="mt-auto flex items-center gap-2 border-t border-line-soft pt-3">
                {draft.id && canDelete && (
                  <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>
                    Eliminar
                  </Button>
                )}
                <div className="flex-1" />
                <Button onClick={() => setDraft(null)}>Cancelar</Button>
                <Button variant="primary" onClick={save}>
                  Guardar georuta
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-[15px] font-semibold text-ink">{georoutes.length} georutas</h2>
                <p className="text-[12px] text-muted">Se eligen en Nuevo viaje → Usar georuta</p>
              </div>
              <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                {georoutes.length === 0 && <li className="px-4 py-10 text-center text-[14px] text-muted">Aún no hay georutas.</li>}
                {georoutes.map((g) => {
                  const e = estimateRoute(g.stops, geofences);
                  const active = trips.filter((t) => t.georouteId === g.id).length;
                  const sel = g.id === selectedId;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(g.id)}
                        className={clsx('flex w-full flex-col gap-1 border-b border-line-soft px-4 py-3 text-left', sel ? 'border-l-[3px] border-l-primary bg-line-soft pl-[13px]' : 'hover:bg-surface-alt')}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-muted">{g.id}</span>
                          <span className="truncate text-[14px] font-semibold text-ink">{g.name}</span>
                        </span>
                        <span className="text-[13px] text-body">{g.stops.map(placeName).join(' → ')}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                          <Chip mono>{fmtNumber(e.reduce((s, x) => s + x.km, 0))} km</Chip>
                          <Chip mono>{fmtDuration(e.reduce((s, x) => s + x.minutes, 0))}</Chip>
                          <Chip mono>± {fmtNumber(g.widthM / 2000, 1)} km</Chip>
                          {active > 0 && <Chip tone="primary">{active} en viaje</Chip>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>

        {/* Map */}
        <section className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white">
          {shown && !draft && selected && (
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Route size={17} className="text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{selected.name}</p>
                <p className="text-[12px] text-muted">
                  Actualizada {fmtDate(selected.updatedAt, true)}
                  {selected.notes ? ` · ${selected.notes}` : ''}
                </p>
              </div>
              {canEdit && <Button onClick={() => startEdit(selected)}>Editar</Button>}
            </div>
          )}
          <div className="relative min-h-0 flex-1">
            <BaseMap onReady={setMap}>
              {path.length > 1 && shown && <Polygon positions={corridorPolygon(path, shown.widthM)} pathOptions={{ color: '#1e3a5f', weight: 1, opacity: 0.4, fillOpacity: 0.12 }} />}
              {estimates.map((e, i) => (
                <Polyline key={i} positions={e.path} pathOptions={{ color: '#1e3a5f', weight: 4, opacity: 0.9, dashArray: e.approx ? '2 6' : undefined }} />
              ))}
              {stops.map((id, i) => {
                const g = geofences.find((x) => x.id === id);
                return g ? <Marker key={`${id}-${i}`} position={centerOf(g)} icon={pinIcon(i + 1, i === 0 ? 'start' : i === stops.length - 1 ? 'end' : 'stop')} /> : null;
              })}
            </BaseMap>
            {!shown && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/70 text-[14px] text-muted">Elige una georuta o crea una nueva</div>}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Eliminar la georuta ${draft?.id}`}
        message="Los viajes que ya la usan conservan su ruta. Deja de aparecer en Nuevo viaje."
        confirmLabel="Eliminar georuta"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteGeoroute(draft!.id!);
          toast.success(`Georuta ${draft!.id} eliminada`);
          setConfirmDelete(false);
          setDraft(null);
          setSelectedId(georoutes.find((g) => g.id !== draft!.id)?.id ?? null);
        }}
      />
    </div>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const out = [...list];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

function IconBtn({ label, icon, disabled, onClick }: { label: string; icon: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="flex size-7 items-center justify-center rounded-[3px] text-muted hover:bg-line-soft hover:text-ink disabled:opacity-30">
      {icon}
    </button>
  );
}

function pinIcon(n: number, tone: 'start' | 'stop' | 'end') {
  const style = tone === 'end' ? 'background:#047857;color:#fff' : tone === 'stop' ? 'background:#fff;color:#1e3a5f;border:2px solid #1e3a5f' : 'background:#1e3a5f;color:#fff';
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="${style};width:24px;height:24px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 12px var(--font-mono);box-shadow:0 1px 3px rgba(0,0,0,.3)">${n}</div>`,
  });
}
