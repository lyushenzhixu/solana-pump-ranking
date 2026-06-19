export type NavStatus = 'live' | 'coming-soon'

export interface NavItem {
  label: string
  href: string
  icon: string
  status: NavStatus
}

export interface NavGroup {
  key: 'overview' | 'sectors' | 'cross'
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: '总览',
    items: [
      { label: '行情总览', href: '/dashboard', icon: 'layout-dashboard', status: 'live' },
    ],
  },
  {
    key: 'sectors',
    label: '板块',
    items: [
      { label: 'Meme · 链上', href: '/meme', icon: 'flame', status: 'live' },
      { label: '永续合约', href: '/perps', icon: 'chart-candle', status: 'coming-soon' },
      { label: '预测市场', href: '/prediction', icon: 'scale', status: 'coming-soon' },
    ],
  },
  {
    key: 'cross',
    label: '跨板块',
    items: [
      { label: '聪明钱追踪', href: '/smart-money', icon: 'wallet', status: 'live' },
      { label: '信号日志', href: '/signals', icon: 'broadcast', status: 'live' },
      { label: '模拟盘战绩', href: '/paper', icon: 'report-money', status: 'live' },
    ],
  },
]

export function allNavItems(): NavItem[] {
  return NAV_GROUPS.flatMap(g => g.items)
}
