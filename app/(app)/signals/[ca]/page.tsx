export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Topbar from '@/components/shell/Topbar'
import EmptyState from '@/components/ui/EmptyState'
import TweetTimelineCard, { SignalRow } from '@/components/signals/TweetTimelineCard'
import { getKbSignalByCa } from '@/lib/queries'

interface PageProps {
  params: Promise<{ ca: string }>
}

// 信号详情 = 单个信号的完整推特 call 时间线卡。
export default async function SignalDetailPage({ params }: PageProps) {
  const { ca } = await params
  const { data } = await getKbSignalByCa(ca)
  const row = (data as unknown as SignalRow | null) || null
  const now = Date.now()
  const hasTimeline = row?.narrative_twitter?.status === 'generated'

  return (
    <>
      <Topbar title="信号详情" />
      <main style={{ padding: '18px 22px', maxWidth: 760, margin: '0 auto' }}>
        <Link
          href="/signals"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 14 }}
        >
          <i className="ti ti-chevron-left" style={{ fontSize: 15 }} aria-hidden="true" /> 信号日志
        </Link>

        {hasTimeline && row ? (
          <TweetTimelineCard row={row} now={now} />
        ) : (
          <EmptyState
            title="该信号暂无推特时间线"
            hint="可能尚未富化、推特 0 召回,或该币已下架。每 2 小时富化一次进榜币。"
          />
        )}
      </main>
    </>
  )
}
