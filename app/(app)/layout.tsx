import TopNav from '@/components/shell/TopNav'
import React from 'react'

/** 聚焦版 layout:顶部 nav + 居中容器(替换平台侧栏壳) */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <div className="page-container">{children}</div>
    </>
  )
}
