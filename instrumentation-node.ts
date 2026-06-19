import { schedulerStatus } from './src/scheduler-status.js'

// Widen the type so TS allows assigning string to the initially-null fields
const sched = schedulerStatus as {
  enabled: boolean
  intervalMs: number
  running: boolean
  lastRun: string | null
  lastResult: unknown
}

let started = false

export function startScheduler(): void {
  if (started) return
  started = true
  if ((process.env.SCHEDULER_ENABLED || 'true').toLowerCase() === 'false') {
    sched.enabled = false
    return
  }

  const intervalMs = Math.max(60_000, parseInt(process.env.AUTO_UPDATE_INTERVAL_MIN || '5', 10) * 60_000)
  sched.intervalMs = intervalMs

  const run = async () => {
    if (sched.running) return
    sched.running = true
    sched.lastRun = new Date().toISOString()
    const runStart = Date.now()
    const result: { pump?: { ok: boolean; count: number }; zhilabs?: { ok: boolean; count: number }; durationMs?: number } = {}
    try {
      const { updatePumpRanking } = await import('./scripts/fetch-pump-ranking.js')
      const { updateZhilabsRanking } = await import('./scripts/fetch-zhilabs-ranking.js')
      try {
        const out = await updatePumpRanking()
        result.pump = { ok: true, count: Array.isArray(out) ? out.length : 0 }
      } catch (e) {
        console.error('[scheduler] pump 失败:', (e as Error)?.message)
        result.pump = { ok: false, count: 0 }
      }
      try {
        const out = await updateZhilabsRanking()
        result.zhilabs = { ok: true, count: Array.isArray(out) ? out.length : 0 }
      } catch (e) {
        console.error('[scheduler] zhilabs 失败:', (e as Error)?.message)
        result.zhilabs = { ok: false, count: 0 }
      }
    } finally {
      result.durationMs = Date.now() - runStart
      sched.lastResult = result
      sched.running = false
    }
  }

  console.log(`[scheduler] 启动,每 ${intervalMs / 60000} 分钟刷新 pump+zhilabs 榜单`)
  setTimeout(run, 3000)
  setInterval(run, intervalMs)
}
