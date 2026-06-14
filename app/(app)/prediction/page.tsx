import Topbar from '@/components/shell/Topbar'
import ComingSoon from '@/components/ui/ComingSoon'

export default function PredictionPage() {
  return (
    <>
      <Topbar title="预测市场" />
      <main style={{ padding: '18px 22px' }}>
        <ComingSoon
          sector="预测市场"
          blurb="热门市场赔率、概率走势与大额下注异动，聚合 Polymarket 等公开数据。即将上线。"
        />
      </main>
    </>
  )
}
