export const dynamic = 'force-dynamic'

import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const SITE_URL = process.env.SITE_URL || 'https://zhizhilabs.com'

// 静态页面
const STATIC_PAGES: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/meme`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/paper`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await supabase
      .from('kb_signals')
      .select('ca')
      .order('score', { ascending: false })
      .limit(100)

    const tokenPages: MetadataRoute.Sitemap = (data ?? []).map((row: any) => ({
      url: `${SITE_URL}/token/${row.ca}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))

    return [...STATIC_PAGES, ...tokenPages]
  } catch {
    // DB 不可达时退化为仅静态页
    return STATIC_PAGES
  }
}
