/**
 * Shared mutable scheduler state — pure module, no Node-only imports.
 * Written by instrumentation-node.ts; read by /api/scheduler/status route.
 */

export const schedulerStatus = {
  enabled: true,
  intervalMs: Math.max(
    60_000,
    parseInt(
      (typeof process !== 'undefined' && process.env?.AUTO_UPDATE_INTERVAL_MIN) || '5',
      10
    ) * 60_000
  ),
  running: false,
  /** ISO string of last run start, or null */
  lastRun: null,
  /** { pump: { ok, count }, zhilabs: { ok, count }, durationMs } or null */
  lastResult: null,
};
