function handleMouseMove(e) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  card.style.setProperty('--mx', `${x}%`)
  card.style.setProperty('--my', `${y}%`)
}

export default function Downloads() {
  return (
    <section id="downloads">
      <div className="section-label">01 · DOWNLOADS</div>
      <h2 className="section-title">
        Get <b>one installer</b>
        <br />
        to get started.
      </h2>

      <div className="downloads">
        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">INSTALLER · EVERYTHING INCLUDED</div>
          <div className="card-icon">◆</div>
          <div className="card-title">Noiseless Installer</div>
          <div className="card-desc">
            The app plus the VB-CABLE audio driver it needs, in one setup. Runs in the system tray,
            detects when a meeting starts in Zoom, Teams or your browser, and asks to turn on noise
            cancellation.
          </div>
          <div className="card-meta">
            <span><strong>~37 MB</strong> Size</span>
            <span><strong>EXE</strong> Format</span>
            <span><strong>Win 10/11</strong> 64-bit</span>
          </div>
          <a href="/noise_cancellation_setup.exe" download className="btn btn-primary download-btn-wide">
            <span className="btn-icon">↓</span> Download Noiseless
          </a>
        </div>

        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">OPTIONAL · DRIVER ONLY</div>
          <div className="card-icon">⚡</div>
          <div className="card-title">VB-CABLE Driver</div>
          <div className="card-desc">
            Already included in the Noiseless installer. Only download it if you need to reinstall
            the virtual microphone driver on its own.
          </div>
          <div className="card-meta">
            <span><strong>~1.3 MB</strong> Size</span>
            <span><strong>ZIP</strong> Format</span>
            <span><strong>Admin</strong> Required</span>
          </div>
          <a href="/VBCABLE_Driver_Pack45.zip" download className="btn btn-secondary download-btn-wide">
            <span className="btn-icon">↓</span> Download Driver
          </a>
        </div>
      </div>
    </section>
  )
}
