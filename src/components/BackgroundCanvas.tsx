'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  baseOpacity: number
  size: number
  angle: number
  angleSpeed: number
  isAccent: boolean
}

interface Ring {
  cx: number; cy: number
  radius: number
  speed: number      // rotation speed
  phase: number      // pulse phase offset
}

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })
  const raf = useRef(0)
  const t = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let W = 0, H = 0
    let particles: Particle[] = []
    let rings: Ring[] = []

    /* ── Resize + init ──────────────────────────────────── */
    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
      init()
    }

    function init() {
      // Particle count: ~1 per 12 000 px², capped 40–90
      const count = Math.min(90, Math.max(40, Math.floor((W * H) / 12000)))
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        baseOpacity: Math.random() * 0.35 + 0.08,
        size: i < 6 ? Math.random() * 2 + 1.5 : Math.random() * 1.2 + 0.4,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.004,
        isAccent: i < 4,                // first 4 are red accent particles
      }))

      // Zen mandala rings — positioned off-center
      rings = [
        { cx: W * 0.15, cy: H * 0.25, radius: Math.min(W, H) * 0.32, speed: 0.00018, phase: 0 },
        { cx: W * 0.85, cy: H * 0.75, radius: Math.min(W, H) * 0.28, speed: -0.00013, phase: 2.1 },
        { cx: W * 0.80, cy: H * 0.15, radius: Math.min(W, H) * 0.18, speed: 0.00025, phase: 1.1 },
        { cx: W * 0.20, cy: H * 0.82, radius: Math.min(W, H) * 0.22, speed: -0.00020, phase: 3.4 },
      ]
    }

    /* ── Draw loop ──────────────────────────────────────── */
    function draw() {
      t.current += 1
      ctx.clearRect(0, 0, W, H)

      const mx = mouse.current.x
      const my = mouse.current.y

      /* 1 ─ Zen mandala rings */
      rings.forEach((r, ri) => {
        const rotAngle = t.current * r.speed
        const pulse = Math.sin(t.current * 0.0018 + r.phase) * 0.012 + 0.018
        const innerPulse = Math.sin(t.current * 0.0024 + r.phase + 1) * 0.008 + 0.012

        // outer ring
        ctx.beginPath()
        ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${pulse})`
        ctx.lineWidth = 1
        ctx.stroke()

        // inner ring (50%)
        ctx.beginPath()
        ctx.arc(r.cx, r.cy, r.radius * 0.55, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${innerPulse})`
        ctx.lineWidth = 0.7
        ctx.stroke()

        // 6-petal petal marks on the outer ring — rotated slowly
        const petals = ri % 2 === 0 ? 6 : 8
        for (let p = 0; p < petals; p++) {
          const a = rotAngle + (p / petals) * Math.PI * 2
          const px = r.cx + Math.cos(a) * r.radius
          const py = r.cy + Math.sin(a) * r.radius
          ctx.beginPath()
          ctx.arc(px, py, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${pulse * 1.8})`
          ctx.fill()
        }
      })

      /* 2 ─ Mouse radial glow */
      if (mx > 0 && my > 0) {
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 110)
        g.addColorStop(0, 'rgba(220,0,25,0.07)')
        g.addColorStop(0.5, 'rgba(77,64,232,0.04)')
        g.addColorStop(1, 'rgba(220,0,25,0)')
        ctx.fillStyle = g
        ctx.fillRect(mx - 110, my - 110, 220, 220)
      }

      /* 3 ─ Update particle physics */
      for (const p of particles) {
        p.angle += p.angleSpeed

        // Sinusoidal zen drift (breathing)
        p.x += p.vx + Math.sin(p.angle) * 0.07
        p.y += p.vy + Math.cos(p.angle * 0.71) * 0.07

        // Wrap
        if (p.x < -10) p.x = W + 10
        if (p.x > W + 10) p.x = -10
        if (p.y < -10) p.y = H + 10
        if (p.y > H + 10) p.y = -10

        // Mouse attraction (gentle pull)
        const dx = mx - p.x
        const dy = my - p.y
        const dist2 = dx * dx + dy * dy
        if (dist2 < 180 * 180 && dist2 > 0) {
          const dist = Math.sqrt(dist2)
          const force = ((180 - dist) / 180) * 0.015
          p.x += (dx / dist) * force * 18
          p.y += (dy / dist) * force * 18
        }
      }

      /* 4 ─ Connection lines (corporate network) */
      const CONNECT_DIST = 120
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.18
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = a.isAccent || b.isAccent
              ? `rgba(220,0,25,${alpha * 0.8})`
              : `rgba(255,255,255,${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      /* 5 ─ Draw particles */
      for (const p of particles) {
        const breathe = Math.sin(t.current * 0.015 + p.angle) * 0.08
        const opacity = Math.max(0, Math.min(1, p.baseOpacity + breathe))

        if (p.isAccent) {
          // Red accent: soft glow
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
          g.addColorStop(0, `rgba(220,0,25,${opacity * 0.9})`)
          g.addColorStop(1, 'rgba(220,0,25,0)')
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.isAccent
          ? `rgba(220,0,25,${opacity})`
          : `rgba(255,255,255,${opacity})`
        ctx.fill()
      }

      raf.current = requestAnimationFrame(draw)
    }

    /* ── Mouse tracking ─────────────────────────────────── */
    function onMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    function onLeave() {
      mouse.current = { x: -9999, y: -9999 }
    }

    resize()
    draw()

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
