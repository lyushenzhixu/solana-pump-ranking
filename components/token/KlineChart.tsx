'use client'

import { useEffect, useRef, useState } from 'react'

interface OhlcvBar {
  time: number   // unix 秒
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface Props {
  address: string
}

/**
 * K线图组件 — lightweight-charts v5
 * 1. fetch /api/token/:address → 取 main_pair + name/symbol
 * 2. fetch /api/kline/:pair → OHLCV bars
 * 3. createChart + addSeries(CandlestickSeries)
 */
export default function KlineChart({ address }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState<string>('')
  const [status, setStatus] = useState<'loading' | 'no-pair' | 'error' | 'ready'>('loading')

  useEffect(() => {
    let destroyed = false
    let chart: any = null

    async function init() {
      try {
        // 1. Token 元数据 + pair
        const tokenRes = await fetch(`/api/token/${address}`)
        if (!tokenRes.ok) { setStatus('error'); return }
        const token = await tokenRes.json()

        if (!destroyed) {
          setTitle(
            token.name
              ? `${token.name}${token.symbol ? ` (${token.symbol})` : ''}`
              : address.slice(0, 8) + '…'
          )
        }

        const pair = token.main_pair
        if (!pair) { setStatus('no-pair'); return }

        // 2. OHLCV
        const klineRes = await fetch(`/api/kline/${pair}`)
        if (!klineRes.ok) { setStatus('no-pair'); return }
        const bars: OhlcvBar[] = await klineRes.json()

        if (!bars || bars.length === 0) { setStatus('no-pair'); return }
        if (destroyed) return

        // 3. Chart
        const lc = await import('lightweight-charts')

        if (destroyed || !containerRef.current) return

        chart = lc.createChart(containerRef.current, {
          width: containerRef.current.clientWidth || 860,
          height: 320,
          layout: {
            background: { color: 'transparent' },
            textColor: 'oklch(72% 0.01 285)',
          },
          grid: {
            vertLines: { color: 'oklch(40% 0.02 285 / 0.14)' },
            horzLines: { color: 'oklch(40% 0.02 285 / 0.14)' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: 'oklch(40% 0.02 285 / 0.28)',
          },
          timeScale: {
            borderColor: 'oklch(40% 0.02 285 / 0.28)',
            timeVisible: true,
            secondsVisible: false,
          },
        })

        // v5 API: addSeries(CandlestickSeries)
        const series = chart.addSeries(lc.CandlestickSeries, {
          upColor: 'oklch(78% 0.16 158)',
          downColor: 'oklch(68% 0.17 22)',
          borderUpColor: 'oklch(78% 0.16 158)',
          borderDownColor: 'oklch(68% 0.17 22)',
          wickUpColor: 'oklch(78% 0.16 158)',
          wickDownColor: 'oklch(68% 0.17 22)',
        })

        series.setData(
          bars.map((b) => ({
            time: b.time as any,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }))
        )

        chart.timeScale().fitContent()
        setStatus('ready')

        // Resize observer
        const ro = new ResizeObserver(() => {
          if (containerRef.current && chart) {
            chart.applyOptions({ width: containerRef.current.clientWidth })
          }
        })
        if (containerRef.current) ro.observe(containerRef.current)

        return () => { ro.disconnect() }
      } catch (e) {
        console.error('[KlineChart]', e)
        if (!destroyed) setStatus('error')
      }
    }

    init()

    return () => {
      destroyed = true
      chart?.remove()
    }
  }, [address])

  return (
    <div
      className="panel"
      style={{ padding: '16px', marginBottom: 16 }}
    >
      {/* 标题行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <i
          className="ti ti-chart-candle"
          style={{ fontSize: 16, color: 'var(--accent)' }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text)',
            fontFamily: 'var(--mono)',
          }}
        >
          {title || 'K 线图'}
        </span>
        {status === 'loading' && (
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>
            加载中…
          </span>
        )}
      </div>

      {/* Chart 容器 */}
      {(status === 'loading' || status === 'ready') && (
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: 320,
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            background: 'transparent',
          }}
        >
          {status === 'loading' && (
            <div
              className="skeleton"
              style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)' }}
            />
          )}
        </div>
      )}

      {status === 'no-pair' && (
        <div
          style={{
            height: 80,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
          }}
        >
          暂无交易对 K 线数据
        </div>
      )}

      {status === 'error' && (
        <div
          style={{
            height: 80,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
          }}
        >
          K 线加载失败
        </div>
      )}
    </div>
  )
}
