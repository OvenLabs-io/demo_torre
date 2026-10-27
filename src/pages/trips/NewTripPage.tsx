import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { Marker, Polyline } from 'react-leaflet';
import { AlertTriangle, Check, ChevronDown, Clock3, Crosshair, GripVertical, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LegKind } from '@/types/domain';
import { useCurrentUser, useStore } from '@/store/useStore';
import { daysUntil, fmtDate, fmtDuration, fmtNumber, fmtTime } from '@/lib/format';
import { shippingLineFor, validateContainer } from '@/lib/iso6346';
import {
  applicableRules,
  buildTrip,
  CARGO_TYPES,
  centerOf,
  containerError,
  emptyForm,
  estimateLegs,
  LEG_KINDS,
  newLeg,
  nextTripId,
  parseLocal,
  riskCrossings,
  SHIPPING_LINES,
  validate,
  windowText,
  type Check as CheckItem,
  type NewTripForm,
} from '@/lib/newTrip';
import { TRIP_GROUPS, CHASSIS } from '@/mocks/clients';
import { crewName } from '@/mocks/crew';
import { legLabel } from '@/mocks/trips';
import { LOCKS, ROUTE_TEMPLATES } from '@/mocks/routeTemplates';
import { BaseMap } from '@/components/map/BaseMap';
import { RiskZonesLayer } from '@/components/map/layers';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { Toggle } from '@/components/ui/Toggle';
import { Popover } from '@/components/ui/Popover';
import { InfoBanner } from '@/components/ui/InfoBanner';

const LEG_GRID = 'grid grid-cols-[28px_1fr_1.3fr_1fr_170px_44px] items-center gap-x-3';

const KIND_BY_MOVEMENT: Record<'IMP' | 'EXP', LegKind[]> = {
  IMP: ['terminal_pickup', 'client_delivery', 'empty_return'],
  EXP: ['empty_pickup', 'client_loading', 'terminal_delivery'],
};

export function NewTripPage() {
  const navigate = useNavigate();
  const { trips, history, units, crew, clients, geofences, rules, tripDraft, saveTripDraft, createTrip, lastTickAt } = useStore();
  const user = useCurrentUser();
  const [f, setF] = useState<NewTripForm>(() => (tripDraft?.data as NewTripForm | undefined) ?? emptyForm());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const folio = useMemo(() => nextTripId([...trips, ...history].map((t) => t.id)), [trips, history]);
  const now = Math.max(Date.now(), lastTickAt);

  const set = <K extends keyof NewTripForm>(k: K, v: NewTripForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const estimates = useMemo(() => estimateLegs(f.legs, geofences), [f.legs, geofences]);
  const crossings = useMemo(() => riskCrossings(estimates), [estimates]);
  const checks = validate(f, { units, crew, now });
  const errors = checks.filter((c) => c.level === 'error');
  const warnings = checks.filter((c) => c.level === 'warn');
  const ruleChips = applicableRules(f, crossings.length > 0, rules);
  const client = clients.find((c) => c.id === f.clientId);
  const pickup = parseLocal(f.pickupAt);
  const freeEnd = f.freeDaysEnd ? new Date(`${f.freeDaysEnd}T23:59`).getTime() : null;
  const freeDays = freeEnd ? daysUntil(freeEnd, now) : null;

  /* ---------- Handlers ---------- */

  const setClient = (id: string) =>
    setF((x) => {
      const prev = clients.find((c) => c.id === x.clientId);
      const next = clients.find((c) => c.id === id);
      const keepContacts = x.contacts.length && JSON.stringify(x.contacts) !== JSON.stringify(prev?.contacts ?? []);
      return { ...x, clientId: id, contacts: keepContacts ? x.contacts : next?.contacts ?? [] };
    });

  const setContainer = (i: number, patch: Partial<NewTripForm['containers'][number]>) =>
    setF((x) => {
      const containers = x.containers.map((c, j) => (j === i ? { ...c, ...patch } : c));
      let shippingLine = x.shippingLine;
      if (i === 0 && patch.number !== undefined) {
        const line = shippingLineFor(patch.number);
        const prevAuto = shippingLineFor(x.containers[0].number);
        if (SHIPPING_LINES.includes(line) && (!x.shippingLine || x.shippingLine === prevAuto)) shippingLine = line;
      }
      return { ...x, containers, shippingLine };
    });

  const setModality = (m: NewTripForm['modality']) =>
    setF((x) => ({
      ...x,
      modality: m,
      containers: m === 'full' ? [x.containers[0], x.containers[1] ?? { number: '', isoType: x.containers[0].isoType, seal: '' }] : [x.containers[0]],
    }));

  const setMovement = (mv: NewTripForm['movement']) =>
    setF((x) => {
      const kinds = mv === 'LOC' ? null : KIND_BY_MOVEMENT[mv];
      return { ...x, movement: mv, legs: kinds ? x.legs.map((l, i) => ({ ...l, kind: kinds[i] ?? l.kind })) : x.legs };
    });

  const applyTemplate = (id: string) => {
    const tpl = ROUTE_TEMPLATES.find((t) => t.id === id)!;
    setF((x) => {
      const p = parseLocal(x.pickupAt);
      const end = x.freeDaysEnd ? new Date(`${x.freeDaysEnd}T23:59`).getTime() : null;
      const legs = tpl.legs.map((l, i) => ({
        id: crypto.randomUUID(),
        kind: l.kind,
        geofenceId: l.geofenceId,
        window: i === 0 ? (p ? windowText(p) : '') : l.window ? `${p ? `${fmtDate(p)} · ` : ''}${l.window}` : end ? `Antes del ${fmtDate(end)}` : '',
      }));
      const terminal = geofences.find((g) => g.id === tpl.legs[0].geofenceId && g.type === 'terminal');
      return { ...x, movement: tpl.movement, legs, terminalId: terminal ? terminal.id : x.terminalId };
    });
    toast.success('Plantilla aplicada', { description: tpl.name });
  };

  /** The first leg's appointment follows the terminal pickup unless edited by hand. */
  const setPickup = (value: string) =>
    setF((x) => {
      const prev = parseLocal(x.pickupAt);
      const next = parseLocal(value);
      const autoFirst = !x.legs[0]?.window || (prev !== null && x.legs[0].window === windowText(prev));
      const legs = autoFirst && next !== null ? x.legs.map((l, i) => (i === 0 ? { ...l, window: windowText(next) } : l)) : x.legs;
      return { ...x, pickupAt: value, legs };
    });

  const setLeg = (i: number, patch: Partial<NewTripForm['legs'][number]>) => set('legs', f.legs.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const toggleEscort = (v: boolean) =>
    setF((x) => ({ ...x, escortRequired: v, escortLegs: v && crossings[0] ? String(crossings[0].legIndex + 1) : x.escortLegs }));

  const saveDraft = () => {
    saveTripDraft(f);
    toast.success('Borrador guardado', { description: 'Lo encuentras al volver a Viajes → Nuevo viaje.' });
  };

  const create = () => {
    if (errors.length) return;
    const unit = units.find((u) => u.id === f.unitId)!;
    const escortIsProvider = f.escortId.startsWith('prov:');
    const trip = buildTrip(f, {
      id: folio,
      unit,
      user,
      client,
      estimates,
      warnings: warnings.map((w) => w.text),
      ruleIds: ruleChips.map((r) => r.rule.id),
      escort: escortIsProvider ? undefined : crew.find((c) => c.id === f.escortId),
      escortProvider: escortIsProvider ? f.escortId.slice(5) : undefined,
    });
    createTrip(trip);
    navigate(`/?viaje=${trip.id}`);
    toast.success(`Viaje ${trip.id} creado`, { description: 'Ya aparece en la Torre de control. El monitoreo inicia cuando el tracto sale del origen.' });
  };

  /* ---------- Option lists ---------- */

  const drivers = crew.filter((c) => c.role === 'driver');
  const escorts = crew.filter((c) => c.role === 'escort');
  const tractors = units.filter((u) => u.economic);
  const usedChassis = new Set(trips.map((t) => t.chassis));
  const terminals = geofences.filter((g) => g.type === 'terminal');
  const driver = drivers.find((d) => d.id === f.driverId);
  const unit = tractors.find((u) => u.id === f.unitId);
  const lock = LOCKS.find((l) => l.id === f.lockId);

  const driverHelp = (() => {
    if (!driver) return null;
    const lic = daysUntil(driver.license.expiresOn, now);
    if (driver.status !== 'available') return { error: true, text: `En viaje ${driver.assignment?.tripId ?? ''}` };
    if (lic < 0) return { error: true, text: 'Licencia vencida' };
    return { error: false, text: `Licencia ${driver.license.kind.toLowerCase()} vigente · sin viaje activo` };
  })();
  const unitHelp = (() => {
    if (!unit) return null;
    if (unit.status === 'maintenance') return { error: true, text: 'En taller · no disponible' };
    if (unit.status === 'on_trip') return { error: true, text: `En viaje ${unit.currentTripId}` };
    if (unit.gps.signal === 'offline') return { error: true, text: 'Sin señal GPS' };
    return { error: false, text: `GPS en línea · en patio ${unit.base}` };
  })();

  const total = estimates.reduce((s, e) => s + e.minutes, 0);
  const totalKm = estimates.reduce((s, e) => s + (e.km ?? 0), 0);
  const etaClient = pickup ? pickup + ((estimates[0]?.minutes ?? 0) + (estimates[1]?.minutes ?? 0)) * 60_000 : null;

  // Drag & drop legs (handle only).
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [handleIdx, setHandleIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3.5 px-6 py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] text-muted">
            <Link to="/" className="hover:underline">
              Viajes
            </Link>{' '}
            / Nuevo viaje
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[18px] font-bold text-ink">Nuevo viaje</h1>
            <Chip tone="primary" mono>
              {folio} · folio automático
            </Chip>
            {tripDraft && <Chip tone="muted">Borrador guardado {fmtTime(tripDraft.savedAt)}</Chip>}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Captura el viaje y sus tramos. Al crearlo aparece en la Torre de control y empieza el monitoreo cuando el tracto sale del origen.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Popover
            align="right"
            panelClassName="w-[420px]"
            trigger={({ toggle }) => (
              <Button onClick={toggle}>
                Usar plantilla de ruta <ChevronDown size={13} />
              </Button>
            )}
          >
            {(close) => (
              <div className="flex flex-col">
                <p className="label-section px-2 pt-1 pb-1.5">Plantillas de ruta</p>
                {ROUTE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      applyTemplate(t.id);
                      close();
                    }}
                    className="rounded-[3px] px-2 py-2 text-left text-[12px] hover:bg-line-soft"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </Popover>
          <Button onClick={() => navigate('/')}>Cancelar</Button>
          <Button onClick={saveDraft}>Guardar borrador</Button>
          <Button variant="primary" disabled={errors.length > 0} onClick={create} title={errors.length ? `Falta resolver ${errors.length} ${errors.length === 1 ? 'punto' : 'puntos'}` : 'Crear el viaje'}>
            Crear viaje
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3.5">
        {/* Form */}
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <Card n={1} title="Datos generales" subtitle="Tipo de movimiento, cliente y referencias de la naviera">
            <div className="mb-3.5 flex items-start gap-4">
              <Field label="Tipo de movimiento" className="shrink-0">
                <Segmented
                  tone="light"
                  value={f.movement}
                  onChange={setMovement}
                  items={[
                    { key: 'IMP', label: 'Importación' },
                    { key: 'EXP', label: 'Exportación' },
                    { key: 'LOC', label: 'Reparto local' },
                  ]}
                />
              </Field>
              <Field label="Modalidad" className="shrink-0">
                <Segmented
                  tone="light"
                  value={f.modality}
                  onChange={setModality}
                  items={[
                    { key: 'single', label: 'Sencillo' },
                    { key: 'full', label: 'Full (2 contenedores)' },
                  ]}
                />
              </Field>
              <Field label="Cliente" required className="min-w-0 flex-1" error={touched.client && !f.clientId ? 'Requerido' : undefined}>
                <Select
                  value={f.clientId}
                  placeholder="Selecciona el cliente"
                  required
                  invalid={touched.client && !f.clientId}
                  onBlur={() => touch('client')}
                  onChange={(e) => setClient(e.target.value)}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-3.5">
              <Field label="BL / Booking" required error={touched.booking && !f.booking.trim() ? 'Requerido' : undefined}>
                <Input mono value={f.booking} invalid={touched.booking && !f.booking.trim()} onBlur={() => touch('booking')} onChange={(e) => set('booking', e.target.value.toUpperCase())} placeholder="MEDUMX0000000" />
              </Field>
              <Field label="Referencia del cliente">
                <Input value={f.clientRef} onChange={(e) => set('clientRef', e.target.value)} placeholder="OC-00000" />
              </Field>
              <Field label="Grupo de viaje" extra={<Chip tone="muted" className="text-[9px]">opcional</Chip>}>
                <Select mono value={f.groupId} onChange={(e) => set('groupId', e.target.value)} options={[{ value: '', label: 'Sin grupo' }, ...TRIP_GROUPS.map((g) => ({ value: g, label: g }))]} />
              </Field>
              <Field label="Cita de retiro en terminal" required error={touched.pickup && !f.pickupAt ? 'Requerido' : undefined}>
                <Input type="datetime-local" value={f.pickupAt} invalid={touched.pickup && !f.pickupAt} onBlur={() => touch('pickup')} onChange={(e) => setPickup(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card
            n={2}
            title="Contenedor"
            subtitle="Se valida el dígito de control ISO 6346"
            right={
              freeDays !== null && (
                <Chip tone={freeDays < 0 ? 'crit' : freeDays <= 2 ? 'warn' : 'ok'}>
                  {freeDays < 0 ? `Días libres: demora ${-freeDays} d` : `Días libres: ${freeDays} restantes`}
                </Chip>
              )
            }
          >
            <div className="grid grid-cols-4 gap-x-3 gap-y-3.5">
              {f.containers.map((c, i) => {
                const v = c.number.trim() ? validateContainer(c.number) : null;
                const err = containerError(c);
                const sealErr = (touched[`seal${i}`] || (v?.ok ?? false)) && !c.seal.trim();
                const suffix = f.containers.length > 1 ? ` ${i + 1}` : '';
                return (
                  <ContainerRow key={i}>
                    <Field
                      label={`Número de contenedor${suffix}`}
                      required
                      error={err ?? undefined}
                      help={v?.ok ? `Dígito de control válido · ${shippingLineFor(c.number)}` : 'Ej. MSKU7731403'}
                    >
                      <Input
                        mono
                        value={c.number}
                        maxLength={11}
                        invalid={Boolean(err)}
                        valid={v?.ok}
                        trailing={v?.ok ? <Check size={14} className="text-ok-text" /> : undefined}
                        onChange={(e) => setContainer(i, { number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        placeholder="MSKU0000000"
                      />
                    </Field>
                    <Field label="Tipo" required>
                      <Select value={c.isoType} onChange={(e) => setContainer(i, { isoType: e.target.value as '20DC' })} options={['20DC', '40HC', '40RF'].map((t) => ({ value: t, label: t }))} />
                    </Field>
                    <Field label={`Sello${suffix}`} required error={sealErr ? 'Requerido para salir de terminal' : undefined}>
                      <Input mono value={c.seal} invalid={sealErr} onBlur={() => touch(`seal${i}`)} onChange={(e) => setContainer(i, { seal: e.target.value.toUpperCase() })} placeholder="CMX000000" />
                    </Field>
                    {i === 0 ? (
                      <Field label="Peso bruto (kg)">
                        <Input mono value={f.grossWeightKg} onChange={(e) => set('grossWeightKg', e.target.value.replace(/[^\d]/g, '') ? fmtNumber(Number(e.target.value.replace(/[^\d]/g, ''))) : '')} placeholder="24,800" />
                      </Field>
                    ) : (
                      <div />
                    )}
                  </ContainerRow>
                );
              })}
              <Field label="Naviera">
                <Select value={f.shippingLine} placeholder="Selecciona" onChange={(e) => set('shippingLine', e.target.value)} options={SHIPPING_LINES.map((s) => ({ value: s, label: s }))} />
              </Field>
              <Field label="Terminal de retiro">
                <Select value={f.terminalId} placeholder="Selecciona" onChange={(e) => set('terminalId', e.target.value)} options={terminals.map((t) => ({ value: t.id, label: t.name.split(' · ')[0] }))} />
              </Field>
              <Field label="Fin de días libres" help="Se generará alerta R-07 un día antes">
                <Input type="date" value={f.freeDaysEnd} onChange={(e) => set('freeDaysEnd', e.target.value)} />
              </Field>
              <Field label="Carga">
                <Select value={f.cargo} onChange={(e) => set('cargo', e.target.value)} options={CARGO_TYPES.map((c) => ({ value: c, label: c }))} />
              </Field>
            </div>
          </Card>

          <Card
            n={3}
            title="Ruta y tramos"
            subtitle="Cada tramo usa geocercas de origen y destino; el tramo actual se muestra en la torre"
            right={
              <Button icon={<Plus size={14} />} onClick={() => set('legs', [...f.legs, newLeg(f.movement === 'EXP' ? 'terminal_delivery' : 'empty_return')])}>
                Agregar parada
              </Button>
            }
          >
            <div className="flex flex-col gap-2">
              <div className={LEG_GRID}>
                {['#', 'Tramo', 'Geocerca', 'Cita / ventana', 'Tiempo estimado', ''].map((h) => (
                  <span key={h} className="text-[9px] font-semibold tracking-[0.54px] text-muted uppercase">
                    {h}
                  </span>
                ))}
              </div>
              {f.legs.map((l, i) => (
                <div
                  key={l.id}
                  className={clsx(LEG_GRID, 'rounded-[4px]', dragFrom === i && 'bg-primary-soft opacity-60')}
                  draggable={handleIdx === i}
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null && dragFrom !== i) {
                      const legs = [...f.legs];
                      const [m] = legs.splice(dragFrom, 1);
                      legs.splice(i, 0, m);
                      set('legs', legs);
                    }
                    setDragFrom(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setHandleIdx(null);
                  }}
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-white">{i + 1}</span>
                  <Select value={l.kind} onChange={(e) => setLeg(i, { kind: e.target.value as LegKind })} options={LEG_KINDS.map((k) => ({ value: k, label: legLabel(k) }))} />
                  <div className="relative">
                    <Crosshair size={12} className="pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 text-faint" />
                    <Select
                      className="[&_select]:pl-7"
                      value={l.geofenceId}
                      placeholder="Elige la geocerca"
                      onChange={(e) => setLeg(i, { geofenceId: e.target.value })}
                      options={geofences.filter((g) => g.type !== 'avoid_zone').map((g) => ({ value: g.id, label: `${g.name.split(' · ')[0]} · ${g.locationLabel}` }))}
                    />
                  </div>
                  <Input leading={<Clock3 size={12} />} value={l.window} onChange={(e) => setLeg(i, { window: e.target.value })} placeholder={i === 0 ? '27 oct · 07:30 h' : 'Ventana o límite'} />
                  <span className="text-[11px] text-body">{estimates[i]?.text}</span>
                  <span className="flex items-center gap-1">
                    <span
                      onMouseDown={() => setHandleIdx(i)}
                      onMouseUp={() => setHandleIdx(null)}
                      className="cursor-grab text-input active:cursor-grabbing"
                      title="Arrastra para reordenar"
                    >
                      <GripVertical size={15} />
                    </span>
                    {f.legs.length > 2 && (
                      <button type="button" aria-label="Quitar tramo" onClick={() => set('legs', f.legs.filter((_, j) => j !== i))} className="text-faint hover:text-crit">
                        <X size={14} />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {crossings.map((c) => (
              <InfoBanner key={`${c.legIndex}-${c.zone.id}`} tone="warn" className="mt-3">
                El tramo {c.legIndex + 1} cruza la zona de riesgo “{c.zone.name}”. Se sugiere custodia o salida antes de las 18:00 h.
              </InfoBanner>
            ))}
          </Card>

          <Card n={4} title="Asignación" subtitle="Operador, unidad y seguridad del viaje">
            <div className="grid grid-cols-4 gap-x-3 gap-y-3.5">
              <Field label="Operador" required error={driverHelp?.error ? driverHelp.text : undefined} help={driverHelp && !driverHelp.error ? driverHelp.text : undefined}>
                <Select
                  value={f.driverId}
                  placeholder="Selecciona"
                  invalid={driverHelp?.error}
                  onChange={(e) => set('driverId', e.target.value)}
                  options={drivers.map((d) => ({ value: d.id, label: `${crewName(d)}${d.status !== 'available' ? ' (en viaje)' : ''}` }))}
                />
              </Field>
              <Field label="Tracto (desde GPS)" required error={unitHelp?.error ? unitHelp.text : undefined} help={unitHelp && !unitHelp.error ? unitHelp.text : undefined}>
                <Select
                  mono
                  value={f.unitId}
                  placeholder="Selecciona"
                  invalid={unitHelp?.error}
                  onChange={(e) => set('unitId', e.target.value)}
                  options={tractors.map((u) => ({
                    value: u.id,
                    label: `${u.economic} · ${u.plate}${u.status === 'maintenance' ? ' (taller)' : u.status === 'on_trip' ? ' (en viaje)' : ''}`,
                  }))}
                />
              </Field>
              <Field label="Remolque / chasis" required>
                <Select
                  value={f.chassis}
                  placeholder="Selecciona"
                  onChange={(e) => set('chassis', e.target.value)}
                  options={CHASSIS.map((c) => ({ value: c, label: `${c}${usedChassis.has(c) ? ' (en uso)' : ''}`, disabled: usedChassis.has(c) }))}
                />
              </Field>
              <Field label="Candado" help={lock ? `Batería ${lock.batteryPct} % · cerrado` : undefined}>
                <Select
                  mono
                  value={f.lockId}
                  onChange={(e) => set('lockId', e.target.value)}
                  options={[{ value: '', label: 'Sin candado' }, ...LOCKS.map((l) => ({ value: l.id, label: `${l.id} · ${l.batteryPct} %` }))]}
                />
              </Field>
              <div className="flex items-center">
                <Toggle
                  color="primary"
                  checked={f.escortRequired}
                  onChange={toggleEscort}
                  label="Requiere custodia"
                  description={f.escortRequired ? (crossings[0] ? `Por zona de riesgo del tramo ${crossings[0].legIndex + 1}` : 'Custodia en todo el viaje') : 'Sin custodia'}
                />
              </div>
              <Field label="Custodio" className="col-span-2">
                <Select
                  value={f.escortId}
                  placeholder="Por asignar"
                  disabled={!f.escortRequired}
                  onChange={(e) => set('escortId', e.target.value)}
                  options={[
                    { value: 'prov:Protección Bajío', label: 'Protección Bajío · por asignar' },
                    { value: 'prov:Custodias del Pacífico', label: 'Custodias del Pacífico · por asignar' },
                    ...escorts.map((e) => ({ value: e.id, label: `${crewName(e)} · ${e.provider}${e.status !== 'available' ? ' (en servicio)' : ''}`, disabled: e.status !== 'available' })),
                  ]}
                />
              </Field>
              <Field label="Tramos con custodia">
                <Select
                  value={f.escortLegs}
                  disabled={!f.escortRequired}
                  onChange={(e) => set('escortLegs', e.target.value)}
                  options={[{ value: 'all', label: 'Todos los tramos' }, ...f.legs.map((_, i) => ({ value: String(i + 1), label: `Tramo ${i + 1}` }))]}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="flex w-[448px] shrink-0 flex-col gap-3.5">
          <section className="overflow-hidden rounded-md border border-line bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[13px] font-semibold">Vista previa de ruta</h2>
              <span className="font-mono text-[11px] text-muted">
                {fmtNumber(totalKm)} km · {f.legs.length} tramos
              </span>
            </div>
            <RoutePreview form={f} estimates={estimates} />
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <Stat label="Distancia" value={`${fmtNumber(totalKm)} km`} />
              <Stat label="Tiempo total" value={total ? fmtDuration(total, true) : '—'} />
              <Stat label="ETA a cliente" value={etaClient ? `${fmtDate(etaClient)} ${fmtTime(etaClient)} h` : '—'} />
            </div>
          </section>

          <Card n={5} title="Validación antes de crear" subtitle="Lo que falta para que el viaje entre a la torre">
            <ul className="flex flex-col gap-2">
              {checks.map((c, i) => (
                <CheckRow key={i} check={c} />
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-muted">“Crear viaje” se habilita cuando no hay errores. Las advertencias se registran en la bitácora del viaje.</p>
          </Card>

          <Card n={6} title="Seguimiento y alertas">
            <Toggle color="primary" checked={f.shareLink} onChange={(v) => set('shareLink', v)} label="Compartir link público con el cliente" description="Se envía por WhatsApp y correo al crear el viaje" />
            {f.shareLink && <Contacts contacts={f.contacts} onChange={(c) => set('contacts', c)} />}
            <p className="mt-4 text-[11px] text-body">Reglas de alerta que aplican</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ruleChips.map(({ rule, label }) => (
                <Chip key={rule.id} tone={rule.active ? 'primary' : 'muted'} mono className="text-[10px]">
                  {label}
                  {!rule.active && ' · inactiva'}
                </Chip>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] text-muted">Heredadas de Admin → Reglas de alertas según cliente y tipo de movimiento.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContainerRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Card({ n, title, subtitle, right, children }: { n: number; title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white">
      <div className="flex items-start gap-3 border-b border-line-soft px-4 py-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className="font-mono text-[12px] font-bold text-ink">{value}</p>
    </div>
  );
}

function CheckRow({ check }: { check: CheckItem }) {
  const style =
    check.level === 'ok'
      ? { box: 'bg-ok-bg text-ok-text', icon: <Check size={11} strokeWidth={3} /> }
      : check.level === 'warn'
        ? { box: 'bg-med-bg text-med', icon: <span className="text-[11px] font-bold">!</span> }
        : { box: 'bg-crit-bg text-crit', icon: <X size={11} strokeWidth={3} /> };
  return (
    <li className="flex items-center gap-2.5 text-[12px]">
      <span className={clsx('flex size-[18px] shrink-0 items-center justify-center rounded-full', style.box)}>{style.icon}</span>
      <span className={check.level === 'error' ? 'text-crit' : 'text-body'}>{check.text}</span>
    </li>
  );
}

function Contacts({ contacts, onChange }: { contacts: string[]; onChange: (c: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const add = () => {
    if (value.trim()) onChange([...contacts, value.trim()]);
    setValue('');
    setAdding(false);
  };
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[38px]">
      {contacts.map((c) => (
        <span key={c} className="flex items-center gap-1 rounded-[3px] bg-line-soft px-1.5 py-0.5 text-[10px] text-body">
          {c}
          <button type="button" aria-label={`Quitar ${c}`} onClick={() => onChange(contacts.filter((x) => x !== c))} className="text-faint hover:text-crit">
            <X size={10} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
            if (e.key === 'Escape') setAdding(false);
          }}
          placeholder="correo o teléfono"
          className="h-6 w-[170px] rounded-[3px] border border-input px-1.5 text-[11px] focus:border-primary focus:outline-none"
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-[11px] font-medium text-primary hover:underline">
          + contacto
        </button>
      )}
    </div>
  );
}

function numberIcon(n: number, tone: 'navy' | 'green' | 'ring') {
  const style =
    tone === 'green'
      ? 'background:#047857;color:#fff'
      : tone === 'ring'
        ? 'background:#fff;color:#1e3a5f;border:2px solid #1e3a5f'
        : 'background:#1e3a5f;color:#fff';
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="${style};width:20px;height:20px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:700 10px var(--font-mono);box-shadow:0 1px 3px rgba(0,0,0,.3)">${n}</div>`,
  });
}

function RoutePreview({ form, estimates }: { form: NewTripForm; estimates: ReturnType<typeof estimateLegs> }) {
  const geofences = useStore((s) => s.geofences);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const points = form.legs.map((l) => geofences.find((g) => g.id === l.geofenceId)).map((g) => (g ? centerOf(g) : null));
  const key = form.legs.map((l) => l.geofenceId).join('|');
  const lastKey = useRef('');

  useEffect(() => {
    if (!map || key === lastKey.current) return;
    lastKey.current = key;
    const pts = [...estimates.flatMap((e) => e.path ?? []), ...points.filter((p): p is [number, number] => Boolean(p))];
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] });
    else if (pts.length === 1) map.setView(pts[0], 10);
  }, [map, key, estimates, points]);

  return (
    <div className="relative isolate h-[220px] border-y border-line-soft">
      <BaseMap onReady={setMap} zoom={7}>
        <RiskZonesLayer />
        {estimates.map((e, i) =>
          e.path ? (
            <Polyline
              key={i}
              positions={e.path}
              pathOptions={
                i === estimates.length - 1 && i > 1
                  ? { color: '#6b7280', weight: 3, dashArray: '5 5' }
                  : { color: '#1e3a5f', weight: 4, opacity: 0.9, dashArray: e.approx ? '2 6' : undefined }
              }
            />
          ) : null,
        )}
        {points.map((p, i) =>
          p ? <Marker key={i} position={p} icon={numberIcon(i + 1, form.legs[i].kind === 'client_delivery' || form.legs[i].kind === 'client_loading' ? 'green' : i === form.legs.length - 1 && i > 1 ? 'ring' : 'navy')} /> : null,
        )}
      </BaseMap>
      {points.every((p) => !p) && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/70 text-[11px] text-muted">
          Elige geocercas en “Ruta y tramos” o usa una plantilla
        </div>
      )}
      {estimates.some((e) => e.approx) && (
        <span className="absolute bottom-1.5 left-2 z-[500] flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-med">
          <AlertTriangle size={10} /> Ruta aproximada en tramos sin ruta guardada
        </span>
      )}
    </div>
  );
}
