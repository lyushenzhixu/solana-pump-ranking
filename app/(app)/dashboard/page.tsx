export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import Topbar from '@/components/shell/Topbar'
import MetricCard from '@/components/ui/MetricCard'
import PreviewCard from '@/components/ui/PreviewCard'
import { getKbSignals, getPaperSummary } from '@/lib/queries'
import { getMarketOverview } from '@/lib/fetchers/marketOverview'
import { fetchSmartMoneySignals } from '@/lib/sources/index.js'

export default async function DashboardPage() {
  const [sigRes, sumRes, overview, smRaw] = await Promise.all([
    getKbSignals(),
    getPaperSummary(),
    getMarketOverview(),
    fetchSmartMoneySignals({ page: 1, pageSize: 5, chainId: 'CT_501' }).catch(() => []),
  ])
  const smRows: Array<{ name?: string; symbol?: string; ticker?: string; contractAddress?: string; contract_address?: string }> =
    Array.isArray(smRaw) ? smRaw.slice(0, 5) : []

  // Both failing → throw so error.tsx takes over; single failure → soft degrade
  if (sigRes.error && sumRes.error) {
    throw new Error('行情总览数据加载失败')
  }

  const signals = sigRes.data ?? null
  const summary = sumRes.data ?? null

  type KbRow = {
    ca?: string | null
    name?: string | null
    score?: number | null
  }
  type Summary = {
    total_return_pct?: number | null
    active_count?: number | null
    closed_count?: number | null
    win_rate_pct?: number | null
  }

  const top = ((signals as unknown as KbRow[] | null) ?? []).slice(0, 5)
  const s = summary as unknown as Summary | null

  const returnVal = s?.total_return_pct != null
    ? `${s.total_return_pct > 0 ? '+' : ''}${s.total_return_pct.toFixed(1)}%`
    : '—'
  const returnTone: 'pos' | 'neg' | 'muted' =
    s?.total_return_pct == null
      ? 'muted'
      : s.total_return_pct > 0
      ? 'pos'
      : s.total_return_pct < 0
      ? 'neg'
      : 'muted'

  const kbCount = (signals as unknown as KbRow[] | null)?.length ?? 0

  const fmtTotalMc = (v: number | null) =>
    v == null ? '—' : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(0)}B` : `$${(v / 1e6).toFixed(0)}M`
  const mcChg = overview.totalMcChange24h
  const fng = overview.fearGreedValue
  const fngTone: 'pos' | 'neg' | 'muted' = fng == null ? 'muted' : fng >= 55 ? 'pos' : fng <= 45 ? 'neg' : 'muted'

  return (
    <>
      <Topbar title="行情总览" />

      <main style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 指标卡区 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
          }}
        >
          <MetricCard
            label="总市值"
            value={fmtTotalMc(overview.totalMcUsd)}
            sub={mcChg != null ? `${mcChg > 0 ? '+' : ''}${mcChg.toFixed(2)}% · 24h` : '暂不可用'}
            tone={mcChg == null ? 'muted' : mcChg > 0 ? 'pos' : 'neg'}
          />
          <MetricCard
            label="恐贪指数"
            value={fng != null ? String(fng) : '—'}
            sub={overview.fearGreedLabel ?? '暂不可用'}
            tone={fngTone}
          />
          <MetricCard
            label="今日 KB 信号"
            value={String(kbCount)}
            countUpValue={kbCount}
            sub="已落档"
            tone="muted"
          />
          <MetricCard
            label="模拟盘总收益"
            value={returnVal}
            tone={returnTone}
          />
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -8 }}>
          市场数据 as of {new Date(overview.asOf).toLocaleString('zh-CN', { hour12: false })} · 恐贪/总市值来自公开源
        </div>

        {/* ── 预览面板区 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {/* Meme 热榜预览 */}
          <PreviewCard title="Meme 热榜" href="/meme">
            {top.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>暂无信号数据</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {top.map((row, idx) => {
                  const displayName = row.name || (row.ca ? row.ca.slice(0, 6) + '…' : '—')
                  const rowContent = (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-3)',
                            fontVariantNumeric: 'tabular-nums',
                            width: 16,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{displayName}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-2)',
                          fontFamily: 'var(--mono)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {row.score != null ? row.score.toFixed(1) : '—'}
                      </span>
                    </>
                  )
                  const rowStyle: CSSProperties = {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom:
                      idx < top.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  }
                  return row.ca ? (
                    <Link
                      key={row.ca}
                      href={`/token/${row.ca}`}
                      style={{
                        ...rowStyle,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                      className="clickable-row"
                    >
                      {rowContent}
                    </Link>
                  ) : (
                    <div key={idx} style={rowStyle}>
                      {rowContent}
                    </div>
                  )
                })}
              </div>
            )}
          </PreviewCard>

          {/* 模拟盘预览 */}
          <PreviewCard title="模拟盘" href="/paper">
            {s ? (
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
                <div>总收益(含浮盈){' '}
                  <span style={{ color: s.total_return_pct != null && s.total_return_pct > 0 ? 'var(--up)' : s.total_return_pct != null && s.total_return_pct < 0 ? 'var(--down)' : 'var(--text-2)', fontFamily: 'var(--mono)' }}>
                    {returnVal}
                  </span>
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                  活仓 {s.active_count ?? '—'} · 已平 {s.closed_count ?? '—'} · 已平仓胜率 {s.win_rate_pct != null ? `${s.win_rate_pct.toFixed(0)}%` : '—'}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>暂无数据</div>
            )}
          </PreviewCard>

          {/* Solana 聪明钱近期活动(仅取 CT_501 一路,口径与标题一致) */}
          <PreviewCard title="Solana 聪明钱近期活动" href="/smart-money">
            {smRows.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>暂无聪明钱数据</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {smRows.map((row, idx) => {
                  const ca = row.contractAddress || row.contract_address || ''
                  const nm = row.ticker || row.name || row.symbol || (ca ? ca.slice(0, 6) + '…' : '—')
                  return (
                    <div key={ca || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: idx < smRows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', width: 16, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{nm}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </PreviewCard>
        </div>

        {/* ── 底部占位提示 ── */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            paddingTop: 4,
          }}
        >
          永续 / 预测市场板块即将上线 ·{' '}
          <Link
            href="/perps"
            style={{ color: 'var(--text-3)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            查看
          </Link>
        </div>

      </main>
    </>
  )
}
