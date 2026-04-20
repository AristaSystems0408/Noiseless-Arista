import { useEffect, useState } from 'react'

export default function Hero() {
  const [glitched, setGlitched] = useState(false)

  useEffect(() => {
    let offTimer
    let onTimer

    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 8000
      onTimer = setTimeout(() => {
        setGlitched(true)
        offTimer = setTimeout(() => {
          setGlitched(false)
          scheduleNext()
        }, 2000)
      }, delay)
    }

    scheduleNext()

    return () => {
      clearTimeout(onTimer)
      clearTimeout(offTimer)
    }
  }, [])

  return (
    <section className="hero">
      <div className="hero-tag">Active Noise Cancellation · v3.1</div>
      <h1>
        Mute the{' '}
        {glitched ? (
          <span className="glitch-strike">
            <span className="bold cut-base">world.</span>
            <span className="bold cut-top" aria-hidden="true">world.</span>
            <span className="bold cut-bottom" aria-hidden="true">world.</span>
            <svg
              className="sword-svg"
              viewBox="0 0 220 44"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bladeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#eef0f3" />
                  <stop offset="0.45" stopColor="#ffffff" />
                  <stop offset="0.55" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#8a909a" />
                </linearGradient>
                <linearGradient id="bladeEdge" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="0.1" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="0.9" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gripGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2a1808" />
                  <stop offset="0.5" stopColor="#5a3418" />
                  <stop offset="1" stopColor="#1e1005" />
                </linearGradient>
                <radialGradient id="pommelGrad" cx="0.35" cy="0.35">
                  <stop offset="0" stopColor="#fff1b0" />
                  <stop offset="0.5" stopColor="#d9a646" />
                  <stop offset="1" stopColor="#6d4a1a" />
                </radialGradient>
                <linearGradient id="guardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f3d27a" />
                  <stop offset="0.5" stopColor="#c8963c" />
                  <stop offset="1" stopColor="#6d4a1a" />
                </linearGradient>
              </defs>
              <polygon points="0,22 142,14 150,22 142,30" fill="url(#bladeGrad)" />
              <rect x="6" y="21" width="136" height="1.2" fill="url(#bladeEdge)" />
              <polygon points="136,14 150,22 136,30 142,22" fill="#c8cdd4" opacity="0.6" />
              <rect x="146" y="6" width="8" height="32" rx="1.5" fill="url(#guardGrad)" />
              <rect x="146" y="6" width="8" height="3" fill="#ffe08a" opacity="0.8" />
              <rect x="154" y="16" width="28" height="12" rx="3" fill="url(#gripGrad)" />
              <line x1="160" y1="16" x2="160" y2="28" stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
              <line x1="166" y1="16" x2="166" y2="28" stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
              <line x1="172" y1="16" x2="172" y2="28" stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
              <line x1="178" y1="16" x2="178" y2="28" stroke="#000" strokeOpacity="0.5" strokeWidth="0.6" />
              <circle cx="188" cy="22" r="7" fill="url(#pommelGrad)" />
              <circle cx="186" cy="20" r="1.8" fill="#fff4c8" opacity="0.9" />
            </svg>
            <span className="spark s1" aria-hidden="true" />
            <span className="spark s2" aria-hidden="true" />
            <span className="spark s3" aria-hidden="true" />
            <span className="spark s4" aria-hidden="true" />
            <span className="spark s5" aria-hidden="true" />
            <span className="spark s6" aria-hidden="true" />
          </span>
        ) : (
          <span className="bold">world.</span>
        )}
        <br />
        Not your <span className="bold">voice.</span>
      </h1>
      <p className="hero-sub">
        Some people won't learn etiquette. You don't have to wait for them.
      </p>
      <div className="hero-cta-row">
        <a href="#downloads" className="btn btn-primary">
          <span className="btn-icon">↓</span> Download Now
        </a>
        <a href="#setup" className="btn btn-secondary">
          Setup Guide
        </a>
      </div>
    </section>
  )
}
