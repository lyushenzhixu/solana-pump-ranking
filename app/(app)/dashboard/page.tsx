export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Topbar from '@/components/shell/Topbar'
import MetricCard from '@/components/ui/MetricCard'
import PreviewCard from '@/components/ui/PreviewCard'
import { getKbSignals, getPaperSummary } from '@/lib/queries'

export default async function DashboardPage() {
  const [{ data: signals }, { data: summary }] = await Promise.all([
    getKbSignals(),
    getPaperSummary(),
  ])

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

  return (
    <>
      <Topbar title="行情总览" />

      <main style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 指标卡区 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 12,
          }}
        >
          <MetricCard
            label="总市值"
            value="—"
            sub="即将接入"
            tone="muted"
          />
          <MetricCard
            label="恐贪指数"
            value="—"
            sub="即将接入"
            tone="muted"
          />
          <MetricCard
            label="今日 KB 信号"
            value={String(kbCount)}
            sub="已落档"
            tone="muted"
          />
          <MetricCard
            label="模拟盘总收益"
            value={returnVal}
            tone={returnTone}
          />
        </div>

        {/* ── 预览面板区 ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                  return (
                    <div
                      key={row.ca ?? idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 0',
                        borderBottom:
                          idx < top.length - 1 ? '1px solid var(--line-soft)' : 'none',
                      }}
                    >
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
                    </div>
                  )
                })}
              </div>
            )}
          </PreviewCard>

          {/* 模拟盘预览 */}
          <PreviewCard title="模拟盘" href="/paper">
            {s ? (
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                活仓 {s.active_count ?? '—'} · 已平 {s.closed_count ?? '—'} · 胜率{' '}
                {s.win_rate_pct != null ? `${s.win_rate_pct.toFixed(0)}%` : '—'}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>暂无数据</div>
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
