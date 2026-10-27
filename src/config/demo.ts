/** Demo/simulation knobs. */
export const DEMO = {
  /** How often the simulated GPS feed ticks (ms). Handoff asks for 5–10 s. */
  tickMs: 5000,
  /** Units move this many times faster than real time so motion is visible on the map. */
  moveSpeedup: 4,
  /**
   * Clock time the Figma mocks were drawn at. Mock times written as 'HH:mm'
   * are shifted so this moment maps to "now" when the app loads.
   */
  designNow: '10:47',
  /** GPS freshness thresholds (minutes): green < fresh, amber < stale, red otherwise. */
  gpsFreshMin: 5,
  gpsStaleMin: 30,
} as const;
