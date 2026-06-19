'use client'

import { useEffect, useState } from 'react'
import RankingTable from './RankingTable'
import SmartMoneyPanels from '@/components/smart-money/SmartMoneyPanels'
import type { RankingRowData } from '@/lib/rankingMerge'

type Tab = 'pump' | 'zhilabs' | 'kb' | 'binance'
const TABS: { key: Tab; label: string }[] = [
  { key: 'pump', label: '成交量榜' },
  { key: 'zhilabs', label: 'Zhilabs' },
  { key: 'kb', label: 'KB 信号' },
  { key: 'binance', label: '聪明钱' },
]

export default function RankingTabs({ pump, zhilabs, kb }: { pump: RankingRowData[]; zhilabs: RankingRowData[]; kb: RankingRowData[] }) {
  const [tab, setTab] = useState<Tab>('pump')
  useEffect(() => { if (typeof window !== 'undefined' && window.location.hash === '#kb') setTab('kb') }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line-soft)', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: 13.5,
              color: tab === t.key ? 'var(--text)' : 'var(--text-3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pump' && <RankingTable rows={pump} />}
      {tab === 'zhilabs' && <RankingTable rows={zhilabs} />}
      {tab === 'kb' && <RankingTable rows={kb} />}
      {tab === 'binance' && <SmartMoneyPanels />}
    </div>
  )
}
