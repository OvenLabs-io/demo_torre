import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import type { GeofenceShape, LatLng } from '@/types/domain';

export type DrawMode = 'select' | 'circle' | 'polygon' | 'corridor' | 'edit';

const DRAW_SHAPE: Record<'circle' | 'polygon' | 'corridor', string> = {
  circle: 'Circle',
  polygon: 'Polygon',
  corridor: 'Line',
};

const DRAW_STYLE = { color: '#1e3a5f', weight: 2, fillColor: '#1e3a5f', fillOpacity: 0.15 };

function toLatLng(p: L.LatLng): LatLng {
  return [Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6))];
}

/** Converts a Leaflet layer drawn/edited with Geoman into our shape model. */
function layerToShape(layer: L.Layer, corridorWidth: number): GeofenceShape | null {
  if (layer instanceof L.Circle) return { kind: 'circle', center: toLatLng(layer.getLatLng()), radiusM: Math.round(layer.getRadius()) };
  if (layer instanceof L.Polygon) {
    const ring = (layer.getLatLngs() as L.LatLng[][])[0] ?? [];
    return { kind: 'polygon', points: ring.map(toLatLng) };
  }
  if (layer instanceof L.Polyline) return { kind: 'corridor', path: (layer.getLatLngs() as L.LatLng[]).map(toLatLng), widthM: corridorWidth };
  return null;
}

function shapeToLayer(shape: GeofenceShape, color: string): L.Layer {
  const style = { color, weight: 2, fillColor: color, fillOpacity: 0.18 };
  if (shape.kind === 'circle') return L.circle(shape.center, { ...style, radius: shape.radiusM });
  if (shape.kind === 'polygon') return L.polygon(shape.points, style);
  return L.polyline(shape.path, { color, weight: 3, dashArray: '6 4' });
}

/** Enables Geoman drawing for the active mode and reports the finished shape. */
export function DrawController({ mode, onCreate, onCancel }: { mode: DrawMode; onCreate: (shape: GeofenceShape) => void; onCancel: () => void }) {
  const map = useMap();
  const onCreateRef = useRef(onCreate);
  onCreateRef.current = onCreate;

  useEffect(() => {
    const handler = (e: { layer: L.Layer }) => {
      const shape = layerToShape(e.layer, 1000);
      e.layer.remove();
      if (shape) onCreateRef.current(shape);
    };
    map.on('pm:create', handler as L.LeafletEventHandlerFn);
    return () => {
      map.off('pm:create', handler as L.LeafletEventHandlerFn);
    };
  }, [map]);

  useEffect(() => {
    if (mode === 'circle' || mode === 'polygon' || mode === 'corridor') {
      map.pm.enableDraw(DRAW_SHAPE[mode] as 'Polygon', {
        finishOn: mode === 'circle' ? undefined : 'dblclick',
        allowSelfIntersection: false,
        templineStyle: { color: '#1e3a5f' },
        hintlineStyle: { color: '#1e3a5f', dashArray: [4, 4] },
        pathOptions: DRAW_STYLE,
      });
    } else {
      map.pm.disableDraw();
    }
    return () => {
      map.pm.disableDraw();
    };
  }, [map, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (mode === 'circle' || mode === 'polygon' || mode === 'corridor')) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, onCancel]);

  return null;
}

/** The shape being created/edited, as a raw Leaflet layer so Geoman can move its vertices. */
export function EditableShape({
  shape,
  editing,
  color,
  onChange,
}: {
  shape: GeofenceShape;
  editing: boolean;
  color: string;
  onChange: (shape: GeofenceShape) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const fromLayer = useRef(false);
  const [version, setVersion] = useState(0);
  const widthRef = useRef(shape.kind === 'corridor' ? shape.widthM : 1000);
  widthRef.current = shape.kind === 'corridor' ? shape.widthM : widthRef.current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // (Re)create the layer when the shape changes from outside (not from a vertex drag).
  useEffect(() => {
    if (fromLayer.current) {
      fromLayer.current = false;
      return;
    }
    layerRef.current?.remove();
    const layer = shapeToLayer(shape, color);
    layer.addTo(map);
    layerRef.current = layer;
    setVersion((v) => v + 1);
  }, [shape, color, map]);

  useEffect(() => () => void layerRef.current?.remove(), []);

  useEffect(() => {
    const layer = layerRef.current as L.Polygon | null;
    if (!layer) return;
    if (!editing) {
      layer.pm.disable();
      return;
    }
    layer.pm.enable({ allowSelfIntersection: false });
    const handler = () => {
      const next = layerToShape(layer, widthRef.current);
      if (next) {
        fromLayer.current = true;
        onChangeRef.current(next);
      }
    };
    layer.on('pm:edit', handler);
    return () => {
      layer.off('pm:edit', handler);
      layer.pm.disable();
    };
  }, [editing, version]);

  return null;
}
