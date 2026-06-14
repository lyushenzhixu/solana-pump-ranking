export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getKbSignalByCa } from '@/lib/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ca: string }> }
) {
  const { ca } = await params
  const { data, error } = await getKbSignalByCa(ca)
  if (error) return Response.json({ error: String(error) }, { status: 500 })
  return Response.json(data ?? null)
}
