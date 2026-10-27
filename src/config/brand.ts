/**
 * Brand settings. Change ACTIVE_BRAND to switch the whole app between the
 * placeholder (PuertoTrack) and the proposals from Figma frame 13.
 */
export interface BrandPreset {
  name: string;
  initials: string;
  tagline: string;
  colors: {
    /** Top menu, primary buttons, IDs, active tabs. */
    primary: string;
    /** Soft tint for chips (IMP, folio, rule chips) and info banners. */
    primarySoft: string;
    /** Accent used sparingly (brand mark details). */
    accent: string;
  };
}

export const BRAND_PRESETS = {
  puertotrack: {
    name: 'PuertoTrack',
    initials: 'PT',
    tagline: 'Torre de control',
    colors: { primary: '#1e3a5f', primarySoft: '#e8eef5', accent: '#e8590c' },
  },
  tramo: {
    name: 'Tramo',
    initials: 'TR',
    tagline: 'Control de cada tramo, del puerto al cliente.',
    colors: { primary: '#1e3a5f', primarySoft: '#e8eef5', accent: '#e8590c' },
  },
  faro: {
    name: 'Faro',
    initials: 'FA',
    tagline: 'Vemos tu operación aunque sea de noche.',
    colors: { primary: '#13253d', primarySoft: '#e8eef5', accent: '#f59e0b' },
  },
  atraque: {
    name: 'Atraque',
    initials: 'AT',
    tagline: 'Del atraque a la entrega, sin perder la carga de vista.',
    colors: { primary: '#0f3d3e', primarySoft: '#e3f1f0', accent: '#2dd4bf' },
  },
} satisfies Record<string, BrandPreset>;

export type BrandKey = keyof typeof BRAND_PRESETS;

/** ← Cambia aquí la marca activa: 'puertotrack' | 'tramo' | 'faro' | 'atraque'. */
const DEFAULT_BRAND: BrandKey = 'puertotrack';

/** Can also be set at build time with VITE_BRAND (e.g. VITE_BRAND=atraque npm run build). */
const envBrand = import.meta.env.VITE_BRAND as string | undefined;
export const ACTIVE_BRAND: BrandKey = envBrand && envBrand in BRAND_PRESETS ? (envBrand as BrandKey) : DEFAULT_BRAND;

/** Name of the carrier (tenant) using the control tower. */
export const TENANT_NAME = 'Transportes del Pacífico';

export const brand: BrandPreset = BRAND_PRESETS[ACTIVE_BRAND];

/** Pushes brand colors into CSS variables and sets title + favicon. */
export function applyBrand(): void {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', brand.colors.primary);
  root.style.setProperty('--brand-primary-soft', brand.colors.primarySoft);
  root.style.setProperty('--brand-accent', brand.colors.accent);
  document.title = `${brand.name} · Torre de control`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', brand.colors.primary);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${brand.colors.primary}"/><text x="16" y="21" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${brand.initials}</text></svg>`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
