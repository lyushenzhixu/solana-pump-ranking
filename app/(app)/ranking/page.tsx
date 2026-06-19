export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import DataFreshness from '@/components/ui/DataFreshness'
import RankingTabs from '@/components/ranking/RankingTabs'
import { getPumpRanking, getKbSignals, getZhilabsRanking } from '@/lib/queries'
import { buildKbBadgeMap, toRankingRows, kbToRankingRows } from '@/lib/rankingMerge'

export default async function RankingPage() {
  const [pumpResult, kbResult, zhilabsResult] = await Promise.all([
    getPumpRanking(20), getKbSignals(), getZhilabsRanking(),
  ])
  if (pumpResult.error && kbResult.error) {
    throw new Error(`数据加载失败: ${pumpResult.error.message} / ${kbResult.error.message}`)
  }
  const pumpRows = (pumpResult.data as any[]) ?? []
  const kbRows = (kbResult.data as any[]) ?? []
  const zhilabsRows = (zhilabsResult.data as any[]) ?? []

  const badgeMap = buildKbBadgeMap(kbRows)
  const pump = toRankingRows(pumpRows, badgeMap)
  const zhilabs = toRankingRows(zhilabsRows, badgeMap)
  const kb = kbToRankingRows(kbRows.filter((r) => r.has_signal === true)).concat(
    kbToRankingRows(kbRows.filter((r) => r.has_signal !== true)),
  ) // 有信号优先,其余存活在后

  const latestKbIso = kbRows.reduce<string | null>((acc, r) => (r.discovered_at && (!acc || r.discovered_at > acc) ? r.discovered_at : acc), null)

  return (
    <main style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>发现榜</h1>
        <DataFreshness iso={latestKbIso} />
      </div>
      <RankingTabs pump={pump} zhilabs={zhilabs} kb={kb} />
    </main>
  )
}
