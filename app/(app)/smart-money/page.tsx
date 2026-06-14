import Topbar from '@/components/shell/Topbar'
import SmartMoneyPanels from '@/components/smart-money/SmartMoneyPanels'

export default function SmartMoneyPage() {
  return (
    <>
      <Topbar title="聪明钱追踪" />
      <main style={{ padding: '18px 22px' }}>
        <SmartMoneyPanels />
      </main>
    </>
  )
}
