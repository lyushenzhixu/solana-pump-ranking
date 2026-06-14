'use client'

import { useEffect, useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'

// ── 聪明钱信号 (Binance Smart Money Signals) ──
// 字段来自 /api/smart-money-signals → binance-smart-money.js → fetchSmartMoneySignals
// 实际 Binance API 返回字段样例：contractAddress, symbol, name, logoUrl, chain,
//   smartSignalType, smartHolderCount, buyVolume24H, sellVolume24H, priceChange24H 等
type SignalItem = {
  contractAddress?: string | null
  contract_address?: string | null
  symbol?: string | null
  name?: string | null
  logoUrl?: string | null
  logoUrlFallback?: string | null
  chain?: string | null
  smartSignalType?: string | null
  smartHolderCount?: number | null
  buyVolume24H?: number | null
  sellVolume24H?: number | null
  priceChange24H?: number | null
  [key: string]: unknown
}

// ── 净流入榜 (Binance Inflow Rank) ──
// 字段来自 /api/smart-money-inflow → fetchSmartMoneyInflowRank
// 实际 Binance API 返回字段样例：tokenAddress, symbol, inflow, tokenIconUrl, chain 等
type InflowItem = {
  tokenAddress?: string | null
  symbol?: string | null
  name?: string | null
  inflow?: number | null
  tokenIconUrl?: string | null
  chain?: string | null
  [key: string]: unknown
}

function fmtUsd(val: number | null | undefined): string {
  if (val == null) return '—'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val)}`
}

function fmtPct(val: number | null | undefined): string {
  if (val == null) return '—'
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

// ── 骨架屏 ──
function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 40,
            borderBottom: i < rows - 1 ? '1px solid var(--line-soft)' : 'none',
            background: 'var(--surface-1)',
            opacity: 0.5 + (i % 2) * 0.15,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

// ── 段A: 聪明钱信号 ──
function SignalsPanel() {
  const [data, setData] = useState<SignalItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/smart-money-signals')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((json) => setData(Array.isArray(json) ? json : []))
      .catch(() => setError(true))
  }, [])

  return (
    <section>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
        聪明钱信号
      </div>

      {error ? (
        <EmptyState title="加载失败" hint="暂时无法获取聪明钱信号，稍后重试" />
      ) : data === null ? (
        <TableSkeleton rows={6} />
      ) : data.length === 0 ? (
        <EmptyState title="暂无聪明钱信号" hint="需要 Binance Web3 数据源可用" />
      ) : (
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                <th style={{ padding: '9px 14px', textAlign: 'left' }}>链</th>
                <th style={{ padding: '9px 14px', textAlign: 'right' }}>聪明钱数</th>
                <th style={{ padding: '9px 14px', textAlign: 'right' }}>买入量</th>
                <th style={{ padding: '9px 14px', textAlign: 'right' }}>24h 涨跌</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const ca = item.contractAddress || item.contract_address
                const displayName = item.name || item.symbol || (ca ? ca.slice(0, 6) + '…' : '—')
                const href = ca ? `/token/${ca}` : undefined
                const pct = item.priceChange24H
                const pctColor =
                  pct == null ? 'var(--text-2)' : pct >= 0 ? 'var(--up)' : 'var(--down)'
                return (
                  <tr
                    key={ca ?? idx}
                    onClick={href ? () => { window.location.href = href } : undefined}
                    style={{
                      cursor: href ? 'pointer' : undefined,
                      borderBottom:
                        idx < data.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}
                    className={href ? 'clickable-row' : undefined}
                  >
                    <td
                      className="num"
                      style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{displayName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>
                      {item.chain || '—'}
                    </td>
                    <td
                      className="num"
                      style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                    >
                      {item.smartHolderCount != null ? item.smartHolderCount : '—'}
                    </td>
                    <td
                      className="num"
                      style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}
                    >
                      {fmtUsd(item.buyVolume24H as number | null)}
                    </td>
                    <td
                      className="num"
                      style={{ padding: '10px 14px', textAlign: 'right', color: pctColor }}
                    >
                      {fmtPct(pct as number | null)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ── 段B: 净流入榜 ──
function InflowPanel() {
  const [data, setData] = useState<InflowItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/smart-money-inflow')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((json) => setData(Array.isArray(json) ? json : []))
      .catch(() => setError(true))
  }, [])

  return (
    <section>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
        净流入榜
      </div>

      {error ? (
        <EmptyState title="加载失败" hint="暂时无法获取流入数据，稍后重试" />
      ) : data === null ? (
        <TableSkeleton rows={6} />
      ) : data.length === 0 ? (
        <EmptyState title="暂无净流入数据" hint="需要 Binance Web3 数据源可用" />
      ) : (
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                <th style={{ padding: '9px 14px', textAlign: 'left' }}>链</th>
                <th style={{ padding: '9px 14px', textAlign: 'right' }}>净流入</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const ca = item.tokenAddress
                const displayName = item.name || item.symbol || (ca ? ca.slice(0, 6) + '…' : '—')
                const href = ca ? `/token/${ca}` : undefined
                return (
                  <tr
                    key={ca ?? idx}
                    onClick={href ? () => { window.location.href = href } : undefined}
                    style={{
                      cursor: href ? 'pointer' : undefined,
                      borderBottom:
                        idx < data.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}
                    className={href ? 'clickable-row' : undefined}
                  >
                    <td
                      className="num"
                      style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{displayName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 11 }}>
                      {item.chain || '—'}
                    </td>
                    <td
                      className="num"
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        color: (item.inflow ?? 0) >= 0 ? 'var(--up)' : 'var(--down)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtUsd(item.inflow as number | null)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function SmartMoneyPanels() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <SignalsPanel />
      <InflowPanel />
    </div>
  )
}
