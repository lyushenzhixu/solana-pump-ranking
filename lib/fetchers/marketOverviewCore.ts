export interface MarketOverview {
  totalMcUsd: number | null
  totalMcChange24h: number | null
  fearGreedValue: number | null
  fearGreedLabel: string | null
  asOf: string
}

const FNG_LABELS: Record<string, string> = {
  'Extreme Fear': '极度恐惧',
  Fear: '恐惧',
  Neutral: '中性',
  Greed: '贪婪',
  'Extreme Greed': '极度贪婪',
}

export function mapFngLabel(cls: string | null): string | null {
  if (cls == null) return null
  return FNG_LABELS[cls] ?? cls
}

export type GlobalRes = { mc: number | null; chg: number | null }
export type FngRes = { value: number | null; label: string | null }

export function composeOverview(
  g: PromiseSettledResult<GlobalRes>,
  f: PromiseSettledResult<FngRes>,
  asOf: string,
): MarketOverview {
  return {
    totalMcUsd: g.status === 'fulfilled' ? g.value.mc : null,
    totalMcChange24h: g.status === 'fulfilled' ? g.value.chg : null,
    fearGreedValue: f.status === 'fulfilled' ? f.value.value : null,
    fearGreedLabel: f.status === 'fulfilled' ? f.value.label : null,
    asOf,
  }
}
