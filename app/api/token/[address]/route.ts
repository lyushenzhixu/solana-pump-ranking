export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import { getTokenDetail, getTokenSecurityDetail, okxOnchain } from '@/lib/sources/index.js'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params
  const chain = new URL(req.url).searchParams.get('chain') || 'solana'

  const [detail, pumpRow, zhilabsRow, secDetail] = await Promise.all([
    getTokenDetail(address, chain),
    Promise.resolve(
      supabase
        .from('solana_pump_ranking')
        .select('holders, holders_top10_percent')
        .eq('token', address)
        .maybeSingle()
    ).then((r: any) => r.data).catch(() => null),
    Promise.resolve(
      supabase
        .from('zhilabs_ranking')
        .select('holders')
        .eq('token', address)
        .maybeSingle()
    ).then((r: any) => r.data).catch(() => null),
    (getTokenSecurityDetail(address, chain) as unknown as Promise<any>).catch(() => null),
  ])

  if (!detail) {
    return Response.json({ error: '未找到该代币' }, { status: 404 })
  }

  const dbRow = pumpRow || zhilabsRow
  if (detail.holders == null && (dbRow as any)?.holders != null) {
    detail.holders = (dbRow as any).holders
  }
  if (detail.holders == null && (secDetail as any)?.holderCount != null) {
    detail.holders = (secDetail as any).holderCount
  }

  // Prefer DB (Binance-sourced) top10 data for ranking consistency
  let dbTop10: number | null = (pumpRow as any)?.holders_top10_percent ?? null
  let goplusTop10: number | null = (secDetail as any)?.topHolderPercent ?? null
  // GoPlus topHolderPercent is 0-1 ratio; convert to percent
  if (goplusTop10 != null && goplusTop10 < 1) goplusTop10 = goplusTop10 * 100
  let okxTop10: number | null = null
  if (dbTop10 == null && (okxOnchain as any).isConfigured()) {
    okxTop10 = await (okxOnchain as any).getTop10HolderPercent(address, chain).catch(() => null)
  }
  const finalTop10 = dbTop10 ?? okxTop10 ?? goplusTop10

  if (secDetail) {
    ;(detail as any)._security = {
      lpNotLocked: (secDetail as any).lpNotLocked,
      isHoneypot: (secDetail as any).isHoneypot,
      buyTax: (secDetail as any).buyTax,
      sellTax: (secDetail as any).sellTax,
      isMintable: (secDetail as any).isMintable,
      isFreezable: (secDetail as any).isFreezable,
      riskLevel: (secDetail as any).riskLevel,
      topHolderPercent: finalTop10,
    }
  } else if (finalTop10 != null) {
    ;(detail as any)._security = { topHolderPercent: finalTop10 }
  }

  return Response.json(detail)
}
