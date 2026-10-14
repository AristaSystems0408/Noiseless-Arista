import { useEffect, useState } from 'react'
import HeroOrb from './HeroOrb.jsx'

// One clean slice through "world." every few seconds: a light blade sweeps across, the word splits
// along the blade, the halves drift apart and dissolve ("muted"), then it settles back.
const CYCLE_MS = 2600          // length of one slice animation (matches the CSS)
const IMPACT_MS = 260          // when the blade reaches the word -> the orb calms at the same moment

export default function Hero() {
  const [cutting, setCutting] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let timers = []
    const later = (fn, ms) => timers.push(setTimeout(fn, ms))
    const cut = () => {
      setCutting(true)
      later(() => window.dispatchEvent(new Event('noiseless:cut')), IMPACT_MS)
      later(() => setCutting(false), CYCLE_MS)
      later(cut, CYCLE_MS + 4200 + Math.random() * 2400)
    }
    later(cut, 1800)
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <section className="hero hero-split">
      <div className="hero-copy">
        <div className="hero-tag">AI noise cancellation · runs on your PC</div>
        <h1>
          Mute the{' '}
          <span className={`slice-word ${cutting ? 'cutting' : ''}`}>
            <span className="bold slice-base">world.</span>
            <span className="bold slice-half slice-top" aria-hidden="true">world.</span>
            <span className="bold slice-half slice-bottom" aria-hidden="true">world.</span>
            <span className="slice-blade" aria-hidden="true" />
          </span>
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
        <a href="/how-it-works/" className="hero-how">
          <span className="hero-how-dot" />
          How it works — the model and the math
          <span aria-hidden="true">→</span>
        </a>
      </div>
      <HeroOrb />
    </section>
  )
}
