import { describe, it, expect } from 'vitest'
import { getPumpRanking, getKbSignals } from '@/lib/queries'

describe.skipIf(!process.env.SUPABASE_URL)('api data contracts', () => {
  it('pump ranking has token + tx_volume_u_24h', async () => {
    const { data, error } = await getPumpRanking(5)
    expect(error).toBeFalsy()
    if (data?.length) {
      expect(data[0]).toHaveProperty('token')
      expect(data[0]).toHaveProperty('tx_volume_u_24h')
    }
  })

  it('kb signals ordered by score desc', async () => {
    const { data } = await getKbSignals()
    if (data && data.length > 1) {
      expect((data[0] as any).score).toBeGreaterThanOrEqual((data[1] as any).score)
    }
  })
})
