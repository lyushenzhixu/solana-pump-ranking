import { describe, it, expect } from 'vitest'
import nextConfig from '../next.config.mjs'

describe('legacy URL redirects', () => {
  it('301s /ranking to /meme', async () => {
    const rules = await (nextConfig as any).redirects()
    const r = rules.find((x: any) => x.source === '/ranking')
    expect(r).toBeTruthy()
    expect(r.destination).toBe('/meme')
    expect(r.permanent).toBe(true)
  })

  it('does NOT redirect /token/:address', async () => {
    const rules = await (nextConfig as any).redirects()
    expect(rules.find((x: any) => x.source.startsWith('/token'))).toBeUndefined()
  })
})
