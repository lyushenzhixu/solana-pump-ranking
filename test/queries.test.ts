import { describe, it, expect } from 'vitest'
import { KB_SIGNAL_PUBLIC_COLUMNS, PAPER_TRADE_PUBLIC_COLUMNS, assertNoSensitive } from '@/lib/columns'

const FORBIDDEN = ['stop','target','size','wallet_address','cost_basis']

describe('public column whitelists', () => {
  it('kb whitelist excludes sensitive', () => {
    for (const f of FORBIDDEN) expect(KB_SIGNAL_PUBLIC_COLUMNS).not.toContain(f)
  })
  it('kb whitelist includes display fields', () => {
    for (const f of ['ca','score','conviction_rating','narrative','discovered_at']) {
      expect(KB_SIGNAL_PUBLIC_COLUMNS).toContain(f)
    }
  })
  it('assertNoSensitive throws on leak', () => {
    expect(() => assertNoSensitive(['name','wallet_address'])).toThrow(/sensitive/i)
    expect(() => assertNoSensitive(['name','score'])).not.toThrow()
  })
})
