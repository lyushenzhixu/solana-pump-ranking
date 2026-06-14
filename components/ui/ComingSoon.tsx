export interface ComingSoonProps {
  sector: string
  blurb: string
}

/**
 * 即将上线占位面板 — 居中哑光面板
 */
export default function ComingSoon({ sector, blurb }: ComingSoonProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: 'var(--text)',
        }}
      >
        {sector} · 即将上线
      </div>
      <div
        style={{
          fontSize: 13.5,
          color: 'var(--text-2)',
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        {blurb}
      </div>
    </div>
  )
}
