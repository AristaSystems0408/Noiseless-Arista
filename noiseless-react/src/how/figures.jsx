import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'

// ── Math ─────────────────────────────────────────────────────────────────────
export function Tex({ children, block = false }) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: block, throwOnError: false, strict: false }),
    [children, block],
  )
  return block
    ? <div className="tex-block" dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="tex-inline" dangerouslySetInnerHTML={{ __html: html }} />
}

const C = {
  teal: '#00d4aa', mint: '#00ffd0', blue: '#4dabff', pink: '#ff6b8a', violet: '#a78bfa',
  text: '#e8ecf1', dim: '#8893a2', mute: '#566070', grid: 'rgba(255,255,255,0.07)', line: 'rgba(255,255,255,0.14)',
}

// ── 1. Signal path ───────────────────────────────────────────────────────────
const STAGES = [
  { k: 'mic', t: 'Microphone', s: 'raw 48 kHz' },
  { k: 'hp', t: 'High-pass', s: '70 Hz · 3rd order' },
  { k: 'rnn', t: 'RNNoise', s: 'GRU network · 10 ms' },
  { k: 'la', t: 'Look-ahead', s: '30 ms' },
  { k: 'gate', t: 'Proximity gate', s: 'level × speech prob.' },
  { k: 'lim', t: 'Limiter', s: 'soft tanh knee' },
  { k: 'out', t: 'Your meeting', s: 'only your voice' },
]

export function PipelineFigure() {
  const W = 1120, H = 230, bw = 132, gap = (W - STAGES.length * bw) / (STAGES.length - 1)
  const x = (i) => i * (bw + gap)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fig fig-pipeline" role="img" aria-label="Signal path">
      <defs>
        <linearGradient id="pipeFlow" x1="0" x2="1">
          <stop offset="0" stopColor={C.pink} /><stop offset="0.42" stopColor={C.violet} /><stop offset="0.62" stopColor={C.teal} /><stop offset="1" stopColor={C.mint} />
        </linearGradient>
        <filter id="pipeGlow"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <path d={`M ${bw / 2} 92 H ${W - bw / 2}`} stroke="url(#pipeFlow)" strokeWidth="2" fill="none" opacity="0.35" />
      <path d={`M ${bw / 2} 92 H ${W - bw / 2}`} stroke="url(#pipeFlow)" strokeWidth="3" fill="none"
        strokeDasharray="6 18" className="flow-dash" filter="url(#pipeGlow)" />
      <path d={`M ${bw / 2} 92 H ${W - bw / 2}`} stroke="url(#pipeFlow)" strokeWidth="2" fill="none" strokeDasharray="6 18" className="flow-dash" />
      {/* speech probability side-channel: RNNoise -> gate */}
      <path d={`M ${x(2) + bw / 2} 128 C ${x(2) + bw / 2} 192, ${x(4) + bw / 2} 192, ${x(4) + bw / 2} 128`} stroke={C.blue}
        strokeWidth="1.6" fill="none" strokeDasharray="4 6" className="flow-dash-slow" />
      <text x={(x(2) + x(4)) / 2 + bw / 2} y="214" fill={C.blue} fontSize="13" textAnchor="middle" fontFamily="JetBrains Mono">
        speech probability p ∈ [0, 1]
      </text>
      {STAGES.map((s, i) => {
        const key = s.k === 'rnn' || s.k === 'gate'
        return (
          <g key={s.k} transform={`translate(${x(i)}, 56)`}>
            <rect width={bw} height="72" rx="14" fill={key ? 'rgba(0,212,170,0.10)' : 'rgba(255,255,255,0.035)'}
              stroke={key ? C.teal : C.line} strokeWidth={key ? 1.4 : 1} />
            <text x={bw / 2} y="31" fill={C.text} fontSize="15" fontWeight="600" textAnchor="middle" fontFamily="Space Grotesk">{s.t}</text>
            <text x={bw / 2} y="52" fill={key ? C.teal : C.dim} fontSize="11.5" textAnchor="middle" fontFamily="JetBrains Mono">{s.s}</text>
          </g>
        )
      })}
      <text x={bw / 2} y="30" fill={C.pink} fontSize="12" textAnchor="middle" fontFamily="JetBrains Mono">voice + noise</text>
      <text x={W - bw / 2} y="30" fill={C.mint} fontSize="12" textAnchor="middle" fontFamily="JetBrains Mono">voice</text>
    </svg>
  )
}

// ── shared plot frame ────────────────────────────────────────────────────────
function Plot({ W = 900, H = 340, pad = { l: 52, r: 18, t: 18, b: 40 }, xTicks, yTicks, xLabel, yLabel, children }) {
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fig">
      <g transform={`translate(${pad.l},${pad.t})`}>
        {yTicks.map(([v, y, lab]) => (
          <g key={`y${v}`}>
            <line x1="0" x2={iw} y1={y(ih)} y2={y(ih)} stroke={C.grid} />
            <text x="-10" y={y(ih) + 4} fill={C.mute} fontSize="11" textAnchor="end" fontFamily="JetBrains Mono">{lab}</text>
          </g>
        ))}
        {xTicks.map(([v, x, lab]) => (
          <g key={`x${v}`}>
            <line y1="0" y2={ih} x1={x(iw)} x2={x(iw)} stroke={C.grid} />
            <text y={ih + 22} x={x(iw)} fill={C.mute} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">{lab}</text>
          </g>
        ))}
        {children(iw, ih)}
        <text x={iw / 2} y={ih + 38} fill={C.dim} fontSize="11.5" textAnchor="middle" fontFamily="JetBrains Mono">{xLabel}</text>
        <text transform={`translate(-40 ${ih / 2}) rotate(-90)`} fill={C.dim} fontSize="11.5" textAnchor="middle" fontFamily="JetBrains Mono">{yLabel}</text>
      </g>
    </svg>
  )
}

// ── 2. High-pass frequency response, from the exact coefficients the engine uses ──
function highPassCoefficients(fc = 70, fs = 48000) {
  const k = Math.tan((Math.PI * fc) / fs)
  const b0 = 1 / (1 + k), a1 = (k - 1) / (k + 1)
  const w0 = (2 * Math.PI * fc) / fs, cw = Math.cos(w0), alpha = Math.sin(w0) / 2, a0 = 1 + alpha
  return { b0, a1, c0: (1 + cw) / 2 / a0, c1: -(1 + cw) / a0, c2: (1 + cw) / 2 / a0, d1: (-2 * cw) / a0, d2: (1 - alpha) / a0 }
}

export function HighPassFigure() {
  const co = highPassCoefficients()
  const fs = 48000
  const resp = (f) => {
    const w = (2 * Math.PI * f) / fs
    const re = (a, b) => [a, b] // complex helper
    const mul = ([a, b], [c, d]) => re(a * c - b * d, a * d + b * c)
    const div = ([a, b], [c, d]) => { const m = c * c + d * d; return re((a * c + b * d) / m, (b * c - a * d) / m) }
    const z1 = re(Math.cos(-w), Math.sin(-w)), z2 = mul(z1, z1)
    const h1 = div(re(co.b0 * (1 - z1[0]), -co.b0 * z1[1]), re(1 + co.a1 * z1[0], co.a1 * z1[1]))
    const h2 = div(re(co.c0 + co.c1 * z1[0] + co.c2 * z2[0], co.c1 * z1[1] + co.c2 * z2[1]),
      re(1 + co.d1 * z1[0] + co.d2 * z2[0], co.d1 * z1[1] + co.d2 * z2[1]))
    const h = mul(h1, h2)
    return 20 * Math.log10(Math.hypot(h[0], h[1]) + 1e-12)
  }
  const fmin = 10, fmax = 20000
  const fx = (f) => (Math.log10(f / fmin) / Math.log10(fmax / fmin))
  const dy = (db) => (6 - db) / 66 // 6 dB .. -60 dB
  const pts = []
  for (let i = 0; i <= 240; i++) { const f = fmin * (fmax / fmin) ** (i / 240); pts.push([fx(f), dy(Math.max(-60, resp(f)))]) }
  return (
    <Plot
      xTicks={[[10, () => 0, '10'], [70, (w) => fx(70) * w, '70 Hz'], [300, (w) => fx(300) * w, '300'], [1000, (w) => fx(1000) * w, '1k'], [4000, (w) => fx(4000) * w, '4k'], [20000, (w) => w, '20k']]}
      yTicks={[[0, (h) => dy(0) * h, '0 dB'], [-20, (h) => dy(-20) * h, '-20'], [-40, (h) => dy(-40) * h, '-40'], [-60, (h) => dy(-60) * h, '-60']]}
      xLabel="frequency (Hz, log)" yLabel="gain (dB)">
      {(w, h) => (
        <>
          <rect x="0" y="0" width={fx(70) * w} height={h} fill="rgba(255,107,138,0.07)" />
          <text x="8" y={h - 10} fill={C.pink} fontSize="11" fontFamily="JetBrains Mono">rumble, hum, desk thumps</text>
          <rect x={fx(300) * w} y="0" width={(fx(3400) - fx(300)) * w} height={h} fill="rgba(0,212,170,0.06)" />
          <text x={fx(1000) * w} y="16" fill={C.teal} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">speech band — untouched</text>
          <polyline points={pts.map(([px, py]) => `${px * w},${py * h}`).join(' ')} fill="none" stroke={C.mint} strokeWidth="2.4" />
          <circle cx={fx(70) * w} cy={dy(resp(70)) * h} r="4" fill={C.mint} />
          <text x={fx(70) * w + 8} y={dy(resp(70)) * h + 16} fill={C.text} fontSize="11" fontFamily="JetBrains Mono">{resp(70).toFixed(1)} dB at 70 Hz</text>
        </>
      )}
    </Plot>
  )
}

// ── 3. RNNoise's 22 Bark-like bands (eband5ms edges × 200 Hz) ────────────────
const EBAND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 34, 40, 48, 60, 78, 100]
export function BandsFigure() {
  const fmax = 20000
  const X = (f, w) => (Math.sqrt(f / fmax)) * w   // sqrt axis shows the narrow low bands
  return (
    <Plot H={290}
      xTicks={[[0, () => 0, '0'], [1000, (w) => X(1000, w), '1k'], [4000, (w) => X(4000, w), '4k'], [8000, (w) => X(8000, w), '8k'], [20000, (w) => w, '20 kHz']]}
      yTicks={[[0, (h) => h, '0'], [1, () => 0, '1']]}
      xLabel="frequency (√ scale)" yLabel="band weight w_b(k)">
      {(w, h) => EBAND.map((e, b) => {
        const f = e * 200, fl = (EBAND[b - 1] ?? 0) * 200, fr = (EBAND[b + 1] ?? e) * 200
        const col = b % 2 ? C.teal : C.blue
        return (
          <polygon key={b} points={`${X(fl, w)},${h} ${X(f, w)},0 ${X(fr, w)},${h}`}
            fill={col} fillOpacity="0.12" stroke={col} strokeOpacity="0.85" strokeWidth="1.3" />
        )
      })}
    </Plot>
  )
}

// ── 4. The network (Valin, 2018) ─────────────────────────────────────────────
export function NetworkFigure() {
  const box = (x, y, w, h, title, sub, accent) => (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={h} rx="14" fill={accent ? 'rgba(0,212,170,0.10)' : 'rgba(255,255,255,0.04)'} stroke={accent ? C.teal : C.line} />
      <text x={w / 2} y={h / 2 - 3} textAnchor="middle" fill={C.text} fontSize="15" fontWeight="600" fontFamily="Space Grotesk">{title}</text>
      <text x={w / 2} y={h / 2 + 16} textAnchor="middle" fill={accent ? C.teal : C.dim} fontSize="11.5" fontFamily="JetBrains Mono">{sub}</text>
    </g>
  )
  const arrow = (d, col = C.line) => <path d={d} stroke={col} strokeWidth="1.6" fill="none" markerEnd="url(#arr)" />
  return (
    <svg viewBox="0 0 1120 360" className="fig" role="img" aria-label="RNNoise network architecture">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.dim} />
        </marker>
      </defs>
      {box(0, 140, 170, 72, '42 features', 'per 10 ms frame')}
      {box(230, 140, 170, 72, 'Dense 24', 'tanh')}
      {box(460, 40, 170, 72, 'GRU 24', 'voice activity', true)}
      {box(690, 40, 170, 72, 'Dense 1', 'sigmoid')}
      {box(460, 140, 170, 72, 'GRU 48', 'noise estimate', true)}
      {box(690, 240, 170, 72, 'GRU 96', 'denoising', true)}
      {box(920, 240, 200, 72, 'Dense 22', 'sigmoid → band gains g_b')}
      {box(920, 40, 200, 72, 'p(speech)', '→ the proximity gate')}
      {arrow('M170,176 H226')}
      {arrow('M400,176 C430,176 430,76 456,76')}
      {arrow('M630,76 H686')}
      {arrow('M860,76 H916')}
      {arrow('M630,92 C650,120 640,150 632,160', C.line)}
      {arrow('M400,186 H456')}
      {arrow('M630,176 C660,176 660,276 686,276')}
      {arrow('M85,212 C85,300 400,300 686,290', 'rgba(77,171,255,0.5)')}
      {arrow('M860,276 H916')}
      <text x="300" y="338" fill={C.blue} fontSize="11.5" fontFamily="JetBrains Mono">the raw features also skip forward into the noise and denoising layers</text>
      <text x="0" y="24" fill={C.dim} fontSize="12" fontFamily="JetBrains Mono">215 units · 4 hidden layers · int8 weights · one GRU state carried from frame to frame</text>
    </svg>
  )
}

// ── 5. The proximity gate over time (illustration with the real decision rule) ──
// illustration levels (dBFS) and the 95 % strength factors
const GN = -54, GV = -28
const GT = GN + 0.75 * (GV - GN), GH = GN + 0.65 * (GV - GN)

export function GateFigure() {
  const N = GN, V = GV, T = GT, Hh = GH
  const frames = 300 // 3 s of 10 ms frames
  const sig = useMemo(() => {
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const out = []
    for (let i = 0; i < 300; i++) {
      const s = i / 300
      let db = GN + (rnd() - 0.5) * 6
      let p = 0.08 + rnd() * 0.12
      if ((s > 0.12 && s < 0.32) || (s > 0.46 && s < 0.6) || (s > 0.74 && s < 0.9)) { db = GV + Math.sin(i * 0.9) * 3 + (rnd() - 0.5) * 4; p = 0.9 + rnd() * 0.09 }
      if (Math.abs(s - 0.39) < 0.012 || Math.abs(s - 0.67) < 0.01) { db = -18; p = 0.06 }        // taps: loud, not speech
      if (s > 0.62 && s < 0.7 && !(Math.abs(s - 0.67) < 0.01)) { db = GN + 12 + (rnd() - 0.5) * 4; p = 0.75 } // colleague, quieter
      out.push({ db, p })
    }
    let g = 0, sil = 0
    return out.map((f, i) => {
      const recent = out.slice(Math.max(0, i - 2), i + 1)
      const mean = recent.reduce((a, r) => a + r.db, 0) / recent.length
      const pk = Math.max(...recent.map((r) => r.p))
      if (f.db < GH) { sil++; if (sil > 3) g *= 0.7 }
      else if (mean > GT && pk >= 0.585) { g = Math.min(1, g + 0.35); sil = 0 }
      else { sil++; if (sil > 3) g *= 0.7 }
      return { ...f, g }
    })
  }, [])
  const dbY = (db) => (-10 - db) / 56
  return (
    <Plot W={1120} H={320} pad={{ l: 60, r: 120, t: 18, b: 40 }}
      xTicks={[[0, () => 0, '0 s'], [1, (w) => w / 3, '1 s'], [2, (w) => (2 * w) / 3, '2 s'], [3, (w) => w, '3 s']]}
      yTicks={[[-10, (hh) => dbY(-10) * hh, '-10'], [-30, (hh) => dbY(-30) * hh, '-30'], [-50, (hh) => dbY(-50) * hh, '-50'], [-66, (hh) => dbY(-66) * hh, '-66 dBFS']]}
      xLabel="time" yLabel="frame level r (dB)">
      {(w, hh) => (
        <>
          {sig.map((f, i) => f.g > 0.01 && (
            <rect key={i} x={(i / frames) * w} y="0" width={w / frames + 0.5} height={hh} fill="rgba(0,212,170,0.13)" opacity={f.g} />
          ))}
          <polyline fill="none" stroke={C.dim} strokeWidth="1.3"
            points={sig.map((f, i) => `${(i / frames) * w},${dbY(f.db) * hh}`).join(' ')} />
          {[[V, 'V  your voice', C.mint], [T, 'T  open', C.teal], [Hh, 'H  hard close', C.blue], [N, 'N  room', C.pink]].map(([v, lab, col]) => (
            <g key={lab}>
              <line x1="0" x2={w} y1={dbY(v) * hh} y2={dbY(v) * hh} stroke={col} strokeDasharray="5 5" strokeWidth="1.2" />
              <text x={w + 8} y={dbY(v) * hh + 4} fill={col} fontSize="11.5" fontFamily="JetBrains Mono">{lab}</text>
            </g>
          ))}
          <text x={0.39 * w} y={dbY(-18) * hh - 8} fill={C.pink} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">tap: loud, p≈0</text>
          <text x={0.66 * w} y={dbY(-60) * hh} fill={C.pink} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">colleague: speech, too quiet</text>
          <text x={0.22 * w} y="14" fill={C.teal} fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">gate open — you</text>
        </>
      )}
    </Plot>
  )
}

// ── 6. Soft limiter transfer curve ───────────────────────────────────────────
export function LimiterFigure() {
  const t = 0.92
  const lim = (x) => (Math.abs(x) > t ? Math.sign(x) * (t + (1 - t) * Math.tanh((Math.abs(x) - t) / (1 - t))) : x)
  const xs = Array.from({ length: 161 }, (_, i) => (i / 160) * 1.6)
  const X = (v, w) => (v / 1.6) * w, Y = (v, h) => h - (v / 1.1) * h
  return (
    <Plot H={300}
      xTicks={[[0, () => 0, '0'], [0.92, (w) => X(0.92, w), 'τ=0.92'], [1.6, (w) => w, '1.6']]}
      yTicks={[[0, (h) => h, '0'], [0.92, (h) => Y(0.92, h), '0.92'], [1, (h) => Y(1, h), '1.0']]}
      xLabel="input |x|" yLabel="output |y|">
      {(w, h) => (
        <>
          <line x1="0" y1={h} x2={X(1.1, w)} y2={Y(1.1, h)} stroke={C.mute} strokeDasharray="4 5" />
          <line x1="0" x2={w} y1={Y(1, h)} y2={Y(1, h)} stroke={C.pink} strokeDasharray="3 5" opacity="0.6" />
          <polyline fill="none" stroke={C.mint} strokeWidth="2.4" points={xs.map((x) => `${X(x, w)},${Y(lim(x), h)}`).join(' ')} />
          <text x={X(1.2, w)} y={Y(1, h) - 8} fill={C.pink} fontSize="11" fontFamily="JetBrains Mono">never clips</text>
        </>
      )}
    </Plot>
  )
}

// ── 7. Real level envelope: microphone vs what the meeting hears ─────────────
export function EnvelopeFigure() {
  const [data, setData] = useState(null)
  useEffect(() => { fetch('/how/envelope.json').then((r) => r.json()).then(setData).catch(() => {}) }, [])
  const W = 1120, H = 220
  if (!data) return <div className="fig-placeholder" style={{ height: H }} />
  const n = data.before.length
  // envelope height follows loudness: 0 at -72 dBFS, full at -12 dBFS, mirrored round the centre line
  const amp = (v) => { const db = 20 * Math.log10(Math.max(v, 1e-6)); return Math.min(1, Math.max(0, (db + 72) / 60)) }
  const top = (arr) => arr.map((v, i) => `${(i / (n - 1)) * W},${H / 2 - amp(v) * H * 0.47}`).join(' ')
  const bottom = (arr) => arr.map((v, i) => `${(i / (n - 1)) * W},${H / 2 + amp(v) * H * 0.47}`).reverse().join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fig" role="img" aria-label="Level before and after">
      <defs>
        <linearGradient id="envAfter" x1="0" x2="1"><stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.blue} /></linearGradient>
      </defs>
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke={C.grid} />
      <polygon points={`${top(data.before)} ${bottom(data.before)}`} fill="rgba(255,107,138,0.16)" stroke="rgba(255,107,138,0.6)" strokeWidth="1" />
      <polygon points={`${top(data.after)} ${bottom(data.after)}`} fill="url(#envAfter)" fillOpacity="0.6" stroke={C.mint} strokeWidth="1" />
    </svg>
  )
}
