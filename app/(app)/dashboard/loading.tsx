/** 行情总览骨架屏 — 指标卡 + 预览卡占位 */
export default function DashboardLoading() {
  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 指标卡骨架 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 3 }} />
            <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* 预览卡骨架 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* 卡头 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 70, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 40, height: 11, borderRadius: 3 }} />
            </div>
            {/* 列表行骨架 */}
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 16, height: 12, flexShrink: 0 }} />
                <div className="skeleton" style={{ flex: 2, height: 12 }} />
                <div className="skeleton" style={{ flex: 1, height: 12 }} />
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
