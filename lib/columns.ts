const SENSITIVE = ['entry_mc', 'entry', 'stop', 'target', 'size', 'position', 'wallet_address', 'pnl', 'cost_basis']

export function assertNoSensitive(columns: readonly string[]): void {
  const leaked = columns.filter(c => SENSITIVE.includes(c))
  if (leaked.length) throw new Error(`refusing to select sensitive columns: ${leaked.join(', ')}`)
}

export const KB_SIGNAL_PUBLIC_COLUMNS = [
  'ca',
  'name',
  'conviction_rating',
  'cluster_risk',
  'smart_money_24h',
  'revival',
  'score',
  'discovered_at',
  'lp_usd',
  'vol_24h_usd',
  'price_usd',
  'market_cap',
  'narrative',
  'onchain_cluster',
  'price_change_24h',
  'has_signal',
] as const

export const PAPER_TRADE_PUBLIC_COLUMNS = [
  'trade_id',
  'ca',
  'ticker',
  'status',
  'source',
  'entry_mc',
  'current_mc',
  'pnl_pct',
  'stop_loss_mc',
  'take_profit_mc',
  'opened_at',
  'closed_at',
] as const
