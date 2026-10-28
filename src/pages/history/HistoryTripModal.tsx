import clsx from 'clsx';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { HistoryTrip } from '@/types/domain';
import { useCan, useCurrentUser, useStore } from '@/store/useStore';
import { fmtDateTime, fmtDuration, fmtMoney, fmtTimeH } from '@/lib/format';
import { buildPdf, downloadBlob, type PdfLine } from '@/lib/pdf';
import { TENANT_NAME } from '@/config/brand';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Chip';

const MOVEMENT: Record<string, string> = { IMP: 'Importación', EXP: 'Exportación', LOC: 'Reparto local' };

interface Milestone {
  at: number;
  text: string;
  tone: 'muted' | 'warn' | 'crit' | 'ok';
}

/** Key moments of a closed trip; trips closed in this session use their real bitácora. */
function milestones(h: HistoryTrip): Milestone[] {
  if (h.log?.length) {
    return [...h.log]
      .sort((a, b) => a.at - b.at)
      .map((e) => ({ at: e.at, text: e.title, tone: e.kind === 'alert' ? 'crit' : e.kind === 'incident' ? 'warn' : 'muted' }));
  }
  const out: Milestone[] = [{ at: h.startedAt, text: `Inicio del viaje · ${h.unitEconomic} · ${h.driverShort}`, tone: 'muted' }];
  if (h.terminal !== '—') {
    out.push({
      at: h.startedAt + 60 * 60_000,
      text: `Espera en ${h.terminal}: ${fmtDuration(h.terminalWaitMin, true)}${h.terminalWaitMin > 180 ? ' (excesiva)' : ''}`,
      tone: h.terminalWaitMin > 180 ? 'crit' : 'muted',
    });
  }
  if (h.incidents > 0) out.push({ at: h.startedAt + ((h.closedAt - h.startedAt) * 2) / 3, text: `${h.incidents} ${h.incidents === 1 ? 'incidencia registrada' : 'incidencias registradas'}`, tone: 'warn' });
  out.push({
    at: h.closedAt,
    text: h.status === 'cancelled' ? 'Viaje cancelado' : `Viaje cerrado${h.onTime ? ' · entrega a tiempo' : ' · entrega fuera de tiempo'}`,
    tone: h.status === 'cancelled' ? 'muted' : h.onTime ? 'ok' : 'warn',
  });
  return out;
}

const TONE_DOT: Record<Milestone['tone'], string> = { muted: 'bg-faint', warn: 'bg-high', crit: 'bg-crit', ok: 'bg-ok' };

export function HistoryTripModal({ trip: h, statusMeta, onClose }: { trip: HistoryTrip; statusMeta: { label: string; dot: string }; onClose: () => void }) {
  const client = useStore((s) => s.clients.find((c) => c.id === h.clientId));
  const user = useCurrentUser();
  const canExport = useCan('history', 'export');
  const events = milestones(h);

  const rows: [string, string][] = [
    ['Tipo', h.movement ? MOVEMENT[h.movement] : '—'],
    ['Cliente', client?.name ?? '—'],
    ['Contenedor', h.container],
    ['Terminal', h.terminal],
    ['Tracto · operador', `${h.unitEconomic} · ${h.driverShort}`],
    ['Inicio', fmtDateTime(h.startedAt)],
    ['Cierre', fmtDateTime(h.closedAt)],
    ['Duración', fmtDuration((h.closedAt - h.startedAt) / 60_000, true)],
    ['Espera en terminal', h.terminal === '—' ? '—' : fmtDuration(h.terminalWaitMin, true)],
    ['Incidencias', String(h.incidents)],
    ['Demora pagada a naviera', h.demurrageMxn ? fmtMoney(h.demurrageMxn) : 'Sin demora'],
    ['Entrega', h.status === 'cancelled' ? '—' : h.onTime ? 'A tiempo' : 'Fuera de tiempo'],
  ];

  const download = () => {
    const lines: PdfLine[] = [
      { text: `Resumen del viaje ${h.id}`, size: 18, bold: true },
      { text: `${TENANT_NAME} · ${statusMeta.label} · descargado el ${fmtDateTime(Date.now())} por ${user.name}`, size: 9, muted: true, gapBefore: 2 },
      { text: 'Datos del viaje', size: 12, bold: true, gapBefore: 14, rule: true },
      ...rows.map(([k, v], i) => ({ text: `${k}: ${v}`, gapBefore: i === 0 ? 2 : 0 })),
      { text: h.log?.length ? 'Bitácora' : 'Línea de tiempo', size: 12, bold: true, gapBefore: 14, rule: true },
      ...events.map((e) => ({ text: `${fmtDateTime(e.at)}   ${e.text}`, gapBefore: 3 })),
    ];
    downloadBlob(`viaje-${h.id}.pdf`, buildPdf(lines, `Viaje ${h.id}`));
    toast.success('Resumen descargado', { description: `viaje-${h.id}.pdf` });
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={860}
      title={
        <span className="flex items-center gap-3">
          <span className="font-mono">{h.id}</span>
          <span className="flex items-center gap-1.5 text-[14px] font-normal text-body">
            <Dot className={statusMeta.dot} />
            {statusMeta.label}
          </span>
        </span>
      }
      subtitle="Viaje cerrado · solo lectura"
      footer={
        <>
          <div className="flex-1" />
          <Button onClick={onClose}>Cerrar</Button>
          {canExport && (
            <Button variant="primary" icon={<Download size={15} />} onClick={download}>
              Descargar resumen
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <dl className="grid grid-cols-[150px_1fr] content-start gap-x-3 gap-y-2 text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className={clsx('text-ink', (k === 'Contenedor' || k === 'Inicio' || k === 'Cierre') && 'font-mono text-[13px]')}>{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="label-section">{h.log?.length ? `Bitácora (${h.log.length})` : 'Línea de tiempo'}</p>
          <ol className="mt-2 flex flex-col">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3 border-l-2 border-line-soft pb-3 pl-3 last:pb-0">
                <Dot className={clsx(TONE_DOT[e.tone], '-ml-[19px] mt-1.5 shrink-0 ring-2 ring-white')} size={10} />
                <div className="min-w-0">
                  <p className="font-mono text-[12px] text-muted">
                    {fmtDateTime(e.at).split(' ').slice(0, 2).join(' ')} · {fmtTimeH(e.at)}
                  </p>
                  <p className="text-[14px] text-ink">{e.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
