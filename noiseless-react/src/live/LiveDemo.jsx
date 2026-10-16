import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LiveCanvas from './LiveCanvas.jsx'
import { IdleSource, MicEngine, SimulatedEngine } from './engine.js'
import './live.css'

/*
 * "Try it live": the visitor's own microphone through the real Noiseless engine (RNNoise, the same
 * worklet the Chrome extension runs), shown in 3D. The scenes read one interface — source.getFrame() —
 * so they never touch the audio code; the engine behind it is the mic, a simulated room, or (before
 * anyone presses start) a quiet preview.
 */
const fmtDb = (v) => `${v > 0.5 ? '−' : ''}${Math.round(v)} dB`
const levelDb = (l) => Math.round(l * 55 - 70)

function CoreFallback() {
  return (
    <svg viewBox="0 0 400 400" className="live-fallback-svg">
      <defs>
        <radialGradient id="lfg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#4dabff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#lfg)" />
      <circle cx="200" cy="200" r="96" fill="none" stroke="#00d4aa" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="140" fill="none" stroke="#1b2a33" strokeWidth="2" />
      <path d="M200 60 A140 140 0 0 1 333 243" fill="none" stroke="#00ffd0" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function WavesFallback() {
  const path = (y, a) => `M0 ${y} ${Array.from({ length: 40 }, (_, i) => `L${i * 10 + 10} ${y + Math.sin(i * 0.9) * a}`).join(' ')}`
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="live-fallback-svg">
      <path d={path(45, 18)} fill="none" stroke="#ff6b8a" strokeWidth="2" opacity="0.8" />
      <path d={path(100, 2)} fill="none" stroke="#00ffd0" strokeWidth="2" opacity="0.8" />
      <path d={path(155, -18)} fill="none" stroke="#4dabff" strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

export default function LiveDemo() {
  const engineRef = useRef(null)
  // a stable source for the scenes: whichever engine is current answers getFrame()
  const source = useMemo(() => ({ getFrame: () => engineRef.current.getFrame() }), [])
  const [status, setStatus] = useState('preview')      // preview | starting | mic | simulated
  const [notice, setNotice] = useState('')
  const [active, setActive] = useState(false)
  const [strength, setStrength] = useState(85)
  const [listening, setListening] = useState(false)
  const [readout, setReadout] = useState({ reduction: 0, inLevel: 0, outLevel: 0, voice: false })

  if (engineRef.current == null) engineRef.current = new IdleSource()

  useEffect(() => {
    const idle = engineRef.current
    idle.start()
    // the preview gently shows both states, so the section never sits still before anyone presses start
    const demo = setInterval(() => { if (engineRef.current === idle) idle.setActive(!idle.active) }, 4200)
    const tick = setInterval(() => {
      const f = engineRef.current.getFrame()
      setReadout({ reduction: f.reductionDb, inLevel: f.inLevel, outLevel: f.outLevel, voice: f.voice })
      if (engineRef.current === idle) setActive(f.active)
    }, 120)
    return () => { clearInterval(demo); clearInterval(tick); engineRef.current.stop() }
  }, [])

  const swap = useCallback((next) => {
    engineRef.current.stop()
    engineRef.current = next
  }, [])

  const startMic = async () => {
    setStatus('starting')
    setNotice('')
    const mic = new MicEngine()
    mic.strength = strength
    try {
      await mic.start()
      swap(mic)
      mic.setActive(false)
      setActive(false)
      setListening(false)
      setStatus('mic')
    } catch (err) {
      mic.stop()
      const name = err && err.name
      setNotice(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'The microphone was blocked, so this is a simulated room. To use your own mic, allow it from the address bar and press Use my microphone again.'
          : name === 'NotFoundError'
            ? 'No microphone was found, so this is a simulated room.'
            : 'Your browser could not start the live engine, so this is a simulated room.',
      )
      startSimulated(true)
    }
  }

  const startSimulated = (keepNotice = false) => {
    const sim = new SimulatedEngine()
    sim.strength = strength
    sim.start()
    swap(sim)
    sim.setActive(false)
    setActive(false)
    setListening(false)
    setStatus('simulated')
    if (!keepNotice) setNotice('')
  }

  const stop = () => {
    const idle = new IdleSource()
    idle.start()
    swap(idle)
    setStatus('preview')
    setListening(false)
    setActive(false)
  }

  const toggle = () => {
    if (status === 'preview') return
    const next = !active
    engineRef.current.setActive(next)
    setActive(next)
  }

  const onStrength = (e) => {
    const v = Number(e.target.value)
    setStrength(v)
    engineRef.current.setStrength(v)
  }

  const onListen = () => {
    const next = !listening
    engineRef.current.setMonitoring(next)
    setListening(next)
  }

  const live = status === 'mic' || status === 'simulated'
  const chip = status === 'mic' ? 'Live · your microphone' : status === 'simulated' ? 'Simulated room · no audio' : 'Preview'

  return (
    <section id="live" className="live">
      <div className="section-label">TRY IT LIVE</div>
      <h2 className="section-title">
        Hear your own room <b>go quiet</b>.
      </h2>
      <p className="live-lead">
        Use your microphone and the real Noiseless engine runs right here in your browser, the same one as the
        Chrome extension. Turn it on and watch the noise fall away. Nothing you say leaves your computer.
      </p>

      <div className="live-grid">
        <div className="live-stage reveal" data-on={active}>
          <LiveCanvas scene="core" source={source} className="live-core" fallback={<CoreFallback />} />
          <div className={`live-chip ${status}`}><i />{chip}</div>
          <div className="live-gauge" aria-live="polite" hidden={!live}>
            <b>{active ? fmtDb(readout.reduction) : 'Off'}</b>
            <span>{active ? 'quieter than your room' : 'noise cancellation is off'}</span>
          </div>

          {!live && (
            <div className="live-start">
              <button type="button" className="btn btn-primary" onClick={startMic} disabled={status === 'starting'}>
                {status === 'starting' ? 'Starting…' : '🎙 Use my microphone'}
              </button>
              <button type="button" className="live-link" onClick={() => startSimulated()}>or try a simulated room</button>
              <small>Your browser will ask for the microphone. Audio is processed on your device and never uploaded.</small>
            </div>
          )}
        </div>

        <aside className="live-panel reveal">
          <button type="button" role="switch" aria-checked={active} className={`live-switch ${active ? 'on' : ''}`} onClick={toggle} disabled={!live}>
            <span className="live-switch-track"><span className="live-switch-knob" /></span>
            <span className="live-switch-text">
              <small>Noise cancellation</small>
              <b>{active ? 'On' : 'Off'}</b>
            </span>
          </button>

          <label className="live-slider">
            <span>Strength <b>{strength}%</b></span>
            <input type="range" min="0" max="100" value={strength} onChange={onStrength} disabled={!live} />
            <small>Higher removes more; 85% is the app's default.</small>
          </label>

          <div className="live-meters">
            <div className="live-meter">
              <span>Your room</span>
              <div><i style={{ transform: `scaleX(${readout.inLevel})` }} /></div>
              <em>{levelDb(readout.inLevel)} dB</em>
            </div>
            <div className="live-meter out">
              <span>The call hears</span>
              <div><i style={{ transform: `scaleX(${readout.outLevel})` }} /></div>
              <em>{levelDb(readout.outLevel)} dB</em>
            </div>
            <div className={`live-voice ${readout.voice && live ? 'on' : ''}`}><i />{readout.voice && live ? 'Voice detected' : 'Listening for a voice'}</div>
          </div>

          {status === 'mic' && (
            <button type="button" className={`live-listen ${listening ? 'on' : ''}`} onClick={onListen}>
              {listening ? '🔊 Listening — toggle Noiseless to compare' : '🎧 Hear it yourself (use headphones)'}
            </button>
          )}
          {live && <button type="button" className="live-link" onClick={stop}>Stop</button>}
          {notice && <p className="live-notice">{notice}</p>}
        </aside>
      </div>

      <div className="live-waves-card reveal">
        <div className="live-waves-head">
          <h3>How cancelling works, at a glance</h3>
          <p>Noise plus the same noise turned upside down adds up to nothing. Noiseless cancels everything that
            isn't your voice, so only your voice survives in the middle line.</p>
        </div>
        <div className="live-waves">
          <LiveCanvas scene="waves" source={source} className="live-waves-canvas" fallback={<WavesFallback />} />
          <ul className="live-waves-labels" aria-hidden="true">
            <li className="noise"><b>Noise</b> in your room</li>
            <li className="result"><b>Result</b> what the call hears</li>
            <li className="anti"><b>Anti-noise</b> the noise, inverted</li>
          </ul>
        </div>
        <p className="live-waves-note">
          A picture of the idea: the Noiseless engine does it with a neural network (RNNoise) that recognises
          speech, rather than with speakers playing anti-sound.
        </p>
      </div>
    </section>
  )
}
