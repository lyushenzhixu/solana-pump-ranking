export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import Topbar from '@/components/shell/Topbar'
import Badge from '@/components/ui/Badge'
import DataFreshness from '@/components/ui/DataFreshness'
import EmptyState from '@/components/ui/EmptyState'
import { getPumpRanking, getKbSignals } from '@/lib/queries'

/** 格式化市值：$X.XXM / $XXK / $XXX */
function fmtMc(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val)}`
}

/** 格式化 24h 量：$XK / $X.XM */
function fmtVol(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val)}`
}

export default async function MemePage() {
  // 并行拉两路数据，防级联瀑布
  const [pumpResult, kbResult] = await Promise.all([
    getPumpRanking(20),
    getKbSignals(),
  ])

  // 两者都 error 才 throw
  if (pumpResult.error && kbResult.error) {
    throw new Error(
      `数据加载失败: ${pumpResult.error.message} / ${kbResult.error.message}`
    )
  }

  // After the dual-error guard, at least one succeeded.
  // Cast through unknown to avoid GenericStringError union confusion.
  type PumpRow = {
    token?: string | null
    name?: string | null
    symbol?: string | null
    market_cap?: number | null
    tx_volume_u_24h?: number | null
    holders?: number | null
  }
  type KbRow = {
    ca?: string | null
    name?: string | null
    score?: number | null
    conviction_rating?: string | null
    cluster_risk?: unknown
    smart_money_24h?: unknown
    revival?: unknown
    market_cap?: number | null
    discovered_at?: string | null
  }

  const pumpRows: PumpRow[] = (pumpResult.data as unknown as PumpRow[] | null) ?? []
  const kbRows: KbRow[] = (kbResult.data as unknown as KbRow[] | null) ?? []

  // 取 kbRows 里最大 discovered_at 作新鲜度
  const latestKbIso =
    kbRows.length > 0
      ? kbRows.reduce<string | null>((acc, r) => {
          if (!r.discovered_at) return acc
          if (!acc) return r.discovered_at
          return r.discovered_at > acc ? r.discovered_at : acc
        }, null)
      : null

  return (
    <>
      <Topbar title="Meme · 链上" />

      <main style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── 段1:成交量榜 24h ── */}
        <section>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: 10,
            }}
          >
            成交量榜 · 24h
          </div>

          {pumpRows.length === 0 ? (
            <EmptyState title="暂无成交量数据" hint="链上数据稍后同步" />
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
                    <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h 量</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>持有人</th>
                  </tr>
                </thead>
                <tbody>
                  {pumpRows.map((row, idx) => {
                    const displayName =
                      row.name || row.symbol || (row.token ? row.token.slice(0, 6) + '…' : '—')
                    return (
                      <tr
                        key={row.token ?? idx}
                        style={{
                          borderBottom:
                            idx < pumpRows.length - 1
                              ? '1px solid var(--line-soft)'
                              : 'none',
                        }}
                      >
                        <td
                          className="num"
                          style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                          {displayName}
                        </td>
                        <td
                          className="num"
                          style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                        >
                          {fmtMc(row.market_cap)}
                        </td>
                        <td
                          className="num"
                          style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                        >
                          {fmtVol(row.tx_volume_u_24h)}
                        </td>
                        <td
                          className="num"
                          style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                        >
                          {row.holders != null ? row.holders.toLocaleString() : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 段2:知智 KB 信号 ── */}
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
              知智 KB 信号
            </span>
            <DataFreshness iso={latestKbIso} />
          </div>

          {kbRows.length === 0 ? (
            <EmptyState title="暂无 KB 信号" hint="等待 scout cron 同步" />
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
                    <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>综合分</th>
                    <th style={{ padding: '9px 14px', textAlign: 'left' }}>信号</th>
                    <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
                  </tr>
                </thead>
                <tbody>
                  {kbRows.map((row, idx) => {
                    const displayName =
                      row.name || (row.ca ? row.ca.slice(0, 6) + '…' : '—')

                    // 解析 jsonb 字段
                    const sm = row.smart_money_24h as { wallet_count?: number } | null
                    const rev = row.revival as { status?: string } | null
                    const cr = row.cluster_risk as { level?: string } | null

                    return (
                      <tr
                        key={row.ca ?? idx}
                        style={{
                          borderBottom:
                            idx < kbRows.length - 1
                              ? '1px solid var(--line-soft)'
                              : 'none',
                        }}
                      >
                        <td
                          className="num"
                          style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text)' }}>
                          {displayName}
                        </td>
                        <td
                          className="num"
                          style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                        >
                          {row.score != null ? row.score.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {sm && (sm.wallet_count ?? 0) > 0 && (
                              <Badge kind="smart">聪明钱 {sm.wallet_count}</Badge>
                            )}
                            {rev?.status && (
                              <Badge kind="revival">复活</Badge>
                            )}
                            {cr?.level === 'high' && (
                              <Badge kind="cluster">cluster 高</Badge>
                            )}
                            {row.conviction_rating && (
                              <Badge kind="conviction">{row.conviction_rating}</Badge>
                            )}
                          </div>
                        </td>
                        <td
                          className="num"
                          style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                        >
                          {fmtMc(row.market_cap)}
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
