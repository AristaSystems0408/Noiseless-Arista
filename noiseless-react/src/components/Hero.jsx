import { useRef } from 'react'
import ProofOfConcept from './ProofOfConcept'
import SamuraiStrike from './SamuraiStrike'

export default function Hero() {
  const wordRef = useRef(null)

  return (
    <section className="hero hero-split">
      <div className="hero-copy">
        <div className="hero-tag">AI noise cancellation · runs on your PC</div>
        <h1>
          Mute the{' '}
          <span className="slice-word" ref={wordRef} title="Click to cut">
            <span className="bold slice-base">world.</span>
            <span className="bold slice-half slice-top" aria-hidden="true">world.</span>
            <span className="bold slice-half slice-bottom" aria-hidden="true">world.</span>
          </span>
          <br />
          Not your <span className="bold">voice.</span>
          <SamuraiStrike wordRef={wordRef} />
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
      {/* the scroll-companion orb (ScrollOrb) starts here: this box sets its size and place */}
      <div className="hero-orb" data-orb-anchor aria-hidden="true">
        <div className="hero-orb-hint">Hover · click · scroll</div>
      </div>
      <ProofOfConcept />
    </section>
  )
}
