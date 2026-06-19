export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import Topbar from '@/components/shell/Topbar'
import EmptyState from '@/components/ui/EmptyState'
import TweetTimelineCard, { SignalRow } from '@/components/signals/TweetTimelineCard'
import { getKbSignals } from '@/lib/queries'

// 信号日志 = 带推特 call 时间线的透明信号 feed。数据来自 KB(kb_signals.narrative_twitter)。
export default async function SignalsPage() {
  const { data } = await getKbSignals()
  const rows = (data || []) as unknown as SignalRow[]
  const withTimeline = rows.filter((r) => r.narrative_twitter?.status === 'generated')
  const now = Date.now()

  return (
    <>
      <Topbar title="信号日志" />
      <main style={{ padding: '18px 22px', maxWidth: 760, margin: '0 auto' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 16px', lineHeight: 1.6 }}>
          链上信号 + 推特 call 时间线,带时间戳透明落档。每条 call 可点跳原推核验。聚合自公开信息,非投资建议。
        </p>

        {withTimeline.length === 0 ? (
          <EmptyState
            title="暂无带推特时间线的信号"
            hint="进榜币的推特 call 时间线每 2 小时富化一次,稍后回来看。我们宁可不显,也不硬凑。"
          />
        ) : (
          withTimeline.map((r) => <TweetTimelineCard key={r.ca} row={r} now={now} />)
        )}
      </main>
    </>
  )
}
