'use client'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div
      style={{
        padding: '48px 22px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: 'var(--down)',
        }}
      >
        行情总览加载失败
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {error.message || '网络或数据库连接异常，请稍后重试。'}
      </div>
      <button
        onClick={reset}
        style={{
          marginTop: 4,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--accent)',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
        }}
      >
        重试
      </button>
    </div>
  )
}
