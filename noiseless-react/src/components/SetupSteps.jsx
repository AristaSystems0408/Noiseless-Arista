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
          <h3 className="step-title">Install VB-CABLE Driver</h3>
          <p className="step-desc">
            VB-CABLE creates a virtual microphone on your system. This is what Zoom/Meet will use to
            receive your cleaned audio.
          </p>
          <ul className="step-list">
            <li>Download <strong>VBCABLE_Driver_Pack43.zip</strong> from the section above</li>
            <li>Right-click the zip file → <strong>Extract All</strong></li>
            <li>Open the extracted folder</li>
            <li>
              Right-click <span className="step-code">VBCABLE_Setup_x64.exe</span> →{' '}
              <strong>Run as Administrator</strong>
            </li>
            <li>Click <strong>Install Driver</strong> in the installer window</li>
            <li><strong>Restart your computer</strong> (this is mandatory)</li>
          </ul>

          <Screenshot src="/images/01-vbcable-install.png" alt="VB-CABLE Installer Window" />

          <div className="info-box">
            <span className="ib-icon">⚠</span>
            <p>
              <strong>Important:</strong> If you skip the restart, VB-CABLE won't appear as an audio
              device. Restart before proceeding to Step 2.
            </p>
          </div>
        </Step>

        <Step num="02">
          <h3 className="step-title">Install Noiseless</h3>
          <p className="step-desc">
            Run the Noiseless installer to set up the main noise cancellation application.
          </p>
          <ul className="step-list">
            <li>Download <strong>noise_cancellation_setup.exe</strong> from above</li>
            <li>Double-click to launch the installer</li>
            <li>Click <strong>Next</strong> through the wizard</li>
            <li>
              When finished, check <strong>Launch Noiseless</strong> and click <strong>Finish</strong>
            </li>
          </ul>

          <Screenshot
            src="/images/Noiseless_setup_installation.png"
            alt="Noiseless Installer Wizard"
          />

          <p className="step-desc step-desc-mt">
            A <strong>Noiseless shortcut</strong> will appear on your desktop. Double-click it
            anytime to launch the app.
          </p>

          <Screenshot src="/images/Noiseless_app_sss.png" alt="Noiseless Desktop Shortcut" />
        </Step>

        <Step num="03">
          <h3 className="step-title">Calibrate Your Voice</h3>
          <p className="step-desc">
            Noiseless needs to learn your voice to separate it from background noise. This takes 7
            seconds.
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

        <Step num="04">
          <h3 className="step-title">Start Noise Cancellation</h3>
          <p className="step-desc">
            With calibration done, activate the noise suppression engine.
          </p>
          <ul className="step-list">
            <li>Click the large <strong>START</strong> button</li>
            <li>Speak into your mic — the <strong>input graph</strong> shows your voice</li>
            <li>The <strong>output graph</strong> shows the cleaned audio sent to meetings</li>
            <li>
              The status should display <strong>● VOICE DETECTED</strong> when you speak
            </li>
            <li>And <strong>● MUTED</strong> when you're silent</li>
            <li>Keep the app running in the background during your entire call</li>
          </ul>

          <Screenshot
            src="/images/Start_Noise_Cancellation.png"
            alt="Noiseless Dashboard - Active with Graphs"
          />
        </Step>

        <Step num="05">
          <h3 className="step-title">Configure Google Meet</h3>
          <p className="step-desc">
            Tell Google Meet to use the virtual microphone (the cleaned audio from Noiseless).
          </p>
          <ul className="step-list">
            <li>Open Google Meet and join your meeting</li>
            <li>
              Click the <strong>three dots</strong> (⋮) in the bottom toolbar →{' '}
              <strong>Settings</strong>
            </li>
            <li>Click the <strong>Audio</strong> tab on the left</li>
            <li>
              Change <strong>Microphone</strong> to:{' '}
              <span className="step-code">CABLE Output (VB-Audio Virtual Cable)</span>
            </li>
            <li>Keep your <strong>Speaker</strong> set to your headphones</li>
            <li>Close settings — you're done!</li>
          </ul>

          <Screenshot src="/images/Google_meet.png" alt="Google Meet Audio Settings" />
        </Step>

        <Step num="06">
          <h3 className="step-title">Configure Zoom</h3>
          <p className="step-desc">Same idea for Zoom — point it at the virtual cable.</p>
          <ul className="step-list">
            <li>Open Zoom and click the <strong>gear icon</strong> (Settings)</li>
            <li>Click the <strong>Audio</strong> tab on the left</li>
            <li>Under <strong>Microphone</strong>, click the dropdown</li>
            <li>
              Select: <span className="step-code">CABLE Output (VB-Audio Virtual Cable)</span>
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

        <Step num="07">
          <h3 className="step-title">You're Ready</h3>
          <p className="step-desc">
            Your calls are now protected from background noise. Here's your daily workflow:
          </p>
          <ul className="step-list">
            <li><strong>Before every call</strong> → Open Noiseless from desktop</li>
            <li>
              Click <strong>START</strong> (calibration persists — no need to recalibrate)
            </li>
            <li>Join your Meet/Zoom call normally</li>
            <li>
              When the call ends, click <strong>STOP</strong> in Noiseless (or just close it)
            </li>
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
