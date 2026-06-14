import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'

// ─── 营销首页 — Phase 5 (expanded) ────────────────────────────────────────────
// 无侧边栏。全站 server component，无 'use client'。
// 哑光终端设计系统：近黑底 + 发丝边框 + 单一电紫 accent。
// 铁律：不造假数据；涉及收益一律标"模拟盘、非投资建议"。

// ─ shared layout constants ──────────────────────────────────────────────────
const MAX_W = 1080
const SECTION_PX = 24
const SECTION_PY_SM = 56
const SECTION_PY_LG = 80

// ─ icon badge helper ────────────────────────────────────────────────────────
function IconBadge({ icon }: { icon: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--accent-bg)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 20, color: 'var(--accent)' }} />
    </div>
  )
}

// ─ section title helper ─────────────────────────────────────────────────────
function SectionTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string
  title: string
  sub?: string
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 48 }}>
      {eyebrow && (
        <p
          style={{
            fontSize: 11.5,
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        style={{
          fontSize: 'clamp(20px, 3.5vw, 28px)',
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.3,
          marginBottom: sub ? 12 : 0,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-2)',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

// ─ divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--line-soft)',
        maxWidth: MAX_W,
        margin: '0 auto',
        width: '100%',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
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
      {/* ══════════════════════════════════════════════════════════════════════
          1. STICKY NAV
         ══════════════════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          height: 56,
          borderBottom: '1px solid var(--line-soft)',
          background: 'oklch(15% 0.014 285 / 0.92)',
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

        {/* 锚点导航 */}
        <nav
          style={{
            display: 'flex',
            gap: 24,
            marginRight: 28,
          }}
        >
          {[
            { label: '能力', href: '#features' },
            { label: '板块', href: '#sectors' },
            { label: '战绩', href: '#track-record' },
            { label: '社区', href: '#community' },
            { label: '定价', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              style={{
                fontSize: 13.5,
                color: 'var(--text-2)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* 进入面板 */}
        <Link
          href="/dashboard"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: '#fff',
            background: 'var(--accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 16px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          进入面板
        </Link>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          2. HERO
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px 64px`,
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
            fontSize: 'clamp(26px, 5vw, 44px)',
            fontWeight: 700,
            lineHeight: 1.25,
            color: 'var(--text)',
            maxWidth: 640,
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
            lineHeight: 1.7,
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
            marginBottom: 52,
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

        {/* 诚实指标条 */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            flexWrap: 'wrap',
            justifyContent: 'center',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            maxWidth: 680,
            width: '100%',
          }}
        >
          {[
            { icon: 'ti-layout-grid', label: '4 大板块' },
            { icon: 'ti-world', label: '多链覆盖' },
            { icon: 'ti-refresh', label: '每 ~20 分钟刷新' },
            { icon: 'ti-clock-check', label: '信号全程时间戳落档' },
          ].map(({ icon, label }, i, arr) => (
            <div
              key={label}
              style={{
                flex: '1 1 140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 16px',
                borderRight: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
                background: 'var(--surface-1)',
              }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          3. 四大能力 (features)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="features"
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="为什么用 ZHIZHILABS"
            title="不是信息更多,是判断更准"
            sub="把原始数据变成有 conviction 评级的可操作信号。每条信号公开可查,结果随时间自然累积。"
          />
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[
            {
              icon: 'ti-layout-grid',
              title: '数据聚合',
              desc: '把分散在十几个站的链上 + 行情数据聚到一个看板,不用反复切页面。',
            },
            {
              icon: 'ti-broadcast',
              title: '透明信号日志',
              desc: '每条信号带时间戳公开落档,发了不能改,结果随时间公开累积,没有 cherry-pick。',
            },
            {
              icon: 'ti-bulb',
              title: 'KB 编辑部判断',
              desc: 'conviction 评级 + cluster 取证 + 叙事分析,卖的是判断不是喊单。',
            },
            {
              icon: 'ti-wallet',
              title: '聪明钱 / 大户追踪',
              desc: '跨板块看聪明钱在 meme / 永续 / 预测市场怎么做,信号在手早一步。',
            },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 60}>
              <div
                className="panel"
                style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
              >
                <IconBadge icon={card.icon} />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: 6,
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    {card.desc}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          4. 四大板块详解 (sectors)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="sectors"
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="SECTORS"
            title="四大板块,一处掌握"
            sub="从 Meme 聪明钱到宏观大盘,跨板块的资金流向一条线串联。"
          />
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {[
            {
              icon: 'ti-flame',
              title: 'Meme · 链上',
              desc: '聪明钱榜 / 复活信号 / cluster 取证 / 成交量排名。信号公开落档,过去的判断随时翻查。',
              badge: '已上线',
              badgeLive: true,
            },
            {
              icon: 'ti-chart-candle',
              title: '永续合约',
              desc: '跨交易所资金费率实时聚合,未平仓量 / 爆仓 / 大户多空持仓比,极端偏离 = 潜在反转信号。',
              badge: '即将上线',
              badgeLive: false,
            },
            {
              icon: 'ti-scale',
              title: '预测市场',
              desc: 'Polymarket / Drift 热门赔率一览,概率走势 / 大额下注异动,宏观事件不再全凭感觉。',
              badge: '即将上线',
              badgeLive: false,
            },
            {
              icon: 'ti-layout-dashboard',
              title: '宏观 / 行情总览',
              desc: '大盘行情 / 恐贪指数 / 资金流向 / 跨板块数据串联,开盘前五分钟看懂全局。',
              badge: '已上线',
              badgeLive: true,
            },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 60}>
              <div
                className="panel"
                style={{
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  position: 'relative',
                  height: '100%',
                  border: card.badgeLive ? '1px solid var(--line)' : '1px solid var(--line-soft)',
                }}
              >
                {/* 状态 badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: card.badgeLive ? 'var(--up-bg)' : 'var(--surface-2)',
                    color: card.badgeLive ? 'var(--up)' : 'var(--text-3)',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                  }}
                >
                  {card.badge}
                </div>

                <IconBadge icon={card.icon} />

                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: 8,
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    {card.desc}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          5. 怎么工作 (how it works)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="HOW IT WORKS"
            title="它怎么工作"
            sub="从原始链上数据到你看板上的可操作信号,四步完成。"
          />
        </Reveal>

        <Reveal delay={80}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 0,
            position: 'relative',
          }}
        >
          {[
            {
              step: '01',
              icon: 'ti-database',
              title: '链上 + 多源扫描',
              desc: '每 ~20 分钟从链上 / DEX / 社交多源扫描,原始数据全量落档。',
            },
            {
              step: '02',
              icon: 'ti-cpu',
              title: 'KB 规则判断',
              desc: '10 个检测模式 + conviction 评级逐一过滤,去噪留信号。',
            },
            {
              step: '03',
              icon: 'ti-clock-check',
              title: '带时间戳透明落档',
              desc: '每条信号附完整时间戳公开存档,发了不可回溯修改。',
            },
            {
              step: '04',
              icon: 'ti-eye',
              title: '你在看板上决策',
              desc: '带 entry / stop / target 的 actionable 输出,你自己决定进不进。',
            },
          ].map((item, i, arr) => (
            <div
              key={item.step}
              style={{
                padding: '28px 24px',
                background: 'var(--surface-1)',
                borderTop: '1px solid var(--line-soft)',
                borderBottom: '1px solid var(--line-soft)',
                borderLeft: '1px solid var(--line-soft)',
                borderRight: i === arr.length - 1 ? '1px solid var(--line-soft)' : 'none',
                borderRadius:
                  i === 0
                    ? 'var(--radius) 0 0 var(--radius)'
                    : i === arr.length - 1
                      ? '0 var(--radius) var(--radius) 0'
                      : 0,
                position: 'relative',
              }}
            >
              {/* 序号 */}
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  color: 'var(--accent)',
                  letterSpacing: '0.06em',
                  marginBottom: 14,
                  fontWeight: 500,
                }}
              >
                {item.step}
              </div>

              {/* icon */}
              <i
                className={`ti ${item.icon}`}
                style={{
                  fontSize: 22,
                  color: 'var(--text-3)',
                  display: 'block',
                  marginBottom: 14,
                }}
              />

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                {item.desc}
              </div>

              {/* 箭头连接（最后一个不加）*/}
              {i < arr.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    right: -10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    width: 20,
                    height: 20,
                    background: 'var(--bg)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <i
                    className="ti ti-chevron-right"
                    style={{ fontSize: 14, color: 'var(--text-3)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        </Reveal>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          6. 透明战绩 (track-record)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="track-record"
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="TRACK RECORD"
            title="战绩全程透明"
            sub="模拟盘全量公开,含亏损,不 cherry-pick。每笔记录完整入场 / 出场 / 盈亏,信号发出时间锁定,不可回溯修改。"
          />
        </Reveal>

        {/* 说明卡 */}
        <Reveal delay={80}>
          <div
            className="panel"
            style={{
              maxWidth: 640,
              margin: '0 auto 32px',
              padding: '24px 28px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: 'ti-lock', text: '信号发出时间戳锁定,不可回溯修改' },
                { icon: 'ti-eye', text: '模拟盘结果全量展示,包括亏损单' },
                { icon: 'ti-list-details', text: '每笔含入场 MC / 出场 MC / 盈亏 % / 持仓时长' },
                { icon: 'ti-shield-x', text: '不选取"最佳表现"样本,全量原始记录' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <i
                    className={`ti ${item.icon}`}
                    style={{ fontSize: 16, color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <Link
            href="/paper"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 22px',
              textDecoration: 'none',
              marginBottom: 16,
            }}
          >
            <i className="ti ti-chart-line" style={{ fontSize: 15 }} />
            看模拟盘战绩
          </Link>

          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>
            PAPER · 模拟盘 · 非投资建议
          </p>
        </Reveal>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          7a. 私域社区 (community)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="community"
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="COMMUNITY"
            title="和真正在看数据的人一起交流"
            sub="Discord / Telegram 私域频道,Pro 解锁实时告警推送 + 分析师研究同步。"
          />
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          {[
            {
              icon: 'ti-brand-discord',
              title: 'Discord 社区',
              desc: '公开频道看信号播报,Pro 频道实时推送 KB 高 conviction 判断 + 分析师讨论。',
            },
            {
              icon: 'ti-brand-telegram',
              title: 'Telegram 告警',
              desc: 'Pro 解锁专属告警 Bot,聪明钱动向 / 信号变化第一时间推送到手机。',
            },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 60}>
              <div
                className="panel"
                style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}
              >
                <IconBadge icon={card.icon} />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: 6,
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                    {card.desc}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            {/* 占位按钮，待配置社区链接 */}
            <a
              href="#"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 22px',
                textDecoration: 'none',
              }}
            >
              <i className="ti ti-brand-discord" style={{ fontSize: 15 }} />
              加入社区(链接即将开放)
            </a>
          </div>
        </Reveal>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          7b. 订阅定价 (pricing)
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        style={{
          padding: `${SECTION_PY_LG}px ${SECTION_PX}px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle
            eyebrow="PRICING"
            title="按需订阅,从免费开始"
            sub="价格即将公布。现在免费试用全部基础功能,无需信用卡。"
          />
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            maxWidth: 820,
            margin: '0 auto',
          }}
        >
          {[
            {
              tier: '免费',
              tagline: '链上数据入门',
              features: ['延迟信号查看', '部分板块榜单', 'KB 信号公开日志', '无实时推送'],
              cta: '免费开始',
              ctaHref: '/dashboard',
              highlight: false,
            },
            {
              tier: '标准',
              tagline: '实时信号 + 完整看板',
              features: ['实时信号推送', '链上看板全量', 'Telegram 告警', '全部板块访问'],
              cta: '价格即将公布',
              ctaHref: '#',
              highlight: true,
            },
            {
              tier: '高级',
              tagline: '机构级深度数据',
              features: ['聪明钱钱包全量数据', '高频告警', '跨板块关联分析', '优先支持'],
              cta: '价格即将公布',
              ctaHref: '#',
              highlight: false,
            },
          ].map((plan, i) => (
            <Reveal key={plan.tier} delay={i * 70}>
            <div
              className="panel"
              style={{
                padding: '28px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                border: plan.highlight ? '2px solid var(--accent)' : '1px solid var(--line-soft)',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 11,
                    padding: '3px 12px',
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: 20,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  推荐
                </div>
              )}

              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  {plan.tier}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{plan.tagline}</div>
              </div>

              {/* 价格占位 */}
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-3)',
                  fontFamily: 'var(--mono)',
                  borderTop: '1px solid var(--line-soft)',
                  paddingTop: 14,
                }}
              >
                价格即将公布
              </div>

              {/* 功能列表 */}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--text-2)',
                    }}
                  >
                    <i
                      className="ti ti-check"
                      style={{ fontSize: 14, color: 'var(--up)', marginTop: 1, flexShrink: 0 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                style={{
                  marginTop: 'auto',
                  display: 'block',
                  textAlign: 'center',
                  fontSize: 13.5,
                  fontWeight: 500,
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  background: plan.highlight ? 'var(--accent)' : 'transparent',
                  color: plan.highlight ? '#fff' : 'var(--text-2)',
                  border: plan.highlight ? 'none' : '1px solid var(--line)',
                }}
              >
                {plan.cta}
              </Link>
            </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          8. FAQ
         ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `${SECTION_PY_SM}px ${SECTION_PX}px`,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Reveal>
          <SectionTitle title="常见问题" />
        </Reveal>

        <Reveal delay={60}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            {
              q: '这是投资建议吗?',
              a: 'Zhizhilabs 是链上数据与研究工具,提供数据聚合和信号参考,不构成任何投资建议。所有操作自行决策,自负盈亏。',
            },
            {
              q: '数据多久更新一次?',
              a: 'KB 信号约每 20 分钟刷新一轮;部分实时行情数据更新频率更高;具体以页面时间戳为准。',
            },
            {
              q: '目前支持哪些链?',
              a: '当前以 Solana 为主,重点覆盖 Pump.fun 生态的 meme token。多链扩展(ETH / BSC 等)在路线图中,逐步上线。',
            },
            {
              q: '模拟盘战绩是真实的吗?',
              a: '是模拟盘,非真实资金。全量记录含亏损,时间戳在信号发出时锁定,不可回溯修改,不做 cherry-pick。',
            },
            {
              q: '聪明钱数据从哪里来?',
              a: '基于链上公开 tx 数据,结合多跳资金溯源 + 行为特征识别(胜率 / 盈亏比 / 持仓时间),不依赖任何私有 feed。',
            },
          ].map((item) => (
            <details
              key={item.q}
              style={{
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <summary
                style={{
                  padding: '16px 4px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text)',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  userSelect: 'none',
                }}
              >
                {item.q}
                <i
                  className="ti ti-chevron-down"
                  style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0 }}
                />
              </summary>
              <p
                style={{
                  padding: '0 4px 18px',
                  fontSize: 13.5,
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
          <div style={{ borderTop: '1px solid var(--line-soft)' }} />
        </div>
        </Reveal>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          9. FOOTER
         ══════════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding: `${SECTION_PY_SM}px ${SECTION_PX}px 32px`,
          maxWidth: MAX_W,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 32,
            marginBottom: 32,
          }}
        >
          {/* 左:logo + 一句定位 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Z
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                zhizhilabs
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.65 }}>
              面向中文 crypto 交易者的链上数据终端 —— 聪明钱追踪、信号落档、透明可审计。
            </p>
          </div>

          {/* 右:导航链接 */}
          <div
            style={{
              display: 'flex',
              gap: 40,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>
                板块
              </div>
              {[
                { label: 'Meme 链上', href: '/meme' },
                { label: '永续合约', href: '/perps' },
                { label: '预测市场', href: '/prediction' },
                { label: '宏观大盘', href: '/dashboard' },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', letterSpacing: '0.08em', fontWeight: 600 }}>
                产品
              </div>
              {[
                { label: '模拟盘战绩', href: '/paper' },
                { label: '信号日志', href: '/signals' },
                { label: '社区', href: '#community' },
                { label: '定价', href: '#pricing' },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 底部免责 */}
        <div
          style={{
            borderTop: '1px solid var(--line-soft)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            © 2026 Zhizhilabs
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right', maxWidth: 540 }}>
            Zhizhilabs 提供链上数据与研究,非投资建议。加密资产高风险,自行决策。
          </p>
        </div>
      </footer>
    </div>
  )
}
