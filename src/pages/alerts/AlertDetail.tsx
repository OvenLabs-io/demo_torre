import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Marker } from 'react-leaflet';
import { Check, ChevronDown, MapPin, NotebookPen, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { Alert } from '@/types/domain';
import { useCurrentUser, useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { fmtDate, fmtDuration, fmtTime, fmtTimeH } from '@/lib/format';
import { haversine } from '@/lib/geo';
import { SEVERITY_LABEL, SEVERITY_STYLE } from '@/lib/severity';
import { alertSteps, slaState, userName } from '@/lib/alerts';
import { movementTag } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';
import { fmtSla } from '@/mocks/rules';
import { CLOSE_REASONS } from '@/mocks/alerts';
import { BaseMap } from '@/components/map/BaseMap';
import { GeofenceLayer } from '@/components/map/layers';
import { unitIcon, unitState } from '@/components/map/unitIcon';
import { Button } from '@/components/ui/Button';
import { useDismiss } from '@/components/ui/Popover';
import { useTripModal } from '@/components/trip/useTripModal';

const BAND: Record<Alert['severity'], string> = {
  critical: 'bg-crit-bg',
  high: 'bg-high-bg',
  medium: 'bg-med-bg',
  low: 'bg-line-soft',
};

export function AlertDetail({ alert: a }: { alert: Alert }) {
  const now = useNow();
  const { open: openTrip } = useTripModal();
  const trip = useStore((s) => s.trips.find((t) => t.id === a.tripId));
  const unit = useStore((s) => s.units.find((u) => u.id === (trip?.unitId ?? a.unitId)));
  const driver = useStore((s) => s.crew.find((c) => c.id === (trip?.driverId ?? a.crewId)));
  const client = useStore((s) => s.clients.find((c) => c.id === trip?.clientId));
  const rules = useStore((s) => s.rules);
  const users = useStore((s) => s.users);
  const rule = rules.find((r) => r.id === a.ruleId);
  const sla = slaState(a, now);
  const closed = a.status === 'closed';

  const fields: [string, React.ReactNode][] = [];
  if (a.tripId) {
    fields.push([
      'Viaje',
      trip ? (
        <button type="button" onClick={() => openTrip(trip.id)} className="font-mono text-primary hover:underline">
          {[trip.id, movementTag(trip)].filter(Boolean).join(' · ')}
        </button>
      ) : (
        <span className="font-mono">{a.tripId} · cerrado</span>
      ),
    ]);
  }
  if (unit) fields.push(['Tracto', <span className="font-mono">{unit.economic} · {unit.plate}</span>]);
  if (driver) fields.push(['Operador', `${crewName(driver)} · ${driver.phone}`]);
  if (client) fields.push(['Cliente', client.name]);
  if (trip?.live.stoppedSince && trip.live.speedKmh === 0) {
    fields.push(['Detenida desde', <span className="font-mono">{fmtTimeH(trip.live.stoppedSince)} · {fmtDuration((now - trip.live.stoppedSince) / 60_000)}</span>]);
  } else if (trip) {
    fields.push(['Velocidad', <span className="font-mono">{trip.live.speedKmh} km/h</span>]);
  }
  if (!a.tripId && driver) {
    fields.push(['Licencia', `${driver.license.kind} · ${driver.license.number}`]);
    fields.push(['Vence', <span className="font-mono">{fmtDate(driver.license.expiresOn, true)}</span>]);
    if (driver.medicalExpiresOn) fields.push(['Apto médico', <span className="font-mono">{fmtDate(driver.medicalExpiresOn, true)}</span>]);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Band */}
      <div className={clsx('shrink-0 border-b border-line px-4 py-3', BAND[a.severity])}>
        <div className="flex items-center gap-2.5">
          <span className={clsx('rounded-[3px] px-1.5 py-px text-[11px] font-bold tracking-[0.5px] text-white uppercase', SEVERITY_STYLE[a.severity].dot)}>
            {SEVERITY_LABEL[a.severity]}
          </span>
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-ink">{a.headline ?? a.title}</h2>
          <span className={clsx('font-mono text-[13px] font-bold whitespace-nowrap', closed ? 'text-ok-text' : sla.overdue ? 'text-crit' : 'text-body')}>
            {closed
              ? `Cerrada ${fmtTimeH(a.closure!.at)} · ${a.closure!.reason}`
              : sla.overdue
                ? `SLA vencido · ${sla.elapsedMin} min abierta`
                : `SLA ${fmtSla(a.slaMinutes)} · quedan ${a.slaMinutes - sla.elapsedMin} min`}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-7 gap-y-2">
          {fields.length === 0 && <Field label="Contexto" value={a.context} />}
          {fields.map(([label, value]) => (
            <Field key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {/* Context map */}
      <AlertMap alert={a} />

      {/* Protocol + sidebar */}
      <div className="flex min-h-0 flex-1">
        <ProtocolPanel alert={a} />
        <aside className="scrollbar-thin w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface-alt px-4 py-3.5">
          <Assignee alert={a} />
          <p className="label-section mt-5">Línea de tiempo</p>
          <ol className="mt-2 flex flex-col gap-2">
            {[...a.timeline]
              .sort((x, y) => y.at - x.at)
              .map((e, i) => (
                <li key={i} className="flex gap-2.5 text-[13px]">
                  <span className="w-9 shrink-0 font-mono text-[12px] text-muted">{fmtTime(e.at)}</span>
                  <span className="text-body">{e.text}</span>
                </li>
              ))}
          </ol>
          {rule && (
            <>
              <p className="label-section mt-5">Regla que la generó</p>
              <p className="mt-1.5 text-[13px] text-body">
                <Link to="/admin/reglas" className="font-mono font-bold text-primary hover:underline">
                  {rule.id}
                </Link>{' '}
                · {rule.name} · {SEVERITY_LABEL[rule.severity]} · SLA {fmtSla(rule.slaMinutes)}
              </p>
              <p className="mt-1 text-[12px] text-muted">{rule.conditionText}</p>
            </>
          )}
          {closed && a.closure && (
            <>
              <p className="label-section mt-5">Cierre</p>
              <p className="mt-1.5 text-[13px] text-body">
                {a.closure.reason} · {userName(users, a.closure.byUserId)} · {fmtTimeH(a.closure.at)}
              </p>
              {a.closure.comment && <p className="mt-1 text-[13px] text-muted">“{a.closure.comment}”</p>}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-muted uppercase">{label}</p>
      <div className="mt-0.5 text-[14px] text-ink">{value}</div>
    </div>
  );
}

function AlertMap({ alert: a }: { alert: Alert }) {
  const trips = useStore((s) => s.trips);
  const units = useStore((s) => s.units);
  const geofences = useStore((s) => s.geofences);
  const loc = a.location;
  const nearby = useMemo(() => (loc ? trips.filter((t) => haversine(t.live.position, loc.position) < 40_000 || t.id === a.tripId) : []), [trips, loc, a.tripId]);

  if (!loc) {
    return (
      <div className="flex h-[120px] shrink-0 items-center justify-center gap-2 border-b border-line bg-surface-alt text-[13px] text-muted">
        <MapPin size={14} className="text-faint" />
        Esta alerta no tiene ubicación (vigencia de documentos).
      </div>
    );
  }

  return (
    <div className="relative isolate h-[220px] shrink-0 border-b border-line">
      <BaseMap center={loc.position} zoom={11}>
        <GeofenceLayer geofences={geofences} />
        {nearby.map((t) => {
          const state = unitState(t);
          const label = units.find((u) => u.id === t.unitId)?.economic ?? t.unitId;
          return (
            <Marker
              key={t.id}
              position={t.live.position}
              zIndexOffset={t.id === a.tripId ? 800 : 0}
              icon={unitIcon({
                state,
                heading: t.live.heading,
                label,
                speedText: state === 'nosignal' ? 'sin señal' : `${t.live.speedKmh} km/h`,
                selected: t.id === a.tripId,
                showChip: true,
              })}
            />
          );
        })}
      </BaseMap>
      <div className="absolute top-2.5 left-2.5 z-[500] flex max-w-[70%] items-center gap-1.5 rounded-[4px] border border-line bg-white px-2.5 py-1.5 text-[13px] text-body shadow-sm">
        <MapPin size={13} className="shrink-0 text-crit/60" />
        <span className="truncate">
          {loc.label}
          {loc.detail ? ` · ${loc.detail}` : ''}
        </span>
      </div>
    </div>
  );
}

function ProtocolPanel({ alert: a }: { alert: Alert }) {
  const rules = useStore((s) => s.rules);
  const protocols = useStore((s) => s.protocols);
  const driver = useStore((s) => s.crew.find((c) => c.id === (s.trips.find((t) => t.id === a.tripId)?.driverId ?? a.crewId)));
  const { completeAlertStep, addAlertAction } = useStore();
  const { protocol, steps } = alertSteps(a, rules, protocols);
  const done = steps.filter((s) => s.done).length;
  const firstPending = steps.find((s) => !s.done);
  const closed = a.status === 'closed';
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');

  const saveNote = () => {
    if (!note.trim()) return;
    addAlertAction(a.id, note.trim());
    setNote('');
    setNoting(false);
    toast.success('Acción registrada', { description: a.tripId ? 'También quedó en la bitácora del viaje.' : undefined });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
        <div className="flex items-center justify-between">
          <p className="label-section">Protocolo de atención{protocol ? ` · ${protocol.name}` : ''}</p>
          {protocol && (
            <span className="text-[13px] text-muted">
              {done} de {steps.length} completados
            </span>
          )}
        </div>
        {!protocol && (
          <p className="mt-3 rounded-[4px] bg-surface-alt px-3 py-3 text-[13px] text-muted">
            La regla {a.ruleId} no tiene protocolo asignado. Registra la acción tomada y cierra con motivo.
          </p>
        )}
        <ol className="mt-2.5 flex flex-col gap-2">
          {steps.map((s) => (
            <li
              key={s.stepId}
              className={clsx('flex items-center gap-3 rounded-[5px] border px-3 py-2.5', s.done ? 'border-line-soft bg-surface-alt' : 'border-line bg-white')}
            >
              {s.done ? (
                <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ok text-white">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : (
                <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border border-faint bg-white font-mono text-[13px] text-body">
                  {s.index}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={clsx('text-[14px]', s.done ? 'text-muted' : 'font-medium text-ink')}>{s.step?.title ?? `Paso ${s.index}`}</p>
                <p className="text-[12px] text-muted">
                  {s.done
                    ? `Hecho · ${fmtTime(s.doneAt!)}${s.note ? ` · ${s.note}` : ''}`
                    : `Pendiente${s.step?.sendsMessage ? ' · plantilla WhatsApp lista' : ''}${s.step ? ` · ${s.step.owner} · máx. ${s.step.maxMinutes} min` : ''}`}
                </p>
              </div>
              {!closed && firstPending?.stepId === s.stepId && (
                <Button
                  size="sm"
                  onClick={() => {
                    completeAlertStep(a.id, s.stepId);
                    if (s.step?.sendsMessage) toast.success('Mensaje enviado por WhatsApp', { description: 'Plantilla con ubicación y hora, al cliente y al jefe de tráfico.' });
                  }}
                >
                  Marcar hecho
                </Button>
              )}
            </li>
          ))}
        </ol>
        {noting && (
          <div className="mt-3 flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNote();
                if (e.key === 'Escape') setNoting(false);
              }}
              placeholder="¿Qué se hizo? (queda como evidencia)"
              className="h-[34px] min-w-0 flex-1 rounded-[4px] border border-input px-2.5 text-[14px] focus:border-primary focus:outline-none"
            />
            <Button variant="primary" onClick={saveNote} disabled={!note.trim()}>
              Guardar
            </Button>
          </div>
        )}
        {(a.actions?.length ?? 0) > 0 && (
          <p className="mt-2 text-[12px] text-muted">
            {a.actions!.length} {a.actions!.length === 1 ? 'acción registrada' : 'acciones registradas'} como evidencia
          </p>
        )}
      </div>

      {!closed && (
        <div className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5">
          <Button icon={<NotebookPen size={14} />} onClick={() => setNoting((v) => !v)}>
            Registrar acción
          </Button>
          <Button
            icon={<Phone size={14} />}
            disabled={!driver}
            onClick={() => driver && toast(`Llamando a ${crewName(driver)}…`, { description: `${driver.phone} · la llamada se registra en la línea de tiempo` })}
          >
            Llamar operador
          </Button>
          <div className="flex-1" />
          {/* "Escalar" se retiró hasta definir bien el flujo de escalamiento. */}
          <CloseMenu alert={a} />
        </div>
      )}
    </div>
  );
}

function CloseMenu({ alert: a }: { alert: Alert }) {
  const rules = useStore((s) => s.rules);
  const protocols = useStore((s) => s.protocols);
  const closeAlert = useStore((s) => s.closeAlert);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const ref = useDismiss(open, () => setOpen(false));
  const { protocol, steps } = alertSteps(a, rules, protocols);
  const hasEvidence = (a.actions?.length ?? 0) > 0 || steps.some((s) => s.done);

  const submit = () => {
    if (!reason) return setError('Elige un motivo de cierre.');
    if (protocol?.closure.requireEvidence && !hasEvidence) return setError('El protocolo exige al menos una evidencia: marca un paso o registra una acción.');
    closeAlert(a.id, reason, comment.trim() || undefined);
    setOpen(false);
    toast.success(`Alerta cerrada · ${reason}`, { description: a.context });
  };

  return (
    <div ref={ref} className="relative">
      <Button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Cerrar con motivo <ChevronDown size={13} />
      </Button>
      {open && (
        <div className="absolute right-0 bottom-full z-50 mb-1.5 w-[300px] rounded-[5px] border border-line bg-white p-3 shadow-pop">
          <p className="label-section">Motivo de cierre</p>
          <div className="mt-2 flex flex-col gap-1">
            {CLOSE_REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-[3px] px-1.5 py-1 text-[14px] hover:bg-line-soft">
                <input
                  type="radio"
                  name="close-reason"
                  checked={reason === r}
                  onChange={() => {
                    setReason(r);
                    setError('');
                  }}
                  className="accent-[var(--brand-primary)]"
                />
                {r}
              </label>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            rows={2}
            className="mt-2 w-full resize-none rounded-[4px] border border-input px-2 py-1.5 text-[14px] focus:border-primary focus:outline-none"
          />
          {error && <p className="mt-1.5 text-[12px] text-crit">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="primary" onClick={submit}>
              Cerrar alerta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Assignee({ alert: a }: { alert: Alert }) {
  const users = useStore((s) => s.users);
  const takeAlert = useStore((s) => s.takeAlert);
  const me = useCurrentUser();
  const user = users.find((u) => u.id === a.assigneeId);
  return (
    <>
      <p className="label-section">Atendida por</p>
      {user ? (
        <div className="mt-2 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">{user.initials}</span>
          <div>
            <p className="text-[14px] font-semibold text-ink">{user.name}</p>
            {a.takenAt && <p className="text-[12px] text-muted">Tomó la alerta {fmtTimeH(a.takenAt)}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[14px] text-muted">Sin asignar</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              takeAlert(a.id);
              toast.success('Alerta tomada', { description: `Quedó asignada a ${me.name}.` });
            }}
          >
            Tomar alerta
          </Button>
        </div>
      )}
    </>
  );
}
