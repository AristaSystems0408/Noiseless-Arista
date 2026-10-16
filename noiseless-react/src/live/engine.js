/*
 * The live demo's audio side. Nothing here draws anything: the 3D scenes only read getFrame().
 *
 *   mic ─┬─► analyser "in"   (what the room sounds like)
 *        └─► Noiseless worklet (the same RNNoise engine as the Chrome extension)
 *                 └─► analyser "out" (what a call would hear) ─► monitor gain ─► speakers (off by default)
 *
 * The worklet passes the raw mic straight through while noise cancellation is off, so switching it
 * on and off while listening is a true before/after. If the mic is refused (or there is no mic),
 * a simulated room drives the visuals instead, so the page still shows what happens.
 */

export const BANDS = 8
const WORKLET_URL = '/live/worklet/rnnoise-processor.js'
const FFT = 1024
const EDGES = (() => {
  // log-spaced band edges, 80 Hz .. 12 kHz
  const e = []
  for (let i = 0; i <= BANDS; i++) e.push(80 * Math.pow(12000 / 80, i / BANDS))
  return e
})()

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const TRANSITION_MS = 1200

class Shared {
  constructor() {
    this.active = false
    this.strength = 85
    this.calmFrom = 0
    this.calmTo = 0
    this.calmT0 = 0
    this.inBands = new Float32Array(BANDS)
    this.outBands = new Float32Array(BANDS)
    this.inLevel = 0      // 0..1, perceptual
    this.outLevel = 0
    this.inE = 1e-8       // slow energy averages for the reduction figure
    this.outE = 1e-8
    this.reduction = 0    // dB, smoothed for display
    this.voice = false
    this.listeners = new Set()
  }

  calm(now = performance.now()) {
    const k = clamp01((now - this.calmT0) / TRANSITION_MS)
    return this.calmFrom + (this.calmTo - this.calmFrom) * inOut(k)
  }

  setActiveVisual(on) {
    const now = performance.now()
    this.calmFrom = this.calm(now)
    this.calmTo = on ? 1 : 0
    this.calmT0 = now
    this.active = on
  }

  // The single interface the 3D scenes read, once per frame.
  getFrame() {
    return {
      active: this.active,
      strength: this.strength / 100,
      calm: this.calm(),
      inBands: this.inBands,
      outBands: this.outBands,
      inLevel: this.inLevel,
      outLevel: this.outLevel,
      reductionDb: this.reduction,
      voice: this.voice,
    }
  }

  trackEnergy(inRms, outRms, dt) {
    const a = 1 - Math.exp(-dt / 0.8)            // about the last second
    this.inE += (inRms * inRms - this.inE) * a
    this.outE += (outRms * outRms - this.outE) * a
    const target = this.active ? Math.min(60, Math.max(0, 10 * Math.log10((this.inE + 1e-10) / (this.outE + 1e-10)))) : 0
    this.reduction += (target - this.reduction) * (1 - Math.exp(-dt / 0.4))
  }

  emit() { this.listeners.forEach((fn) => fn()) }
}

const levelOf = (rms) => clamp01((20 * Math.log10(Math.max(rms, 1e-6)) + 70) / 55)

// ── Real microphone + RNNoise ──
export class MicEngine extends Shared {
  constructor() {
    super()
    this.kind = 'mic'
    this.monitoring = false
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      // the browser's own cleanup must be off, or the "before" would already be cleaned
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    })
    this.stream = stream
    const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' })
    this.ctx = ctx
    if (ctx.sampleRate !== 48000) throw new Error('This browser cannot run audio at 48 kHz')
    await ctx.audioWorklet.addModule(WORKLET_URL)
    const node = new AudioWorkletNode(ctx, 'noiseless-rnnoise', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
      processorOptions: { active: this.active, strength: this.strength },
    })
    this.node = node
    node.port.onmessage = (e) => {
      const m = e.data || {}
      if (m.type === 'levels') {
        const now = performance.now()
        const dt = Math.min(0.2, (now - (this.lastLevels || now)) / 1000) || 0.05
        this.lastLevels = now
        this.voice = !!m.voice
        this.trackEnergy(m.inRms, m.outRms, dt)
      }
    }

    const src = ctx.createMediaStreamSource(stream)
    const mk = () => { const a = ctx.createAnalyser(); a.fftSize = FFT; a.smoothingTimeConstant = 0.55; a.minDecibels = -100; a.maxDecibels = -20; return a }
    this.anIn = mk()
    this.anOut = mk()
    this.monitor = ctx.createGain()
    this.monitor.gain.value = 0
    src.connect(this.anIn)
    src.connect(node)
    node.connect(this.anOut)
    this.anOut.connect(this.monitor)
    this.monitor.connect(ctx.destination)    // keeps the graph running even while muted

    this.freq = new Float32Array(FFT / 2)
    this.time = new Float32Array(FFT)
    const binHz = ctx.sampleRate / FFT
    this.bins = EDGES.map((hz) => Math.max(1, Math.round(hz / binHz)))
    if (ctx.state === 'suspended') await ctx.resume()
    this.running = true
    this.loop()
  }

  readBands(an, into) {
    an.getFloatFrequencyData(this.freq)
    for (let b = 0; b < BANDS; b++) {
      let sum = 0, n = 0
      for (let i = this.bins[b]; i < Math.min(this.freq.length, this.bins[b + 1]); i++) { sum += Math.pow(10, this.freq[i] / 20); n++ }
      const db = 20 * Math.log10(Math.max(1e-7, sum / Math.max(1, n)))
      const v = clamp01((db + 95) / 60)
      into[b] += (v - into[b]) * (v > into[b] ? 0.55 : 0.14)
    }
    an.getFloatTimeDomainData(this.time)
    let sq = 0
    for (let i = 0; i < this.time.length; i++) sq += this.time[i] * this.time[i]
    return Math.sqrt(sq / this.time.length)
  }

  loop() {
    if (!this.running) return
    const li = levelOf(this.readBands(this.anIn, this.inBands))
    const lo = levelOf(this.readBands(this.anOut, this.outBands))
    this.inLevel += (li - this.inLevel) * 0.35
    this.outLevel += (lo - this.outLevel) * 0.35
    this.raf = requestAnimationFrame(() => this.loop())
  }

  setActive(on) {
    this.setActiveVisual(on)
    this.node?.port.postMessage({ type: 'active', value: on })
    this.emit()
  }

  setStrength(pct) {
    this.strength = pct
    this.node?.port.postMessage({ type: 'strength', value: pct })
    this.emit()
  }

  setMonitoring(on) {
    this.monitoring = on
    if (this.monitor) this.monitor.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.03)
    this.emit()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.node?.port.postMessage({ type: 'dispose' })
    this.stream?.getTracks().forEach((t) => t.stop())
    this.ctx?.close()
  }
}

// ── A simulated room, for when there is no mic (or it was refused). Visual only, no sound. ──
export class SimulatedEngine extends Shared {
  constructor() {
    super()
    this.kind = 'simulated'
    this.monitoring = false
  }

  start() {
    this.running = true
    this.t0 = performance.now()
    this.last = this.t0
    this.nextClick = 0
    this.click = 0
    this.loop()
    return Promise.resolve()
  }

  loop() {
    if (!this.running) return
    const now = performance.now()
    const t = (now - this.t0) / 1000
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    // a room: steady fan hum, chatter rising and falling, the odd keyboard clatter
    if (t > this.nextClick) { this.click = 1; this.nextClick = t + 0.15 + Math.random() * (Math.random() < 0.2 ? 2 : 0.4) }
    this.click *= Math.exp(-dt * 14)
    const chatter = 0.5 + 0.5 * Math.sin(t * 0.7) * Math.sin(t * 0.31 + 1)
    // someone speaking at the mic, in phrases
    const phrase = Math.sin(t * 0.55) > 0.15 ? 1 : 0
    const syll = phrase * (0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1)))
    this.voice = syll > 0.5
    const cancel = this.calm() * Math.min(1, 0.4 + this.strength / 100)
    let inSq = 0, outSq = 0
    for (let b = 0; b < BANDS; b++) {
      const hum = b < 2 ? 0.55 : 0.22
      const chat = b >= 2 && b <= 5 ? 0.35 * chatter : 0.1 * chatter
      const clk = b >= 4 ? 0.6 * this.click : 0.15 * this.click
      const jitter = 0.08 * Math.random()
      const noise = Math.min(1, hum + chat + clk + jitter)
      const voice = b >= 1 && b <= 5 ? syll * (0.75 - Math.abs(b - 3) * 0.12) : 0
      const vin = Math.min(1, Math.max(noise, voice) + 0.1 * Math.min(noise, voice))
      const vout = Math.min(1, voice * (0.6 + 0.4 * cancel) + noise * (1 - cancel) * (1 - cancel))
      this.inBands[b] += (vin - this.inBands[b]) * 0.4
      this.outBands[b] += (Math.max(vout, vin * (1 - cancel)) - this.outBands[b]) * 0.4
      inSq += vin * vin
      outSq += this.outBands[b] * this.outBands[b]
    }
    const inR = Math.sqrt(inSq / BANDS) * 0.12, outR = Math.max(1e-5, Math.sqrt(outSq / BANDS) * 0.12 * (cancel > 0.5 && !this.voice ? 0.01 : 1))
    this.inLevel += (levelOf(inR) - this.inLevel) * 0.3
    this.outLevel += (levelOf(outR) - this.outLevel) * 0.3
    this.trackEnergy(inR, outR, dt)
    this.raf = requestAnimationFrame(() => this.loop())
  }

  setActive(on) { this.setActiveVisual(on); this.emit() }
  setStrength(pct) { this.strength = pct; this.emit() }
  setMonitoring() {}
  stop() { this.running = false; cancelAnimationFrame(this.raf) }
}

// A quiet, idle source so the scenes have something to show before anyone presses start.
export class IdleSource extends SimulatedEngine {
  constructor() { super(); this.kind = 'idle' }
}
