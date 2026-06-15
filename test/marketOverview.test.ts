import { describe, it, expect } from 'vitest'
import { composeOverview, mapFngLabel } from '@/lib/fetchers/marketOverviewCore'

describe('mapFngLabel', () => {
  it('maps known classifications to Chinese', () => {
    expect(mapFngLabel('Extreme Fear')).toBe('极度恐惧')
    expect(mapFngLabel('Greed')).toBe('贪婪')
  })
  it('passes through unknown / null', () => {
    expect(mapFngLabel('Whatever')).toBe('Whatever')
    expect(mapFngLabel(null)).toBe(null)
  })
})

describe('composeOverview', () => {
  const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value })
  const bad = (): PromiseSettledResult<never> => ({ status: 'rejected', reason: new Error('x') })

  it('both fulfilled → full object', () => {
    const r = composeOverview(
      ok({ mc: 2.37e12, chg: 3.99 }),
      ok({ value: 20, label: '极度恐惧' }),
      '2026-06-15T00:00:00Z',
    )
    expect(r.totalMcUsd).toBe(2.37e12)
    expect(r.totalMcChange24h).toBe(3.99)
    expect(r.fearGreedValue).toBe(20)
    expect(r.fearGreedLabel).toBe('极度恐惧')
    expect(r.asOf).toBe('2026-06-15T00:00:00Z')
  })

  it('one source rejected → that side null, other intact', () => {
    const r = composeOverview(ok({ mc: 1e12, chg: -1 }), bad(), 'iso')
    expect(r.totalMcUsd).toBe(1e12)
    expect(r.fearGreedValue).toBe(null)
    expect(r.fearGreedLabel).toBe(null)
  })
})
