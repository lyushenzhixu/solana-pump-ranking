'use client'

import { useEffect, useState } from 'react'

interface InitialToken {
  name?: string | null
  symbol?: string | null
  chain?: string | null
  main_pair?: string | null
}

interface Props {
  address: string
  initialToken?: InitialToken | null
}

/** 内部链标识 → DexScreener embed 链 slug */
function toDexScreenerSlug(chain: string): string {
  const MAP: Record<string, string> = {
    solana: 'solana',
    sol: 'solana',
    eth: 'ethereum',
    ethereum: 'ethereum',
    bsc: 'bsc',
    base: 'base',
    arbitrum: 'arbitrum',
    polygon: 'polygon',
    avalanche: 'avalanche',
    optimism: 'optimism',
    ton: 'ton',
  }
  return MAP[chain.toLowerCase()] ?? 'solana'
}

type FetchState = 'loading' | 'ready' | 'no-pair' | 'error'

/**
 * DexChart — DexScreener embed K 线图
 * 1. fetch /api/token/:address → 取 main_pair + chain + name/symbol
 * 2. 有 pair → 渲染 DexScreener iframe embed
 * 3. 无 pair / 失败 → 友好占位
 */
function computeFromToken(token: InitialToken | null | undefined, address: string): {
  state: FetchState; title: string; iframeSrc: string
} | null {
  if (!token) return null
  const name = token.name || ''
  const symbol = token.symbol || ''
  const t = name ? `${name}${symbol ? ` (${symbol})` : ''}` : address.slice(0, 8) + '…'
  const pair = token.main_pair || null
  const chain = token.chain || 'solana'
  if (!pair) return { state: 'no-pair', title: t, iframeSrc: '' }
  const slug = toDexScreenerSlug(chain)
  const src = `https://dexscreener.com/${slug}/${pair}?embed=1&theme=dark&info=0&trades=0`
  return { state: 'ready', title: t, iframeSrc: src }
}

export default function DexChart({ address, initialToken }: Props) {
  const precomputed = computeFromToken(initialToken, address)
  const [state, setState] = useState<FetchState>(precomputed?.state ?? 'loading')
  const [title, setTitle] = useState(precomputed?.title ?? '')
  const [iframeSrc, setIframeSrc] = useState(precomputed?.iframeSrc ?? '')
  // Track whether we already have server-prefetched data to skip client fetch
  const hasInitial = precomputed != null

  useEffect(() => {
    if (hasInitial) return

    let cancelled = false

    async function init() {
      try {
        const res = await fetch(`/api/token/${address}`)
        if (!res.ok) {
          if (!cancelled) setState('error')
          return
        }
        const token = await res.json()
        if (cancelled) return

        const name: string = token.name || ''
        const symbol: string = token.symbol || ''
        setTitle(name ? `${name}${symbol ? ` (${symbol})` : ''}` : address.slice(0, 8) + '…')

        const pair: string | null = token.main_pair || null
        const chain: string = token.chain || 'solana'

        if (!pair) {
          setState('no-pair')
          return
        }

        const slug = toDexScreenerSlug(chain)
        const src = `https://dexscreener.com/${slug}/${pair}?embed=1&theme=dark&info=0&trades=0`
        setIframeSrc(src)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    init()
    return () => { cancelled = true }
  }, [address, hasInitial])

  return (
    <div className="panel" style={{ padding: '16px', marginBottom: 16 }}>
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
        {state === 'loading' && (
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>
            加载中…
          </span>
        )}
      </div>

      {/* skeleton 占位 */}
      {state === 'loading' && (
        <div
          className="skeleton"
          style={{
            width: '100%',
            height: 480,
            borderRadius: 'var(--radius-sm)',
          }}
        />
      )}

      {/* DexScreener iframe */}
      {state === 'ready' && iframeSrc && (
        <div
          style={{
            width: '100%',
            height: 480,
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <iframe
            src={iframeSrc}
            title={`${title} — DexScreener 行情图`}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            allow="clipboard-write"
          />
        </div>
      )}

      {/* 无 pair 占位 */}
      {(state === 'no-pair' || state === 'error') && (
        <div
          style={{
            height: 80,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
          }}
        >
          {state === 'error' ? 'K 线加载失败' : '该代币暂无可用图表'}
        </div>
      )}
    </div>
  )
}
