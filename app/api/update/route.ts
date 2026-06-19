export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Track per-type in-progress state (module-level singleton, nodejs runtime)
const updateRunning: Record<string, boolean> = {}

export async function POST(req: Request) {
  const type = new URL(req.url).searchParams.get('type')?.toLowerCase() ?? ''

  if (type !== 'pump' && type !== 'zhilabs') {
    return Response.json({ error: '参数 type 必须为 pump 或 zhilabs' }, { status: 400 })
  }

  if (updateRunning[type]) {
    return Response.json({ error: '更新中，请稍后再试' }, { status: 409 })
  }

  updateRunning[type] = true
  const started = Date.now()
  try {
    let out: unknown
    if (type === 'pump') {
      const { updatePumpRanking } = await import('@/scripts/fetch-pump-ranking.js')
      out = await updatePumpRanking()
    } else {
      const { updateZhilabsRanking } = await import('@/scripts/fetch-zhilabs-ranking.js')
      out = await updateZhilabsRanking()
    }
    const durationMs = Date.now() - started
    const updated = Array.isArray(out) ? out.length : 0
    return Response.json({ ok: true, type, updated, durationMs, at: new Date().toISOString() })
  } catch (e) {
    return Response.json({ error: (e as Error)?.message || String(e) }, { status: 500 })
  } finally {
    updateRunning[type] = false
  }
}
