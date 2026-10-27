import L from 'leaflet';
import type { Trip } from '@/types/domain';

export type UnitState = 'moving' | 'stopped' | 'alert' | 'nosignal';

/** Map state of a unit: critical → alert, no signal, moving or stopped. */
export function unitState(trip: Trip): UnitState {
  if (trip.severity === 'critical') return 'alert';
  if (trip.live.stopReason === 'no_signal' && trip.live.speedKmh === 0) return 'nosignal';
  return trip.live.speedKmh > 0 ? 'moving' : 'stopped';
}

const ARROW = (deg: number) =>
  `<svg width="12" height="12" viewBox="0 0 24 24" style="transform:rotate(${Math.round(deg)}deg)"><path fill="#fff" d="M12 2 20 21 12 16.5 4 21z"/></svg>`;

const cache = new Map<string, L.DivIcon>();

/** Leaflet divIcon for a unit marker (cached by its visual state). */
export function unitIcon(opts: {
  state: UnitState;
  heading: number;
  label: string;
  speedText: string;
  selected?: boolean;
  showChip?: boolean;
}): L.DivIcon {
  const heading = Math.round(opts.heading / 5) * 5;
  const key = `${opts.state}|${heading}|${opts.label}|${opts.speedText}|${opts.selected}|${opts.showChip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const inner = opts.state === 'moving' ? ARROW(heading) : '<span class="um-square"></span>';
  const speedCls = opts.state === 'alert' ? 'crit' : opts.state === 'nosignal' ? 'muted' : '';
  const chip = opts.showChip ? `<span class="um-chip">${opts.label}<i class="${speedCls}">${opts.speedText}</i></span>` : '';
  const icon = L.divIcon({
    className: 'unit-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div class="um um-${opts.state}${opts.selected ? ' um-sel' : ''}"><span class="um-halo"></span><span class="um-dot">${inner}</span>${chip}</div>`,
  });
  cache.set(key, icon);
  return icon;
}
