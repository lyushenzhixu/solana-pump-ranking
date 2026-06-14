export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { fetchSmartMoneySignals } from '@/lib/sources/index.js'
import * as dexscreener from '@/lib/sources/dexscreener.js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100', 10) || 100, 100)

  // Fetch Solana + BSC smart money signals concurrently
  const [solData, bscData] = await Promise.all([
    fetchSmartMoneySignals({ page, pageSize, chainId: 'CT_501' }),
    fetchSmartMoneySignals({ page, pageSize, chainId: '56' }),
  ])
  const solWithChain = (Array.isArray(solData) ? solData : []).map((d: any) => ({ ...d, chain: 'solana', sol: true, bsc: false }))
  const bscWithChain = (Array.isArray(bscData) ? bscData : []).map((d: any) => ({ ...d, chain: 'bsc', sol: false, bsc: true }))
  let data: any[] = [...solWithChain, ...bscWithChain]

  // Supplement logos from DexScreener as fallback source
  if (data.length > 0) {
    const allAddrs = data.map((d) => d.contractAddress || d.contract_address).filter(Boolean)
    if (allAddrs.length > 0) {
      try {
        const pairs = await dexscreener.getTokenPairs(allAddrs)
        const logoByKey = new Map<string, string>()
        const chainMap: Record<string, string> = { solana: 'solana', bsc: 'bsc' }
        for (const p of pairs || []) {
          const addr = (p.baseToken?.address || '').toLowerCase()
          const logo = p.info?.imageUrl || null
          const dsChain = (p.chainId || '').toLowerCase()
          const chain = chainMap[dsChain] || dsChain || 'solana'
          const key = chain + ':' + addr
          if (addr && logo && !logoByKey.has(key)) logoByKey.set(key, logo)
        }
        data = data.map((item) => {
          const addr = (item.contractAddress || item.contract_address || '').toLowerCase()
          const key = (item.chain || 'solana') + ':' + addr
          return { ...item, logoUrlFallback: logoByKey.get(key) || null }
        })
      } catch { /* ignore DexScreener failures */ }
    }
  }
  return Response.json(data)
}
