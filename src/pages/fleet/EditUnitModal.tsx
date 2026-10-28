import { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { Unit } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { fmtDate, fmtTime } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { SIGNAL_META } from './fleetMeta';

/** "Editar unidad" (Figma 07m): only económico, placa, base and notes are editable. */
export function EditUnitModal({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const units = useStore((s) => s.units);
  const updateUnit = useStore((s) => s.updateUnit);
  const [economic, setEconomic] = useState(unit.economic ?? '');
  const [plate, setPlate] = useState(unit.plate);
  const [base, setBase] = useState<string>(unit.base ?? '');
  const [notes, setNotes] = useState(unit.notes ?? '');
  const [error, setError] = useState('');
  const isNew = unit.status === 'new';

  const save = () => {
    const eco = economic.trim().toUpperCase();
    if (!eco) return setError('El número económico es obligatorio.');
    if (units.some((u) => u.id !== unit.id && u.economic === eco)) return setError(`El económico ${eco} ya está asignado a otra unidad.`);
    if (!plate.trim()) return setError('La placa es obligatoria.');
    if (!base) return setError('Elige la base de la unidad.');
    updateUnit(unit.id, {
      economic: eco,
      plate: plate.trim().toUpperCase(),
      base: base as Unit['base'],
      notes: notes.trim() || undefined,
      status: isNew ? 'available' : unit.status,
    });
    toast.success(isNew ? `Unidad ${eco} lista para asignar` : `Unidad ${eco} actualizada`, { description: `${plate.toUpperCase()} · base ${base}` });
    onClose();
  };

  const lastSignal = `${fmtDate(unit.gps.lastSignalAt) === fmtDate(Date.now()) ? 'Hoy' : fmtDate(unit.gps.lastSignalAt)} ${fmtTime(unit.gps.lastSignalAt)} · ${SIGNAL_META[unit.gps.signal].label.toLowerCase()}`;

  return (
    <Modal
      open
      onClose={onClose}
      width={620}
      title={isNew ? `Completar datos · ${unit.plate}` : `Editar unidad · ${unit.economic}`}
      subtitle="Los demás datos vienen del proveedor GPS y no se editan aquí"
      footer={
        <>
          <span className="flex-1 text-[12px] text-crit">{error}</span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Número económico" required>
            <Input mono value={economic} onChange={(e) => setEconomic(e.target.value.toUpperCase())} placeholder="T-116" autoFocus={isNew} />
          </Field>
          <Field label="Placa" required>
            <Input mono value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Base" required>
            <Select
              value={base}
              placeholder="Selecciona"
              onChange={(e) => setBase(e.target.value)}
              options={[
                { value: 'Manzanillo', label: 'Base Manzanillo' },
                { value: 'Guadalajara', label: 'Base Guadalajara' },
              ]}
            />
          </Field>
        </div>

        <div className="rounded-[5px] border border-line bg-surface-alt p-3">
          <p className="label-section">Datos del GPS (solo lectura)</p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            <ReadOnly label="Proveedor / ID" value={`${unit.gps.provider} · ${unit.gps.deviceId}`} />
            <ReadOnly label="Marca / modelo" value={unit.model} />
            <ReadOnly label="VIN" value={unit.vin} mono />
            <ReadOnly label="Última señal" value={lastSignal} />
          </div>
          <p className="mt-2.5 text-[12px] text-muted">Para corregir estos datos hay que hacerlo en la plataforma GPS; se reflejan en la siguiente sincronización.</p>
        </div>

        <Field label="Notas internas">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. asignada al grupo BAJÍO · revisión de frenos pendiente" />
        </Field>
      </div>
    </Modal>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Field label={label}>
      <Input value={value} readOnly disabled mono={mono} trailing={<Lock size={12} className="text-faint" />} />
    </Field>
  );
}
