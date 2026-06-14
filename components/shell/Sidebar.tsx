'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_GROUPS } from '@/lib/nav'

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

/**
 * 持久左抽屉 — 200px 固定宽,surface-1 底,right line-soft 分隔
 * 品牌 Z logo + 三组 nav + 底部升级占位
 */
export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--line-soft)',
        padding: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      {/* 品牌 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 18px 18px',
        }}
      >
        {/* Z logo */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          Z
        </div>
        <b
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.02em',
            color: 'var(--text)',
          }}
        >
          zhizhilabs
        </b>
      </div>

      {/* Nav groups */}
      {NAV_GROUPS.map((group) => (
        <div key={group.key}>
          {/* 组标题 */}
          <div
            style={{
              padding: '12px 18px 5px',
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: '0.06em',
            }}
          >
            {group.label}
          </div>

          {/* nav items */}
          {group.items.map((item) => {
            const active = item.status === 'live' && isActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.status === 'live' ? item.href : '#'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '1px 8px',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  background: active ? 'var(--accent-bg)' : 'transparent',
                  cursor: item.status === 'live' ? 'pointer' : 'default',
                  textDecoration: 'none',
                  transition: 'background 150ms ease-out, color 150ms ease-out',
                }}
                // CSS hover handled inline via onMouse — we keep it simple
                onMouseEnter={(e) => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'var(--surface-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.background = 'transparent'
                  }
                }}
              >
                {/* Tabler icon */}
                <i
                  className={`ti ti-${item.icon}`}
                  style={{
                    fontSize: 16,
                    lineHeight: 1,
                    flexShrink: 0,
                    color: active ? 'var(--accent)' : 'var(--text-3)',
                  }}
                />

                {/* label */}
                <span style={{ flex: 1 }}>{item.label}</span>

                {/* 右侧装饰 */}
                {active && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  />
                )}
                {item.status === 'coming-soon' && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-3)',
                      flexShrink: 0,
                    }}
                  >
                    soon
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}

      {/* 底部「升级 Pro」占位 */}
      <div style={{ marginTop: 'auto', padding: '0 12px 4px' }}>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '9px',
            textAlign: 'center',
            fontSize: 12.5,
            color: 'var(--text-2)',
            cursor: 'pointer',
            transition: 'background 150ms ease-out',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
          }}
        >
          升级 Pro
        </div>
      </div>
    </aside>
  )
}
