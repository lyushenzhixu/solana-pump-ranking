/** 模拟盘骨架屏 — shimmer 占位 */
export default function PaperLoading() {
  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 免责横幅骨架 */}
      <div
        className="skeleton"
        style={{ height: 36, borderRadius: 'var(--radius-sm)' }}
      />

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

      {/* 新鲜度骨架 */}
      <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 3 }} />

      {/* 表格骨架 */}
      <section>
        <div className="skeleton" style={{ width: 70, height: 14, marginBottom: 12, borderRadius: 4 }} />
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ width: 40, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ width: 60, height: 12 }} />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
