export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import Topbar from '@/components/shell/Topbar'
import Badge from '@/components/ui/Badge'
import ClickableRow from '@/components/ui/ClickableRow'
import DataFreshness from '@/components/ui/DataFreshness'
import EmptyState from '@/components/ui/EmptyState'
import { getPumpRanking, getKbSignals, getZhilabsRanking } from '@/lib/queries'

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

/** 24h 涨跌幅:+12.3% / -8.0%,带颜色 token class */
function fmtPct(val: number | null | undefined): { text: string; cls: 'up' | 'down' | '' } {
  if (val == null) return { text: '—', cls: '' }
  const cls = val > 0 ? 'up' : val < 0 ? 'down' : ''
  return { text: `${val > 0 ? '+' : ''}${val.toFixed(1)}%`, cls }
}

export default async function MemePage() {
  // 并行拉三路数据，防级联瀑布
  const [pumpResult, kbResult, zhilabsResult] = await Promise.all([
    getPumpRanking(20),
    getKbSignals(),
    getZhilabsRanking(),
  ])

  // 两者都 error 才 throw（zhilabs 单独失败不阻断页面）
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
    price_change_24h?: number | null
    has_signal?: boolean | null
  }

  type ZhilabsRow = {
    token?: string | null
    name?: string | null
    symbol?: string | null
    market_cap?: number | null
    tx_volume_u_24h?: number | null
    holders?: number | null
  }

  const pumpRows: PumpRow[] = (pumpResult.data as unknown as PumpRow[] | null) ?? []
  const kbRows: KbRow[] = (kbResult.data as unknown as KbRow[] | null) ?? []
  const zhilabsRows: ZhilabsRow[] = (zhilabsResult.data as unknown as ZhilabsRow[] | null) ?? []

  const kbFeatured = kbRows.filter((r) => r.has_signal === true)
  const kbAlive = kbRows.filter((r) => r.has_signal !== true)

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
                      <ClickableRow
                        key={row.token ?? idx}
                        href={row.token ? `/token/${row.token}` : null}
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
                      </ClickableRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 段2:Zhilabs 榜 ── */}
        <section>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: 10,
            }}
          >
            Zhilabs 榜
          </div>

          {zhilabsRows.length === 0 ? (
            <EmptyState title="Zhilabs 榜暂无数据" hint="等待数据同步" />
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
                  {zhilabsRows.map((row, idx) => {
                    const displayName =
                      row.name || row.symbol || (row.token ? row.token.slice(0, 6) + '…' : '—')
                    return (
                      <ClickableRow
                        key={row.token ?? idx}
                        href={row.token ? `/token/${row.token}` : null}
                        style={{
                          borderBottom:
                            idx < zhilabsRows.length - 1
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
                      </ClickableRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 段3:知智 KB 信号(分组) ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>知智 KB 信号</span>
            <DataFreshness iso={latestKbIso} />
          </div>

          {kbRows.length === 0 ? (
            <EmptyState title="暂无 KB 信号" hint="等待 scout cron 同步" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 精选信号 */}
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 500, marginBottom: 8 }}>
                  ★ KB 精选信号 · {kbFeatured.length}
                </div>
                {kbFeatured.length === 0 ? (
                  <EmptyState title="当前无精选信号" hint="无评级/聪明钱/复活/集群命中" />
                ) : (
                  <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}>
                          <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
                          <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right' }}>综合分</th>
                          <th style={{ padding: '9px 14px', textAlign: 'left' }}>信号</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kbFeatured.map((row, idx) => {
                          const displayName = row.name || (row.ca ? row.ca.slice(0, 6) + '…' : '—')
                          const sm = row.smart_money_24h as { wallet_count?: number } | null
                          const rev = row.revival as { status?: string } | null
                          const cr = row.cluster_risk as { level?: string } | null
                          const pct = fmtPct(row.price_change_24h)
                          return (
                            <ClickableRow key={row.ca ?? idx} href={row.ca ? `/token/${row.ca}` : null}
                              style={{ borderBottom: idx < kbFeatured.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                              <td className="num" style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{displayName}</td>
                              <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{row.score != null ? row.score.toFixed(1) : '—'}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {sm && (sm.wallet_count ?? 0) > 0 && <Badge kind="smart">聪明钱 {sm.wallet_count}</Badge>}
                                  {rev?.status && rev.status !== 'none' && <Badge kind="revival">复活</Badge>}
                                  {(cr?.level === 'high' || cr?.level === 'medium') && <Badge kind="cluster">cluster {cr.level === 'high' ? '高' : '中'}</Badge>}
                                  {row.conviction_rating && <Badge kind="conviction">{row.conviction_rating}</Badge>}
                                </div>
                              </td>
                              <td className={`num ${pct.cls}`} style={{ padding: '10px 14px', textAlign: 'right' }}>{pct.text}</td>
                              <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{fmtMc(row.market_cap)}</td>
                            </ClickableRow>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 存活·新鲜榜(弱化,无综合分) */}
              {kbAlive.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500, marginBottom: 8 }}>
                    存活 · 新鲜榜 · {kbAlive.length}
                  </div>
                  <div style={{ background: 'var(--surface-1)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', opacity: 0.78 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line-soft)', color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}>
                          <th style={{ padding: '9px 14px', textAlign: 'left', width: 32 }}>#</th>
                          <th style={{ padding: '9px 14px', textAlign: 'left' }}>名称</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right' }}>市值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kbAlive.map((row, idx) => {
                          const displayName = row.name || (row.ca ? row.ca.slice(0, 6) + '…' : '—')
                          const pct = fmtPct(row.price_change_24h)
                          return (
                            <ClickableRow key={row.ca ?? idx} href={row.ca ? `/token/${row.ca}` : null}
                              style={{ borderBottom: idx < kbAlive.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                              <td className="num" style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>{idx + 1}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{displayName}</td>
                              <td className={`num ${pct.cls}`} style={{ padding: '10px 14px', textAlign: 'right' }}>{pct.text}</td>
                              <td className="num" style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-3)' }}>{fmtMc(row.market_cap)}</td>
                            </ClickableRow>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </section>

      </main>
    </>
  )
}
