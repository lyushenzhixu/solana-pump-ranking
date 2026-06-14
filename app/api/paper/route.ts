export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getPaperSummary, getPaperTrades } from '@/lib/queries'

export async function GET() {
  try {
    const [{ data: summary }, { data: trades }] = await Promise.all([
      getPaperSummary(),
      getPaperTrades(),
    ])
    return Response.json({ summary: summary ?? null, trades: trades ?? [] })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
