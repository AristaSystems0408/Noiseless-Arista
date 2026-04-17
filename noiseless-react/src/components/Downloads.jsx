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
        Get <b>both files</b>
        <br />
        to get started.
      </h2>

      <div className="downloads">
        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">FILE 01 · DRIVER</div>
          <div className="card-icon">⚡</div>
          <div className="card-title">VB-CABLE Driver</div>
          <div className="card-desc">
            Virtual audio cable driver. Creates a virtual microphone that Zoom/Meet can use as input.
            Required one-time install.
          </div>
          <div className="card-meta">
            <span><strong>~3 MB</strong> Size</span>
            <span><strong>ZIP</strong> Format</span>
            <span><strong>Admin</strong> Required</span>
          </div>
          <a href="/VBCABLE_Driver_Pack43.zip" download className="btn btn-secondary download-btn-wide">
            <span className="btn-icon">↓</span> Download Driver
          </a>
        </div>

        <div className="download-card reveal" onMouseMove={handleMouseMove}>
          <div className="card-step">FILE 02 · APPLICATION</div>
          <div className="card-icon">◆</div>
          <div className="card-title">Noiseless Installer</div>
          <div className="card-desc">
            The main application. Installs to Program Files and creates a desktop shortcut. Open,
            calibrate, and start cancelling noise.
          </div>
          <div className="card-meta">
            <span><strong>~80 MB</strong> Size</span>
            <span><strong>EXE</strong> Format</span>
            <span><strong>Win 10/11</strong> Only</span>
          </div>
          <a href="/noise_cancellation_setup.exe" download className="btn btn-primary download-btn-wide">
            <span className="btn-icon">↓</span> Download Noiseless
          </a>
        </div>
      </div>
    </section>
  )
}
