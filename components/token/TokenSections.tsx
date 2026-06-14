'use client'

import { useEffect, useState } from 'react'

interface Props {
  address: string
}

// ─── 行情 / 安全 / 持仓卡 ─────────────────────────────────────────────────────

function fmtMc(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val)}`
}

function fmtPrice(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val < 0.000001) return val.toExponential(3)
  if (val < 0.01) return `$${val.toFixed(6)}`
  return `$${val.toFixed(4)}`
}

function SkeletonRow() {
  return (
    <div
      className="skeleton"
      style={{ height: 18, borderRadius: 4, marginBottom: 8, width: '60%' }}
    />
  )
}

function CardShell({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="panel" style={{ padding: '16px', marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          borderBottom: '1px solid var(--line-soft)',
          paddingBottom: 10,
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 15, color: 'var(--accent)' }} />
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function KV({ k, v, tone }: { k: string; v: string; tone?: 'up' | 'down' | 'warn' }) {
  const color =
    tone === 'up'
      ? 'var(--up)'
      : tone === 'down'
      ? 'var(--down)'
      : tone === 'warn'
      ? 'var(--warn)'
      : 'var(--text)'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '4px 0',
        borderBottom: '1px solid var(--line-soft)',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{k}</span>
      <span
        style={{
          fontSize: 13,
          fontFamily: 'var(--mono)',
          fontVariantNumeric: 'tabular-nums',
          color,
        }}
      >
        {v}
      </span>
    </div>
  )
}

// ── 1. 行情 / 安全卡 ──────────────────────────────────────────────────────────

function MarketCard({ address }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/token/${address}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [address])

  return (
    <CardShell title="行情 · 安全" icon="ti-report-analytics">
      {loading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>行情数据暂时不可用</p>
      )}
      {!loading && !error && data && (
        <>
          <KV k="价格" v={fmtPrice(data.price_usd ?? data.price)} />
          <KV k="市值 (MC)" v={fmtMc(data.market_cap ?? data.mc)} />
          <KV k="24h 成交量" v={fmtMc(data.vol_24h_usd ?? data.volume_24h)} />
          {data.holders != null && (
            <KV k="持仓人数" v={String(data.holders)} />
          )}
          {data._security?.topHolderPercent != null && (
            <KV
              k="Top10 持仓 %"
              v={`${Number(data._security.topHolderPercent).toFixed(1)}%`}
              tone={data._security.topHolderPercent > 50 ? 'warn' : undefined}
            />
          )}
          {data._security?.isHoneypot != null && (
            <KV
              k="蜜罐风险"
              v={data._security.isHoneypot ? '⚠ 是' : '否'}
              tone={data._security.isHoneypot ? 'down' : undefined}
            />
          )}
          {data._security?.isMintable != null && (
            <KV
              k="可增发"
              v={data._security.isMintable ? '⚠ 是' : '否'}
              tone={data._security.isMintable ? 'warn' : undefined}
            />
          )}
        </>
      )}
    </CardShell>
  )
}

// ── 2. 叙事卡 ─────────────────────────────────────────────────────────────────

function NarrativeCard({ address }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/token/${address}/narrative`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [address])

  const summary = data?.summary ?? null

  return (
    <CardShell title="叙事分析" icon="ti-news">
      {loading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <div className="skeleton" style={{ height: 18, borderRadius: 4, width: '80%' }} />
        </>
      )}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>叙事分析暂时不可用</p>
      )}
      {!loading && !error && (
        <p
          style={{
            fontSize: 13,
            color: summary ? 'var(--text-2)' : 'var(--text-3)',
            lineHeight: 1.65,
          }}
        >
          {summary || '暂无叙事'}
        </p>
      )}
    </CardShell>
  )
}

// ── 3. 热门推文卡 ─────────────────────────────────────────────────────────────

function TweetsCard({ address }: Props) {
  const [tweets, setTweets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/token/${address}/tweets`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const arr = Array.isArray(d) ? d : d?.tweets ?? []
        setTweets(arr.slice(0, 5))
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [address])

  return (
    <CardShell title="热门推文" icon="ti-brand-x">
      {loading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>推文数据暂时不可用</p>
      )}
      {!loading && !error && tweets.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>暂无相关推文</p>
      )}
      {!loading && !error && tweets.map((t, i) => (
        <div
          key={i}
          style={{
            padding: '10px 0',
            borderBottom: i < tweets.length - 1 ? '1px solid var(--line-soft)' : 'none',
          }}
        >
          {t.author && (
            <span
              style={{
                fontSize: 11.5,
                color: 'var(--accent)',
                fontFamily: 'var(--mono)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              @{t.author}
            </span>
          )}
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-2)',
              lineHeight: 1.55,
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            {t.text}
          </p>
        </div>
      ))}
    </CardShell>
  )
}

// ── 主导出 ────────────────────────────────────────────────────────────────────

export default function TokenSections({ address }: Props) {
  return (
    <>
      <MarketCard address={address} />
      <NarrativeCard address={address} />
      <TweetsCard address={address} />
    </>
  )
}
