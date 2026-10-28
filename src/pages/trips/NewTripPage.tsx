import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { Marker, Polyline } from 'react-leaflet';
import { AlertTriangle, ArrowDown, Check, ChevronDown, Loader2, MapPin, Plus, Route, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CrewMember } from '@/types/domain';
import { useCurrentUser, useStore } from '@/store/useStore';
import { fmtDate, fmtDuration, fmtNumber, fmtTime } from '@/lib/format';
import { dayEnd } from '@/lib/mockTime';
import {
  buildTrip,
  CARRIERS,
  centerOf,
  emptyForm,
  estimateRoute,
  findDriver,
  MAX_TRAILERS,
  newStop,
  nextTripId,
  parseLocal,
  phoneDigits,
  routeStops,
  segmentEstimate,
  useRoadRoutesFor,
  validate,
  type Check as CheckItem,
  type NewTripForm,
} from '@/lib/newTrip';
import { crewName } from '@/mocks/crew';
import { trailerLabel, trailersInUse } from '@/mocks/trailers';
import { BaseMap } from '@/components/map/BaseMap';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { Popover } from '@/components/ui/Popover';

/** Validation field key → DOM id (to jump to it from the checklist). */
const fieldId = (key: string) => `nt-${key}`;

function focusField(key: string) {
  const el = document.getElementById(fieldId(key));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const target = el.matches('input, select') ? el : el.querySelector<HTMLElement>('select, input');
  target?.focus({ preventScroll: true });
}

const fmtPhone = (digits: string) => `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;

export function NewTripPage() {
  const navigate = useNavigate();
  const { trips, history, units, crew, geofences, georoutes, trailers, tripGroups, tripDraft, saveTripDraft, createTrip, upsertCrew, lastTickAt } = useStore();
  const user = useCurrentUser();
  const [f, setF] = useState<NewTripForm>(() => (tripDraft?.data as NewTripForm | undefined) ?? emptyForm());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const usedIds = useMemo(() => [...trips, ...history].map((t) => t.id), [trips, history]);
  const autoFolio = useMemo(() => nextTripId(usedIds), [usedIds]);
  const now = Math.max(Date.now(), lastTickAt);

  const set = <K extends keyof NewTripForm>(k: K, v: NewTripForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const inUse = useMemo(() => trailersInUse(trips), [trips]);
  const checks = validate(f, { units, crew, geofences, usedIds, trailersInUse: inUse, now });
  const errors = checks.filter((c) => c.level === 'error');
  const warnings = checks.filter((c) => c.level === 'warn');
  /** Inline error for a field once the user left it, or after trying to create. */
  const errorFor = (key: string) => (showAll || touched[key] ? errors.find((c) => c.field === key)?.text : undefined);

  const stops = routeStops(f);
  const stopsKey = stops.join('|');
  const roadRoutes = useRoadRoutesFor(stops, geofences);
  const estimates = useMemo(() => estimateRoute(stopsKey ? stopsKey.split('|') : [], geofences), [stopsKey, geofences, roadRoutes]);
  const totalMin = estimates.reduce((s, e) => s + e.minutes, 0);
  const totalKm = estimates.reduce((s, e) => s + e.km, 0);
  const georoute = georoutes.find((g) => g.id === f.georouteId);
  const georouteIntact = georoute && georoute.stops.join('|') === stopsKey;
  const knownDriver = findDriver(f.driverName, crew);
  const arrivalTs = parseLocal(f.arrivalAt);

  /* ---------- Handlers ---------- */

  const setDriverName = (name: string) =>
    setF((x) => {
      const prev = findDriver(x.driverName, crew);
      const next = findDriver(name, crew);
      // Known operator → fill their phone, unless the user typed a different one.
      const autoPhone = !x.driverPhone || (prev !== undefined && phoneDigits(prev.phone) === phoneDigits(x.driverPhone));
      const driverPhone = !autoPhone ? x.driverPhone : next ? next.phone : prev ? '' : x.driverPhone;
      return { ...x, driverName: name, driverPhone };
    });

  const applyGeoroute = (id: string) => {
    const g = georoutes.find((x) => x.id === id)!;
    setF((x) => ({
      ...x,
      georouteId: id,
      departureId: g.stops[0],
      arrivalId: g.stops[g.stops.length - 1],
      stops: g.stops.slice(1, -1).map((geofenceId, i) => ({ ...newStop(), geofenceId, at: x.stops[i]?.at ?? '' })),
    }));
    toast.success('Georuta aplicada', { description: `${g.name} · solo faltan las horas.` });
  };

  const setStop = (i: number, patch: Partial<NewTripForm['stops'][number]>) => set('stops', f.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const saveDraft = () => {
    saveTripDraft(f);
    toast.success('Borrador guardado', { description: 'Lo encuentras al volver a Nuevo viaje.' });
  };

  const create = () => {
    if (errors.length) {
      setShowAll(true);
      const first = errors.find((e) => e.field);
      if (first?.field) focusField(first.field);
      toast.error(`Falta resolver ${errors.length} ${errors.length === 1 ? 'dato' : 'datos'}`, { description: errors[0].text });
      return;
    }
    const unit = units.find((u) => u.id === f.unitId)!;
    const id = f.folio.trim().toUpperCase() || autoFolio;
    const digits = phoneDigits(f.driverPhone);
    let driver = knownDriver;
    if (!driver) {
      const words = f.driverName.trim().split(/\s+/);
      driver = {
        id: `op-${crypto.randomUUID().slice(0, 6)}`,
        role: 'driver',
        firstName: words[0],
        lastName: words.slice(1).join(' '),
        phone: digits ? fmtPhone(digits) : '',
        // The license is captured later in Usuarios → Operadores; flagged as "por vencer" so it isn't forgotten.
        license: { kind: 'Federal E', number: 'Por capturar', expiresOn: dayEnd(7) },
        provider: f.carrier.trim(),
        status: 'available',
      } satisfies CrewMember;
      upsertCrew(driver);
    } else if (digits && digits !== phoneDigits(driver.phone)) {
      upsertCrew({ ...driver, phone: fmtPhone(digits) });
    }
    const trip = buildTrip(f, { id, unit, driverId: driver.id, user, geofences, warnings: warnings.map((w) => w.text) });
    createTrip(trip);
    navigate(`/?viaje=${trip.id}`);
    toast.success(`Viaje ${trip.id} creado`, {
      description: knownDriver
        ? 'Ya aparece en la Torre de control. El monitoreo inicia cuando la unidad sale.'
        : `Ya aparece en la Torre de control. ${crewName(driver)} se agregó en Usuarios → Operadores: completa su licencia ahí.`,
    });
  };

  /* ---------- Option lists ---------- */

  const tractors = units.filter((u) => u.economic);
  const unit = tractors.find((u) => u.id === f.unitId);
  const places = geofences
    .filter((g) => g.type !== 'avoid_zone')
    .map((g) => ({ value: g.id, label: `${g.name.split(' · ')[0]} · ${g.locationLabel}` }));
  const trailerOptions = (current: string) =>
    trailers.map((t) => {
      const label = trailerLabel(t);
      const trip = inUse.get(label);
      const why = t.status === 'maintenance' ? ' (en taller)' : trip ? ` (en ${trip})` : label !== current && f.trailers.includes(label) ? ' (ya elegido)' : '';
      return { value: label, label: `${label} · ${t.kind}${why}`, disabled: Boolean(why) };
    });
  const drivers = crew.filter((c) => c.role === 'driver');
  const driverHelp = knownDriver
    ? 'Operador registrado · celular tomado de Usuarios → Operadores'
    : f.driverName.trim()
      ? 'Operador nuevo: se registrará al crear el viaje'
      : 'Escribe para buscar en Usuarios → Operadores';

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">
            <Link to="/" className="hover:underline">
              Torre de control
            </Link>{' '}
            / Nuevo viaje
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[20px] font-bold text-ink">Nuevo viaje</h1>
            {tripDraft && <Chip tone="muted">Borrador guardado {fmtTime(tripDraft.savedAt)}</Chip>}
          </div>
          <p className="mt-1 text-[13px] text-muted">Solo lo necesario para monitorear el viaje. Los campos con * son obligatorios.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => navigate('/')}>Cancelar</Button>
          <Button onClick={saveDraft}>Guardar borrador</Button>
          <Button variant="primary" onClick={create}>
            Crear viaje
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3.5">
        {/* Form */}
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <Card n={1} title="Datos generales del viaje">
            <div className="grid grid-cols-3 gap-x-4 gap-y-4">
              <Field label="Folio" help={!f.folio.trim() ? `Vacío = folio automático ${autoFolio}` : undefined} error={errorFor('folio')}>
                <Input
                  id={fieldId('folio')}
                  mono
                  value={f.folio}
                  invalid={Boolean(errorFor('folio'))}
                  onBlur={() => touch('folio')}
                  onChange={(e) => set('folio', e.target.value.toUpperCase())}
                  placeholder={autoFolio}
                />
              </Field>
              <Field
                label="Unidad"
                required
                error={errorFor('unit')}
                help={unit && unit.status === 'available' ? `${unit.plate} · ${unit.model} · base ${unit.base}` : undefined}
              >
                <Select
                  id={fieldId('unit')}
                  mono
                  value={f.unitId}
                  placeholder="Selecciona la unidad"
                  invalid={Boolean(errorFor('unit'))}
                  onBlur={() => touch('unit')}
                  onChange={(e) => {
                    set('unitId', e.target.value);
                    touch('unit');
                  }}
                  options={tractors.map((u) => {
                    const why =
                      u.status === 'maintenance' ? ' (en taller)' : u.status === 'on_trip' ? ` (en ${u.currentTripId})` : u.gps.signal === 'offline' ? ' (sin señal GPS)' : '';
                    return { value: u.id, label: `${u.economic} · ${u.plate}${why}`, disabled: Boolean(why) };
                  })}
                />
              </Field>
              <Field label="Grupo de viaje">
                <Select mono value={f.groupId} onChange={(e) => set('groupId', e.target.value)} options={[{ value: '', label: 'Sin grupo' }, ...tripGroups.map((g) => ({ value: g, label: g }))]} />
              </Field>

              <Field label={`Remolques (hasta ${MAX_TRAILERS})`} className="col-span-3" error={errorFor('trailers')}>
                <div id={fieldId('trailers')} className="flex flex-wrap items-center gap-2">
                  {f.trailers.map((t, i) => (
                    <div key={i} className="flex w-[320px] items-center gap-1.5">
                      <Select
                        mono
                        className="flex-1"
                        value={t}
                        placeholder={i === 0 ? 'Sin remolque' : 'Elige el segundo remolque'}
                        onChange={(e) => {
                          set('trailers', f.trailers.map((x, j) => (j === i ? e.target.value : x)));
                          touch('trailers');
                        }}
                        options={trailerOptions(t)}
                      />
                      {(i > 0 || t) && (
                        <button
                          type="button"
                          aria-label="Quitar remolque"
                          onClick={() => set('trailers', f.trailers.length > 1 ? f.trailers.filter((_, j) => j !== i) : [''])}
                          className="text-faint hover:text-crit"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {f.trailers.length < MAX_TRAILERS && f.trailers[0] && (
                    <Button icon={<Plus size={15} />} onClick={() => set('trailers', [...f.trailers, ''])}>
                      Agregar segundo remolque
                    </Button>
                  )}
                </div>
              </Field>

              <Field label="Línea transportista" required error={errorFor('carrier')}>
                <Input
                  id={fieldId('carrier')}
                  list="nt-carriers"
                  value={f.carrier}
                  invalid={Boolean(errorFor('carrier'))}
                  onBlur={() => touch('carrier')}
                  onChange={(e) => set('carrier', e.target.value)}
                  placeholder="Escribe o elige"
                />
                <datalist id="nt-carriers">
                  {CARRIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Nombre de operador" required error={errorFor('driver')} help={driverHelp}>
                <Input
                  id={fieldId('driver')}
                  list="nt-drivers"
                  value={f.driverName}
                  invalid={Boolean(errorFor('driver'))}
                  onBlur={() => touch('driver')}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nombre y apellidos"
                  autoComplete="off"
                />
                <datalist id="nt-drivers">
                  {drivers.map((d) => (
                    <option key={d.id} value={crewName(d)}>
                      {d.status !== 'available' ? `En viaje ${d.assignment?.tripId ?? ''}` : 'Disponible'}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="Celular" error={errorFor('phone')} help="10 dígitos · la torre lo usa para llamarle">
                <Input
                  id={fieldId('phone')}
                  type="tel"
                  mono
                  value={f.driverPhone}
                  invalid={Boolean(errorFor('phone'))}
                  onBlur={() => touch('phone')}
                  onChange={(e) => set('driverPhone', e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="312 000 0000"
                />
              </Field>
            </div>
          </Card>

          <Card n={2} title="Notas del viaje">
            <textarea
              value={f.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Indicaciones para el operador o la torre (opcional). Quedan en la bitácora del viaje."
              aria-label="Notas del viaje"
              className="w-full resize-y rounded-[4px] border border-input bg-white px-2.5 py-2 text-[14px] text-ink placeholder:text-faint focus:border-primary focus:outline-none"
            />
          </Card>

          <Card
            n={3}
            title="Ruta"
            right={
              georoutes.length > 0 && (
                <Popover
                  align="right"
                  panelClassName="w-[460px]"
                  trigger={({ toggle }) => (
                    <Button icon={<Route size={15} />} onClick={toggle}>
                      Usar georuta <ChevronDown size={14} />
                    </Button>
                  )}
                >
                  {(close) => (
                    <div className="flex flex-col">
                      <p className="label-section px-2 pt-1 pb-1.5">Georutas guardadas</p>
                      {georoutes.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            applyGeoroute(g.id);
                            close();
                          }}
                          className="rounded-[3px] px-2 py-2 text-left text-[14px] hover:bg-line-soft"
                        >
                          <span className="font-mono text-[12px] text-muted">{g.id}</span> {g.name}
                        </button>
                      ))}
                    </div>
                  )}
                </Popover>
              )
            }
          >
            {georoute && (
              <p className={clsx('mb-3 flex items-center gap-1.5 text-[13px]', georouteIntact ? 'text-ok-text' : 'text-med')}>
                <Route size={14} />
                {georouteIntact
                  ? `Usando la georuta ${georoute.id} · ${georoute.name}`
                  : `Cambiaste los puntos de la georuta ${georoute.id}: el viaje usará la ruta capturada`}
              </p>
            )}
            {errorFor('route') && <p className="mb-3 text-[13px] text-crit">{errorFor('route')}</p>}
            <div id={fieldId('route')} className="flex flex-col">
              <RoutePoint
                label="Salida"
                timeLabel="Hora de inicio"
                required
                placeKey="departure"
                timeKey="departureAt"
                place={f.departureId}
                time={f.departureAt}
                places={places}
                errorFor={errorFor}
                touch={touch}
                onPlace={(v) => set('departureId', v)}
                onTime={(v) => set('departureAt', v)}
                tone="start"
              />
              {f.stops.map((s, i) => (
                <div key={s.id}>
                  <Leg from={i === 0 ? f.departureId : f.stops[i - 1].geofenceId} to={s.geofenceId} />
                  <RoutePoint
                    label={`Parada intermedia ${i + 1}`}
                    timeLabel="Hora de entrega"
                    required
                    placeKey={`stop${i}`}
                    timeKey={`stop${i}At`}
                    place={s.geofenceId}
                    time={s.at}
                    places={places}
                    errorFor={errorFor}
                    touch={touch}
                    onPlace={(v) => setStop(i, { geofenceId: v })}
                    onTime={(v) => setStop(i, { at: v })}
                    onRemove={() => set('stops', f.stops.filter((_, j) => j !== i))}
                    tone="stop"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 py-2 pl-[11px]">
                <span className="h-7 border-l-2 border-dashed border-input" />
                <Button size="sm" icon={<Plus size={14} />} onClick={() => set('stops', [...f.stops, newStop()])}>
                  Agregar parada intermedia
                </Button>
                <LegText from={f.stops.length ? f.stops[f.stops.length - 1].geofenceId : f.departureId} to={f.arrivalId} />
              </div>
              <RoutePoint
                label="Destino"
                timeLabel="Hora de entrega"
                required
                placeKey="arrival"
                timeKey="arrivalAt"
                place={f.arrivalId}
                time={f.arrivalAt}
                places={places}
                errorFor={errorFor}
                touch={touch}
                onPlace={(v) => set('arrivalId', v)}
                onTime={(v) => set('arrivalAt', v)}
                tone="end"
              />
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="flex w-[460px] shrink-0 flex-col gap-3.5">
          <section className="overflow-hidden rounded-md border border-line bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[15px] font-semibold">Vista previa de ruta</h2>
              <span className="font-mono text-[13px] text-muted">
                {fmtNumber(totalKm)} km · {stops.length} {stops.length === 1 ? 'punto' : 'puntos'}
              </span>
            </div>
            <RoutePreview stops={stops} estimates={estimates} />
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <Stat label="Distancia" value={`${fmtNumber(totalKm)} km`} />
              <Stat label="Manejo estimado" value={totalMin ? fmtDuration(totalMin, true) : '—'} />
              <Stat label="Entrega" value={arrivalTs ? `${fmtDate(arrivalTs)} ${fmtTime(arrivalTs)} h` : '—'} />
            </div>
          </section>

          <section className="rounded-md border border-line bg-white">
            <div className="border-b border-line-soft px-4 py-3">
              <h2 className="text-[15px] font-semibold text-ink">Antes de crear</h2>
              <p className="text-[12px] text-muted">
                {errors.length ? `Faltan ${errors.length} ${errors.length === 1 ? 'dato' : 'datos'}. Clic en uno para ir al campo.` : 'Todo listo para crear el viaje.'}
              </p>
            </div>
            <ul className="flex flex-col gap-2 px-4 py-3.5">
              {checks.map((c, i) => (
                <CheckRow key={i} check={c} onClick={c.field && c.level !== 'ok' ? () => focusField(c.field!) : undefined} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function RoutePoint({
  label,
  timeLabel,
  required,
  placeKey,
  timeKey,
  place,
  time,
  places,
  errorFor,
  touch,
  onPlace,
  onTime,
  onRemove,
  tone,
}: {
  label: string;
  timeLabel: string;
  required?: boolean;
  placeKey: string;
  timeKey: string;
  place: string;
  time: string;
  places: { value: string; label: string }[];
  errorFor: (key: string) => string | undefined;
  touch: (key: string) => void;
  onPlace: (v: string) => void;
  onTime: (v: string) => void;
  onRemove?: () => void;
  tone: 'start' | 'stop' | 'end';
}) {
  const placeErr = errorFor(placeKey);
  const timeErr = errorFor(timeKey);
  return (
    <div className="flex items-start gap-3">
      <span
        className={clsx(
          'mt-[29px] flex size-6 shrink-0 items-center justify-center rounded-full',
          tone === 'start' ? 'bg-primary text-white' : tone === 'end' ? 'bg-ok-text text-white' : 'border-2 border-primary bg-white text-primary',
        )}
      >
        <MapPin size={13} />
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[1.4fr_1fr] gap-3">
        <Field label={label} required={required} error={placeErr}>
          <Select
            id={fieldId(placeKey)}
            value={place}
            placeholder="Elige la geocerca"
            invalid={Boolean(placeErr)}
            onBlur={() => touch(placeKey)}
            onChange={(e) => {
              onPlace(e.target.value);
              touch(placeKey);
            }}
            options={places}
          />
        </Field>
        <Field label={timeLabel} required={required} error={timeErr}>
          <Input id={fieldId(timeKey)} type="datetime-local" value={time} invalid={Boolean(timeErr)} onBlur={() => touch(timeKey)} onChange={(e) => onTime(e.target.value)} />
        </Field>
      </div>
      {onRemove ? (
        <button type="button" aria-label={`Quitar ${label.toLowerCase()}`} onClick={onRemove} className="mt-[32px] text-faint hover:text-crit">
          <X size={16} />
        </button>
      ) : (
        <span className="w-4" />
      )}
    </div>
  );
}

function useLegText(from: string, to: string): string | null {
  const geofences = useStore((s) => s.geofences);
  const e = from && to ? segmentEstimate(from, to, geofences) : null;
  if (e?.loading) return 'calculando ruta…';
  return e ? `${fmtDuration(e.minutes)} · ${e.km} km${e.approx ? ' aprox.' : ''}` : null;
}

/** Driving time between two consecutive points (vertical connector). */
function Leg({ from, to }: { from: string; to: string }) {
  const text = useLegText(from, to);
  return (
    <div className="flex items-center gap-3 py-1.5 pl-[11px]">
      <span className="h-5 border-l-2 border-input" />
      {text && (
        <span className="flex items-center gap-1 text-[12px] text-muted">
          <ArrowDown size={12} /> {text}
        </span>
      )}
    </div>
  );
}

function LegText({ from, to }: { from: string; to: string }) {
  const text = useLegText(from, to);
  return text ? (
    <span className="flex items-center gap-1 text-[12px] text-muted">
      <ArrowDown size={12} /> {text}
    </span>
  ) : null;
}

function Card({ n, title, right, children }: { n: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white">
      <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">{n}</span>
        <h2 className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{title}</h2>
        {right}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="font-mono text-[14px] font-bold text-ink">{value}</p>
    </div>
  );
}

function CheckRow({ check, onClick }: { check: CheckItem; onClick?: () => void }) {
  const style =
    check.level === 'ok'
      ? { box: 'bg-ok-bg text-ok-text', icon: <Check size={12} strokeWidth={3} /> }
      : check.level === 'warn'
        ? { box: 'bg-med-bg text-med', icon: <span className="text-[13px] font-bold">!</span> }
        : { box: 'bg-crit-bg text-crit', icon: <X size={12} strokeWidth={3} /> };
  const content = (
    <>
      <span className={clsx('mt-px flex size-[20px] shrink-0 items-center justify-center rounded-full', style.box)}>{style.icon}</span>
      <span className={check.level === 'error' ? 'text-crit' : 'text-body'}>{check.text}</span>
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full items-start gap-2.5 rounded-[3px] text-left text-[14px] hover:bg-surface-alt">
          {content}
        </button>
      ) : (
        <div className="flex items-start gap-2.5 text-[14px]">{content}</div>
      )}
    </li>
  );
}

function pointIcon(n: number, tone: 'navy' | 'green' | 'ring') {
  const style =
    tone === 'green'
      ? 'background:#047857;color:#fff'
      : tone === 'ring'
        ? 'background:#fff;color:#1e3a5f;border:2px solid #1e3a5f'
        : 'background:#1e3a5f;color:#fff';
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="${style};width:22px;height:22px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 11px var(--font-mono);box-shadow:0 1px 3px rgba(0,0,0,.3)">${n}</div>`,
  });
}

function RoutePreview({ stops, estimates }: { stops: string[]; estimates: ReturnType<typeof estimateRoute> }) {
  const geofences = useStore((s) => s.geofences);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const points = stops.map((id) => geofences.find((g) => g.id === id)).map((g) => (g ? centerOf(g) : null));
  const key = stops.join('|');
  const lastKey = useRef('');
  // Refit when the points change and again when the road routes arrive.
  const fitKey = `${key}#${estimates.map((e) => e.path.length).join(',')}`;

  useEffect(() => {
    if (!map || fitKey === lastKey.current) return;
    lastKey.current = fitKey;
    const pts = [...estimates.flatMap((e) => e.path), ...points.filter((p): p is [number, number] => Boolean(p))];
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [28, 28] });
    else if (pts.length === 1) map.setView(pts[0], 10);
  }, [map, fitKey, estimates, points]);

  const loading = estimates.some((e) => e.loading);
  return (
    <div className="relative isolate h-[260px] border-y border-line-soft">
      <BaseMap onReady={setMap} zoom={7}>
        {estimates.map((e, i) => (
          <Polyline key={i} positions={e.path} pathOptions={{ color: '#1e3a5f', weight: 4, opacity: 0.9, dashArray: e.approx ? '2 6' : undefined }} />
        ))}
        {points.map((p, i) => (p ? <Marker key={i} position={p} icon={pointIcon(i + 1, i === points.length - 1 && i > 0 ? 'green' : i === 0 ? 'navy' : 'ring')} /> : null))}
      </BaseMap>
      {points.length === 0 && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/70 text-[13px] text-muted">Elige salida y destino, o usa una georuta</div>
      )}
      {loading ? (
        <span className="absolute bottom-1.5 left-2 z-[500] flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-muted">
          <Loader2 size={11} className="animate-spin" /> Calculando ruta por carretera…
        </span>
      ) : (
        estimates.some((e) => e.approx) && (
          <span className="absolute bottom-1.5 left-2 z-[500] flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[11px] text-med">
            <AlertTriangle size={11} /> Sin servicio de rutas: tramo aproximado en línea recta
          </span>
        )
      )}
    </div>
  );
}
