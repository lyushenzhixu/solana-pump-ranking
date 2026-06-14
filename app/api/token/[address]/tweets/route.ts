export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import { getTokenHotTweets } from '@/lib/sources/sixfivefiveone.js'
import {
  getCachedTweets,
  saveTweetsCache,
} from '@/src/narrative-cache.js'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params

  // 1. Check Supabase persistent cache
  const cached = await getCachedTweets(address)
  if (cached) return Response.json(cached)

  // 2. Fetch token metadata from DB
  let tokenInfo: { name?: string; symbol?: string } | null = null
  try {
    const row = await supabase
      .from('zhilabs_ranking')
      .select('name, symbol')
      .eq('token', address)
      .maybeSingle()
    tokenInfo = row.data
    if (!tokenInfo) {
      const pumpRow = await supabase
        .from('solana_pump_ranking')
        .select('name, symbol')
        .eq('token', address)
        .maybeSingle()
      tokenInfo = pumpRow.data
    }
  } catch { /* fallback */ }

  const symbol = tokenInfo?.symbol || ''
  const name = tokenInfo?.name || ''
  const keyword = symbol || name || address.slice(0, 8)

  // 3. Call enhanced tweet search (pass contract address + metadata)
  const tweets = await getTokenHotTweets(keyword, {
    contractAddress: address,
    symbol,
    name,
  })

  // 4. Save to Supabase persistent cache
  saveTweetsCache(address, symbol, name, tweets).catch(() => {})

  return Response.json(tweets)
}
