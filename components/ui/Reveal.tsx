'use client'

import React, { useEffect, useRef } from 'react'

export interface RevealProps {
  children: React.ReactNode
  /** optional stagger delay in ms */
  delay?: number
  className?: string
}

/**
 * Reveal — scroll-triggered fade-in + translateY(8px→0).
 *
 * SSR-safe: initial className is 'reveal', observer wired in useEffect only.
 * reduced-motion: CSS makes .reveal always visible (opacity:1, transform:none),
 *   so content is never hidden even if JS/observer never fires.
 * Fallback: if IntersectionObserver is unsupported, immediately adds 'in' class.
 */
export default function Reveal({ children, delay, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Hard fallback: no IO support → just show immediately
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('in')
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={['reveal', className].filter(Boolean).join(' ')}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
