import Topbar from '@/components/shell/Topbar'
import ComingSoon from '@/components/ui/ComingSoon'

export default function PerpsPage() {
  return (
    <>
      <Topbar title="永续合约" />
      <main style={{ padding: '18px 22px' }}>
        <ComingSoon
          sector="永续合约"
          blurb="资金费率、未平仓量、爆仓数据与大户持仓，聚合 Drift / Hyperliquid 等公开数据。即将上线。"
        />
      </main>
    </>
  )
}
