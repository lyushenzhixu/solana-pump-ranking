export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getKline } from '@/lib/sources/index.js'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pairAddress: string }> }
) {
  const { pairAddress } = await params
  const { searchParams } = new URL(req.url)
  const chain = searchParams.get('chain') || 'solana'
  const interval = parseInt(searchParams.get('interval') || '15', 10)
  const size = parseInt(searchParams.get('size') || '96', 10)
  const data = await getKline(pairAddress, chain, interval, size)
  return Response.json(data)
}
