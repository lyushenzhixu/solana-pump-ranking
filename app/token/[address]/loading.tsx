/** Token 详情骨架屏 — K线区 + 三卡占位 */
export default function TokenLoading() {
  return (
    <div
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '24px 20px 48px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* 面包屑骨架 */}
      <div className="skeleton" style={{ width: 180, height: 12, borderRadius: 3 }} />

      {/* K 线区骨架 */}
      <div
        className="skeleton"
        style={{
          width: '100%',
          height: 280,
          borderRadius: 'var(--radius)',
        }}
      />

      {/* 三卡骨架 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
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
            {/* 卡头标题 */}
            <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
            {/* 内容行 */}
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="skeleton" style={{ flex: 1, height: 12 }} />
                <div className="skeleton" style={{ flex: 1.5, height: 12 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
