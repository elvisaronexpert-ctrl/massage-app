'use client'

import { useEffect, useRef } from 'react'

export default function BackgroundBlobs() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const topGroupRef = useRef<SVGGElement>(null)
  const bottomGroupRef = useRef<SVGGElement>(null)

  useEffect(() => {
    let cx = window.innerWidth  / 2
    let cy = window.innerHeight / 2
    let tx = cx, ty = cy

    // smoothed normalized positions (-0.5 → 0.5)
    let nx = 0, ny = 0
    let tnx = 0, tny = 0

    let rafId = 0

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
      tnx = (e.clientX / window.innerWidth)  - 0.5
      tny = (e.clientY / window.innerHeight) - 0.5
    }

    function tick() {
      // cursor glow
      cx += (tx - cx) * 0.045
      cy += (ty - cy) * 0.045
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cx - 200}px,${cy - 200}px)`
      }

      // parallax blobs
      nx += (tnx - nx) * 0.035
      ny += (tny - ny) * 0.035

      if (topGroupRef.current) {
        // top-left blobs drift toward cursor
        topGroupRef.current.setAttribute('transform', `translate(${nx * 7},${ny * 5})`)
      }
      if (bottomGroupRef.current) {
        // bottom-right blobs drift opposite (deeper layer)
        bottomGroupRef.current.setAttribute('transform', `translate(${nx * -4},${ny * -3})`)
      }

      rafId = requestAnimationFrame(tick)
    }

    tick()
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <>
      {/* ── SVG rotating blobs ─────────────────────────────────────── */}
      <svg
        preserveAspectRatio="xMidYMid slice"
        viewBox="10 10 80 80"
        aria-hidden="true"
        className="fixed inset-0 w-full h-screen pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <defs>
          <style>{`
            @keyframes rotate {
              0%   { transform: rotate(0deg);   }
              100% { transform: rotate(360deg); }
            }
            .blob-out-top    { animation: rotate 22s linear infinite; transform-origin: 13px 25px; }
            .blob-in-top     { animation: rotate 12s linear infinite; transform-origin: 13px 25px; }
            .blob-out-bottom { animation: rotate 28s linear infinite; transform-origin: 84px 93px; }
            .blob-in-bottom  { animation: rotate 18s linear infinite; transform-origin: 84px 93px; }
          `}</style>
        </defs>

        {/* top-left group — moves toward cursor */}
        <g ref={topGroupRef}>
          <path
            fill="#07005c"
            fillOpacity="0.22"
            className="blob-out-top"
            d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"
          />
          <path
            fill="#0d00a3"
            fillOpacity="0.18"
            className="blob-in-top"
            d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"
          />
        </g>

        {/* bottom-right group — moves opposite */}
        <g ref={bottomGroupRef}>
          <path
            fill="#1e14e0"
            fillOpacity="0.16"
            className="blob-out-bottom"
            d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"
          />
          <path
            fill="#4d40e8"
            fillOpacity="0.14"
            className="blob-in-bottom"
            d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"
          />
        </g>
      </svg>

      {/* ── Cursor-reactive glow blob ──────────────────────────────── */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          zIndex: 0,
          width:  400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(77,64,232,0.10) 0%, rgba(13,0,163,0.04) 45%, transparent 70%)',
          filter: 'blur(48px)',
          willChange: 'transform',
        }}
      />
    </>
  )
}
