import { unstable_cache } from 'next/cache'
import { composeOverview, mapFngLabel } from './marketOverviewCore'
import type { MarketOverview, GlobalRes, FngRes } from './marketOverviewCore'

export type { MarketOverview } from './marketOverviewCore'

async function fetchGlobal(): Promise<GlobalRes> {
  const res = await fetch('https://api.coingecko.com/api/v3/global')
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const j = await res.json()
  const d = j?.data ?? {}
  return { mc: d.total_market_cap?.usd ?? null, chg: d.market_cap_change_percentage_24h_usd ?? null }
}

async function fetchFng(): Promise<FngRes> {
  const res = await fetch('https://api.alternative.me/fng/?limit=1')
  if (!res.ok) throw new Error(`fng ${res.status}`)
  const j = await res.json()
  const d = j?.data?.[0]
  const v = d ? parseInt(d.value, 10) : NaN
  return { value: Number.isFinite(v) ? v : null, label: mapFngLabel(d?.value_classification ?? null) }
}

const cachedOverview = unstable_cache(
  async (): Promise<MarketOverview> => {
    const [g, f] = await Promise.allSettled([fetchGlobal(), fetchFng()])
    return composeOverview(g, f, new Date().toISOString())
  },
  ['market-overview-v1'],
  { revalidate: 300 },
)

export async function getMarketOverview(): Promise<MarketOverview> {
  return cachedOverview()
}
