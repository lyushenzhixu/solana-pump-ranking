export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { supabase } from '@/lib/supabase'
import { renderPaperPage } from '@/src/views/paper-page.js'
import { extractLegacy } from '@/lib/legacy'
import LegacyRuntime from '@/components/LegacyRuntime'

export default async function PaperPage() {
  const { data: summary } = await supabase
    .from('paper_summary')
    .select('*')
    .eq('id', 'main')
    .maybeSingle()

  const { data: trades } = await supabase
    .from('paper_trades')
    .select('*')
    .order('opened_at', { ascending: false })

  const doc = renderPaperPage({ summary, trades: trades || [] })
  const { prelude, body, scripts } = extractLegacy(doc)

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: prelude + body }} />
      <LegacyRuntime scripts={scripts} />
    </>
  )
}
