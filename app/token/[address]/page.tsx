export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getKbSignalByCa } from '@/lib/queries'
import { getTokenDetail } from '@/lib/sources/index.js'
import DexChart from '@/components/token/DexChart'
import TokenSections from '@/components/token/TokenSections'
import TweetTimelineCard, { type SignalRow } from '@/components/signals/TweetTimelineCard'

interface PageProps {
  params: Promise<{ address: string }>
}

// ─── SEO metadata ──────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { address } = await params
  const { data } = await getKbSignalByCa(address).catch(() => ({ data: null }))
  const name = (data as any)?.name || address.slice(0, 8) + '…'

  const siteUrl = process.env.SITE_URL || 'https://zhizhilabs.com'
  const title = `${name} — Zhizhilabs 链上详情`
  const description = `${name} 的链上行情、K线、叙事分析与聪明钱信号。CA: ${address}`

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/token/${address}` },
    openGraph: {
      title,
      description,
      locale: 'zh_CN',
      type: 'website',
      url: `${siteUrl}/token/${address}`,
    },
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function TokenPage({ params }: PageProps) {
  const { address } = await params

  // Server-prefetch token detail to eliminate first-paint "—" flash
  const detail = await (getTokenDetail as (a: string, c: string) => Promise<any>)(address, 'solana').catch(() => null)

  // KB 叙事信号(推特时间线)
  const { data: kb } = await getKbSignalByCa(address).catch(() => ({ data: null }))
  const signalRow: SignalRow | null = kb
    ? { ca: address, symbol: (kb as any).symbol ?? (detail as any)?.symbol ?? null, name: (kb as any).name ?? null, market_cap: (kb as any).market_cap ?? null, conviction_rating: (kb as any).conviction_rating ?? null, narrative_twitter: (kb as any).narrative_twitter ?? null }
    : null

  return (
    <main
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '24px 20px 48px',
        width: '100%',
      }}
    >
      {/* 页头面包屑 */}
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--text-3)',
          marginBottom: 20,
          fontFamily: 'var(--mono)',
          letterSpacing: '0.02em',
        }}
      >
        <a
          href="/ranking"
          style={{ color: 'var(--text-3)', textDecoration: 'none' }}
        >
          发现榜
        </a>
        <span style={{ margin: '0 6px' }}>/</span>
        <span
          style={{
            color: 'var(--text-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            maxWidth: 200,
            verticalAlign: 'bottom',
          }}
        >
          {address}
        </span>
      </div>

      {/* K 线图(客户端) */}
      <DexChart address={address} initialToken={detail} />

      {/* 推特叙事时间线卡(仅 narrative_twitter.status==='generated' 的 KB 信号显示) */}
      {signalRow ? <TweetTimelineCard row={signalRow} now={Date.now()} /> : null}

      {/* 三卡(行情+安全 / 叙事 / 推文) */}
      <TokenSections address={address} initialDetail={detail} />
    </main>
  )
}
