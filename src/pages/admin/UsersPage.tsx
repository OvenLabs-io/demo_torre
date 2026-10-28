import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Action, Module, PermissionMatrix, RoleKey, User } from '@/types/domain';
import { useCan, useStore } from '@/store/useStore';
import { useNow } from '@/sim/clock';
import { fmtAgo, fmtTime } from '@/lib/format';
import { ACTIONS, MODULES, ROLES } from '@/mocks/users';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function lastAccess(u: User, now: number): string {
  if (!u.active || u.lastAccessAt === null) return 'Inactivo';
  const min = (now - u.lastAccessAt) / 60_000;
  if (min < 1) return 'Ahora';
  const d = new Date(u.lastAccessAt);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (d.toDateString() === today.toDateString()) return fmtAgo(u.lastAccessAt, now);
  if (d.toDateString() === yesterday.toDateString()) return `Ayer ${fmtTime(u.lastAccessAt)}`;
  return fmtAgo(u.lastAccessAt, now);
}

function diffCount(m: PermissionMatrix, base: PermissionMatrix): number {
  let n = 0;
  for (const { key } of MODULES) for (const { key: a } of ACTIONS) if (m[key][a] !== base[key][a]) n++;
  return n;
}

/** Usuarios → Torre de control: who uses the tower and what each one can see and do. */
export function TowerUsersPanel() {
  const users = useStore((s) => s.users);
  const updateUser = useStore((s) => s.updateUser);
  const addUser = useStore((s) => s.addUser);
  const canEdit = useCan('users', 'edit');
  const canCreate = useCan('users', 'create');
  const [adding, setAdding] = useState(false);
  const tripGroups = useStore((s) => s.tripGroups);
  const now = useNow();
  const [selectedId, setSelectedId] = useState('u-lgo');
  const [drafts, setDrafts] = useState<Record<string, User>>({});
  const [confirmToggle, setConfirmToggle] = useState(false);

  const saved = users.find((u) => u.id === selectedId)!;
  const user = drafts[selectedId] ?? saved;
  const base = ROLES[user.baseRole].permissions;
  const changes = diffCount(user.permissions, base);
  const dirty = Boolean(drafts[selectedId]) && JSON.stringify(drafts[selectedId]) !== JSON.stringify(saved);

  const edit = (fn: (u: User) => User) => setDrafts((d) => ({ ...d, [selectedId]: fn(structuredClone(user)) }));

  const setPerm = (mod: Module, action: Action, value: boolean) =>
    edit((u) => {
      const row = { ...u.permissions[mod], [action]: value };
      // Removing "Ver" disables the whole module; granting anything implies "Ver".
      if (action === 'view' && !value) for (const a of ACTIONS) row[a.key] = false;
      if (action !== 'view' && value) row.view = true;
      return { ...u, permissions: { ...u.permissions, [mod]: row } };
    });

  const toggleGroup = (g: string) =>
    edit((u) => {
      const groupIds = u.groupIds.includes(g) ? u.groupIds.filter((x) => x !== g) : [...u.groupIds, g];
      return { ...u, groupIds };
    });

  const save = () => {
    const next = { ...user, scopeLabel: user.groupIds.length ? `${user.groupIds.length} ${user.groupIds.length === 1 ? 'grupo' : 'grupos'}` : user.baseRole === 'account_exec' ? user.scopeLabel : 'Todo' };
    updateUser(user.id, next);
    setDrafts(({ [user.id]: _omit, ...rest }) => rest);
    toast.success('Permisos guardados', { description: `${user.name} · el cambio queda en la bitácora de auditoría.` });
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-[13px] text-muted">
          Permisos granulares por módulo (ver / crear / editar / eliminar / exportar) partiendo de un rol base, y alcance por grupo de viaje. Lo que un
          usuario no tiene permitido no le aparece en el menú ni en los botones.
        </p>
        {canCreate && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Agregar usuario
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3.5">
        {/* Users */}
        <div className="w-[720px] shrink-0 overflow-hidden rounded-md border border-line bg-white">
          <table className="w-full table-fixed border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="th w-[150px]">Usuario</th>
                <th className="th w-[170px]">Email</th>
                <th className="th w-[118px]">Rol base</th>
                <th className="th w-[80px]">Alcance</th>
                <th className="th">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const sel = u.id === selectedId;
                const d = drafts[u.id];
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className={clsx('h-11 cursor-pointer border-b border-line-soft', sel ? 'bg-line-soft' : 'hover:bg-surface-alt')}
                  >
                    <td className={clsx('truncate px-3', sel && 'border-l-[3px] border-l-primary pl-[9px]', u.active ? 'text-ink' : 'text-faint')}>
                      {u.name}
                      {d && JSON.stringify(d) !== JSON.stringify(u) && <span className="ml-1 text-[12px] text-high">·</span>}
                    </td>
                    <td className="truncate px-3 text-[13px] text-body">{u.email}</td>
                    <td className="truncate px-3 text-body">{ROLES[u.baseRole].label}</td>
                    <td className="truncate px-3 text-body">{u.scopeLabel}</td>
                    <td className={clsx('px-3 text-[13px] whitespace-nowrap', u.active ? 'text-body' : 'text-faint')}>{lastAccess(u, now)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className={clsx('flex size-8 items-center justify-center rounded-full text-[13px] font-bold text-white', user.active ? 'bg-primary' : 'bg-faint')}>{user.initials}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">{user.name}</p>
              <p className="text-[13px] text-muted">
                {user.email} · {user.active ? 'activo' : 'inactivo'}
                {user.shift ? ` · ${user.shift}` : ''}
              </p>
            </div>
            <span className="label-section">Rol base</span>
            <Select
              className="w-[200px]"
              value={user.baseRole}
              onChange={(e) => {
                const role = e.target.value as RoleKey;
                edit((u) => ({ ...u, baseRole: role, title: ROLES[role].label, permissions: structuredClone(ROLES[role].permissions) }));
              }}
              options={(Object.keys(ROLES) as RoleKey[]).map((k) => ({ value: k, label: ROLES[k].label }))}
            />
          </div>

          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <p className="label-section">Permisos por módulo</p>
              <span className={clsx('text-[13px]', changes ? 'text-high' : 'text-muted')}>
                {changes ? `Personalizado · ${changes} ${changes === 1 ? 'cambio' : 'cambios'} respecto al rol` : 'Igual al rol base'}
              </span>
              <div className="flex-1" />
              <Button size="sm" disabled={!changes} onClick={() => edit((u) => ({ ...u, permissions: structuredClone(base) }))}>
                Restaurar rol
              </Button>
            </div>

            <table className="mt-2.5 w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="th w-[280px]">Módulo</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="th text-center">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => {
                  const row = user.permissions[m.key];
                  return (
                    <tr key={m.key} className="h-9 border-b border-line-soft">
                      <td className="px-3 text-ink">{m.label}</td>
                      {ACTIONS.map((a) => (
                        <td key={a.key} className="text-center">
                          <span className="inline-flex">
                            <Checkbox
                              aria-label={`${m.label} · ${a.label}`}
                              checked={row[a.key]}
                              disabled={a.key !== 'view' && !row.view}
                              highlight={row[a.key] !== base[m.key][a.key]}
                              onChange={(v) => setPerm(m.key, a.key, v)}
                            />
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-muted">Marco naranja = difiere del rol base. Quitar "Ver" desactiva el resto del módulo.</p>

            <p className="label-section mt-5">Grupos de viaje que ve</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tripGroups.map((g) => {
                const on = user.groupIds.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGroup(g)}
                    className={clsx(
                      'h-7 rounded-[4px] border px-2.5 font-mono text-[13px] transition-colors',
                      on ? 'border-primary bg-primary text-white' : 'border-input bg-white text-body hover:bg-surface-alt',
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[12px] text-muted">
              {user.groupIds.length ? `Solo ve ${user.groupIds.length} ${user.groupIds.length === 1 ? 'grupo' : 'grupos'}.` : 'Ve todos los grupos.'} Sin selección = ve todos.
            </p>

            <p className="label-section mt-5">Notificaciones</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <Checkbox checked={user.notifications.criticalWhatsapp} onChange={(v) => edit((u) => ({ ...u, notifications: { ...u.notifications, criticalWhatsapp: v } }))} label="Alertas críticas por WhatsApp" />
              <Checkbox checked={user.notifications.highInApp} onChange={(v) => edit((u) => ({ ...u, notifications: { ...u.notifications, highInApp: v } }))} label="Alertas altas en la app" />
              <Checkbox checked={user.notifications.dailyEmail} onChange={(v) => edit((u) => ({ ...u, notifications: { ...u.notifications, dailyEmail: v } }))} label="Resumen diario por correo" />
            </div>
          </div>

          {canEdit && (
          <div className="flex items-center gap-2 border-t border-line bg-surface-alt px-4 py-2.5">
            <p className="flex-1 text-[13px] text-muted">Cambios quedan en bitácora de auditoría</p>
            <Button onClick={() => setConfirmToggle(true)} disabled={user.id === 'u-aru'} title={user.id === 'u-aru' ? 'No puedes desactivar tu propio usuario' : undefined}>
              {saved.active ? 'Desactivar usuario' : 'Reactivar usuario'}
            </Button>
            {dirty && (
              <Button onClick={() => setDrafts(({ [user.id]: _omit, ...rest }) => rest)}>Descartar</Button>
            )}
            <Button variant="primary" disabled={!dirty} onClick={save}>
              Guardar permisos
            </Button>
          </div>
          )}
        </div>
      </div>

      {adding && (
        <AddUserModal
          onClose={() => setAdding(false)}
          onSave={(u) => {
            addUser(u);
            setSelectedId(u.id);
            setAdding(false);
            toast.success('Usuario agregado', { description: `${u.name} · se le envió la invitación a ${u.email}` });
          }}
        />
      )}

      <ConfirmDialog
        open={confirmToggle}
        title={saved.active ? `Desactivar a ${saved.name}` : `Reactivar a ${saved.name}`}
        message={saved.active ? 'Ya no podrá entrar a la torre ni recibirá alertas. Puedes reactivarlo después.' : 'Podrá volver a entrar con sus permisos actuales.'}
        confirmLabel={saved.active ? 'Desactivar' : 'Reactivar'}
        danger={saved.active}
        onCancel={() => setConfirmToggle(false)}
        onConfirm={() => {
          updateUser(saved.id, { active: !saved.active, lastAccessAt: saved.active ? saved.lastAccessAt : Date.now() });
          setConfirmToggle(false);
          toast.success(saved.active ? 'Usuario desactivado' : 'Usuario reactivado', { description: saved.name });
        }}
      />
    </div>
  );
}

function AddUserModal({ onClose, onSave }: { onClose: () => void; onSave: (u: User) => void }) {
  const users = useStore((s) => s.users);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleKey>('monitor');
  const [tried, setTried] = useState(false);
  const cleanEmail = email.trim().toLowerCase();
  const errors = {
    name: !name.trim() ? 'Escribe el nombre completo' : null,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
      ? 'Escribe un correo válido'
      : users.some((u) => u.email === cleanEmail)
        ? 'Ya hay un usuario con ese correo'
        : null,
  };
  const save = () => {
    setTried(true);
    if (errors.name || errors.email) return;
    const words = name.trim().split(/\s+/);
    onSave({
      id: `u-${crypto.randomUUID().slice(0, 6)}`,
      name: name.trim(),
      initials: (words[0][0] + (words[words.length - 1][0] ?? '')).toUpperCase(),
      email: cleanEmail,
      title: ROLES[role].label,
      baseRole: role,
      permissions: structuredClone(ROLES[role].permissions),
      groupIds: [],
      scopeLabel: 'Todo',
      lastAccessAt: null,
      active: true,
      notifications: { criticalWhatsapp: role !== 'account_exec', highInApp: true, dailyEmail: false },
    });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Agregar usuario de la torre"
      subtitle="Recibe una invitación por correo. Sus permisos parten del rol base y los puedes ajustar después."
      width={520}
      footer={
        <>
          <div className="flex-1" />
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            Agregar usuario
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Nombre completo" required error={tried ? errors.name : undefined}>
          <Input autoFocus value={name} invalid={tried && Boolean(errors.name)} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" />
        </Field>
        <Field label="Correo" required error={tried ? errors.email : undefined}>
          <Input type="email" value={email} invalid={tried && Boolean(errors.email)} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.mx" />
        </Field>
        <Field label="Rol base" required>
          <Select value={role} onChange={(e) => setRole(e.target.value as RoleKey)} options={(Object.keys(ROLES) as RoleKey[]).map((k) => ({ value: k, label: ROLES[k].label }))} />
        </Field>
      </div>
    </Modal>
  );
}
