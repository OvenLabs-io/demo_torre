import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TowerColumn =
  | 'unit'
  | 'driver'
  | 'containers'
  | 'leg'
  | 'eta'
  | 'gps'
  | 'speed'
  | 'stopped'
  | 'log'
  | 'lock'
  | 'freeDays'
  | 'location';

export type MapLayer = 'geofences' | 'traffic' | 'trail' | 'risk';

export const MAP_LAYERS: { key: MapLayer; label: string }[] = [
  { key: 'geofences', label: 'Geocercas' },
  { key: 'traffic', label: 'Tráfico' },
  { key: 'trail', label: 'Recorrido del día' },
  { key: 'risk', label: 'Zonas de riesgo' },
];

export const TOWER_COLUMNS: { key: TowerColumn; label: string }[] = [
  { key: 'unit', label: 'Tracto' },
  { key: 'driver', label: 'Operador' },
  { key: 'containers', label: 'Contenedor(es)' },
  { key: 'leg', label: 'Tramo actual' },
  { key: 'eta', label: 'ETA' },
  { key: 'gps', label: 'Último GPS' },
  { key: 'speed', label: 'Vel.' },
  { key: 'stopped', label: 'Detenido' },
  { key: 'log', label: 'Bitácora' },
  { key: 'lock', label: 'Candado' },
  { key: 'freeDays', label: 'Días libres' },
  { key: 'location', label: 'Ubicación' },
];

interface PrefsState {
  /** Visible tower list columns (persisted in this browser). */
  columns: Record<TowerColumn, boolean>;
  groupBy: 'group' | 'none';
  showGroups: boolean;
  onlyAlerts: boolean;
  collapsedGroups: string[];
  /** Tower search text, shared by Lista and Mapa. */
  query: string;
  setQuery: (q: string) => void;
  mapLayers: Record<MapLayer, boolean>;
  toggleLayer: (layer: MapLayer) => void;
  setColumn: (key: TowerColumn, visible: boolean) => void;
  resetColumns: () => void;
  setGroupBy: (g: 'group' | 'none') => void;
  setShowGroups: (v: boolean) => void;
  setOnlyAlerts: (v: boolean) => void;
  toggleGroup: (key: string) => void;
}

const ALL_VISIBLE = Object.fromEntries(TOWER_COLUMNS.map((c) => [c.key, true])) as Record<TowerColumn, boolean>;

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      columns: ALL_VISIBLE,
      groupBy: 'group',
      showGroups: true,
      onlyAlerts: false,
      collapsedGroups: [],
      query: '',
      setQuery: (query) => set({ query }),
      mapLayers: { geofences: true, traffic: false, trail: false, risk: false },
      toggleLayer: (layer) => set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),
      setColumn: (key, visible) => set((s) => ({ columns: { ...s.columns, [key]: visible } })),
      resetColumns: () => set({ columns: ALL_VISIBLE }),
      setGroupBy: (groupBy) => set({ groupBy }),
      setShowGroups: (showGroups) => set({ showGroups }),
      setOnlyAlerts: (onlyAlerts) => set({ onlyAlerts }),
      toggleGroup: (key) =>
        set((s) => ({
          collapsedGroups: s.collapsedGroups.includes(key)
            ? s.collapsedGroups.filter((k) => k !== key)
            : [...s.collapsedGroups, key],
        })),
    }),
    {
      name: 'torre-prefs',
      partialize: (s) => ({ columns: s.columns }),
      merge: (persisted, current) => ({
        ...current,
        columns: { ...ALL_VISIBLE, ...((persisted as Partial<PrefsState>)?.columns ?? {}) },
      }),
    },
  ),
);
