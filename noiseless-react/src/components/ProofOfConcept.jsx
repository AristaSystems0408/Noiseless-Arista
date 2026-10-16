import { useCallback, useEffect, useRef, useState } from 'react'
import './ProofOfConcept.css'

/*
 * Proof of concept: a real Google Meet recording — room noise for the first 8 s, then Noiseless on.
 * The recording's own caption reads "OFF" throughout, so a live badge (driven by the measured switch
 * point) sits over it. The meter and timeline are drawn from the recording's real loudness (env.json,
 * measured from its audio track), so they move even while the preview plays muted.
 */
const dB = (v) => `${Math.round(v)} dB`.replace('-', '−')
const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`

export default function ProofOfConcept() {
  const videoRef = useRef(null)
  const meterRef = useRef(null)
  const stripRef = useRef(null)
  const wrapRef = useRef(null)
  const [env, setEnv] = useState(null)
  const [time, setTime] = useState(0)
  const [withSound, setWithSound] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    fetch('/proof/env.json').then((r) => r.json()).then(setEnv).catch(() => {})
  }, [])

  const on = env ? time >= env.switchAt : false

  // muted preview loop while the section is on screen
  useEffect(() => {
    const v = videoRef.current
    const wrap = wrapRef.current
    if (!v || !wrap) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (v.paused && !withSound) v.play().catch(() => {}) }
      else if (!v.paused) v.pause()
    }, { threshold: 0.35 })
    io.observe(wrap)
    return () => io.disconnect()
  }, [withSound])

  // keep time in sync at display rate (timeupdate alone is only ~4 Hz)
  useEffect(() => {
    let raf
    const tick = () => {
      const v = videoRef.current
      if (v) setTime(v.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // live level meter: 48 bars of the last ~1.2 s of the recording's loudness
  useEffect(() => {
    const c = meterRef.current
    if (!c || !env) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = c.clientWidth, h = c.clientHeight
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
    const g = c.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    const N = 48, gap = 3, bw = (w - gap * (N - 1)) / N
    const idx = Math.floor(time * env.rate)
    for (let i = 0; i < N; i++) {
      const k = idx - (N - 1 - i)
      const db = k >= 0 && k < env.db.length ? env.db[k] : -90
      const amp = Math.max(0.03, Math.min(1, (db + 70) / 55))
      const bh = amp * h
      const isOn = k / env.rate >= env.switchAt
      const grd = g.createLinearGradient(0, h - bh, 0, h)
      if (isOn) { grd.addColorStop(0, '#00ffd0'); grd.addColorStop(1, 'rgba(0,212,170,0.35)') }
      else { grd.addColorStop(0, '#ff6b8a'); grd.addColorStop(1, 'rgba(255,107,138,0.3)') }
      g.fillStyle = grd
      const x = i * (bw + gap)
      g.beginPath()
      g.roundRect(x, h - bh, bw, bh, Math.min(3, bw / 2))
      g.fill()
    }
  }, [time, env])

  // the whole recording's loudness, drawn once, under the timeline
  useEffect(() => {
    const c = stripRef.current
    if (!c || !env) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
      const g = c.getContext('2d')
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = env.db.length
      for (let i = 0; i < n; i++) {
        const amp = Math.max(0.02, Math.min(1, (env.db[i] + 70) / 55))
        const x = (i / n) * w
        g.fillStyle = i / env.rate >= env.switchAt ? 'rgba(0,255,208,0.75)' : 'rgba(255,107,138,0.75)'
        g.fillRect(x, (h - amp * h) / 2, Math.max(1, w / n - 0.6), amp * h)
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [env])

  const playWithSound = useCallback((from = 0) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = from
    v.muted = false
    v.loop = false
    setWithSound(true)
    v.play().catch(() => {})
  }, [])

  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    if (v.muted) { v.muted = false; setWithSound(true); if (v.paused) v.play().catch(() => {}) }
    else { v.muted = true; setWithSound(false) }
  }

  const seek = (e) => {
    const v = videoRef.current
    if (!v || !env) return
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * env.duration
    v.currentTime = t
    if (v.paused) v.play().catch(() => {})
  }

  const progress = env ? Math.min(1, time / env.duration) : 0
  const reduction = env ? Math.round(env.offMedian - env.onMedian) : 61

  return (
    <div className="poc" id="proof" ref={wrapRef}>
      <div className="poc-head">
        <div className="poc-kicker"><span className="poc-rec" /> Proof of concept · recorded in a real Google Meet call</div>
        <h2>
          Don't take our word for it. <b>Hear it.</b>
        </h2>
        <p>
          Same room, same microphone, one call. For the first 8 seconds the meeting hears everything; then
          Noiseless is switched on.
        </p>
      </div>

      <div className="poc-grid">
        <div className={`poc-frame ${on ? 'is-on' : 'is-off'}`}>
          <div className="poc-screen">
            <video
              ref={videoRef}
              src="/proof/noiseless-demo.mp4"
              poster="/proof/poster.webp"
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setWithSound(false); const v = videoRef.current; if (v) { v.muted = true; v.loop = true } }}
            />
            <div className="poc-badge" aria-live="polite">
              <span className="poc-badge-dot" />
              Noise cancellation: <b>{on ? 'ON' : 'OFF'}</b>
            </div>
            {!withSound && (
              <button type="button" className="poc-play" onClick={() => playWithSound(0)}>
                <span className="poc-play-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
                </span>
                <span className="poc-play-text">Play with sound<small>25 s · use headphones for the full effect</small></span>
              </button>
            )}
            <button type="button" className="poc-sound" onClick={toggleSound} aria-label={withSound ? 'Mute' : 'Unmute'}>
              {withSound ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></svg>
              )}
            </button>
          </div>
        </div>

        <aside className="poc-side">
          <div className={`poc-state ${on ? 'is-on' : 'is-off'}`}>
            <div className="poc-state-label">What the meeting hears now</div>
            <div className="poc-state-value">{on ? 'Only the speaker' : 'Everything in the room'}</div>
            <canvas ref={meterRef} className="poc-meter" aria-hidden="true" />
            <div className="poc-state-db">
              <span>{env ? dB(env.db[Math.min(env.db.length - 1, Math.floor(time * env.rate))]) : '—'}</span>
              <span>{playing ? (withSound ? 'playing with sound' : 'muted preview') : 'paused'}</span>
            </div>
          </div>
          <div className="poc-numbers">
            <div><b>{env ? dB(env.offMedian) : '−24 dB'}</b><span>typical level before</span></div>
            <div className="on"><b>{env ? dB(env.onMedian) : '−86 dB'}</b><span>with Noiseless</span></div>
            <div className="wide"><b>{reduction} dB quieter</b><span>{env ? `${env.onSilentPct}% of the call is true silence once it's on` : ''}</span></div>
          </div>
        </aside>
      </div>

      <div className="poc-timeline" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0}
        aria-valuemax={env ? env.duration : 25} aria-valuenow={Math.round(time)} tabIndex={0}>
        <canvas ref={stripRef} className="poc-strip" aria-hidden="true" />
        {env && (
          <>
            <div className="poc-seg off" style={{ width: `${(env.switchAt / env.duration) * 100}%` }}>
              <span>Without Noiseless</span>
            </div>
            <div className="poc-seg on" style={{ left: `${(env.switchAt / env.duration) * 100}%` }}>
              <span>With Noiseless</span>
            </div>
            <div className="poc-switch" style={{ left: `${(env.switchAt / env.duration) * 100}%` }}>
              <i /> Noiseless on · {fmt(env.switchAt)}
            </div>
          </>
        )}
        <div className="poc-head-line" style={{ left: `${progress * 100}%` }} />
      </div>
      <div className="poc-jump">
        <button type="button" onClick={() => playWithSound(0)}>▶ From the start</button>
        <button type="button" onClick={() => playWithSound(env ? Math.max(0, env.switchAt - 2.5) : 5.5)}>▶ The moment it switches on</button>
      </div>
    </div>
  )
}
