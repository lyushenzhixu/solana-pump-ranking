import Topbar from '@/components/shell/Topbar'
import ComingSoon from '@/components/ui/ComingSoon'

export default function SignalsPage() {
  return (
    <>
      <Topbar title="信号日志" />
      <main style={{ padding: '18px 22px' }}>
        <ComingSoon
          sector="信号日志"
          blurb="所有信号带时间戳透明落档，结果随时间公开累积。即将上线。"
        />
      </main>
    </>
  )
}
