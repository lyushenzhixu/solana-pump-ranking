import React from 'react'

export type BadgeKind = 'smart' | 'revival' | 'cluster' | 'conviction'

export interface BadgeProps {
  kind: BadgeKind
  children: React.ReactNode
}

const BADGE_STYLES: Record<BadgeKind, React.CSSProperties> = {
  smart: {
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
  },
  revival: {
    // 绿系底 + up
    background: 'oklch(78% 0.16 158 / 0.16)',
    color: 'var(--up)',
  },
  cluster: {
    // 红系底 + down
    background: 'oklch(68% 0.17 22 / 0.16)',
    color: 'var(--down)',
  },
  conviction: {
    background: 'var(--surface-2)',
    color: 'var(--text-2)',
  },
}

/**
 * 语义徽章 — 10px / 圆角5-6 / 500
 * smart=聪明钱(紫) revival=复活(绿) cluster=集群(红) conviction=信号档(灰)
 */
export default function Badge({ kind, children }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: 5,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        ...BADGE_STYLES[kind],
      }}
    >
      {children}
    </span>
  )
}
