// 推特叙事 call 时间线卡(信号日志主体块)。消费 kb_signals.narrative_twitter。
// 数据来自 KB python 直连 Xpoz 提取器(主推 KOL + 时序 call,每条带真实 tweet_id)。server component。

type Tweet = {
  ts?: string
  handle: string
  name?: string | null
  followers?: number | null
  verified?: boolean | null
  tweet_id: string
  text?: string
  impressions?: number
  likes?: number
  sentiment?: 'bullish' | 'bearish' | 'neutral'
  is_first_call?: boolean
  is_main_shill?: boolean
}

export type NarrativeTwitter = {
  status: 'generated' | 'none'
  main_shill?: Tweet | null
  timeline?: Tweet[]
  mention_count?: number
  fetched_at?: string
}

export type SignalRow = {
  ca: string
  symbol?: string | null
  name?: string | null
  market_cap?: number | null
  conviction_rating?: string | null
  narrative_twitter?: NarrativeTwitter | null
}

function fmtMc(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${Math.round(v)}`
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return `${v}`
}

function tweetUrl(t: Tweet): string {
  return `https://x.com/${t.handle}/status/${t.tweet_id}`
}

function ago(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const h = Math.max(0, Math.round((now - t) / 3_600_000))
  if (h < 1) return '刚刚'
  if (h < 24) return `${h} 小时前`
  return `${Math.round(h / 24)} 天前`
}

const SENT: Record<string, { label: string; color: string }> = {
  bullish: { label: '看涨', color: 'var(--positive, #3FB950)' },
  bearish: { label: '转空', color: 'var(--negative, #F85149)' },
  neutral: { label: '中性', color: 'var(--text-3)' },
}

function initial(handle: string): string {
  return (handle || '?').replace(/^@/, '').slice(0, 1).toUpperCase()
}

export default function TweetTimelineCard({ row, now }: { row: SignalRow; now: number }) {
  const nt = row.narrative_twitter
  if (!nt || nt.status !== 'generated') return null
  const ms = nt.main_shill
  const timeline = nt.timeline || []

  return (
    <article
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      {/* 头部 */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', flexShrink: 0 }}>
            {row.symbol ? `$${row.symbol}` : (row.name || '—')}
          </span>
          {row.symbol && row.name ? (
            <span style={{ fontSize: 12.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.name}
            </span>
          ) : null}
          {row.conviction_rating ? (
            <span style={{ fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 7px', borderRadius: 'var(--radius-xs)' }}>
              {row.conviction_rating}
            </span>
          ) : null}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono, ui-monospace)', color: 'var(--text)', flexShrink: 0 }}>
          {fmtMc(row.market_cap)}
        </span>
      </header>

      {/* 主推 KOL */}
      {ms ? (
        <a
          href={tweetUrl(ms)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
              {initial(ms.handle)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text)' }}>
                <b style={{ fontWeight: 500 }}>{ms.name || ms.handle}</b>
                {ms.verified ? <span style={{ color: '#3B82F6', marginLeft: 3 }}>✓</span> : null}
                <span style={{ fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '0 5px', borderRadius: 'var(--radius-xs)', marginLeft: 6 }}>主推</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>@{ms.handle} · {fmtNum(ms.followers)} 粉</div>
            </div>
          </div>
          {ms.text ? <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>&ldquo;{ms.text}&rdquo;</div> : null}
        </a>
      ) : (
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 }}>无单一主推 KOL,caller 群驱动</div>
      )}

      {/* call 时间线 */}
      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 7 }}>
        call 时间线 · {nt.mention_count ?? timeline.length} 条提及 · 点跳原推
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
        {timeline.map((t) => {
          const s = SENT[t.sentiment || 'neutral'] || SENT.neutral
          return (
            <li key={t.tweet_id} style={{ marginBottom: 8 }}>
              <a href={tweetUrl(t)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <b style={{ fontWeight: 500, color: t.is_main_shill ? 'var(--accent)' : 'var(--text)' }}>{t.name || t.handle}</b>
                  {t.verified ? <span style={{ color: '#3B82F6', fontSize: 10, marginLeft: 2 }}>✓</span> : null}
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, marginLeft: 5 }}>@{t.handle}</span>
                  {t.is_first_call ? <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 5 }}>· 首 call</span> : null}
                  <span style={{ color: s.color, fontSize: 10, marginLeft: 5 }}>· {s.label}</span>
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono, ui-monospace)', flexShrink: 0 }}>
                  <i className="ti ti-eye" style={{ fontSize: 11, verticalAlign: '-1px' }} aria-hidden="true" /> {fmtNum(t.impressions)}
                </span>
              </a>
            </li>
          )
        })}
      </ol>

      {/* 元 */}
      <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--line-soft)', fontSize: 10, color: 'var(--text-3)' }}>
        推特数据更新于 {ago(nt.fetched_at, now)} · 聚合自公开信息,非投资建议
      </div>
    </article>
  )
}
