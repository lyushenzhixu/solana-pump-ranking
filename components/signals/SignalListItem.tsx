// 信号日志列表行(紧凑,一行一信号,点 → /signals/[ca] 详情)。server component。
import Link from 'next/link'
import type { SignalRow } from './TweetTimelineCard'

function fmtMc(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}

function fmtFollowers(v: number | null | undefined): string {
  if (v == null) return ''
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return `${v}`
}

function ago(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const h = Math.max(0, Math.round((now - t) / 3_600_000))
  if (h < 1) return '刚刚'
  if (h < 24) return `${h}h前`
  return `${Math.round(h / 24)}d前`
}

const SENT_COLOR: Record<string, string> = {
  bullish: 'var(--positive, #3FB950)',
  bearish: 'var(--negative, #F85149)',
  neutral: 'var(--text-3)',
}

export default function SignalListItem({ row, now }: { row: SignalRow; now: number }) {
  const nt = row.narrative_twitter
  const ms = nt?.main_shill
  const timeline = nt?.timeline || []
  const mentions = nt?.mention_count ?? timeline.length
  // 主导情绪:看跌优先(转空更重要),其次看涨
  const sents = timeline.map((t) => t.sentiment || 'neutral')
  const dominant = sents.includes('bearish') ? 'bearish' : sents.includes('bullish') ? 'bullish' : 'neutral'
  const title = row.symbol ? `$${row.symbol}` : row.name || '—'

  return (
    <Link
      href={`/signals/${row.ca}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit',
        padding: '11px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-soft)',
        background: 'var(--surface-1)', marginBottom: 7,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
          {row.symbol && row.name ? (
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
          ) : null}
          {row.conviction_rating ? (
            <span style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '0 6px', borderRadius: 'var(--radius-xs)' }}>{row.conviction_rating}</span>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
          {ms ? (
            <>主推 <b style={{ fontWeight: 500, color: 'var(--text-2)' }}>@{ms.handle}</b>{ms.followers ? ` · ${fmtFollowers(ms.followers)} 粉` : ''}</>
          ) : (
            <span>caller 群驱动</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono, ui-monospace)' }}>
          <i className="ti ti-brand-x" style={{ fontSize: 11, verticalAlign: '-1px' }} aria-hidden="true" /> {mentions}
        </span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SENT_COLOR[dominant] }} aria-hidden="true" />
        <div style={{ textAlign: 'right', minWidth: 64 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--font-mono, ui-monospace)', color: 'var(--text)' }}>{fmtMc(row.market_cap)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{ago(nt?.fetched_at, now)}</div>
        </div>
        <i className="ti ti-chevron-right" style={{ fontSize: 15, color: 'var(--text-3)' }} aria-hidden="true" />
      </div>
    </Link>
  )
}
