import AppShell from '@/components/shell/AppShell'
import React from 'react'

/** Dashboard 外壳 layout — 持久不重载;响应式逻辑在 AppShell(client)+ globals.css */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
