let started = false

export function startScheduler(): void {
  if (started) return
  started = true
  if ((process.env.SCHEDULER_ENABLED || 'true').toLowerCase() === 'false') return

  const intervalMs = Math.max(60_000, parseInt(process.env.AUTO_UPDATE_INTERVAL_MIN || '5', 10) * 60_000)
  const running = { v: false }

  const run = async () => {
    if (running.v) return
    running.v = true
    try {
      const { updatePumpRanking } = await import('./scripts/fetch-pump-ranking.js')
      const { updateZhilabsRanking } = await import('./scripts/fetch-zhilabs-ranking.js')
      try { await updatePumpRanking() } catch (e) { console.error('[scheduler] pump 失败:', (e as Error)?.message) }
      try { await updateZhilabsRanking() } catch (e) { console.error('[scheduler] zhilabs 失败:', (e as Error)?.message) }
    } finally { running.v = false }
  }

  console.log(`[scheduler] 启动,每 ${intervalMs / 60000} 分钟刷新 pump+zhilabs 榜单`)
  setTimeout(run, 3000)
  setInterval(run, intervalMs)
}
