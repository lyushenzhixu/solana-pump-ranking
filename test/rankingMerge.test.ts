import { describe, it, expect } from 'vitest'
import { buildKbBadgeMap, toRankingRows, kbToRankingRows } from '../lib/rankingMerge'

describe('rankingMerge', () => {
  it('buildKbBadgeMap 抽取聪明钱/复活/cluster/conviction 徽章', () => {
    const m = buildKbBadgeMap([
      { ca: 'A', smart_money_24h: { wallet_count: 3 }, revival: { status: 'revived' }, cluster_risk: { level: 'high' }, conviction_rating: 'swing' },
      { ca: 'B', smart_money_24h: { wallet_count: 0 } },
    ] as any)
    expect(m.get('A')!.map((b) => b.kind)).toEqual(['smart', 'revival', 'cluster', 'conviction'])
    expect(m.get('B') ?? []).toEqual([]) // wallet_count 0 不出徽章
  })

  it('toRankingRows 把 badgeMap 按 token join 到行,holders 保留', () => {
    const m = buildKbBadgeMap([{ ca: 'A', conviction_rating: 'small' }] as any)
    const rows = toRankingRows([{ token: 'A', name: 'Aaa', symbol: 'AAA', market_cap: 1e6, tx_volume_u_24h: 5e5, holders: 1200 }] as any, m)
    expect(rows[0]).toMatchObject({ ca: 'A', name: 'Aaa', holders: 1200 })
    expect(rows[0].badges.map((b) => b.kind)).toEqual(['conviction'])
  })

  it('kbToRankingRows holders 为 null(kb_signals 无 holders)', () => {
    const rows = kbToRankingRows([{ ca: 'A', name: 'Aaa', market_cap: 2e6, vol_24h_usd: 1e5, price_change_24h: 12.3, conviction_rating: 'swing', smart_money_24h: { wallet_count: 2 } }] as any)
    expect(rows[0].holders).toBeNull()
    expect(rows[0].pct24h).toBe(12.3)
    expect(rows[0].badges.some((b) => b.kind === 'smart')).toBe(true)
  })

  it('toRankingRows coerces string numerics to numbers (real DB returns strings)', () => {
    const rows = toRankingRows([{ token: 'A', name: 'A', symbol: 'A', market_cap: '1500000', tx_volume_u_24h: '50000', price_change_24h: '12.3', holders: '1200' }] as any, new Map())
    expect(rows[0].marketCap).toBe(1500000)
    expect(rows[0].vol24h).toBe(50000)
    expect(rows[0].pct24h).toBeCloseTo(12.3)
    expect(rows[0].holders).toBe(1200)
    expect(typeof rows[0].pct24h).toBe('number')
  })

  it('numeric coercion: non-numeric string → null', () => {
    const rows = toRankingRows([{ token: 'B', name: 'B', market_cap: 'N/A', price_change_24h: '' }] as any, new Map())
    expect(rows[0].marketCap).toBeNull()
    expect(rows[0].pct24h).toBeNull()
  })
})
