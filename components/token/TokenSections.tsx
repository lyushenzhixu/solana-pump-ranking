'use client'

import { useEffect, useState } from 'react'

interface TokenDetail {
  name?: string | null
  symbol?: string | null
  chain?: string | null
  main_pair?: string | null
  current_price_usd?: number | null
  market_cap?: number | null
  tx_volume_u_24h?: number | null
  holders?: number | null
  _security?: {
    topHolderPercent?: number | null
    isHoneypot?: boolean | null
    isMintable?: boolean | null
    isFreezable?: boolean | null
    lpNotLocked?: boolean | null
    riskLevel?: string | null
    buyTax?: number | null
    sellTax?: number | null
  } | null
  [key: string]: unknown
}

interface Props {
  address: string
  initialDetail?: TokenDetail | null
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

function MarketCard({ address, initialDetail }: Props) {
  const [data, setData] = useState<TokenDetail | null>(initialDetail ?? null)
  const [loading, setLoading] = useState(initialDetail == null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Always fetch /api/token to get _security + DB-holders fallback + fresh price.
    // initialDetail seeds the initial state so there is no loading-skeleton flash,
    // but the client fetch still runs in background to enrich and revalidate.
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
          <KV k="价格" v={fmtPrice(data.current_price_usd ?? (data as any).price_usd ?? (data as any).price)} />
          <KV k="市值 (MC)" v={fmtMc(data.market_cap ?? (data as any).mc)} />
          <KV k="24h 成交量" v={fmtMc(data.tx_volume_u_24h ?? (data as any).vol_24h_usd ?? (data as any).volume_24h)} />
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

/** 评级 → 颜色 */
function gradeColor(grade: string | undefined): string {
  if (!grade) return 'var(--text-3)'
  if (grade === 'S' || grade === 'A') return 'var(--up)'
  if (grade === 'B') return 'var(--accent)'
  if (grade === 'C') return 'var(--warn)'
  return 'var(--down)' // D or unknown
}

/** 小进度条 */
function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  const color = pct >= 75 ? 'var(--up)' : pct >= 45 ? 'var(--accent)' : 'var(--warn)'
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: 'var(--surface-2)',
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

/** 单个维度格 */
function DimCell({
  label,
  score,
  max,
  sub1,
  sub2,
}: {
  label: string
  score: number | undefined
  max: number
  sub1?: string
  sub2?: string
}) {
  const s = score ?? 0
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 6,
        padding: '9px 10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{label}</span>
        <span
          className="num"
          style={{ fontSize: 12.5, color: 'var(--text-2)' }}
        >
          {s}<span style={{ color: 'var(--text-3)', fontSize: 11 }}>/{max}</span>
        </span>
      </div>
      <ScoreBar score={s} max={max} />
      {(sub1 || sub2) && (
        <div style={{ marginTop: 5, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sub1 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub1}</span>
          )}
          {sub2 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub2}</span>
          )}
        </div>
      )}
    </div>
  )
}

function fmt(v: number | null | undefined, suffix = ''): string {
  if (v == null) return '—'
  return `${v}${suffix}`
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${Number(v).toFixed(1)}%`
}

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

  const summary: string | null = data?.summary || null
  const tn = data?.twitterNarrative ?? null

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

      {/* 新闻摘要(有才显) */}
      {!loading && !error && summary && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-2)',
            lineHeight: 1.65,
            marginBottom: tn ? 14 : 0,
          }}
        >
          {summary}
        </p>
      )}

      {/* 链上叙事评分 */}
      {!loading && !error && tn && (
        <>
          {/* 顶部评级行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            {/* 评级 badge */}
            <span
              style={{
                fontSize: 22,
                fontFamily: 'var(--mono)',
                fontWeight: 700,
                color: gradeColor(tn.narrativeGrade),
                lineHeight: 1,
                minWidth: 22,
              }}
            >
              {tn.narrativeGrade ?? '—'}
            </span>
            {/* 总分 */}
            <span
              className="num"
              style={{ fontSize: 18, color: 'var(--text-2)', fontWeight: 600 }}
            >
              {tn.totalScore ?? '—'}
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>/100</span>
            </span>
            {/* 推荐标签 */}
            {tn.recommendation && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  color: gradeColor(tn.narrativeGrade),
                  background: `${gradeColor(tn.narrativeGrade)}22`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: `1px solid ${gradeColor(tn.narrativeGrade)}44`,
                  fontWeight: 500,
                }}
              >
                {tn.recommendation}
              </span>
            )}
          </div>

          {/* 4 维度小格网格 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <DimCell
              label="市场"
              score={tn.dimensions?.market?.score}
              max={tn.dimensions?.market?.max ?? 30}
              sub1={tn.dimensions?.market?.txns24h != null
                ? `交易 ${fmt(tn.dimensions.market.txns24h)}`
                : undefined}
              sub2={tn.dimensions?.market?.buyRatio != null
                ? `买入比 ${fmtPct(tn.dimensions.market.buyRatio)}`
                : undefined}
            />
            <DimCell
              label="社区"
              score={tn.dimensions?.community?.score}
              max={tn.dimensions?.community?.max ?? 25}
              sub1={tn.dimensions?.community?.holders != null
                ? `持仓 ${fmt(tn.dimensions.community.holders)}`
                : undefined}
              sub2={tn.dimensions?.community?.topHolderPct != null
                ? `Top10 ${fmtPct(tn.dimensions.community.topHolderPct)}`
                : undefined}
            />
            <DimCell
              label="安全"
              score={tn.dimensions?.security?.score}
              max={tn.dimensions?.security?.max ?? 25}
              sub1={tn.dimensions?.security?.riskLevel
                ? `风险 ${tn.dimensions.security.riskLevel}`
                : undefined}
              sub2={tn.dimensions?.security?.lpLocked != null
                ? `LP锁 ${tn.dimensions.security.lpLocked ? '是' : '否'}`
                : undefined}
            />
            <DimCell
              label="成熟度"
              score={tn.dimensions?.maturity?.score}
              max={tn.dimensions?.maturity?.max ?? 20}
              sub1={tn.dimensions?.maturity?.ageDays != null
                ? `${fmt(tn.dimensions.maturity.ageDays)}天`
                : undefined}
              sub2={[
                tn.dimensions?.maturity?.hasTwitter ? 'X' : null,
                tn.dimensions?.maturity?.hasTelegram ? 'TG' : null,
                tn.dimensions?.maturity?.hasWebsite ? '网站' : null,
              ]
                .filter(Boolean)
                .join(' · ') || undefined}
            />
          </div>

          {/* 底部量价摘要 */}
          {(tn.mcap != null || tn.volume24h != null || tn.priceChange24h != null) && (
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderTop: '1px solid var(--line-soft)',
                paddingTop: 10,
              }}
            >
              {tn.mcap != null && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>市值</div>
                  <div className="num" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                    {fmtMc(tn.mcap)}
                  </div>
                </div>
              )}
              {tn.volume24h != null && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>24h 量</div>
                  <div className="num" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                    {fmtMc(tn.volume24h)}
                  </div>
                </div>
              )}
              {tn.priceChange24h != null && (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>24h 涨跌</div>
                  <div
                    className="num"
                    style={{
                      fontSize: 12.5,
                      color: tn.priceChange24h >= 0 ? 'var(--up)' : 'var(--down)',
                    }}
                  >
                    {tn.priceChange24h >= 0 ? '+' : ''}{Number(tn.priceChange24h).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 两者都没有 */}
      {!loading && !error && !summary && !tn && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>暂无叙事数据</p>
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

export default function TokenSections({ address, initialDetail }: Props) {
  return (
    <>
      <MarketCard address={address} initialDetail={initialDetail} />
      <NarrativeCard address={address} />
      <TweetsCard address={address} />
    </>
  )
}
