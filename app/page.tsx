'use client'

import { useEffect } from 'react'
import './hero.css'

export default function HomeHero() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 1) 点击辉光 ripple
    const btn = document.getElementById('exploreBtn')
    const ripple = document.getElementById('ripple')
    const onClick = () => {
      if (reduce || !ripple || !btn) return
      const r = btn.getBoundingClientRect()
      ripple.style.left = r.left + r.width / 2 + 'px'
      ripple.style.top = r.top + r.height / 2 + 'px'
      ripple.classList.remove('active'); void ripple.offsetWidth; ripple.classList.add('active')
    }
    btn?.addEventListener('click', onClick)

    // 2) 鼠标 parallax(仅非 reduced-motion)
    let onMove: ((e: MouseEvent) => void) | null = null
    let observer: IntersectionObserver | null = null
    if (!reduce) {
      const universe = document.querySelector('.universe') as HTMLElement | null
      let heroVisible = true
      if (universe && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          heroVisible = entries[0].isIntersecting
        }, { threshold: 0.15 })
        observer.observe(universe)
      }
      onMove = (e: MouseEvent) => {
        if (!heroVisible) return
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2
        const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy
        const nebula = document.querySelector('.nebula') as HTMLElement | null
        if (nebula) nebula.style.transform = `translate(${dx * 20}px, ${dy * 20}px)`
        const orb = document.querySelector('.distortion-orb') as HTMLElement | null
        if (orb) orb.style.transform = `translate(${dx * -15}px, ${dy * -15}px)`
        const content = document.querySelector('.center-content') as HTMLElement | null
        if (content) content.style.transform = `translate(${dx * 5}px, ${dy * 5}px)`
        document.querySelectorAll('.brand-logo').forEach((logo, i) => {
          const el = logo as HTMLElement
          const speed = (i % 3 + 1) * 4
          const dir = i % 2 === 0 ? 1 : -1
          el.style.setProperty('--px', `${dx * speed * dir}px`)
          el.style.setProperty('--py', `${dy * speed * dir}px`)
        })
      }
      document.addEventListener('mousemove', onMove)
    }

    // 3) Top-3 HUD
    const hud = document.getElementById('zl-hud')
    const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v || 0)
    const fmtChg = (c: number) => (c >= 0 ? '+' : '') + (Number(c) || 0).toFixed(1) + '%'
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string))
    if (hud) {
      Promise.allSettled([
        fetch('/api/ranking').then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch('/api/kb-signals').then((r) => (r.ok ? r.json() : Promise.reject())),
      ]).then(([rk, kb]) => {
        const ranking = rk.status === 'fulfilled' ? rk.value : null
        const rows = Array.isArray(ranking) ? ranking : ranking?.rows || []
        if (!rows.length) { hud.innerHTML = '<div class="hud-fallback">榜单加载中,稍后重试<br><a href="/ranking">查看完整榜单 →</a></div>'; return }
        const kbRows = kb.status === 'fulfilled' ? (Array.isArray(kb.value) ? kb.value : kb.value?.rows || []) : []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = new Map(kbRows.map((s: any) => [s.ca, s.conviction_rating || (s.smart_money_24h ? '聪明钱' : '')]))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hud.innerHTML = rows.slice(0, 3).map((row: any, i: number) => {
          const chg = Number(row.price_change_24h) || 0
          const sig = map.get(row.token) || '—'
          return `<div class="hud-row"><span class="hud-rank zl-num">#${i + 1}</span><span class="hud-name">${esc(row.name || row.symbol || '?')}<span class="hud-sym">${esc(row.symbol || '')}</span></span><span class="hud-vol zl-num">${fmtVol(row.tx_volume_u_24h)}</span><span class="hud-chg zl-num ${chg >= 0 ? 'zl-up' : 'zl-dn'}">${fmtChg(chg)}</span><span class="hud-sig">${esc(sig)}</span></div>`
        }).join('')
      }).catch(() => { hud.innerHTML = '<div class="hud-fallback">榜单加载中,稍后重试<br><a href="/ranking">查看完整榜单 →</a></div>' })
    }

    return () => {
      btn?.removeEventListener('click', onClick)
      if (onMove) document.removeEventListener('mousemove', onMove)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="hero-root">
      <nav className="zl-nav">
        <a className="zl-brand" href="/">
          <span style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg,var(--sol-purple),var(--sol-green))', display: 'inline-block' }}></span>
          Zhizhi Labs
        </a>
        <div className="zl-links">
          <a href="/ranking">发现榜</a>
          <a href="/ranking#kb">KB 信号</a>
          <a href="/paper">模拟盘</a>
        </div>
      </nav>

      <div className="universe">
        {/* Background layers */}
        <div className="stars"></div>

        <div className="nebula">
          <div className="nebula-layer nebula-1"></div>
          <div className="nebula-layer nebula-2"></div>
          <div className="nebula-layer nebula-3"></div>
          <div className="nebula-layer nebula-4"></div>
        </div>

        <div className="warp-grid"></div>

        <div className="shadow-entity"></div>
        <div className="shadow-entity"></div>
        <div className="shadow-entity"></div>
        <div className="shadow-entity"></div>

        <div className="distortion-orb"></div>

        <div className="light-streak"></div>
        <div className="light-streak-2"></div>

        {/* Brand logos: Solana ×3, Polymarket ×3, Binance ×3 */}
        <div className="brand-logos">
          <svg className="brand-logo-defs" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="solGrad" x1="0" y1="0" x2="400" y2="320" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9945FF" />
                <stop offset="55%" stopColor="#00D1FF" />
                <stop offset="100%" stopColor="#14F195" />
              </linearGradient>
              <linearGradient id="polyGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9AE6FF" />
                <stop offset="100%" stopColor="#4DA3FF" />
              </linearGradient>
              <linearGradient id="bnGrad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F0B90B" />
                <stop offset="100%" stopColor="#FCD535" />
              </linearGradient>
              <symbol id="mark-solana" viewBox="0 0 400 320">
                <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#solGrad)" opacity="0.92" />
                <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#solGrad)" opacity="0.92" />
                <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#solGrad)" opacity="0.92" />
              </symbol>
              <symbol id="mark-poly" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="url(#polyGrad)" strokeWidth="6" fill="none" opacity="0.8" />
                <circle cx="100" cy="100" r="66" stroke="url(#polyGrad)" strokeWidth="2.6" fill="none" opacity="0.42" strokeDasharray="10 8" strokeLinecap="round" />
                <path d="M75 55h30c22 0 40 18 40 40s-18 40-40 40H95v25H75V55zm20 60h10c11 0 20-9 20-20s-9-20-20-20H95v40z" fill="url(#polyGrad)" opacity="0.86" />
              </symbol>
              <symbol id="mark-bn" viewBox="0 0 200 200">
                <polygon points="100,70 130,100 100,130 70,100" fill="url(#bnGrad)" opacity="0.88" />
                <polygon points="100,15 122,37 100,59 78,37" fill="url(#bnGrad)" opacity="0.74" />
                <polygon points="100,141 122,163 100,185 78,163" fill="url(#bnGrad)" opacity="0.74" />
                <polygon points="37,78 59,100 37,122 15,100" fill="url(#bnGrad)" opacity="0.74" />
                <polygon points="163,78 185,100 163,122 141,100" fill="url(#bnGrad)" opacity="0.74" />
                <line x1="100" y1="59" x2="100" y2="70" stroke="url(#bnGrad)" strokeWidth="2" opacity="0.55" />
                <line x1="100" y1="130" x2="100" y2="141" stroke="url(#bnGrad)" strokeWidth="2" opacity="0.55" />
                <line x1="59" y1="100" x2="70" y2="100" stroke="url(#bnGrad)" strokeWidth="2" opacity="0.55" />
                <line x1="130" y1="100" x2="141" y2="100" stroke="url(#bnGrad)" strokeWidth="2" opacity="0.55" />
              </symbol>
            </defs>
          </svg>

          <div className="brand-logo logo-sol-1">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
          </div>
          <div className="brand-logo logo-sol-2">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
          </div>
          <div className="brand-logo logo-sol-3">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-solana" /></svg></span>
          </div>

          <div className="brand-logo logo-poly-1">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
          </div>
          <div className="brand-logo logo-poly-2">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
          </div>
          <div className="brand-logo logo-poly-3">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-poly" /></svg></span>
          </div>

          <div className="brand-logo logo-bn-1">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
          </div>
          <div className="brand-logo logo-bn-2">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
          </div>
          <div className="brand-logo logo-bn-3">
            <span className="logo-layer phantom phantom-1"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-2"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer phantom phantom-3"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
            <span className="logo-layer core"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#mark-bn" /></svg></span>
          </div>
        </div>

        <div className="glyphs">
          <div className="glyph">◆</div>
          <div className="glyph">⟐</div>
          <div className="glyph">⬡</div>
          <div className="glyph">◈</div>
          <div className="glyph">⟡</div>
          <div className="glyph">⬢</div>
          <div className="glyph">◇</div>
          <div className="glyph">⟠</div>
        </div>

        {/* Center content */}
        <div className="center-content">
          <div className="title-wrapper">
            <div className="pre-title">⟡ ZHIZHILABS ⟡</div>
            <h1 className="main-title" data-text="Zhizhi Labs">Zhizhi Labs</h1>
            <p className="sub-title">BEYOND THE VISIBLE SPECTRUM</p>
            <p className="value-prop">实时发现 Solana meme 新币 —— 按交易量、持仓、聪明钱与 AI 叙事信号交叉排序。</p>
          </div>

          <div className="btn-container">
            <div className="portal"></div>
            <div className="phantom-rings">
              <div className="phantom-ring"></div>
              <div className="phantom-ring"></div>
              <div className="phantom-ring"></div>
              <div className="phantom-ring"></div>
              <div className="phantom-ring"></div>
            </div>
            <a className="explore-btn" id="exploreBtn" href="/ranking">
              <div className="btn-scanline"></div>
              <span className="btn-text">查看实时榜单</span>
              <div className="orbit-particle"></div>
              <div className="orbit-particle"></div>
              <div className="orbit-particle"></div>
            </a>
            <div className="btn-shadow"></div>
          </div>

          <div id="zl-hud" className="zl-glass-panel" style={{ width: '100%', maxWidth: 760, margin: '32px auto', padding: '8px 0' }}>
            <div className="hud-row" style={{ opacity: 0.55 }}>
              <span className="hud-rank zl-num">#1</span>
              <span className="hud-name"><span className="zl-skel" style={{ display: 'inline-block', width: 120 }}></span></span>
              <span className="hud-vol zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 60 }}></span></span>
              <span className="hud-chg zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
              <span className="hud-sig"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
            </div>
            <div className="hud-row" style={{ opacity: 0.4 }}>
              <span className="hud-rank zl-num">#2</span>
              <span className="hud-name"><span className="zl-skel" style={{ display: 'inline-block', width: 120 }}></span></span>
              <span className="hud-vol zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 60 }}></span></span>
              <span className="hud-chg zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
              <span className="hud-sig"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
            </div>
            <div className="hud-row" style={{ opacity: 0.28 }}>
              <span className="hud-rank zl-num">#3</span>
              <span className="hud-name"><span className="zl-skel" style={{ display: 'inline-block', width: 120 }}></span></span>
              <span className="hud-vol zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 60 }}></span></span>
              <span className="hud-chg zl-num"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
              <span className="hud-sig"><span className="zl-skel" style={{ display: 'inline-block', width: 48 }}></span></span>
            </div>
          </div>
        </div>

        {/* Overlays */}
        <div className="vignette"></div>
        <div className="scanlines"></div>
        <div className="noise"></div>

        <div className="bottom-hint">
          <span className="arrow">↓</span>
          ENTER THE VOID
        </div>

        <div className="ripple-ring" id="ripple"></div>
      </div>
    </div>
  )
}
