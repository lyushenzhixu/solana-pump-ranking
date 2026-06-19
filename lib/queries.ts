import { supabase } from './supabase'
import { KB_SIGNAL_PUBLIC_COLUMNS, PAPER_TRADE_PUBLIC_COLUMNS, assertNoSensitive } from './columns'

export async function getKbSignals() {
  assertNoSensitive([...KB_SIGNAL_PUBLIC_COLUMNS])
  return supabase
    .from('kb_signals')
    .select(KB_SIGNAL_PUBLIC_COLUMNS.join(','))
    .order('score', { ascending: false })
}

export async function getKbSignalByCa(ca: string) {
  assertNoSensitive([...KB_SIGNAL_PUBLIC_COLUMNS])
  return supabase
    .from('kb_signals')
    .select(KB_SIGNAL_PUBLIC_COLUMNS.join(','))
    .eq('ca', ca)
    .maybeSingle()
}

export async function getPumpRanking(limit = 20) {
  return supabase
    .from('solana_pump_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false })
    .limit(limit)
}

export async function getZhilabsRanking() {
  return supabase
    .from('zhilabs_ranking')
    .select('*')
    .order('tx_volume_u_24h', { ascending: false })
}

export async function getPaperSummary() {
  return supabase
    .from('paper_summary')
    .select('*')
    .eq('id', 'main')
    .maybeSingle()
}

export async function getPaperTrades() {
  return supabase
    .from('paper_trades')
    .select(PAPER_TRADE_PUBLIC_COLUMNS.join(','))
    .order('opened_at', { ascending: false })
}
