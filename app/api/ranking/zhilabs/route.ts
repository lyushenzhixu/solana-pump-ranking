export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getZhilabsRanking } from '@/lib/queries'

export async function GET() {
  const { data, error } = await getZhilabsRanking()
  if (error) return Response.json({ error: String(error) }, { status: 500 })
  return Response.json(data ?? [])
}
