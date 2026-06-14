export interface EmptyStateProps {
  title: string
  hint?: string
}

/**
 * 空态面板 — 哑光面板居中
 */
export default function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: 'var(--text-2)',
        }}
      >
        {title}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
