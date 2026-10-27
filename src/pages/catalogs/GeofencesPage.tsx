import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { Marker, Polygon } from 'react-leaflet';
import { Circle as CircleIcon, Download, Hexagon, MousePointer2, Move, Plus, Route, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Geofence, GeofenceShape } from '@/types/domain';
import { useNow } from '@/sim/clock';
import { useStore } from '@/store/useStore';
import { fmtNumber, normalize } from '@/lib/format';
import { isInside, shapeBounds, shapeCenter, shapeSummary } from '@/lib/geofence';
import { GEOFENCE_TYPE_LABEL } from '@/mocks/geofences';
import { nearestPlaceLabel } from '@/mocks/places';
import { PageHeader } from '@/components/layout/AppLayout';
import { BaseMap, MapZoomButtons } from '@/components/map/BaseMap';
import { corridorPolygon, GEOFENCE_COLOR, ShapeView } from '@/components/map/layers';
import { DrawController, EditableShape, type DrawMode } from '@/components/map/GeofenceDraw';
import { unitIcon, unitState } from '@/components/map/unitIcon';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip, Dot } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { Toggle } from '@/components/ui/Toggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type EditorForm = Pick<Geofence, 'name' | 'type' | 'clientId' | 'toleranceM' | 'validity' | 'ruleIds' | 'syncToGps'>;

interface Editor {
  id: string | null;
  form: EditorForm;
  shape: GeofenceShape | null;
}

const TYPE_TONE: Record<Geofence['type'], 'primary' | 'ok' | 'warn' | 'crit' | 'muted'> = {
  terminal: 'primary',
  yard: 'primary',
  destination: 'ok',
  poi: 'warn',
  avoid_zone: 'crit',
  authorized_stop: 'muted',
};

const TYPE_OPTIONS: { value: Geofence['type']; label: string }[] = [
  { value: 'terminal', label: 'Terminal' },
  { value: 'yard', label: 'Patio' },
  { value: 'destination', label: 'Destino de cliente' },
  { value: 'poi', label: 'Punto de interés' },
  { value: 'authorized_stop', label: 'Parada autorizada' },
  { value: 'avoid_zone', label: 'Zona a evitar' },
];

const RULE_HINT: Record<string, string> = {
  'R-01': 'Detención no autorizada (parada permitida dentro)',
  'R-05': 'Desvío de ruta (destino del tramo)',
  'R-06': 'Espera excesiva en terminal',
  'R-07': 'Días libres por vencer (patio de vacíos)',
  'R-09': 'Zona de riesgo',
};

const HINT: Record<string, string> = {
  polygon: 'Dibujando polígono · clic para agregar vértices · doble clic para cerrar · Esc cancela',
  circle: 'Dibujando círculo · clic en el centro y clic de nuevo para fijar el radio · Esc cancela',
  corridor: 'Dibujando corredor de ruta · clic para agregar puntos · doble clic para terminar · Esc cancela',
  edit: 'Arrastra los vértices para ajustar la forma · Guardar geocerca para confirmar',
};

const EMPTY_FORM: EditorForm = { name: '', type: 'destination', clientId: null, toleranceM: 150, validity: 'permanent', ruleIds: ['R-01'], syncToGps: true };

export function GeofencesPage() {
  const geofences = useStore((s) => s.geofences);
  const clients = useStore((s) => s.clients);
  const trips = useStore((s) => s.trips);
  const units = useStore((s) => s.units);
  const syncedAt = useStore((s) => s.geofencesSyncedAt);
  const saveGeofence = useStore((s) => s.saveGeofence);
  const deleteGeofence = useStore((s) => s.deleteGeofence);
  const now = useNow();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [mode, setMode] = useState<DrawMode>('select');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [client, setClient] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importing, setImporting] = useState(false);

  const insideCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of geofences) m.set(g.id, trips.filter((t) => isInside(g.shape, t.live.position)).length);
    return m;
  }, [geofences, trips]);

  const list = useMemo(() => {
    const q = normalize(query.trim());
    return geofences
      .filter((g) => !q || normalize(`${g.name} ${g.locationLabel}`).includes(q))
      .filter((g) => !type || g.type === type)
      .filter((g) => !client || (client === 'none' ? !g.clientId : g.clientId === client));
  }, [geofences, query, type, client]);

  const pending = geofences.filter((g) => g.syncStatus === 'pending').length;
  const syncedMin = Math.max(0, Math.floor((now - syncedAt) / 60_000));

  const focusShape = useCallback(
    (shape: GeofenceShape) => map?.flyToBounds(L.latLngBounds(shapeBounds(shape)), { padding: [80, 80], maxZoom: 15, duration: 0.6 }),
    [map],
  );

  const openExisting = (g: Geofence) => {
    setMode('select');
    setEditor({ id: g.id, form: { name: g.name, type: g.type, clientId: g.clientId, toleranceM: g.toleranceM, validity: g.validity, ruleIds: g.ruleIds, syncToGps: g.syncToGps }, shape: g.shape });
    focusShape(g.shape);
  };

  const startNew = (drawMode: DrawMode = 'polygon') => {
    setEditor({ id: null, form: EMPTY_FORM, shape: null });
    setMode(drawMode);
  };

  const setTool = (tool: DrawMode) => {
    if (tool === 'select') return setMode('select');
    if (tool === 'edit') return editor?.shape ? setMode('edit') : toast('Primero selecciona o dibuja una geocerca');
    // A drawing tool: new shape (keeps the form if a new geocerca is already open).
    if (!editor || editor.id) setEditor({ id: null, form: EMPTY_FORM, shape: null });
    else setEditor((e) => (e ? { ...e, shape: null } : e));
    setMode(tool);
  };

  const onDelete = () => {
    if (!editor) return toast('Selecciona una geocerca para borrarla');
    if (!editor.id) {
      setEditor(null);
      setMode('select');
      return;
    }
    setConfirmDelete(true);
  };

  const save = () => {
    if (!editor?.shape) return toast.error('Dibuja la geocerca en el mapa antes de guardar.');
    if (!editor.form.name.trim()) return toast.error('Escribe el nombre de la geocerca.');
    const prev = geofences.find((g) => g.id === editor.id);
    const g: Geofence = {
      id: editor.id ?? `gf-n${Date.now()}`,
      ...editor.form,
      name: editor.form.name.trim(),
      locationLabel: prev?.locationLabel ?? nearestPlaceLabel(shapeCenter(editor.shape)).split(',')[0],
      shape: editor.shape,
      syncStatus: 'pending',
    };
    saveGeofence(g);
    setEditor(null);
    setMode('select');
    if (g.syncToGps) {
      toast('Geocerca guardada · pendiente de enviar a Wialon', { description: g.name });
      setTimeout(() => toast.success('Geocerca sincronizada con Wialon', { description: `${g.name} · ya llegan eventos de entrada y salida` }), 2000);
    } else {
      toast.success('Geocerca guardada', { description: 'La detección se hará en nuestro servidor con las posiciones.' });
    }
  };

  const importFromGps = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      toast.success('Importación completa', { description: `Wialon tiene ${geofences.length} geocercas · no hay nuevas por importar.` });
    }, 1500);
  };

  // Fit the corridor once.
  useEffect(() => {
    if (map) map.setView([19.95, -103.2], 8);
  }, [map]);

  const editingColor = editor ? GEOFENCE_COLOR[editor.form.type] : '#1e3a5f';
  const setForm = (patch: Partial<EditorForm>) => setEditor((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));
  const ruleOptions = [...new Set(['R-01', 'R-05', 'R-09', ...(editor?.form.ruleIds ?? [])])].sort();

  return (
    <div className="flex h-[calc(100vh-52px)] min-h-[720px] flex-col gap-3.5 px-6 py-5">
      <PageHeader
        title="Geocercas"
        subtitle="Se crean y editan aquí (círculo, polígono o corredor de ruta) y se sincronizan con la plataforma GPS del cliente para detectar entradas y salidas. Una geocerca puede ser terminal, patio, destino, punto de interés, parada autorizada o zona a evitar."
        actions={
          <>
            <span className="mr-2 flex items-center gap-1.5 text-[11px] whitespace-nowrap text-body">
              <Dot className={pending ? 'bg-med' : 'bg-ok'} />
              Sincronizadas con Wialon hace {syncedMin} min · {geofences.length} geocercas · {pending} pendiente{pending === 1 ? '' : 's'} de enviar
            </span>
            <Button icon={<Download size={14} />} onClick={importFromGps} disabled={importing}>
              {importing ? 'Consultando Wialon…' : 'Importar del GPS'}
            </Button>
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => startNew('polygon')}>
              Nueva geocerca
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 gap-3.5">
        {/* List */}
        <section className="flex w-[480px] shrink-0 flex-col overflow-hidden rounded-md border border-line bg-white">
          <div className="flex gap-2 border-b border-line p-2.5">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar geocerca…"
                aria-label="Buscar geocerca"
                className="h-[30px] w-full rounded-[4px] border border-input pr-2 pl-8 text-[12px] placeholder:text-faint focus:border-primary focus:outline-none"
              />
            </div>
            <Select
              className="w-[130px]"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Tipo"
              options={[{ value: '', label: 'Tipo: Todas' }, ...TYPE_OPTIONS.map((t) => ({ value: t.value, label: GEOFENCE_TYPE_LABEL[t.value] }))]}
            />
            <Select
              className="w-[120px]"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              aria-label="Cliente"
              options={[{ value: '', label: 'Cliente' }, { value: 'none', label: 'Sin cliente' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {list.map((g) => {
              const color = GEOFENCE_COLOR[g.type];
              const inside = insideCount.get(g.id) ?? 0;
              const selected = editor?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openExisting(g)}
                  className={clsx('flex w-full items-start gap-2.5 border-b border-line-soft px-3.5 py-2.5 text-left', selected ? 'bg-surface-alt' : 'hover:bg-surface-alt')}
                >
                  <span className="mt-0.5 size-3 shrink-0 rounded-[2px] border" style={{ borderColor: color, background: `${color}40` }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink">{g.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                      <Chip tone={TYPE_TONE[g.type]} className="text-[9px]">
                        {GEOFENCE_TYPE_LABEL[g.type]}
                      </Chip>
                      <span>{g.clientId ? clients.find((c) => c.id === g.clientId)?.name : g.type === 'avoid_zone' || g.type === 'authorized_stop' ? 'Sin cliente' : g.locationLabel}</span>
                      {g.ruleIds.length > 0 && <span className="font-mono">· {g.ruleIds.join(', ')}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {inside > 0 && (
                      <span className="text-[10px] font-medium text-primary">
                        {inside} {inside === 1 ? 'unidad dentro' : 'unidades dentro'}
                      </span>
                    )}
                    {g.syncStatus === 'pending' && <Chip tone="warn" className="text-[9px]">Pendiente de enviar</Chip>}
                    {g.syncStatus === 'local' && <Chip tone="muted" className="text-[9px]">Solo en servidor</Chip>}
                  </div>
                </button>
              );
            })}
            {list.length === 0 && <p className="px-4 py-10 text-center text-[12px] text-muted">Ninguna geocerca coincide.</p>}
          </div>
        </section>

        {/* Map */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative isolate min-h-0 flex-1 overflow-hidden rounded-md border border-line">
            <BaseMap onReady={setMap}>
              {geofences
                .filter((g) => g.id !== editor?.id)
                .map((g) => {
                  const color = GEOFENCE_COLOR[g.type];
                  return (
                    <ShapeView
                      key={g.id}
                      shape={g.shape}
                      style={{ color, weight: 1.5, dashArray: '4 3', fillColor: color, fillOpacity: 0.16 }}
                      tooltip={g.name}
                      onClick={mode === 'select' ? () => openExisting(g) : undefined}
                    />
                  );
                })}
              {editor?.shape && (
                <>
                  {editor.shape.kind === 'corridor' && (
                    <Polygon positions={corridorPolygon(editor.shape.path, editor.shape.widthM)} pathOptions={{ color: editingColor, weight: 1, fillColor: editingColor, fillOpacity: 0.15 }} />
                  )}
                  <EditableShape shape={editor.shape} editing={mode === 'edit'} color={editingColor} onChange={(shape) => setEditor((e) => (e ? { ...e, shape } : e))} />
                </>
              )}
              {trips.map((t) => {
                const state = unitState(t);
                return (
                  <Marker
                    key={t.id}
                    position={t.live.position}
                    interactive={false}
                    icon={unitIcon({
                      state,
                      heading: t.live.heading,
                      label: units.find((u) => u.id === t.unitId)?.economic ?? t.unitId,
                      speedText: state === 'nosignal' ? 'sin señal' : `${t.live.speedKmh} km/h`,
                      showChip: state !== 'stopped',
                    })}
                  />
                );
              })}
              <DrawController
                mode={mode}
                onCreate={(shape) => {
                  setEditor((e) => ({ id: e?.id ?? null, form: e?.form ?? EMPTY_FORM, shape }));
                  setMode('select');
                }}
                onCancel={() => setMode('select')}
              />
            </BaseMap>

            {/* Drawing toolbar */}
            <div className="absolute top-2.5 right-2.5 z-[600] flex gap-0.5 rounded-[5px] border border-line bg-white p-0.5 shadow-sm">
              {(
                [
                  ['select', 'Seleccionar', MousePointer2],
                  ['circle', 'Círculo', CircleIcon],
                  ['polygon', 'Polígono', Hexagon],
                  ['corridor', 'Corredor de ruta', Route],
                  ['edit', 'Mover vértice', Move],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={mode === key}
                  onClick={() => setTool(key)}
                  className={clsx(
                    'flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[11px] whitespace-nowrap',
                    mode === key ? 'bg-primary text-white' : 'text-body hover:bg-line-soft',
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
              <button type="button" onClick={onDelete} className="flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[11px] text-body hover:bg-crit-bg hover:text-crit">
                <Trash2 size={13} />
                Borrar
              </button>
            </div>
            {HINT[mode] && (
              <div className="absolute top-12 right-2.5 z-[600] rounded-[4px] bg-[rgba(17,24,39,0.85)] px-3 py-1.5 text-[11px] whitespace-nowrap text-white">
                {HINT[mode]}
              </div>
            )}

            {/* Editor panel */}
            {editor && (
              <GeofencePanel
                editor={editor}
                ruleOptions={ruleOptions}
                clients={clients}
                drawing={mode !== 'select' && mode !== 'edit'}
                onForm={setForm}
                onShape={(shape) => setEditor((e) => (e ? { ...e, shape } : e))}
                onCancel={() => {
                  setEditor(null);
                  setMode('select');
                }}
                onSave={save}
              />
            )}

            <div className="absolute bottom-2.5 left-2.5 z-[500] rounded-[4px] border border-line bg-white px-3 py-2 shadow-sm">
              <p className="text-[9px] font-semibold tracking-[0.5px] text-muted uppercase">Tipos</p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {TYPE_OPTIONS.map((t) => (
                  <span key={t.value} className="flex items-center gap-1.5 text-[10px] text-body">
                    <span className="size-2.5 rounded-[2px] border" style={{ borderColor: GEOFENCE_COLOR[t.value], background: `${GEOFENCE_COLOR[t.value]}40` }} />
                    {GEOFENCE_TYPE_LABEL[t.value]}
                  </span>
                ))}
              </div>
            </div>
            <MapZoomButtons map={map} onFit={() => map?.setView([19.95, -103.2], 8)} />
          </div>
          <InfoBanner tone="warn">
            Al guardar, la geocerca se envía a la plataforma GPS del cliente (API) para que las entradas/salidas lleguen como eventos. Si el GPS no
            soporta geocercas, la detección se hace en nuestro servidor con las posiciones. Pendiente (#15): citas y filas de las terminales de
            Manzanillo.
          </InfoBanner>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Borrar geocerca"
        message={
          <>
            Se borrará <b>{editor?.form.name}</b> de la torre y de la plataforma GPS. Las reglas dejarán de usarla.
          </>
        }
        confirmLabel="Borrar geocerca"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editor?.id) deleteGeofence(editor.id);
          toast.success('Geocerca borrada', { description: editor?.form.name });
          setConfirmDelete(false);
          setEditor(null);
          setMode('select');
        }}
      />
    </div>
  );
}

function GeofencePanel({
  editor,
  ruleOptions,
  clients,
  drawing,
  onForm,
  onShape,
  onCancel,
  onSave,
}: {
  editor: Editor;
  ruleOptions: string[];
  clients: { id: string; name: string }[];
  drawing: boolean;
  onForm: (patch: Partial<EditorForm>) => void;
  onShape: (shape: GeofenceShape) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { form, shape } = editor;
  const sizeField =
    shape?.kind === 'circle'
      ? { label: 'Radio (m)', value: shape.radiusM, set: (v: number) => onShape({ ...shape, radiusM: v }) }
      : shape?.kind === 'corridor'
        ? { label: 'Ancho del corredor (m)', value: shape.widthM, set: (v: number) => onShape({ ...shape, widthM: v }) }
        : { label: 'Radio / tolerancia (m)', value: form.toleranceM, set: (v: number) => onForm({ toleranceM: v }) };

  return (
    <div className="scrollbar-thin absolute top-[50px] left-2.5 z-[600] max-h-[calc(100%-60px)] w-[320px] overflow-y-auto rounded-md border border-line bg-white p-3.5 shadow-pop">
      <h3 className="text-[13px] font-semibold text-ink">{editor.id ? 'Editar geocerca' : 'Nueva geocerca'}</h3>
      {shape && <span className="mt-1 inline-block rounded-[3px] bg-line-soft px-1.5 py-px font-mono text-[9px] text-body">{shapeSummary(shape)}</span>}
      {!shape && (
        <p className="mt-2 rounded-[4px] bg-primary-soft px-2.5 py-2 text-[11px] text-body">
          {drawing ? 'Dibuja la geocerca en el mapa.' : 'Elige Círculo, Polígono o Corredor de ruta en la barra del mapa para dibujarla.'}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2.5">
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => onForm({ name: e.target.value })} placeholder="Ej. Automotriz del Centro · planta" />
        </Field>
        <Field label="Tipo">
          <Select value={form.type} onChange={(e) => onForm({ type: e.target.value as Geofence['type'] })} options={TYPE_OPTIONS} />
        </Field>
        <Field label="Cliente">
          <Select
            value={form.clientId ?? ''}
            onChange={(e) => onForm({ clientId: e.target.value || null })}
            options={[{ value: '', label: 'Sin cliente' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={sizeField.label}>
            <Input
              mono
              value={fmtNumber(sizeField.value)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^\d]/g, ''));
                if (n > 0) sizeField.set(n);
              }}
            />
          </Field>
          <Field label="Vigencia">
            <Select
              value={form.validity}
              onChange={(e) => onForm({ validity: e.target.value as Geofence['validity'] })}
              options={[
                { value: 'permanent', label: 'Permanente' },
                { value: 'temporary', label: 'Temporal' },
              ]}
            />
          </Field>
        </div>
        <div>
          <p className="label-section">Se usa en reglas</p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {ruleOptions.map((id) => (
              <Checkbox
                key={id}
                checked={form.ruleIds.includes(id)}
                onChange={(v) => onForm({ ruleIds: v ? [...form.ruleIds, id] : form.ruleIds.filter((r) => r !== id) })}
                label={
                  <span className="text-[11px]">
                    <b className="font-mono">{id}</b> {RULE_HINT[id] ?? ''}
                  </span>
                }
              />
            ))}
          </div>
        </div>
        <div className="rounded-[4px] bg-surface-alt px-2.5 py-2">
          <Toggle checked={form.syncToGps} onChange={(v) => onForm({ syncToGps: v })} label="Sincronizar con GPS del cliente" description="Wialon · se crea como geofence al guardar" />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={onSave} disabled={!shape || !form.name.trim()}>
            Guardar geocerca
          </Button>
        </div>
      </div>
    </div>
  );
}
