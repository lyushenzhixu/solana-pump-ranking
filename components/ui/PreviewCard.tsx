import Link from 'next/link'
import React from 'react'

export interface PreviewCardProps {
  title: string
  href: string
  children: React.ReactNode
}

/**
 * 预览面板 — 标题行 + 右侧「查看全部」Link + children 内容
 * 哑光终端: surface-1 + line-soft + radius
 */
export default function PreviewCard({ title, href, children }: PreviewCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
      }}
    >
      {/* 标题行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text)',
          }}
        >
          {title}
        </span>
        <Link
          href={href}
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text-3)',
            fontWeight: 400,
            transition: 'color 150ms ease-out',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-2)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-3)'
          }}
        >
          查看全部
        </Link>
      </div>

      {/* 内容 */}
      {children}
    </div>
  )
}
