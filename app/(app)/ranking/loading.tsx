/** Meme 板块骨架屏 — shimmer 动画，8 行占位 */
export default function MemeLoading() {
  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* 段1 骨架 */}
      <section>
        {/* 标题骨架 */}
        <div
          className="skeleton"
          style={{ width: 140, height: 16, marginBottom: 12, borderRadius: 4 }}
        />
        {/* 表格面板骨架 */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <div className="skeleton" style={{ width: 20, height: 12, flexShrink: 0 }} />
              <div className="skeleton" style={{ flex: 2, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
            </div>
          ))}
        </div>
      </section>

      {/* 段2 骨架 */}
      <section>
        {/* 标题行骨架 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 110, height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 80, height: 11, borderRadius: 4 }} />
        </div>
        {/* 表格面板骨架 */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, alignItems: 'center' }}
            >
              <div className="skeleton" style={{ width: 20, height: 12, flexShrink: 0 }} />
              <div className="skeleton" style={{ flex: 2, height: 12 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
              <div className="skeleton" style={{ flex: 1.5, height: 18, borderRadius: 5 }} />
              <div className="skeleton" style={{ flex: 1, height: 12 }} />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
