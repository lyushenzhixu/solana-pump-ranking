export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { schedulerStatus } from '@/src/scheduler-status'

export function GET() {
  return Response.json({
    enabled: schedulerStatus.enabled,
    intervalMs: schedulerStatus.intervalMs,
    intervalMin: schedulerStatus.intervalMs / 60000,
    running: schedulerStatus.running,
    lastRun: schedulerStatus.lastRun,
    lastResult: schedulerStatus.lastResult,
  })
}
