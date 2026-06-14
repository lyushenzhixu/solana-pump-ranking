export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { fetchSmartMoneyInflowRank } from '@/lib/sources/index.js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tagType = parseInt(searchParams.get('tagType') || '1', 10) || 1

  const [solData, bscData] = await Promise.all([
    fetchSmartMoneyInflowRank({ chainId: 'CT_501', tagType }),
    fetchSmartMoneyInflowRank({ chainId: '56', tagType }),
  ])
  const solWithChain = (Array.isArray(solData) ? solData : []).map((d: any) => ({ ...d, chain: 'solana' }))
  const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d: any) => ({ ...d, chain: 'bsc' }))
  const data = [...solWithChain, ...bscWithChain].sort((a, b) => (b.inflow || 0) - (a.inflow || 0))
  return Response.json(data)
}
