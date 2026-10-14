function handleMouseMove(e) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  card.style.setProperty('--mx', `${x}%`)
  card.style.setProperty('--my', `${y}%`)
}

// Puzzle-piece mark for "browser extension" (generic, not a browser's logo)
function ExtensionIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinejoin="round" aria-hidden="true" style={{ color: '#00d4aa' }}>
      <path d="M9 4.5a2 2 0 1 1 4 0V6h3.5a1.5 1.5 0 0 1 1.5 1.5V11h-1.5a2 2 0 1 0 0 4H18v3.5a1.5 1.5 0 0 1-1.5 1.5H13v-1.5a2 2 0 1 0-4 0V20H5.5A1.5 1.5 0 0 1 4 18.5V15h1.5a2 2 0 1 0 0-4H4V7.5A1.5 1.5 0 0 1 5.5 6H9z" />
    </svg>
  )
}

export default function Downloads() {
  return (
    <section id="downloads">
      <div className="section-label">01 · DOWNLOADS</div>
      <h2 className="section-title">
        Choose <b>desktop app</b>
        <br />
        or <b>Chrome extension</b>.
      </h2>

      <div className="downloads">
        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">DESKTOP APP · ALL MEETING APPS</div>
          <div className="card-icon" style={{ padding: 0, overflow: 'hidden' }}>
            <img src="/images/noiseless-logo.png" alt="Noiseless" width="56" height="56"
              style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>
          <div className="card-title">Noiseless for Windows</div>
          <div className="card-desc">
            Works with Zoom, Teams, Webex, Slack and browser meetings. One installer sets up the app
            and its audio driver. Runs in the system tray, notices when a meeting starts, and asks to
            turn on noise cancellation.
          </div>
          <div className="card-meta">
            <span><strong>~29 MB</strong> Size</span>
            <span><strong>EXE</strong> Format</span>
            <span><strong>Win 10/11</strong> 64-bit</span>
          </div>
          <a href="/noise_cancellation_setup.exe" download className="btn btn-primary download-btn-wide">
            <span className="btn-icon">↓</span> Download Noiseless
          </a>
        </div>

        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">CHROME EXTENSION · BROWSER MEETINGS</div>
          <div className="card-icon"><ExtensionIcon /></div>
          <div className="card-title">Noiseless for Chrome</div>
          <div className="card-desc">
            For Google Meet, Teams, Zoom and Webex in Chrome or Edge. Nothing else to install: no
            driver, no admin rights, and no microphone setting to change in your meeting.
          </div>
          <div className="card-meta">
            <span><strong>~1.3 MB</strong> Size</span>
            <span><strong>ZIP</strong> Format</span>
            <span><strong>Chrome / Edge</strong></span>
          </div>
          <a href="/noiseless-extension.zip" download className="btn btn-secondary download-btn-wide">
            <span className="btn-icon">↓</span> Download Extension
          </a>
          <a href="#setup-extension" className="card-desc"
            style={{ display: 'block', textAlign: 'center', marginTop: 14, marginBottom: 0, textDecoration: 'underline' }}>
            How to install the extension
          </a>
        </div>
      </div>
    </section>
  )
}
