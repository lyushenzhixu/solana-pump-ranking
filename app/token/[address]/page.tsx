export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getKbSignalByCa } from '@/lib/queries'
import DexChart from '@/components/token/DexChart'
import TokenSections from '@/components/token/TokenSections'

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
      <DexChart address={address} />

      {/* 三卡(行情+安全 / 叙事 / 推文) */}
      <TokenSections address={address} />
    </main>
  )
}
