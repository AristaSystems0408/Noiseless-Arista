export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-tag">Active Noise Cancellation · v3.1</div>
      <h1>
        Mute the <span className="bold">world.</span>
        <br />
        Not your <span className="bold">voice.</span>
      </h1>
      <p className="hero-sub">
        Some people won't learn office etiquette. You don't have to wait for them.
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
