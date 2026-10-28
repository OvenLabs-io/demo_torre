import { describe, expect, it } from 'vitest';
import { buildTrip, emptyForm, newStop, toLocalInput, validate, type NewTripForm } from './newTrip';
import { UNITS } from '@/mocks/units';
import { CREW } from '@/mocks/crew';
import { GEOFENCES } from '@/mocks/geofences';
import { USERS } from '@/mocks/users';
import { TRIPS } from '@/mocks/trips';
import { trailersInUse } from '@/mocks/trailers';

const now = Date.now();
const H = 60 * 60_000;
const ctx = { units: UNITS, crew: CREW, geofences: GEOFENCES, usedIds: TRIPS.map((t) => t.id), trailersInUse: trailersInUse(TRIPS), now };
const available = UNITS.find((u) => u.status === 'available' && u.gps.signal !== 'offline')!;
const freeDriver = CREW.find((c) => c.role === 'driver' && c.status === 'available' && c.license.expiresOn > now + 20 * 86_400_000)!;

function valid(): NewTripForm {
  return {
    ...emptyForm(),
    unitId: available.id,
    driverName: `${freeDriver.firstName} ${freeDriver.lastName}`,
    departureId: 'gf-contecon',
    departureAt: toLocalInput(now + H),
    arrivalId: 'gf-empaques',
    arrivalAt: toLocalInput(now + 12 * H),
  };
}
const errors = (f: NewTripForm) => validate(f, ctx).filter((c) => c.level === 'error');

describe('Nuevo viaje · validación', () => {
  it('lists every required field on an empty form', () => {
    const fields = errors({ ...emptyForm(), carrier: '' }).map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(['unit', 'carrier', 'driver', 'departure', 'departureAt', 'arrival', 'arrivalAt']));
  });

  it('accepts a complete trip', () => {
    expect(errors(valid())).toEqual([]);
  });

  it('rejects a busy unit, a duplicated folio and a bad phone', () => {
    const busy = UNITS.find((u) => u.status === 'on_trip')!;
    const fields = errors({ ...valid(), unitId: busy.id, folio: TRIPS[0].id, driverPhone: '312 55' }).map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(['unit', 'folio', 'phone']));
  });

  it('requires times in order: inicio < paradas < entrega', () => {
    const f = valid();
    const stop = { ...newStop(), geofenceId: 'gf-km112', at: toLocalInput(now + 30 * 60_000) };
    expect(errors({ ...f, stops: [stop] }).map((c) => c.field)).toContain('stop0At');
    expect(errors({ ...f, arrivalAt: toLocalInput(now) }).map((c) => c.field)).toContain('arrivalAt');
  });

  it('rejects the same trailer twice', () => {
    const free = '[unused]';
    expect(errors({ ...valid(), trailers: [free, free] }).map((c) => c.field)).toContain('trailers');
  });
});

describe('Nuevo viaje · buildTrip', () => {
  it('builds salida → parada → destino legs and keeps the notes', () => {
    const f: NewTripForm = {
      ...valid(),
      notes: 'Llamar al llegar',
      trailers: ['CH-213 · 20 pies', 'CH-214 · 40 pies'],
      stops: [{ ...newStop(), geofenceId: 'gf-km112', at: toLocalInput(now + 4 * H) }],
    };
    const trip = buildTrip(f, { id: 'SRV-TEST', unit: available, driverId: freeDriver.id, user: USERS[0], geofences: GEOFENCES, warnings: [] });
    expect(trip.legs.map((l) => l.kind)).toEqual(['departure', 'stop', 'arrival']);
    expect(trip.trailers).toHaveLength(2);
    expect(trip.chassis).toBe('CH-213 · 20 pies');
    expect(trip.notes).toBe('Llamar al llegar');
    expect(trip.log.some((e) => e.title.includes('Llamar al llegar'))).toBe(true);
  });
});
