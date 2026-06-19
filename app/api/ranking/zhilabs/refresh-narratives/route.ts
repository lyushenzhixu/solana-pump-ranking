export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const { refreshZhilabsNarratives } = await import('@/scripts/refresh-zhilabs-narratives.js')
  const result = await refreshZhilabsNarratives()
  return Response.json({
    ok: true,
    updated: result.updated,
    errors: result.errors,
    tokens: result.tokens,
    at: new Date().toISOString(),
  })
}
