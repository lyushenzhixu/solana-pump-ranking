import Link from 'next/link'

// ─── 营销首页 — Phase 5 ─────────────────────────────────────────────────────
// 无侧边栏。顶栏 + hero + 四板块卖点卡片。
// 哑光终端设计系统：近黑底 + 发丝边框 + 单一电紫 accent。

const FEATURE_CARDS = [
  {
    icon: 'ti-flame',
    title: 'Meme · 链上',
    desc: '聪明钱钱包实时追踪，信号第一时间落档，告别大饼 + 追高两眼摸黑。',
  },
  {
    icon: 'ti-chart-candle',
    title: '永续合约',
    desc: '跨交易所资金费率实时聚合，极端负费率 = 潜在做多信号，一眼出价差。',
  },
  {
    icon: 'ti-tournament',
    title: '预测市场',
    desc: 'Polymarket / Drift 赔率一览，宏观事件概率锚定，不猜结果只看市场共识。',
  },
  {
    icon: 'ti-archive',
    title: '信号日志',
    desc: '每条 KB 推荐留档可查，conviction 评分 + 出入场 MC，回测不靠记忆。',
  },
]

export default function MarketingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 顶栏 ───────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          height: 56,
          borderBottom: '1px solid var(--line-soft)',
          flexShrink: 0,
          gap: 10,
        }}
      >
        {/* Z logo */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          Z
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.02em',
            color: 'var(--text)',
          }}
        >
          zhizhilabs
        </span>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        {/* 进入面板 */}
        <Link
          href="/dashboard"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 16px',
            textDecoration: 'none',
          }}
        >
          进入面板
        </Link>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '72px 24px 56px',
          textAlign: 'center',
          gap: 0,
        }}
      >
        {/* eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: 20,
            padding: '4px 12px',
            marginBottom: 24,
            letterSpacing: '0.06em',
          }}
        >
          <i className="ti ti-bolt" style={{ fontSize: 12 }} />
          实时链上 · 信号落档 · 透明可审计
        </div>

        {/* H1 */}
        <h1
          style={{
            fontSize: 'clamp(26px, 5vw, 42px)',
            fontWeight: 700,
            lineHeight: 1.25,
            color: 'var(--text)',
            maxWidth: 600,
            marginBottom: 16,
          }}
        >
          一个面板,看懂整个 crypto 的钱在往哪走
        </h1>

        {/* 副文案 */}
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-2)',
            maxWidth: 520,
            lineHeight: 1.65,
            marginBottom: 36,
          }}
        >
          Meme 聪明钱、永续资金费率、预测市场赔率、宏观大盘
          —— 聚到一处,信号全程透明落档。
        </p>

        {/* CTA 组 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 24px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            免费开始
          </Link>
          <Link
            href="/meme"
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-2)',
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 24px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            看实时榜单
          </Link>
        </div>
      </section>

      {/* ── 四板块卖点卡片 ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: '0 32px 72px',
          maxWidth: 900,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* 分割线标题 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'var(--line-soft)',
            }}
          />
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-3)',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            四大模块
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'var(--line-soft)',
            }}
          />
        </div>

        {/* 卡片网格 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.title}
              className="panel"
              style={{ padding: '20px 18px' }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-bg)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 14,
                }}
              >
                <i
                  className={`ti ${card.icon}`}
                  style={{ fontSize: 18, color: 'var(--accent)' }}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text)',
                  marginBottom: 7,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                }}
              >
                {card.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── footer 极简 ────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--line-soft)',
          padding: '16px 32px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        © 2026 zhizhilabs · 仅供参考,不构成投资建议
      </footer>
    </div>
  )
}
