import Topbar from '@/components/shell/Topbar'
import ComingSoon from '@/components/ui/ComingSoon'

export default function SmartMoneyPage() {
  return (
    <>
      <Topbar title="聪明钱追踪" />
      <main style={{ padding: '18px 22px' }}>
        <ComingSoon
          sector="聪明钱追踪"
          blurb="跨板块追踪聪明钱与大户在 meme / 永续 / 预测市场的动作。即将上线。"
        />
      </main>
    </>
  )
}
