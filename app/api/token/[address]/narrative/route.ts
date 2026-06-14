export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import { getTokenNarrative } from '@/lib/sources/sixfivefiveone.js'
import {
  getCachedNarrative,
  saveNarrativeCache,
} from '@/src/narrative-cache.js'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params

  // 1. Check Supabase persistent cache
  const cached = await getCachedNarrative(address)
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

  // 3. Call enhanced narrative search (pass contract address)
  const narrative = await getTokenNarrative(symbol, name, { contractAddress: address })

  // 4. Save to Supabase persistent cache
  saveNarrativeCache(address, symbol, name, narrative).catch(() => {})

  return Response.json(narrative)
}
