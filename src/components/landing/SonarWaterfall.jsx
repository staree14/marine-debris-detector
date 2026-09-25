import { useEffect, useRef } from 'react'

const BG = [11, 17, 24]
const AMBER = [217, 139, 43]
const ROWS_PER_SECOND = 14
// Rendered at half resolution and upscaled by CSS: softer texture, a quarter
// of the pixel work.
const RES = 0.5
const MAX_MIX = 0.55

// A synthetic side-scan waterfall: dark nadir gap down the centre, seabed
// texture that is continuous along-track, and the occasional contact with a
// bright return followed by an acoustic shadow on the side away from nadir.
export default function SonarWaterfall({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let bed = new Float32Array(0)
    let targets = []
    let raf = 0
    let last = 0
    let acc = 0
    let onScreen = true

    const makeRow = () => {
      const img = ctx.createImageData(w, 1)
      const d = img.data
      const nadir = w / 2

      for (let x = 0; x < w; x++) {
        bed[x] = Math.min(1, Math.max(0, bed[x] + (Math.random() - 0.5) * 0.08))
      }
      if (Math.random() < 0.012) {
        const side = Math.random() < 0.5 ? -1 : 1
        targets.push({
          x: nadir + side * (0.2 + Math.random() * 0.6) * nadir,
          side,
          size: 2 + Math.random() * 4,
          rows: 4 + Math.floor(Math.random() * 6),
        })
      }

      for (let x = 0; x < w; x++) {
        const r = Math.abs(x - nadir) / nadir
        let v
        if (r < 0.05) {
          v = 0.04 * Math.random()
        } else {
          const gain = Math.min(1, (r - 0.05) * 6) * (1 - r * 0.55)
          const smooth = (bed[x] + bed[Math.max(0, x - 1)] + bed[Math.min(w - 1, x + 1)]) / 3
          v = gain * (0.25 + 0.45 * smooth + 0.3 * Math.random())
        }
        for (const t of targets) {
          const away = (x - t.x) * t.side
          if (away >= -t.size && away <= 0) v = Math.min(1, v + 0.7)
          else if (away > 0 && away < t.size * 3) v *= 0.15
        }
        const k = v * MAX_MIX
        const i = x * 4
        d[i] = BG[0] + (AMBER[0] - BG[0]) * k
        d[i + 1] = BG[1] + (AMBER[1] - BG[1]) * k
        d[i + 2] = BG[2] + (AMBER[2] - BG[2]) * k
        d[i + 3] = 255
      }

      targets = targets.filter((t) => --t.rows > 0)
      return img
    }

    const init = () => {
      const rect = canvas.getBoundingClientRect()
      w = Math.max(2, Math.floor(rect.width * RES))
      h = Math.max(2, Math.floor(rect.height * RES))
      canvas.width = w
      canvas.height = h
      bed = Float32Array.from({ length: w }, () => Math.random())
      targets = []
      for (let y = h - 1; y >= 0; y--) ctx.putImageData(makeRow(), 0, y)
    }

    const advance = () => {
      ctx.drawImage(canvas, 0, 0, w, h - 1, 0, 1, w, h - 1)
      ctx.putImageData(makeRow(), 0, 0)
    }

    const tick = (t) => {
      raf = requestAnimationFrame(tick)
      if (!onScreen || document.hidden) {
        last = t
        return
      }
      const dt = last ? (t - last) / 1000 : 0
      last = t
      acc = Math.min(acc + dt * ROWS_PER_SECOND, 4)
      while (acc >= 1) {
        advance()
        acc -= 1
      }
    }

    init()
    const ro = new ResizeObserver(init)
    ro.observe(canvas)

    let io
    if (!reduce) {
      io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
      })
      io.observe(canvas)
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io?.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={`block size-full ${className}`} />
}
