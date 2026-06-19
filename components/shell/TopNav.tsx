'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { label: '发现榜', href: '/ranking' },
  { label: 'KB 信号', href: '/ranking#kb' },
  { label: '模拟盘', href: '/paper' },
]

export default function TopNav() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '12px 22px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'color-mix(in oklch, var(--bg) 80%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text)', fontWeight: 700 }}>
        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #9945FF, #14F195)' }} />
        Zhizhi Labs
      </Link>
      <span style={{ display: 'flex', gap: 14, marginLeft: 8 }}>
        {LINKS.map((l) => {
          const active = pathname === l.href.split('#')[0]
          return (
            <Link key={l.href} href={l.href} style={{ fontSize: 13.5, textDecoration: 'none', color: active ? 'var(--text)' : 'var(--text-2)' }}>
              {l.label}
            </Link>
          )
        })}
      </span>
    </nav>
  )
}
