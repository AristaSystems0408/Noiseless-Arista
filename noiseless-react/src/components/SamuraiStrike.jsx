import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/*
 * The samurai strike on "world." — drawn on one fixed canvas above the hero, only while it plays.
 *
 *   wind      petals and speed lines gust across
 *   dash      a samurai flashes across the word (afterimages); a crescent slash follows the blade, sparks fly
 *   land      he lands past the word, back to it, sword out; a thin cut glows on the still-whole word
 *   sheathe   the sword swings overhead and slides slowly into the saya
 *   chin      the moment it clicks home, the word falls apart (the page's noise calms with it)
 *   vanish    a beat later: a flash, a column of light, smoke, and he breaks into a vortex of petals
 *
 * The samurai is drawn facing his direction of travel in unit space (feet at 0,0; about 100 tall).
 */

const T = { dash0: 280, dash1: 480, swing0: 1250, swing1: 1580, chin: 1880, vanish0: 2420, vanish1: 3260, end: 4100 }
const SPLIT_MS = 2100            // matches .slice-word.split in index.css

const M = [10, -41]              // saya mouth
const E = [-58, -26]             // saya end
const D = (() => { const x = E[0] - M[0], y = E[1] - M[1], l = Math.hypot(x, y); return [x / l, y / l] })()
const H0 = [-38, -50]            // sword hand in the finishing pose
const A0 = Math.atan2(0.18, -1)  // blade angle in the finishing pose (pointing back, a little down)
const AD = Math.atan2(D[1], D[0])
const H1 = [M[0] - D[0] * 55, M[1] - D[1] * 55]   // blade lined up with the saya
const HS = [M[0] - D[0] * 9, M[1] - D[1] * 9]     // sheathed: only the hilt shows
const BLADE = 74
const SHOULDER = [-4, -61]

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const lerp = (a, b, t) => a + (b - a) * t
const outCubic = (t) => 1 - (1 - t) ** 3
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const bez = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * c + t * t * b

const INK = '#04080c'
const RIM = 'rgba(0, 255, 208, 0.85)'
const PINK = '#ff4d6a'

function samurai(g, s, time, pose, opts = {}) {
  const fl = Math.sin(time * 9) * 2.2, fl2 = Math.sin(time * 7 + 1) * 2.8
  const lw = 1.1 / s
  const fill = (path) => {
    g.fillStyle = INK
    g.shadowColor = 'rgba(0, 255, 208, 0.5)'
    g.shadowBlur = opts.ghost ? 0 : 16
    g.fill(path)
    g.shadowBlur = 0
    g.strokeStyle = RIM
    g.lineWidth = lw
    g.stroke(path)
  }
  const limb = (pts, w) => {
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1])
    g.strokeStyle = RIM
    g.lineWidth = w + lw * 2.4
    g.stroke()
    g.strokeStyle = INK
    g.lineWidth = w
    g.stroke()
  }

  // headband ribbons, streaming back
  g.lineCap = 'round'
  g.strokeStyle = PINK
  g.shadowColor = PINK
  g.shadowBlur = opts.ghost ? 0 : 10
  for (const [len, ph, w] of [[1, 0, 2.2], [0.75, 1.7, 1.6]]) {
    g.beginPath()
    g.moveTo(-1, -73)
    g.bezierCurveTo(-12 * len, -71 + Math.sin(time * 11 + ph) * 3, -24 * len, -75 + Math.sin(time * 9 + ph) * 4, -38 * len, -69 + Math.sin(time * 13 + ph) * 5)
    g.lineWidth = w
    g.stroke()
  }
  g.shadowBlur = 0

  // hakama in a deep lunge
  const hakama = new Path2D()
  hakama.moveTo(-12, -40); hakama.lineTo(10, -40)
  hakama.bezierCurveTo(18, -32, 26, -22, 30, -12); hakama.lineTo(40, 0); hakama.lineTo(22, 0); hakama.lineTo(16, -12)
  hakama.bezierCurveTo(10, -18, 2, -22, -4, -22); hakama.bezierCurveTo(-14, -14, -22, -6, -26, 0)
  hakama.lineTo(-50, 0); hakama.bezierCurveTo(-42, -10, -32, -24, -12, -40); hakama.closePath()
  fill(hakama)
  g.strokeStyle = 'rgba(0, 255, 208, 0.22)'
  g.lineWidth = lw
  g.beginPath(); g.moveTo(-2, -38); g.lineTo(-20, -6); g.moveTo(4, -38); g.lineTo(26, -4); g.stroke()

  // saya at the hip
  g.lineCap = 'round'
  g.strokeStyle = RIM; g.lineWidth = 4.2 + lw * 2.4
  g.beginPath(); g.moveTo(M[0], M[1]); g.lineTo(E[0], E[1]); g.stroke()
  g.strokeStyle = '#0b1219'; g.lineWidth = 4.2; g.stroke()
  g.strokeStyle = 'rgba(255, 77, 106, 0.55)'; g.lineWidth = 0.7
  g.beginPath(); g.moveTo(M[0] - 2, M[1] - 1.2); g.lineTo(E[0] + 3, E[1] - 1.4); g.stroke()

  // haori, its tail fluttering
  const haori = new Path2D()
  haori.moveTo(-6, -66); haori.bezierCurveTo(-18, -60, -26, -46, -30 + fl, -30)
  haori.bezierCurveTo(-33 + fl, -26, -37 + fl2, -22, -42 + fl2 * 1.5, -19)
  haori.lineTo(-16, -36); haori.lineTo(12, -38); haori.lineTo(15, -60)
  haori.bezierCurveTo(10, -66, 2, -68, -6, -66); haori.closePath()
  fill(haori)

  // obi
  g.strokeStyle = PINK; g.lineWidth = 2.6
  g.beginPath(); g.moveTo(-14, -41); g.lineTo(12, -39.5); g.stroke()

  // left hand on the saya mouth
  limb([[10, -62], [21, -52], [12, -43]], 6)

  // head and kasa
  const head = new Path2D(); head.arc(6, -70, 7.5, 0, Math.PI * 2)
  fill(head)
  const kasa = new Path2D()
  kasa.moveTo(-25, -75); kasa.quadraticCurveTo(3, -97, 33, -76); kasa.quadraticCurveTo(4, -80, -25, -75); kasa.closePath()
  fill(kasa)
  // a glint under the hat
  g.fillStyle = '#9ffff0'; g.shadowColor = '#00ffd0'; g.shadowBlur = opts.ghost ? 0 : 8
  g.beginPath(); g.arc(11.5, -71.5, 0.95, 0, Math.PI * 2); g.fill()
  g.shadowBlur = 0

  // sword arm
  const [hx, hy] = pose.hand
  const mx = (SHOULDER[0] + hx) / 2, my = (SHOULDER[1] + hy) / 2
  const ax = hx - SHOULDER[0], ay = hy - SHOULDER[1], al = Math.hypot(ax, ay) || 1
  limb([SHOULDER, [mx - (ay / al) * 7, my + (ax / al) * 7], pose.hand], 6.5)

  // the katana
  const ux = Math.cos(pose.ang), uy = Math.sin(pose.ang), nx = -uy, ny = ux
  g.lineCap = 'round'
  g.strokeStyle = INK; g.lineWidth = 3.4
  g.beginPath(); g.moveTo(hx - ux * 9, hy - uy * 9); g.lineTo(hx + ux * 3, hy + uy * 3); g.stroke()
  g.strokeStyle = '#d4a84b'; g.lineWidth = 1.8
  g.beginPath(); g.moveTo(hx + ux * 4 + nx * 3.4, hy + uy * 4 + ny * 3.4); g.lineTo(hx + ux * 4 - nx * 3.4, hy + uy * 4 - ny * 3.4); g.stroke()
  g.save()
  if (pose.clip) {
    // whatever has passed the saya mouth is inside the saya
    g.beginPath()
    g.moveTo(M[0] + D[1] * 80, M[1] - D[0] * 80)
    g.lineTo(M[0] - D[1] * 80, M[1] + D[0] * 80)
    g.lineTo(M[0] - D[1] * 80 - D[0] * 300, M[1] + D[0] * 80 - D[1] * 300)
    g.lineTo(M[0] + D[1] * 80 - D[0] * 300, M[1] - D[0] * 80 - D[1] * 300)
    g.closePath()
    g.clip()
  }
  const b0x = hx + ux * 5, b0y = hy + uy * 5, b1x = hx + ux * (5 + BLADE), b1y = hy + uy * (5 + BLADE)
  const cx = (b0x + b1x) / 2 - nx * 2.6, cy = (b0y + b1y) / 2 - ny * 2.6
  const blade = () => { g.beginPath(); g.moveTo(b0x, b0y); g.quadraticCurveTo(cx, cy, b1x, b1y) }
  blade()
  g.strokeStyle = 'rgba(0, 255, 208, 0.4)'; g.lineWidth = 4.2; g.shadowColor = '#00ffd0'; g.shadowBlur = opts.ghost ? 0 : 20 * (pose.glow ?? 1)
  g.stroke()
  g.shadowBlur = 0
  blade(); g.strokeStyle = '#effffc'; g.lineWidth = 1.5; g.stroke()
  g.restore()
}

export default function SamuraiStrike({ wordRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const word = wordRef.current
    if (!canvas || !word) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const g = canvas.getContext('2d')
    const h1 = word.closest('h1')

    let raf = 0, timer = 0, running = false, start = 0
    let geo = null
    let sparks = [], petals = [], dust = [], ink = []
    let puffs = [], swirl = [], vanished = false
    let slashP = 0, chinDone = false, shook = false, landed = false

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      return dpr
    }
    let dpr = size()
    const onResize = () => { dpr = size() }
    window.addEventListener('resize', onResize)

    const shake = (amp, ms) => {
      if (!h1) return
      const t0 = performance.now()
      const step = () => {
        const k = (performance.now() - t0) / ms
        if (k >= 1) { h1.style.transform = ''; return }
        const a = amp * (1 - k)
        h1.style.transform = `translate(${(Math.random() - 0.5) * a}px, ${(Math.random() - 0.5) * a}px)`
        requestAnimationFrame(step)
      }
      step()
    }

    const layout = () => {
      const r = word.getBoundingClientRect()
      const fs = parseFloat(getComputedStyle(word).fontSize) || 80
      const s = Math.max(0.9, (fs * 1.8) / 100)             // px per samurai unit
      const vw = window.innerWidth
      let dir = 1
      let lx = r.right + 115 * s
      if (lx + 44 * s > vw - 8) { dir = -1; lx = r.left - 115 * s }
      if (dir === -1 && lx - 50 * s < 8) { dir = 1; lx = Math.min(vw - 44 * s - 8, r.right + 50 * s) }
      // on phones the line is full, so he lands on top of the headline instead of beside the word
      const ly = vw < 700 ? r.top + fs * 0.1 : r.bottom - fs * 0.16
      const sx = dir === 1 ? r.left - 120 * s : r.right + 120 * s
      // the cut: the same line the halves are clipped along
      const A = [r.left - r.width * 0.05, r.top + r.height * 0.6]
      const B = [r.right + r.width * 0.05, r.top + r.height * 0.46]
      return { r, fs, s, dir, lx, ly, sx, A, B }
    }

    const toWorld = (p) => [geo.lx + geo.dir * geo.s * p[0], geo.ly + geo.s * p[1]]

    const poseAt = (ms) => {
      if (ms < T.swing0) return { hand: H0, ang: A0 }
      if (ms < T.swing1) {
        const e = inOut((ms - T.swing0) / (T.swing1 - T.swing0))
        const hand = [bez(H0[0], -6, H1[0], e), bez(H0[1], -88, H1[1], e)]
        const ang = lerp(A0, AD, e) + Math.sin(Math.PI * Math.min(1, e * 1.4)) * 0.95
        return { hand, ang, clip: e > 0.72 }
      }
      if (ms < T.chin) {
        const e = inOut(clamp01((ms - T.swing1) / (T.chin - T.swing1)))
        return { hand: [lerp(H1[0], HS[0], e * e), lerp(H1[1], HS[1], e * e)], ang: AD, clip: true, glow: 1 - e * 0.6 }
      }
      return { hand: HS, ang: AD, clip: true, glow: 0.4 }
    }

    const finish = () => {
      running = false
      cancelAnimationFrame(raf)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      canvas.style.visibility = 'hidden'
      schedule(6500 + Math.random() * 2500)
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const ms = now - start
      if (ms > T.end) { finish(); return }
      geo = layout()
      const { s, dir, lx, ly, sx, A, B, r, fs } = geo
      const time = ms / 1000

      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      g.globalCompositeOperation = 'source-over'

      // ── wind: speed lines and petals ──
      if (ms < T.dash1 + 260) {
        const k = clamp01(ms / (T.dash1 + 260))
        const a = Math.sin(Math.PI * k)
        for (let i = 0; i < 9; i++) {
          const yy = r.top - fs * 0.5 + ((i * 37) % 100) / 100 * fs * 2.2
          const len = fs * (1.5 + ((i * 53) % 7) / 3)
          const x0 = lerp(sx, lx, outCubic(clamp01(k * 1.6 - i * 0.05))) - dir * len
          const grd = g.createLinearGradient(x0, 0, x0 + dir * len, 0)
          grd.addColorStop(0, 'rgba(0,255,208,0)')
          grd.addColorStop(1, `rgba(160,255,240,${0.32 * a})`)
          g.strokeStyle = grd
          g.lineWidth = 1
          g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + dir * len, yy); g.stroke()
        }
      }
      for (const p of petals) {
        p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 10 / 60; p.vx *= 0.992; p.rot += p.vr / 60
        const age = ms - p.born
        const a = clamp01(age / 200) * clamp01((p.life - age) / 600)
        if (a <= 0) continue
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, 0.55 + 0.45 * Math.sin(p.rot * 2))
        g.fillStyle = p.c.replace('A', a.toFixed(3))
        g.beginPath(); g.ellipse(0, 0, p.sz, p.sz * 0.55, 0, 0, Math.PI * 2); g.fill()
        g.restore()
      }

      // ── the samurai ──
      const dashK = clamp01((ms - T.dash0) / (T.dash1 - T.dash0))
      const xNow = lerp(sx, lx, outCubic(dashK))
      if (ms >= T.dash0 && ms < T.dash1) {
        // afterimages along the dash
        for (let j = 6; j >= 0; j--) {
          const kj = clamp01(dashK - j * 0.075)
          const xj = lerp(sx, lx, outCubic(kj))
          g.save()
          g.globalAlpha = j === 0 ? 0.9 : 0.42 - j * 0.055
          g.translate(xj, ly); g.scale(dir * s * 1.25, s * 0.96); g.transform(1, 0, -0.35, 1, 0, 0)
          samurai(g, s, time, { hand: H0, ang: A0 }, { ghost: j > 0 })
          g.restore()
        }
      } else if (ms >= T.dash1) {
        if (!landed) {
          landed = true
          for (let i = 0; i < 16; i++) {
            const side = i % 2 ? 1 : -1
            dust.push({ x: lx + side * 10 * s, y: ly, vx: side * (40 + Math.random() * 120), vy: -Math.random() * 40, born: ms, life: 500 + Math.random() * 300, sz: (2 + Math.random() * 3) * s })
          }
        }
        const vk = clamp01((ms - T.vanish0) / 260)            // the body is gone a quarter-second into the vanish
        if (vk < 1) {
          const settle = 1 - outCubic(clamp01((ms - T.dash1) / 160))   // a little recoil on landing
          const pose = poseAt(ms)
          g.save()
          g.translate(lx + dir * settle * 6 * s, ly)
          g.scale(dir * s * (1 + settle * 0.08 - vk * 0.5), s * (1 - settle * 0.06 + vk * 0.25))
          g.globalAlpha = 1 - vk
          samurai(g, s, time, pose)
          if (vk > 0) {
            // the flash: for an instant he is pure light
            g.globalCompositeOperation = 'lighter'
            g.globalAlpha = Math.sin(Math.PI * vk) * 0.9
            samurai(g, s, time, pose, { ghost: true })
          }
          g.restore()
        }

        // ── the vanish: smoke bomb, flash, a vortex of petals ──
        if (ms >= T.vanish0 && !vanished) {
          vanished = true
          const c = toWorld([0, -48])
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90
            puffs.push({ x: c[0] + Math.cos(a) * 14 * s, y: c[1] + Math.sin(a) * 22 * s, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 30, born: ms, life: 700 + Math.random() * 400, r0: (14 + Math.random() * 12) * s })
          }
          for (let i = 0; i < 240; i++) {
            const w = toWorld([(Math.random() - 0.5) * 70, -Math.random() * 96])
            const dx = w[0] - c[0], dy = w[1] - c[1]
            swirl.push({
              cx: c[0], cy: c[1], ang: Math.atan2(dy, dx), rad: Math.hypot(dx, dy), w: 5 + Math.random() * 5,
              grow: ((40 + Math.random() * 120) * s) / 2, rise: 50 + Math.random() * 110, born: ms + Math.random() * 120, life: 900 + Math.random() * 700,
              sz: ((2.2 + Math.random() * 3.6) * s) / 2, rot: Math.random() * 6,
              c: Math.random() < 0.55 ? 'rgba(255,140,170,A)' : Math.random() < 0.6 ? 'rgba(255,235,242,A)' : 'rgba(0,255,208,A)',
            })
          }
          shake(fs * 0.02, 120)
        }
      }

      // ── the slash follows the blade across the word ──
      const reach = dir === 1 ? (xNow - A[0]) / (B[0] - A[0]) : (B[0] - xNow) / (B[0] - A[0])
      const prevP = slashP
      if (ms >= T.dash0) slashP = Math.max(slashP, clamp01(reach))
      if (slashP > prevP) {
        const u = slashP
        const px = dir === 1 ? lerp(A[0], B[0], u) : lerp(B[0], A[0], u)
        const py = dir === 1 ? lerp(A[1], B[1], u) : lerp(B[1], A[1], u)
        for (let i = 0; i < 7; i++) {
          sparks.push({ x: px, y: py, vx: dir * (120 + Math.random() * 420), vy: (Math.random() - 0.7) * 260, born: ms, life: 300 + Math.random() * 380, c: Math.random() < 0.25 ? PINK : Math.random() < 0.5 ? '#ffffff' : '#00ffd0' })
        }
        if (!shook && u > 0.45) { shook = true; shake(fs * 0.06, 220) }
      }
      if (slashP > 0) {
        const sinceCut = ms - T.dash1
        const hot = sinceCut < 0 ? 1 : Math.max(0, 1 - sinceCut / 420)
        const fadeOut = ms > T.chin ? Math.max(0, 1 - (ms - T.chin) / 260) : 1
        const width = (fs * 0.07) * hot + 1.2
        const flicker = 0.75 + 0.25 * Math.sin(ms / 23)
        const n = 40
        const pt = (u) => (dir === 1 ? [lerp(A[0], B[0], u), lerp(A[1], B[1], u)] : [lerp(B[0], A[0], u), lerp(B[1], A[1], u)])
        const dx = B[0] - A[0], dy = B[1] - A[1], dl = Math.hypot(dx, dy), nx = -dy / dl, ny = dx / dl
        g.save()
        g.globalCompositeOperation = 'lighter'
        g.beginPath()
        for (let i = 0; i <= n; i++) { const u = (i / n) * slashP, [x, y] = pt(u), w = Math.sin(Math.PI * (i / n)) * width; i ? g.lineTo(x + nx * w, y + ny * w) : g.moveTo(x + nx * w, y + ny * w) }
        for (let i = n; i >= 0; i--) { const u = (i / n) * slashP, [x, y] = pt(u), w = Math.sin(Math.PI * (i / n)) * width * 0.35; g.lineTo(x - nx * w, y - ny * w) }
        g.closePath()
        g.shadowColor = '#00ffd0'; g.shadowBlur = 24
        g.fillStyle = `rgba(235,255,250,${(0.35 + 0.65 * hot) * fadeOut * (hot > 0 ? 1 : flicker)})`
        g.fill()
        g.restore()
        // the flash as the blade passes
        if (hot > 0 && sinceCut < 260) {
          const k = 1 - Math.max(0, sinceCut) / 260
          const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2
          const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r.width * 1.2)
          grd.addColorStop(0, `rgba(200,255,245,${0.22 * k})`)
          grd.addColorStop(1, 'rgba(0,255,208,0)')
          g.fillStyle = grd
          g.fillRect(cx - r.width * 1.3, cy - r.width * 1.3, r.width * 2.6, r.width * 2.6)
        }
      }

      // ── chin: the sword clicks home and the word falls apart ──
      if (ms >= T.chin && !chinDone) {
        chinDone = true
        word.classList.remove('split'); void word.offsetWidth; word.classList.add('split')
        setTimeout(() => word.classList.remove('split'), SPLIT_MS)
        window.dispatchEvent(new Event('noiseless:cut'))
        shake(fs * 0.03, 160)
        for (let i = 0; i < 60; i++) {
          const u = Math.random()
          ink.push({ x: lerp(A[0], B[0], u), y: lerp(A[1], B[1], u), vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 70 - 10, born: ms, life: 900 + Math.random() * 700, sz: 1 + Math.random() * 2.2, pink: true })
        }
      }
      if (ms >= T.chin && ms < T.chin + 700) {
        const k = (ms - T.chin) / 700
        const [mx, my] = toWorld(M)
        g.save()
        g.globalCompositeOperation = 'lighter'
        g.strokeStyle = `rgba(160,255,240,${0.8 * (1 - k)})`
        g.lineWidth = 2 * (1 - k) + 0.5
        g.shadowColor = '#00ffd0'; g.shadowBlur = 12
        g.beginPath(); g.arc(mx, my, 4 + outCubic(k) * 34 * s, 0, Math.PI * 2); g.stroke()
        g.fillStyle = `rgba(255,255,255,${0.9 * (1 - k) ** 3})`
        g.beginPath(); g.arc(mx, my, 3 * s, 0, Math.PI * 2); g.fill()
        // 斬 — "cut" — behind the word, one breath long
        g.globalAlpha = 0.16 * Math.sin(Math.PI * k)
        g.font = `${Math.round(fs * 2.1)}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", serif`
        g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillStyle = '#ff6b8a'; g.shadowColor = PINK; g.shadowBlur = 30
        g.fillText('斬', r.left + r.width / 2, r.top + r.height / 2)
        g.restore()
      }

      // ── vanish: smoke, a ground shockwave, petals spiralling out ──
      if (ms >= T.vanish0) {
        const k = (ms - T.vanish0) / (T.vanish1 - T.vanish0)
        const c = toWorld([0, -48])
        if (k < 1) {
          g.save()
          g.globalCompositeOperation = 'lighter'
          g.strokeStyle = `rgba(255,140,170,${0.6 * (1 - k)})`
          g.lineWidth = 2 * (1 - k)
          g.beginPath(); g.ellipse(c[0], c[1] + 40 * s, (10 + outCubic(k) * 120) * s, (3 + outCubic(k) * 26) * s, 0, 0, Math.PI * 2); g.stroke()
          if (k < 0.22) {
            // a column of light where he stood
            const f = 1 - k / 0.22
            const colW = (4 + 30 * (1 - f)) * s
            const grd2 = g.createLinearGradient(c[0] - colW, 0, c[0] + colW, 0)
            grd2.addColorStop(0, 'rgba(0,255,208,0)')
            grd2.addColorStop(0.5, `rgba(220,255,250,${0.75 * f})`)
            grd2.addColorStop(1, 'rgba(0,255,208,0)')
            g.fillStyle = grd2
            g.fillRect(c[0] - colW, c[1] - 260 * s, colW * 2, 310 * s)
          }
          if (k < 0.3) {
            const f = 1 - k / 0.3
            const grd = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], 90 * s)
            grd.addColorStop(0, `rgba(255,255,255,${0.55 * f})`)
            grd.addColorStop(0.4, `rgba(0,255,208,${0.2 * f})`)
            grd.addColorStop(1, 'rgba(0,255,208,0)')
            g.fillStyle = grd
            g.fillRect(c[0] - 90 * s, c[1] - 90 * s, 180 * s, 180 * s)
          }
          g.restore()
        }
        puffs = puffs.filter((p) => ms - p.born < p.life)
        for (const p of puffs) {
          p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.95; p.vy *= 0.95
          const a = 1 - (ms - p.born) / p.life
          const rr = p.r0 * (1 + (1 - a) * 1.6)
          const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr)
          grd.addColorStop(0, `rgba(120,150,160,${0.28 * a})`)
          grd.addColorStop(1, 'rgba(120,150,160,0)')
          g.fillStyle = grd
          g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.fill()
        }
        swirl = swirl.filter((p) => ms - p.born < p.life)
        for (const p of swirl) {
          const age = (ms - p.born) / 1000
          if (age < 0) continue
          const ang = p.ang + p.w * age * Math.exp(-age * 1.2) * 1.3
          const rad = p.rad + p.grow * (1 - Math.exp(-age * 2.2))
          const x = p.cx + Math.cos(ang) * rad + (dir * age * 60 * s) / 2
          const y = p.cy + Math.sin(ang) * rad * 0.7 - p.rise * age
          const a = clamp01(age * 8) * clamp01(1 - (ms - p.born) / p.life)
          g.save(); g.translate(x, y); g.rotate(p.rot + age * 6); g.scale(1, 0.55 + 0.45 * Math.sin(p.rot + age * 9))
          g.fillStyle = p.c.replace('A', a.toFixed(3))
          g.beginPath(); g.ellipse(0, 0, p.sz, p.sz * 0.55, 0, 0, Math.PI * 2); g.fill()
          g.restore()
        }
      }

      // ── particles ──
      g.save()
      g.globalCompositeOperation = 'lighter'
      sparks = sparks.filter((p) => ms - p.born < p.life)
      for (const p of sparks) {
        const dt = 1 / 60
        const ox = p.x, oy = p.y
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.vx *= 0.96
        const a = 1 - (ms - p.born) / p.life
        g.strokeStyle = p.c; g.globalAlpha = a; g.lineWidth = 1.4
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(p.x, p.y); g.stroke()
      }
      g.restore()
      ink = ink.filter((p) => ms - p.born < p.life)
      dust = dust.filter((p) => ms - p.born < p.life)
      for (const p of [...ink, ...dust]) {
        p.x += p.vx / 60; p.y += p.vy / 60; p.vx *= 0.97; p.vy *= 0.97
        const a = 1 - (ms - p.born) / p.life
        g.globalAlpha = a * (p.pink ? 0.85 : 0.55)
        g.fillStyle = p.pink ? (p.sz > 2 ? '#ff6b8a' : '#c77dff') : '#7fe9d6'
        g.beginPath(); g.arc(p.x, p.y, p.sz, 0, Math.PI * 2); g.fill()
      }
      g.globalAlpha = 1
    }

    const play = () => {
      if (running) return
      const r = word.getBoundingClientRect()
      if (document.hidden || r.bottom < 0 || r.top > window.innerHeight) { schedule(1200); return }
      clearTimeout(timer)
      running = true
      slashP = 0; chinDone = false; shook = false; landed = false
      sparks = []; dust = []; ink = []
      puffs = []; swirl = []; vanished = false
      geo = layout()
      petals = Array.from({ length: 18 }, () => {
        const y = geo.r.top - geo.fs * 0.8 + Math.random() * geo.fs * 2.6
        return {
          x: geo.dir === 1 ? geo.r.left - geo.fs * (1 + Math.random() * 3) : geo.r.right + geo.fs * (1 + Math.random() * 3), y,
          vx: geo.dir * (380 + Math.random() * 420), vy: -20 + Math.random() * 40, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 9,
          sz: 2.5 + Math.random() * 3.5, born: Math.random() * 200, life: 1600 + Math.random() * 900,
          c: Math.random() < 0.7 ? 'rgba(255,140,170,A)' : 'rgba(255,230,240,A)',
        }
      })
      canvas.style.visibility = 'visible'
      start = performance.now()
      raf = requestAnimationFrame(frame)
    }
    function schedule(ms) { clearTimeout(timer); timer = setTimeout(play, ms) }

    const onClick = () => play()
    word.addEventListener('click', onClick)
    schedule(1400)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      word.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      word.classList.remove('split')
      if (h1) h1.style.transform = ''
    }
  }, [wordRef])

  return createPortal(<canvas ref={canvasRef} className="samurai-canvas" aria-hidden="true" />, document.body)
}
