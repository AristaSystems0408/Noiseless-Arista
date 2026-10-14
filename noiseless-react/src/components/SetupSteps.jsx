import { useEffect, useState } from 'react'

function Step({ num, children }) {
  return (
    <div className="step reveal">
      <div className="step-num">{num}</div>
      <div className="step-content">{children}</div>
    </div>
  )
}

function Screenshot({ src, alt }) {
  return (
    <div className="screenshot">
      <img src={src} alt={alt} />
    </div>
  )
}

function DesktopSteps() {
  return (
      <div className="steps-wrapper">
        <Step num="01">
          <h3 className="step-title">Install Noiseless</h3>
          <p className="step-desc">
            One installer sets up everything: the Noiseless app and the{' '}
            <strong>VB-CABLE</strong> audio driver, which creates the virtual microphone your
            meetings receive the cleaned audio from.
          </p>
          <ul className="step-list">
            <li>Download <strong>noise_cancellation_setup.exe</strong> from above</li>
            <li>Double-click to launch the installer and click <strong>Yes</strong> to allow it</li>
            <li>
              Keep both boxes ticked: <strong>Install VB-CABLE virtual audio driver</strong> (only
              shown if it isn't installed yet) and <strong>Start Noiseless when I sign in</strong>
            </li>
            <li>
              When Windows asks <strong>"Would you like to install this device software?"</strong>{' '}
              (publisher <strong>Vincent Burel / VB-Audio</strong>), click <strong>Install</strong>
            </li>
            <li>
              If setup asks to <strong>restart your computer</strong>, choose{' '}
              <strong>Yes, restart now</strong>. Noiseless starts by itself after you sign in
            </li>
          </ul>

          <div className="info-box">
            <span className="ib-icon">⚠</span>
            <p>
              <strong>Important:</strong> the restart is needed the first time, so the VB-CABLE
              microphone shows up in Zoom, Teams and Meet. If you decline the Windows driver prompt,
              run the installer again.
            </p>
          </div>

          <Screenshot
            src="/images/Noiseless_setup_installation.png"
            alt="Noiseless Installer Wizard"
          />

          <p className="step-desc step-desc-mt">
            A <strong>Noiseless shortcut</strong> will appear on your desktop. Noiseless also lives
            in the <strong>system tray</strong> (next to the clock): closing the window keeps it
            running there, and right-clicking the icon lets you turn noise cancellation on or off,
            switch meeting detection, or quit.
          </p>

        </Step>

        <Step num="02">
          <h3 className="step-title">Calibrate Your Voice (optional, once)</h3>
          <p className="step-desc">
            Noiseless works straight away: its speech-recognising engine (the same one as the
            Noiseless browser extension) removes anything that isn't your voice — fans, typing,
            clatter, even a tap on the mic — and learns how loud you are as you talk. Calibrating
            once (8 seconds, saved for your microphone) makes it precise from the first word.
          </p>

          <Screenshot src="/images/app-setup.png" alt="Noiseless window before calibration" />

          <ul className="step-list">
            <li>
              Under <strong>Microphone</strong>, pick your <strong>headset microphone</strong> (not the
              webcam mic). Noiseless starts with your Windows default mic
            </li>
            <li>Click <strong>Calibrate my mic · 8 sec</strong></li>
            <li>
              <strong>Step 1:</strong> stay quiet for 3 seconds while it listens to your room
            </li>
            <li>
              <strong>Step 2:</strong> speak normally for 4 seconds; it shows a sentence you can read
              aloud
            </li>
            <li>
              You'll see <strong>You're all set</strong> and how clearly your voice stands out (e.g.
              19 dB, excellent)
            </li>
          </ul>

          <Screenshot src="/images/app-calibrate.png" alt="Noiseless calibration, step 2: speak normally" />

          <div className="info-box">
            <span className="ib-icon">💡</span>
            <p>
              <strong>Pro tip:</strong> Calibrate where you usually take calls. If colleagues are
              talking, let them talk — Noiseless learns that background too. Leave{' '}
              <strong>Strength</strong> at 95% (Maximum) for busy offices.
            </p>
          </div>
        </Step>

        <Step num="03">
          <h3 className="step-title">Join a Meeting — Noiseless Asks</h3>
          <p className="step-desc">
            Noiseless watches for meetings in the background. As soon as Zoom, Teams, Webex, Slack,
            Discord, or a Google Meet / Teams / Zoom call in Chrome or Edge starts using your
            microphone, a card appears in the bottom-right corner:
          </p>

          <Screenshot src="/images/meeting-card.png" alt="Noiseless meeting card: Zoom is using your mic" />

          <ul className="step-list">
            <li>
              Click <strong>Turn on</strong> (or <strong>Not now</strong>)
            </li>
            <li>
              Tick <strong>Always turn on for Zoom</strong> to skip the question next time
            </li>
            <li>
              While Noiseless runs it is Windows' microphone{' '}
              (<span className="step-code">CABLE Output</span>), so every meeting picks it up from the
              start; your voice passes through untouched until you turn noise cancellation on
            </li>
            <li>
              When the meeting ends, noise cancellation turns off by itself. Quitting Noiseless gives
              Windows your normal mic back
            </li>
            <li>
              If a meeting app is set to a specific microphone, Noiseless tells you to switch it to the
              system default once
            </li>
            <li>
              You can also turn it on by hand with the big <strong>power button</strong> in the app, or
              from the tray menu
            </li>
          </ul>
          <p className="step-desc step-desc-mt">
            In the app, <strong>Live audio</strong> shows your microphone next to what others hear,
            how much background is being removed, and <strong>Speaking</strong> /{' '}
            <strong>Muted</strong> as you talk and pause.
          </p>

          <Screenshot src="/images/app-running.png" alt="Noiseless with noise cancellation on during a Zoom call" />
        </Step>

        <Step num="04">
          <h3 className="step-title">Check Google Meet's Microphone (once)</h3>
          <p className="step-desc">
            Meet usually uses the Windows default mic already, so there's nothing to do. If the other
            side still hears background noise, check it once:
          </p>
          <ul className="step-list">
            <li>
              In the meeting, click the <strong>three dots</strong> (⋮) in the bottom toolbar →{' '}
              <strong>Settings</strong>
            </li>
            <li>Click the <strong>Audio</strong> tab on the left</li>
            <li>
              Set <strong>Microphone</strong> to <strong>Default</strong>, or to{' '}
              <span className="step-code">CABLE Output (VB-Audio Virtual Cable)</span>
            </li>
            <li>Keep your <strong>Speaker</strong> set to your headphones</li>
            <li>
              If you turned Noiseless on after joining and Meet doesn't switch, rejoin the call
            </li>
          </ul>

          <Screenshot src="/images/Google_meet.png" alt="Google Meet Audio Settings" />
        </Step>

        <Step num="05">
          <h3 className="step-title">Check Zoom &amp; Teams (once)</h3>
          <p className="step-desc">
            Zoom's <strong>Same as System</strong> and Teams' <strong>Default device</strong> follow
            Noiseless automatically. Check once that they're selected:
          </p>
          <ul className="step-list">
            <li>Open Zoom and click the <strong>gear icon</strong> (Settings)</li>
            <li>Click the <strong>Audio</strong> tab on the left</li>
            <li>Under <strong>Microphone</strong>, click the dropdown</li>
            <li>
              Select <strong>Same as System</strong> (or{' '}
              <span className="step-code">CABLE Output (VB-Audio Virtual Cable)</span>)
            </li>
            <li>
              In Teams: <strong>Settings → Devices → Microphone</strong> →{' '}
              <strong>Default device</strong>
            </li>
            <li>Keep <strong>Speaker</strong> on your headphones</li>
            <li>Uncheck <strong>"Automatically adjust microphone volume"</strong></li>
            <li>
              Uncheck Zoom's built-in <strong>Background noise suppression</strong> (we're handling
              that!)
            </li>
          </ul>

          <Screenshot src="/images/Zoom_meet.png" alt="Zoom Audio Settings" />
        </Step>

        <Step num="06">
          <h3 className="step-title">You're Ready</h3>
          <p className="step-desc">
            Your calls are now protected from background noise. Here's your daily workflow:
          </p>
          <ul className="step-list">
            <li>Join your Meet / Zoom / Teams call normally</li>
            <li>
              Click <strong>Turn on</strong> on the Noiseless card (or let it turn on automatically)
            </li>
            <li>Hang up — Noiseless stops and gives your normal mic back by itself</li>
          </ul>

          <div className="info-box info-box-success">
            <span className="ib-icon">✓</span>
            <p>
              <strong>All set.</strong> Your colleagues will no longer hear office chatter, keyboard
              clicks, or any background noise during your calls. If the client hears background
              sounds anyway, bump the slider up to 100%.
            </p>
          </div>
        </Step>
      </div>
  )
}

function ExtensionSteps() {
  return (
    <div className="steps-wrapper">
      <Step num="01">
        <h3 className="step-title">Download and Unzip</h3>
        <p className="step-desc">
          The extension works on its own: no installer, no audio driver, no admin rights. It cleans
          your microphone inside Chrome or Edge for Google Meet, Microsoft Teams, Zoom and Webex.
        </p>
        <ul className="step-list">
          <li>Download <strong>noiseless-extension.zip</strong> from the section above</li>
          <li>Right-click the zip file → <strong>Extract All</strong> → <strong>Extract</strong></li>
          <li>
            You now have a folder called <span className="step-code">Noiseless-Extension</span>. Keep
            it somewhere permanent (e.g. Documents): Chrome loads the extension from this folder
          </li>
        </ul>
      </Step>

      <Step num="02">
        <h3 className="step-title">Add It to Chrome</h3>
        <ul className="step-list">
          <li>
            Open a new tab and go to <span className="step-code">chrome://extensions</span> (in Edge:{' '}
            <span className="step-code">edge://extensions</span>)
          </li>
          <li>Turn on <strong>Developer mode</strong> (top-right switch; in Edge it's on the left)</li>
          <li>
            Click <strong>Load unpacked</strong> and select the{' '}
            <span className="step-code">Noiseless-Extension</span> folder
          </li>
          <li>
            <strong>Noiseless — Meeting Noise Cancellation</strong> appears in the list. Click the
            puzzle-piece icon in the toolbar and <strong>pin</strong> Noiseless so it's always visible
          </li>
        </ul>
        <div className="info-box">
          <span className="ib-icon">💡</span>
          <p>
            Chrome may show a banner about extensions in developer mode when it starts. That's normal
            for extensions installed from a folder; click <strong>Keep</strong> (or close it).
          </p>
        </div>
      </Step>

      <Step num="03">
        <h3 className="step-title">Join a Meeting — Click Start</h3>
        <p className="step-desc">
          Open Google Meet, Teams, Zoom or Webex in the browser. As soon as the meeting uses your
          microphone, a card appears on the page:
        </p>
        <ul className="step-list">
          <li>
            <strong>"Meeting detected — turn on noise cancellation?"</strong> → click{' '}
            <strong>Start</strong>
          </li>
          <li>
            Tick <strong>Always start automatically</strong> to skip the question on that site next time
          </li>
          <li>
            A small control stays at the bottom-left: <strong>● Noise cancellation · On</strong> with a{' '}
            <strong>Stop</strong> button. Start or stop it any time; the call isn't interrupted
          </li>
          <li>
            Nothing to change in the meeting's own settings: keep your usual microphone selected
          </li>
          <li>
            Already in a call when you installed it? <strong>Refresh the meeting tab</strong> once
          </li>
        </ul>
      </Step>

      <Step num="04">
        <h3 className="step-title">Fine-Tune (optional)</h3>
        <p className="step-desc">Click the Noiseless icon in the toolbar during a meeting:</p>
        <ul className="step-list">
          <li><strong>Strength</strong> — 95% (default) lets only your own voice through; lower it if soft words get cut</li>
          <li><strong>Calibrate (8 sec)</strong> — stay quiet 3 seconds, then speak 4 seconds; saved for your microphone</li>
          <li>Live levels show your mic, what's sent, and how much background is removed</li>
          <li>The toolbar icon shows <strong>ON</strong> / <strong>OFF</strong> for the meeting tab</li>
        </ul>
        <div className="info-box info-box-success">
          <span className="ib-icon">✓</span>
          <p>
            <strong>All set.</strong> Use either the extension or the desktop app for a call, not both
            at once. The desktop app also covers Zoom, Teams and other apps installed on your PC.
          </p>
        </div>
      </Step>
    </div>
  )
}

const MODES = [
  { id: 'desktop', label: 'Desktop app' },
  { id: 'extension', label: 'Chrome extension' },
]

export default function SetupSteps() {
  const [mode, setMode] = useState(() =>
    typeof window !== 'undefined' && window.location.hash === '#setup-extension' ? 'extension' : 'desktop')

  // "How to install the extension" links (#setup-extension) open the extension guide
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#setup-extension') {
        setMode('extension')
        document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // The scroll-reveal observer only knows the steps present on page load: show switched-in ones
  useEffect(() => {
    document.querySelectorAll('#setup .reveal').forEach((el) => el.classList.add('visible'))
  }, [mode])

  return (
    <section id="setup">
      <div className="section-label">02 · COMPLETE SETUP GUIDE</div>
      <h2 className="section-title">
        From download to
        <br />
        <b>crystal-clear calls</b> in minutes.
      </h2>

      <div role="tablist" aria-label="Choose your setup"
        style={{ display: 'inline-flex', gap: 4, padding: 4, margin: '8px 0 40px', borderRadius: 999,
          border: '1px solid var(--border-bright)', background: 'rgba(255,255,255,0.03)' }}>
        {MODES.map((m) => (
          <button key={m.id} role="tab" type="button" aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            style={{ border: 0, cursor: 'pointer', padding: '10px 22px', borderRadius: 999, font: 'inherit',
              fontSize: 15, fontWeight: 600, transition: 'background .2s, color .2s',
              background: mode === m.id ? '#00d4aa' : 'transparent',
              color: mode === m.id ? '#05070a' : 'var(--text-dim)' }}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'desktop' ? <DesktopSteps /> : <ExtensionSteps />}
    </section>
  )
}
