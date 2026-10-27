import type { LatLng } from '@/types/domain';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Base map tiles. CARTO Positron now requires an API key, so the default is
 * OpenStreetMap toned down to light grey with a CSS filter (same sober look).
 */
export const TILE_LAYERS = {
  osmLight: { url: OSM_URL, attribution: OSM_ATTRIBUTION, subdomains: 'abc', className: 'tiles-light' },
  osm: { url: OSM_URL, attribution: OSM_ATTRIBUTION, subdomains: 'abc', className: '' },
} as const;

/** ← Cambia aquí el mapa base: 'osmLight' (gris claro) | 'osm' (a color). */
export const ACTIVE_TILES: keyof typeof TILE_LAYERS = 'osmLight';

/** Manzanillo–Guadalajara–Bajío corridor. */
export const CORRIDOR_CENTER: LatLng = [20.25, -102.95];
export const CORRIDOR_ZOOM = 8;
