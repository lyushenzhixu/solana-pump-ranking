import Sidebar from '@/components/shell/Sidebar'
import React from 'react'

/**
 * Dashboard 外壳 layout — 持久不重载
 * flex: 左 Sidebar(200px 固定) + 右内容区(flex:1)
 * 切板块时此 layout 持久,只有 children 换
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      {/* 持久左抽屉 */}
      <Sidebar />

      {/* 右内容区 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}
