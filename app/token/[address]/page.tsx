export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { supabase } from '@/lib/supabase'
import { buildTokenDetailPage } from '@/src/views/token-detail-page.js'
import { extractLegacy } from '@/lib/legacy'
import LegacyRuntime from '@/components/LegacyRuntime'

interface PageProps {
  params: Promise<{ address: string }>
}

export default async function TokenPage({ params }: PageProps) {
  const { address } = await params

  // Fetch tokenInfo exactly like the old Express route
  let tokenInfo: Record<string, unknown> | null = null

  const { data: zhilabsRow } = await supabase
    .from('zhilabs_ranking')
    .select('name, symbol, token')
    .eq('token', address)
    .maybeSingle()

  if (zhilabsRow) {
    tokenInfo = zhilabsRow
  } else {
    const { data: pumpRow } = await supabase
      .from('solana_pump_ranking')
      .select('name, symbol, token')
      .eq('token', address)
      .maybeSingle()
    if (pumpRow) tokenInfo = pumpRow
  }

  if (!tokenInfo) {
    tokenInfo = { token: address }
  }

  // Ensure token field is always set to the address from the URL
  tokenInfo = { ...tokenInfo, token: address }

  const doc = buildTokenDetailPage(tokenInfo)
  const { prelude, body, scripts } = extractLegacy(doc)

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: prelude + body }} />
      <LegacyRuntime scripts={scripts} />
    </>
  )
}
