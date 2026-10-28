import { useEffect, type ReactNode } from 'react';
import { MapContainer, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import clsx from 'clsx';
import { ACTIVE_TILES, CORRIDOR_CENTER, CORRIDOR_ZOOM, TILE_LAYERS } from '@/config/map';
import type { LatLng } from '@/types/domain';

/** Leaflet map with the configured base tiles (CARTO Positron by default). */
export function BaseMap({
  children,
  className,
  center = CORRIDOR_CENTER,
  zoom = CORRIDOR_ZOOM,
  onReady,
}: {
  children?: ReactNode;
  className?: string;
  center?: LatLng;
  zoom?: number;
  onReady?: (map: LeafletMap) => void;
}) {
  const tiles = TILE_LAYERS[ACTIVE_TILES];
  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} className={clsx('size-full', className)} attributionControl>
      <TileLayer url={tiles.url} attribution={tiles.attribution} subdomains={tiles.subdomains} className={tiles.className} />
      <ScaleControl position="bottomright" imperial={false} />
      {onReady && <ReadyHook onReady={onReady} />}
      {children}
    </MapContainer>
  );
}

function ReadyHook({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

/** Floating zoom (+ / − / fit) buttons, styled like the Figma map controls. */
export function MapZoomButtons({ map, onFit }: { map: LeafletMap | null; onFit: () => void }) {
  const btn =
    'flex size-[34px] items-center justify-center border-b border-line bg-white text-[17px] text-body last:border-b-0 hover:bg-surface-alt';
  return (
    <div className="absolute right-2.5 bottom-[52px] z-[500] flex flex-col overflow-hidden rounded-[4px] border border-line shadow-sm">
      <button type="button" aria-label="Acercar" className={btn} onClick={() => map?.zoomIn()}>
        +
      </button>
      <button type="button" aria-label="Alejar" className={btn} onClick={() => map?.zoomOut()}>
        −
      </button>
      <button type="button" aria-label="Ver todo" title="Ver todas las unidades" className={btn} onClick={onFit}>
        ⌖
      </button>
    </div>
  );
}
