export type SignalBadge = { kind: 'smart' | 'revival' | 'cluster' | 'conviction'; label: string }

export type RankingRowData = {
  ca: string | null
  name: string
  symbol: string | null
  marketCap: number | null
  vol24h: number | null
  pct24h: number | null
  holders: number | null
  badges: SignalBadge[]
}

function badgesFromKb(r: any): SignalBadge[] {
  const out: SignalBadge[] = []
  const sm = r.smart_money_24h as { wallet_count?: number } | null
  if (sm && (sm.wallet_count ?? 0) > 0) out.push({ kind: 'smart', label: `聪明钱 ${sm.wallet_count}` })
  const rev = r.revival as { status?: string } | null
  if (rev?.status && rev.status !== 'none') out.push({ kind: 'revival', label: '复活' })
  const cr = r.cluster_risk as { level?: string } | null
  if (cr?.level === 'high' || cr?.level === 'medium') out.push({ kind: 'cluster', label: `cluster ${cr.level === 'high' ? '高' : '中'}` })
  else if (!cr?.level && r.onchain_cluster != null) out.push({ kind: 'cluster', label: '链上集群' })
  if (r.conviction_rating) out.push({ kind: 'conviction', label: String(r.conviction_rating) })
  return out
}

export function buildKbBadgeMap(kbRows: any[]): Map<string, SignalBadge[]> {
  const m = new Map<string, SignalBadge[]>()
  for (const r of kbRows ?? []) if (r.ca) m.set(r.ca, badgesFromKb(r))
  return m
}

function displayName(name: unknown, symbol: unknown, ca: unknown): string {
  return (name as string) || (symbol as string) || (ca ? String(ca).slice(0, 6) + '…' : '—')
}

export function toRankingRows(rankRows: any[], badgeMap: Map<string, SignalBadge[]>): RankingRowData[] {
  return (rankRows ?? []).map((r) => ({
    ca: r.token ?? null,
    name: displayName(r.name, r.symbol, r.token),
    symbol: r.symbol ?? null,
    marketCap: r.market_cap ?? null,
    vol24h: r.tx_volume_u_24h ?? null,
    pct24h: r.price_change_24h ?? null,
    holders: r.holders ?? null,
    badges: (r.token && badgeMap.get(r.token)) || [],
  }))
}

export function kbToRankingRows(kbRows: any[]): RankingRowData[] {
  return (kbRows ?? []).map((r) => ({
    ca: r.ca ?? null,
    name: displayName(r.name, r.symbol, r.ca),
    symbol: r.symbol ?? null,
    marketCap: r.market_cap ?? null,
    vol24h: r.vol_24h_usd ?? null,
    pct24h: r.price_change_24h ?? null,
    holders: null, // kb_signals 无 holders
    badges: badgesFromKb(r),
  }))
}
