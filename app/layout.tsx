import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://zhizhilabs.com'),
  title: 'Zhizhilabs · Solana Meme 发现榜',
  description:
    '面向中文 crypto 交易者的 Solana 链上发现榜：KB 精选信号、聪明钱动向、Binance 资金流入、实时 K 线。',
  openGraph: {
    title: 'Zhizhilabs · Solana Meme 发现榜',
    description: '面向中文 crypto 交易者的 Solana 链上发现榜',
    locale: 'zh_CN',
    type: 'website',
  },
}

const GA_ID = process.env.GA_MEASUREMENT_ID

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Google Fonts: Noto Sans SC (CJK 主字) + JetBrains Mono (数字/等宽) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Tabler Icons 钉版 3.31.0 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>
        {children}

        {/* Google Analytics — 仅在配置了 GA_MEASUREMENT_ID 时注入 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
