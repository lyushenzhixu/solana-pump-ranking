import { describe, it, expect } from 'vitest'
import { NAV_GROUPS, allNavItems } from '@/lib/nav'

describe('nav IA', () => {
  it('has the three groups in order', () => {
    expect(NAV_GROUPS.map(g => g.key)).toEqual(['overview', 'sectors', 'cross'])
  })
  it('includes all six section routes', () => {
    const hrefs = allNavItems().map(i => i.href)
    expect(hrefs).toEqual(['/dashboard','/meme','/perps','/prediction','/smart-money','/signals','/paper'])
  })
  it('flags which sections are live vs coming-soon', () => {
    const byHref = Object.fromEntries(allNavItems().map(i => [i.href, i.status]))
    expect(byHref['/meme']).toBe('live'); expect(byHref['/paper']).toBe('live')
    expect(byHref['/smart-money']).toBe('live')
    expect(byHref['/perps']).toBe('coming-soon'); expect(byHref['/prediction']).toBe('coming-soon')
  })
})
