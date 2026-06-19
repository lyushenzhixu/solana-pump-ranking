'use client'

/**
 * LegacyRuntime — runs the Express view's inline scripts inside Next.js,
 * intercepts SPA navigation on internal links, and cleans up on unmount.
 *
 * Returns null (no DOM output — the HTML is already SSR'd via dangerouslySetInnerHTML).
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  scripts: string[]
  rootSelector?: string
}

export default function LegacyRuntime({ scripts }: Props) {
  const router = useRouter()

  useEffect(() => {
    // ── 1. Patch window.setInterval + window.addEventListener to track handles ──
    const trackedIntervalIds: number[] = []
    const trackedListeners: Array<[string, EventListenerOrEventListenerObject, (boolean | AddEventListenerOptions | undefined)?]> = []

    const origSetInterval = window.setInterval.bind(window)
    const origAddEventListener = window.addEventListener.bind(window)

    // Temporarily patch to record what the scripts create synchronously
    ;(window as any).setInterval = function (
      fn: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ): number {
      const id = origSetInterval(fn as TimerHandler, delay, ...args) as unknown as number
      trackedIntervalIds.push(id)
      return id
    }
    ;(window as any).addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void {
      trackedListeners.push([type, listener, options])
      origAddEventListener(type, listener, options as boolean | AddEventListenerOptions)
    }

    // ── 2. Run scripts by injecting real <script> elements ────────────────────
    const injected: HTMLScriptElement[] = []
    for (const code of scripts) {
      const el = document.createElement('script')
      el.textContent = code
      el.dataset.legacy = '1'
      document.body.appendChild(el)
      injected.push(el)
    }

    // ── 3. Restore originals IMMEDIATELY after sync init ─────────────────────
    ;(window as any).setInterval = origSetInterval
    ;(window as any).addEventListener = origAddEventListener

    // ── 4. SPA nav interception — capture internal anchor clicks ──────────────
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Skip: external, hash-only, target=_blank, mailto
      if (
        !href.startsWith('/') ||
        href.startsWith('//') ||
        anchor.target === '_blank' ||
        href.startsWith('#') ||
        href.startsWith('mailto:')
      ) return
      e.preventDefault()
      router.push(href)
    }
    document.addEventListener('click', handleClick, true)

    // ── 5. Cleanup on unmount (SPA nav away) ──────────────────────────────────
    return () => {
      for (const id of trackedIntervalIds) {
        clearInterval(id)
      }
      for (const [type, listener, options] of trackedListeners) {
        window.removeEventListener(type, listener, options as boolean | EventListenerOptions)
      }
      for (const el of injected) {
        el.remove()
      }
      document.removeEventListener('click', handleClick, true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
