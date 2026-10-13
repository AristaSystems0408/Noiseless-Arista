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

export default function SetupSteps() {
  return (
    <section id="setup">
      <div className="section-label">02 · COMPLETE SETUP GUIDE</div>
      <h2 className="section-title">
        From download to
        <br />
        <b>crystal-clear calls</b> in minutes.
      </h2>

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
            running there, and right-clicking the icon gives Start/Stop, meeting detection on/off,
            and Quit.
          </p>

          <Screenshot src="/images/Noiseless_app_sss.png" alt="Noiseless Desktop Shortcut" />
        </Step>

        <Step num="02">
          <h3 className="step-title">Calibrate Your Voice (once)</h3>
          <p className="step-desc">
            Noiseless needs to learn your voice to separate it from background noise. This takes 7
            seconds and is saved for your microphone, so you only do it once. If you skip it, the
            first meeting prompt offers <strong>Calibrate &amp; start</strong> instead.
          </p>
          <ul className="step-list">
            <li>Open Noiseless from your desktop</li>
            <li>
              Select your <strong>headphone microphone</strong> from the dropdown (not the webcam mic)
            </li>
            <li>
              Adjust the <strong>Noise Cancellation slider</strong> to <strong>95%</strong>
            </li>
            <li>Click <strong>CALIBRATE</strong></li>
            <li>When prompted, <strong>stay silent</strong> for 3 seconds</li>
            <li>
              When prompted, <strong>speak normally</strong> for 4 seconds (say: "Hello, testing the
              noise cancellation")
            </li>
            <li>Wait for the "Calibrated" confirmation</li>
          </ul>

          <Screenshot
            src="/images/Calibrate_SS.png"
            alt="Noiseless Dashboard - Calibration Screen"
          />

          <div className="info-box">
            <span className="ib-icon">💡</span>
            <p>
              <strong>Pro tip:</strong> Calibrate in the environment where you'll be taking calls. If
              colleagues are talking, let them talk — this helps Noiseless learn the exact noise
              pattern to remove.
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
          <ul className="step-list">
            <li>
              <strong>"Meeting detected — Zoom. Turn on noise cancellation?"</strong> → click{' '}
              <strong>Start</strong> (or <strong>Not now</strong>)
            </li>
            <li>
              Tick <strong>Always start automatically for Zoom</strong> to skip the question next time
            </li>
            <li>
              While it runs, Windows' default microphone is switched to{' '}
              <span className="step-code">CABLE Output</span>, so the meeting gets the cleaned audio
            </li>
            <li>
              When the meeting ends, noise cancellation stops and your normal mic comes back by itself
            </li>
            <li>
              You can still start it by hand: click <strong>START</strong> in the app or the tray menu
            </li>
          </ul>
          <p className="step-desc step-desc-mt">
            In the app, the <strong>input graph</strong> shows your voice and the{' '}
            <strong>output graph</strong> the cleaned audio sent to the meeting:{' '}
            <strong>● VOICE DETECTED</strong> when you speak, <strong>● MUTED</strong> when you're
            silent.
          </p>

          <Screenshot
            src="/images/Start_Noise_Cancellation.png"
            alt="Noiseless Dashboard - Active with Graphs"
          />
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
              Click <strong>Start</strong> on the Noiseless card (or let it start automatically)
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
    </section>
  )
}
