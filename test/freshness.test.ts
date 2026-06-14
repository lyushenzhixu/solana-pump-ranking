import { describe, it, expect } from 'vitest'
import { formatFreshness } from '@/lib/freshness'

describe('formatFreshness', () => {
  const now = new Date('2026-06-14T12:00:00Z').getTime()
  it('minutes', () => expect(formatFreshness('2026-06-14T11:58:00Z', now)).toBe('2 分钟前更新'))
  it('hours', () => expect(formatFreshness('2026-06-14T09:00:00Z', now)).toBe('3 小时前更新'))
  it('null', () => expect(formatFreshness(null, now)).toBe('更新时间未知'))
})
