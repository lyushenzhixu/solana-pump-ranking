'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface CountUpProps {
  value: number
  durationMs?: number
  decimals?: number
  prefix?: string
  suffix?: string
}

/**
 * CountUp — animates from 0 → value on mount using requestAnimationFrame.
 * Uses ease-out easing: fast start, decelerates toward target.
 * reduced-motion: renders final value immediately, no animation.
 */
export default function CountUp({
  value,
  durationMs = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
}: CountUpProps) {
  const [display, setDisplay] = useState<number>(value)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    // Respect reduced-motion preference
    const mq =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    if (mq?.matches) {
      setDisplay(value)
      return
    }

    // Kick off animation
    startRef.current = null

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, durationMs])

  const formatted = `${prefix}${display.toFixed(decimals)}${suffix}`

  return <span>{formatted}</span>
}
