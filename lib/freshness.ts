/**
 * Format a timestamp into a human-readable Chinese freshness string.
 * @param ts   ISO 8601 string or null/undefined
 * @param now  Optional epoch ms override (for testing). Defaults to Date.now().
 */
export function formatFreshness(ts: string | null | undefined, now: number = Date.now()): string {
  if (!ts) return '更新时间未知'

  const parsed = new Date(ts).getTime()
  if (Number.isNaN(parsed)) return '更新时间未知'

  const diffMs = now - parsed
  const diffMin = Math.round(diffMs / 60_000)
  const diffHr = Math.round(diffMs / 3_600_000)
  const diffDay = Math.round(diffMs / 86_400_000)

  if (diffMin < 1) return '刚刚更新'
  if (diffMin < 60) return `${diffMin} 分钟前更新`
  if (diffHr < 24) return `${diffHr} 小时前更新`
  return `${diffDay} 天前更新`
}
