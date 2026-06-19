export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { buildRankingPage } from '@/src/views/ranking-page.js'
import { extractLegacy } from '@/lib/legacy'
import LegacyRuntime from '@/components/LegacyRuntime'

export default function RankingPage() {
  const doc = buildRankingPage()
  const { prelude, body, scripts } = extractLegacy(doc)

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: prelude + body }} />
      <LegacyRuntime scripts={scripts} />
    </>
  )
}
