export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getPumpRanking } from '@/lib/queries'

export async function GET() {
  const { data, error } = await getPumpRanking(20)
  if (error) return Response.json({ error: String(error) }, { status: 500 })
  return Response.json(data ?? [])
}
