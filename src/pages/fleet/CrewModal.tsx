import { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CrewMember } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { crewName } from '@/mocks/crew';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Tabs';
import { Toggle } from '@/components/ui/Toggle';
import { DRIVER_LICENSES, PROVIDERS } from './fleetMeta';

const toDateInput = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromDateInput = (v: string) => (v ? new Date(`${v}T23:59`).getTime() : undefined);

/** "Federal tipo E" (form) ⇄ "Federal E" (table). */
const kindToShort = (k: string) => k.replace(' tipo ', ' ');
const shortToKind = (k: string) => DRIVER_LICENSES.find((l) => kindToShort(l) === k) ?? DRIVER_LICENSES[0];

/** "Agregar persona" (Figma 08m); also used to view/edit someone ("Ver"). */
export function CrewModal({
  member,
  role: fixedRole,
  readOnly,
  onClose,
}: {
  member: CrewMember | null;
  /** Usuarios → Operadores / Custodios opens the modal for one role. */
  role?: CrewMember['role'];
  readOnly?: boolean;
  onClose: () => void;
}) {
  const units = useStore((s) => s.units);
  const upsertCrew = useStore((s) => s.upsertCrew);
  const fileRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<CrewMember['role']>(member?.role ?? fixedRole ?? 'driver');
  const [firstName, setFirstName] = useState(member?.firstName ?? '');
  const [lastName, setLastName] = useState(member?.lastName ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [emergency, setEmergency] = useState(member?.emergencyPhone ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [licenseKind, setLicenseKind] = useState(member?.role === 'driver' ? shortToKind(member.license.kind) : DRIVER_LICENSES[0]);
  const [licenseNumber, setLicenseNumber] = useState(member?.license.number ?? '');
  const [licenseExp, setLicenseExp] = useState(toDateInput(member?.license.expiresOn));
  const [medicalExp, setMedicalExp] = useState(toDateInput(member?.medicalExpiresOn));
  const [curp, setCurp] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [base, setBase] = useState(member?.base ?? 'Manzanillo');
  const [usualUnit, setUsualUnit] = useState(member?.usualUnitId ?? '');
  const [provider, setProvider] = useState(member?.provider ?? 'Propio');
  const [invite, setInvite] = useState(member?.appInvited ?? true);
  const [error, setError] = useState('');
  const driver = role === 'driver';

  const save = () => {
    if (!firstName.trim() || !lastName.trim()) return setError('Escribe nombre y apellidos.');
    if (!phone.trim()) return setError('El teléfono es obligatorio: la torre lo usa para llamar.');
    if (!licenseNumber.trim()) return setError(driver ? 'Escribe el número de licencia.' : 'Escribe el número de credencial.');
    if (!licenseExp) return setError('Indica la vigencia del documento.');
    if (driver && !medicalExp) return setError('Indica la vigencia del apto médico.');
    const saved: CrewMember = {
      id: member?.id ?? `${driver ? 'op' : 'cu'}-${crypto.randomUUID().slice(0, 6)}`,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      emergencyPhone: emergency.trim() || undefined,
      email: email.trim() || undefined,
      license: {
        kind: driver ? kindToShort(licenseKind) : 'Credencial SSP',
        number: licenseNumber.trim().toUpperCase(),
        expiresOn: fromDateInput(licenseExp)!,
      },
      medicalExpiresOn: driver ? fromDateInput(medicalExp) : undefined,
      provider,
      base,
      usualUnitId: usualUnit || undefined,
      appInvited: invite,
      status: member?.status ?? 'available',
      assignment: member?.assignment,
    };
    upsertCrew(saved);
    toast.success(member ? `${crewName(saved)} actualizado` : `${crewName(saved)} agregado`, {
      description: !member && invite ? 'Invitación a la App del operador enviada por WhatsApp.' : undefined,
    });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={840}
      title={member ? crewName(member) : driver ? 'Agregar operador' : 'Agregar custodio'}
      subtitle="Las vigencias generan alertas R-10 al acercarse."
      footer={
        <>
          <span className="flex-1 text-[12px] text-crit">{error}</span>
          <Button onClick={onClose}>{readOnly ? 'Cerrar' : 'Cancelar'}</Button>
          {!readOnly && (
            <Button variant="primary" onClick={save}>
              {driver ? 'Guardar operador' : 'Guardar custodio'}
            </Button>
          )}
        </>
      }
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        {!fixedRole && (
          <Segmented<CrewMember['role']>
            value={role}
            onChange={setRole}
            className="w-fit"
            items={[
              { key: 'driver', label: 'Operador' },
              { key: 'escort', label: 'Custodio' },
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre(s)" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" autoFocus />
          </Field>
          <Field label="Apellidos" required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos" />
          </Field>
          <Field label="Teléfono (para llamadas desde la torre)" required>
            <Input mono value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 312 000 0000" />
          </Field>
          <Field label="Teléfono de emergencia">
            <Input mono value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="+52" />
          </Field>
          <Field label="Correo (opcional)" className="col-span-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.mx" />
          </Field>
        </div>

        <div>
          <p className="label-section">Documentos</p>
          <div className="mt-2 grid grid-cols-4 gap-3">
            <Field label={driver ? 'Licencia' : 'Credencial'}>
              {driver ? (
                <Select value={licenseKind} onChange={(e) => setLicenseKind(e.target.value)} options={DRIVER_LICENSES.map((l) => ({ value: l, label: l }))} />
              ) : (
                <Input value="Credencial SSP" readOnly disabled />
              )}
            </Field>
            <Field label="Número" required>
              <Input mono value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={driver ? 'E-0000000' : 'C-00000'} />
            </Field>
            <Field label="Vigencia" required>
              <Input type="date" value={licenseExp} onChange={(e) => setLicenseExp(e.target.value)} />
            </Field>
            <Field label="Apto médico (vigencia)" required={driver}>
              <Input type="date" value={medicalExp} onChange={(e) => setMedicalExp(e.target.value)} disabled={!driver} />
            </Field>
            <Field label="CURP / RFC (opcional)" className="col-span-2">
              <Input mono value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Archivos" className="col-span-2">
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles((f) => [...f, ...[...(e.target.files ?? [])].map((x) => x.name)])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-[34px] items-center justify-center gap-2 rounded-[4px] border border-dashed border-input text-[13px] text-muted hover:bg-surface-alt"
              >
                <Upload size={13} /> Licencia, apto, INE…
              </button>
            </Field>
          </div>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={`${f}-${i}`} className="flex items-center gap-1 rounded-[3px] bg-line-soft px-1.5 py-0.5 text-[12px] text-body">
                  <FileText size={11} className="text-faint" />
                  {f}
                  <button type="button" aria-label={`Quitar ${f}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-faint hover:text-crit">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="label-section">Operación</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Field label="Base">
              <Select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                options={[
                  { value: 'Manzanillo', label: 'Base Manzanillo' },
                  { value: 'Guadalajara', label: 'Base Guadalajara' },
                ]}
              />
            </Field>
            <Field label="Unidad habitual (opcional)">
              <Select
                mono
                value={usualUnit}
                onChange={(e) => setUsualUnit(e.target.value)}
                options={[{ value: '', label: 'Sin asignar' }, ...units.filter((u) => u.economic).map((u) => ({ value: u.id, label: `${u.economic} · ${u.plate}` }))]}
              />
            </Field>
            <Field label="Proveedor (si es externo)">
              <Select value={provider} onChange={(e) => setProvider(e.target.value)} options={PROVIDERS.map((p) => ({ value: p, label: p }))} />
            </Field>
          </div>
        </div>

        <div className="rounded-[5px] bg-surface-alt px-3 py-2.5">
          <Toggle
            checked={invite}
            onChange={setInvite}
            label="Enviar invitación a la App del operador"
            description="Por WhatsApp al teléfono principal · para EIR, eventos y botón de pánico"
          />
        </div>
      </fieldset>
    </Modal>
  );
}
