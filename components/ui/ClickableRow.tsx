'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface ClickableRowProps {
  href: string | null | undefined
  children: ReactNode
  style?: React.CSSProperties
}

/**
 * A <tr> that navigates to `href` when clicked.
 * Falls back to non-clickable when href is empty/null.
 */
export default function ClickableRow({ href, children, style }: ClickableRowProps) {
  const router = useRouter()

  const clickable = !!href
  const handleClick = clickable ? () => router.push(href!) : undefined

  return (
    <tr
      onClick={handleClick}
      style={{
        cursor: clickable ? 'pointer' : undefined,
        ...style,
      }}
      className={clickable ? 'clickable-row' : undefined}
    >
      {children}
    </tr>
  )
}
