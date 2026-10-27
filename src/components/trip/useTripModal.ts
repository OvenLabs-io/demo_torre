import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TripTab = 'bitacora' | 'historial';

/** The trip modal lives in the URL (?viaje=SRV-…&tab=…) so it opens over any page. */
export function useTripModal() {
  const [params, setParams] = useSearchParams();
  const tripId = params.get('viaje');
  const tab = (params.get('tab') as TripTab | null) ?? 'bitacora';
  const at = params.get('t');

  const open = useCallback(
    (id: string, nextTab: TripTab = 'bitacora', atTs?: number) => {
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.set('viaje', id);
        if (nextTab === 'bitacora') next.delete('tab');
        else next.set('tab', nextTab);
        if (atTs) next.set('t', String(atTs));
        else next.delete('t');
        return next;
      });
    },
    [setParams],
  );

  const close = useCallback(() => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.delete('viaje');
      next.delete('tab');
      next.delete('t');
      return next;
    });
  }, [setParams]);

  return { tripId, tab, at: at ? Number(at) : undefined, open, close };
}
