import { useMemo } from 'react';
import type { Severity, Trip } from '@/types/domain';
import { useStore } from '@/store/useStore';
import { usePrefs } from '@/store/prefs';
import { normalize } from '@/lib/format';
import { maxSeverity, SEVERITY_RANK } from '@/lib/severity';
import { tripHasAlerts } from '@/lib/tripView';
import { crewName } from '@/mocks/crew';

export interface TripGroupView {
  key: string;
  label: string;
  trips: Trip[];
  severity: Severity;
}

const NO_GROUP = '__none__';

const bySeverity = (a: Trip, b: Trip) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.id.localeCompare(b.id);

/** Search + "Solo con alertas" + grouping/sorting shared by the list and the map. */
export function useTowerTrips(query: string) {
  const trips = useStore((s) => s.trips);
  const units = useStore((s) => s.units);
  const crew = useStore((s) => s.crew);
  const alerts = useStore((s) => s.alerts);
  const onlyAlerts = usePrefs((s) => s.onlyAlerts);

  return useMemo(() => {
    const q = normalize(query.trim());
    const filtered = trips.filter((t) => {
      if (onlyAlerts && !tripHasAlerts(t, alerts)) return false;
      if (!q) return true;
      const unit = units.find((u) => u.id === t.unitId);
      const driver = crew.find((c) => c.id === t.driverId);
      const haystack = [
        t.id,
        unit?.economic,
        unit?.plate,
        driver ? crewName(driver) : '',
        ...t.containers.map((c) => c.number),
      ]
        .filter(Boolean)
        .join(' ');
      return normalize(haystack).includes(q);
    });

    const sorted = [...filtered].sort(bySeverity);

    const map = new Map<string, Trip[]>();
    for (const t of sorted) {
      const key = t.groupId ?? NO_GROUP;
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    const groups: TripGroupView[] = [...map.entries()].map(([key, list]) => ({
      key,
      label: key === NO_GROUP ? 'Sin grupo' : key,
      trips: list,
      severity: maxSeverity(list.map((t) => t.severity)),
    }));
    // Most severe first; ties by first trip ID; "Sin grupo" always last.
    groups.sort((a, b) => {
      if (a.key === NO_GROUP) return 1;
      if (b.key === NO_GROUP) return -1;
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.trips[0].id.localeCompare(b.trips[0].id);
    });

    return { total: trips.length, filtered: sorted, groups };
  }, [trips, units, crew, alerts, onlyAlerts, query]);
}
