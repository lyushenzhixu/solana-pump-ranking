export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import MetricCard from '@/components/ui/MetricCard'
import DataFreshness from '@/components/ui/DataFreshness'
import EmptyState from '@/components/ui/EmptyState'
import { getPaperSummary, getPaperTrades } from '@/lib/queries'

/** 格式化市值 */
function fmtMc(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val)}`
}

export default async function PaperPage() {
  const [summaryResult, tradesResult] = await Promise.all([
    getPaperSummary(),
    getPaperTrades(),
  ])

  // trades error → throw
  if (tradesResult.error) {
    throw new Error(`模拟盘数据加载失败: ${tradesResult.error.message}`)
  }

  type Summary = {
    total_return_pct?: number | null
    equity_usd?: number | null
    win_rate_pct?: number | null
    active_count?: number | null
    closed_count?: number | null
    last_success_at?: string | null
  }
  type Trade = {
    trade_id?: string | null
    ca?: string | null
    ticker?: string | null
    status?: string | null
    source?: string | null
    entry_mc?: number | null
    current_mc?: number | null
    pnl_pct?: number | null
  }

  const summary = summaryResult.data as unknown as Summary | null
  const trades: Trade[] = (tradesResult.data as unknown as Trade[] | null) ?? []

  // total_return_pct tone
  const returnTone: 'pos' | 'neg' | 'muted' =
    summary?.total_return_pct == null
      ? 'muted'
      : summary.total_return_pct > 0
      ? 'pos'
      : summary.total_return_pct < 0
      ? 'neg'
      : 'muted'

  return (
    <>
      <main style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', marginBottom: 14 }}>模拟盘战绩</h1>

        {/* ── 免责横幅 ── */}
        <div
          style={{
            background: 'var(--down-bg)',
            border: '1px solid oklch(68% 0.17 22 / 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 14px',
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 500, color: 'var(--down)', marginRight: 6 }}>PAPER</span>
          模拟盘，非投资建议。全量含亏损，不 cherry-pick。
        </div>

        {/* ── Summary 指标卡区 ── */}
        {summary && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 12,
              }}
            >
              <MetricCard
                label="总收益"
                value={
                  summary.total_return_pct != null
                    ? `${summary.total_return_pct > 0 ? '+' : ''}${summary.total_return_pct.toFixed(1)}%`
                    : '—'
                }
                tone={returnTone}
              />
              <MetricCard
                label="权益"
                value={
                  summary.equity_usd != null
                    ? `$${summary.equity_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : '—'
                }
              />
              <MetricCard
                label="胜率"
                value={
                  summary.win_rate_pct != null
                    ? `${summary.win_rate_pct.toFixed(1)}%`
                    : '—'
                }
              />
              <MetricCard
                label="活仓 · 已平"
                value={`${summary.active_count ?? '—'} / ${summary.closed_count ?? '—'}`}
              />
            </div>

            {/* 数据新鲜度 */}
            <div>
              <DataFreshness iso={summary.last_success_at ?? null} />
            </div>
          </>
        )}

        {/* ── 交易记录表 ── */}
        <section>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: 10,
            }}
          >
            交易记录
          </div>

          {trades.length === 0 ? (
            <EmptyState title="暂无模拟盘记录" hint="paper trade 信号落档后同步" />
          ) : (
            <div
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--line-soft)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--line-soft)',
                      color: 'var(--text-3)',
                      fontSize: 11,
                      fontWeight: 400,
                    }}
                  >
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>Token</th>
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>来源</th>
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>状态</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>Entry MC</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>当前·平仓</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>盈亏</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, idx) => {
                    const tokenLabel =
                      trade.ticker ||
                      (trade.ca ? trade.ca.slice(0, 6) + '…' : '—')

                    const statusLabel =
                      trade.status === 'open'
                        ? '活仓'
                        : trade.status === 'closed'
                        ? '已平'
                        : trade.status ?? '—'

                    const statusColor =
                      trade.status === 'open'
                        ? 'var(--up)'
                        : trade.status === 'closed'
                        ? 'var(--text-3)'
                        : 'var(--text-2)'

                    const pnl = trade.pnl_pct
                    const pnlColor =
                      pnl == null
                        ? 'var(--text-2)'
                        : pnl > 0
                        ? 'var(--up)'
                        : pnl < 0
                        ? 'var(--down)'
                        : 'var(--text-2)'

                    const pnlLabel =
                      pnl == null
                        ? '—'
                        : `${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%`

                    return (
                      <tr
                        key={trade.trade_id ?? idx}
                        style={{
                          borderBottom:
                            idx < trades.length - 1
                              ? '1px solid var(--line-soft)'
                              : 'none',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 14px',
                            color: 'var(--text)',
                            fontWeight: 500,
                          }}
                        >
                          {tokenLabel}
                        </td>
                        <td
                          style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 12 }}
                        >
                          {trade.source || '—'}
                        </td>
                        <td
                          style={{ padding: '10px 14px', color: statusColor, fontSize: 12 }}
                        >
                          {statusLabel}
                        </td>
                        <td
                          className="num"
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            color: 'var(--text-2)',
                          }}
                        >
                          {fmtMc(trade.entry_mc)}
                        </td>
                        <td
                          className="num"
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            color: 'var(--text-2)',
                          }}
                        >
                          {fmtMc(trade.current_mc)}
                        </td>
                        <td
                          className="num"
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 500,
                            color: pnlColor,
                          }}
                        >
                          {pnlLabel}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </>
  )
}
