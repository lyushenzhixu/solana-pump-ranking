/**
 * extractLegacy — strip a complete HTML document string into:
 *   prelude : all <link rel="stylesheet"> + <style> blocks from <head>
 *   body    : <body> inner HTML with all <script> tags removed
 *   scripts : text content of every inline <script> (excl. GA/gtag)
 *
 * Pure extraction util — no 'use client', usable in server components.
 */

export interface LegacyDoc {
  prelude: string
  body: string
  scripts: string[]
}

export function extractLegacy(doc: string): LegacyDoc {
  // ── 1. Extract <head> content ──────────────────────────────────────────────
  const headMatch = doc.match(/<head[\s\S]*?>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  // ── 2. Extract <body> content (fallback: whole doc) ────────────────────────
  const bodyMatch = doc.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)
  const bodyRaw = bodyMatch ? bodyMatch[1] : doc

  // ── 3. Build prelude: <link rel="stylesheet"> + <style>...</style> from head ─
  const linkTags: string[] = []
  const linkRe = /<link\s[^>]*rel=["']stylesheet["'][^>]*\/?>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(headContent)) !== null) {
    linkTags.push(m[0])
  }

  const styleTags: string[] = []
  const styleRe = /<style[\s\S]*?>[\s\S]*?<\/style>/gi
  while ((m = styleRe.exec(headContent)) !== null) {
    styleTags.push(m[0])
  }

  const prelude = [...linkTags, ...styleTags].join('\n')

  // ── 4. Collect inline scripts from head + body (excl. GA) ─────────────────
  const gaPattern = /dataLayer|gtag\(/
  const gaTagPattern = /googletagmanager|gtag/
  const scriptRe = /<script([\s\S]*?)>([\s\S]*?)<\/script>/gi

  function collectScripts(source: string): string[] {
    const results: string[] = []
    const re = /<script([\s\S]*?)>([\s\S]*?)<\/script>/gi
    while ((m = re.exec(source)) !== null) {
      const attrs = m[1]
      const code = m[2]
      // Skip external scripts (have src=) that are GA/gtag
      if (gaTagPattern.test(attrs)) continue
      // Skip inline GA scripts
      if (gaPattern.test(code)) continue
      // Skip empty scripts
      if (!code.trim()) continue
      results.push(code)
    }
    return results
  }

  const scripts = [...collectScripts(headContent), ...collectScripts(bodyRaw)]

  // ── 5. Strip all <script> tags from body ──────────────────────────────────
  const body = bodyRaw.replace(/<script[\s\S]*?<\/script>/gi, '')

  // suppress unused var warning — scriptRe was declared above, use it
  void scriptRe

  return { prelude, body, scripts }
}
