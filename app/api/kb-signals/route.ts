export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getKbSignals } from '@/lib/queries'

export async function GET() {
  const { data, error } = await getKbSignals()
  if (error) return Response.json({ error: String(error) }, { status: 500 })
  return Response.json(data ?? [])
}
