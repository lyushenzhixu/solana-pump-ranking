export interface TopbarProps {
  title: string
}

/**
 * 顶栏 — 页面标题 + 搜索占位 + 链筛选占位
 * bottom: 1px line-soft 边框
 */
export default function Topbar({ title }: TopbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 22px',
        borderBottom: '1px solid var(--line-soft)',
        flexShrink: 0,
      }}
    >
      {/* 页面标题 */}
      <h1
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--text)',
          lineHeight: 1.3,
        }}
      >
        {title}
      </h1>

      {/* 搜索占位 — 推至右侧 */}
      <div
        style={{
          marginLeft: 'auto',
          fontSize: 12.5,
          color: 'var(--text-3)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '7px 12px',
          cursor: 'text',
          userSelect: 'none',
        }}
      >
        搜 CA / 钱包 / 市场
      </div>

      {/* 链筛选占位 */}
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--text-2)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '7px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        全链 ▾
      </div>
    </div>
  )
}
