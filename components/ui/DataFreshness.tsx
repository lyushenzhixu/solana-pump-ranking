import { formatFreshness } from '@/lib/freshness'

export interface DataFreshnessProps {
  /** ISO 8601 timestamp string, or null if unknown */
  iso: string | null
  /** ok=false 时前缀「最后成功」 */
  ok?: boolean
}

/**
 * 数据新鲜度标签 — 11px text-3
 * ok=false 时显示「最后成功 X 分钟前更新」
 */
export default function DataFreshness({ iso, ok = true }: DataFreshnessProps) {
  const label = formatFreshness(iso)
  const text = ok ? label : `最后成功 ${label}`

  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--text-3)',
        fontFamily: 'var(--mono)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {text}
    </span>
  )
}
