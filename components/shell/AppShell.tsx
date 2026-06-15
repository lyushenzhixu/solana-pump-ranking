'use client'

import { useEffect, useRef, useState } from 'react'
import Sidebar from './Sidebar'

/**
 * Dashboard 外壳 — 持久不重载。
 * 桌面(≥768px):静态 200px 侧栏 + 正文(CSS 控制,见 globals.css .app-shell)。
 * 移动(<768px):侧栏默认收起为 off-canvas 抽屉;mobile-bar 的汉堡开合 + scrim + 背景 inert。
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('drawer-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('drawer-open')
      hamburgerRef.current?.focus()
    }
  }, [open])

  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <button
          ref={hamburgerRef}
          type="button"
          className="hamburger"
          aria-label="打开导航菜单"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <i className="ti ti-menu-2" aria-hidden="true" />
        </button>
        <div className="mobile-bar-brand">
          <span className="mobile-bar-logo">Z</span>
          <b>zhizhilabs</b>
        </div>
      </div>

      <Sidebar open={open} onClose={close} />

      {open && <div className="app-scrim" onClick={close} aria-hidden="true" />}

      <div className="app-content" inert={open ? true : undefined}>
        {children}
      </div>
    </div>
  )
}
