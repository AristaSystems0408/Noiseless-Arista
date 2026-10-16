/*
 * Noiseless — primary engine (AudioWorklet).
 *
 *   mic ─► 70 Hz high-pass ─► RNNoise (neural denoiser, 10 ms frames) ─► 30 ms look-ahead
 *                                   │ speech probability                        │
 *                                   ▼                                           ▼
 *                    ProximityVAD (level + probability) ───────── gate ─► soft limiter ─► out
 *
 * RNNoise removes non-speech noise (fans, typing, traffic, clatter). The proximity gate from
 * the desktop engine then passes only speech loud enough to be the person at the mic, and
 * outputs true silence otherwise. The look-ahead lets the gate open before the first syllable.
 */
import createRNNWasmModuleSync from './vendor/rnnoise-sync.js';
import { Calibration, HighPass, ProximityVAD, limit, rms, toDb } from './engine-common.js';

const FRAME = 480; // RNNoise frame: 10 ms at 48 kHz
const LOOKAHEAD = 3; // frames
const FIFO_SIZE = 8192; // power of two
const LEVEL_EVERY = 20; // render quanta between level reports (~53 ms)
const SCALE = 32768; // RNNoise works on 16-bit sample values

let wasm = null;
if (sampleRate === 48000) {
  try {
    wasm = createRNNWasmModuleSync();
  } catch (_) {
    wasm = null; // e.g. the page's CSP forbids WebAssembly; inject.js falls back to the classic engine
  }
}

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};

    this.state = wasm._rnnoise_create(0);
    this.inPtr = wasm._malloc(FRAME * 4);
    this.outPtr = wasm._malloc(FRAME * 4);

    this.active = !!opts.active;
    this.vad = new ProximityVAD(sampleRate);
    this.setStrengthPct(opts.strength == null ? 85 : opts.strength);
    this.hp = new HighPass(70, sampleRate);

    this.frameRaw = new Float32Array(FRAME);
    this.frameFilt = new Float32Array(FRAME);
    this.frameFill = 0;
    this.delay = Array.from({ length: LOOKAHEAD }, () => new Float32Array(FRAME));
    this.delayPos = 0;
    this.prevGate = 0;

    // Pre-fill one frame so 128-sample reads never run ahead of 480-sample frames
    this.fifo = new Float32Array(FIFO_SIZE);
    this.fifoRead = 0;
    this.fifoWrite = FRAME;
    this.fifoCount = FRAME;

    this.mono = new Float32Array(128);
    this.peakIn = 0;
    this.peakOut = 0;
    this.quanta = 0;

    this.calibration = null;
    this.disposed = false;

    if (opts.profile) this.applyProfile(opts.profile);
    this.port.onmessage = (e) => this.onMessage(e.data || {});
    this.port.postMessage({ type: 'engine', engine: 'rnnoise' });
  }

  onMessage(msg) {
    switch (msg.type) {
      case 'active':
        this.active = !!msg.value;
        break;
      case 'strength':
        this.setStrengthPct(msg.value);
        break;
      case 'profile':
        this.applyProfile(msg.profile);
        break;
      case 'calibrate':
        this.calibration = new Calibration(sampleRate, this.port);
        break;
      case 'dispose':
        this.dispose();
        break;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    wasm._rnnoise_destroy(this.state);
    wasm._free(this.inPtr);
    wasm._free(this.outPtr);
  }

  setStrengthPct(pct) {
    this.vad.setStrength(Math.min(2, Math.max(0, Number(pct) / 50)));
  }

  applyProfile(p) {
    if (p && p.noiseRms > 0 && p.voiceRms > 0) this.vad.applyLevels(p.noiseRms, p.voiceRms);
  }

  process(inputs, outputs) {
    if (this.disposed) return false;
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    const input = inputs[0];
    if (!input || !input.length) {
      out.fill(0);
      return true;
    }

    const n = out.length;
    if (this.mono.length !== n) this.mono = new Float32Array(n);
    const c0 = input[0];
    const c1 = input[1];
    let inSq = 0;
    for (let i = 0; i < n; i++) {
      const x = c1 ? 0.5 * (c0[i] + c1[i]) : c0[i];
      this.mono[i] = x;
      inSq += x * x;
      this.frameRaw[this.frameFill++] = x;
      if (this.frameFill === FRAME) {
        this.processFrame();
        this.frameFill = 0;
      }
    }

    let outSq = 0;
    for (let i = 0; i < n; i++) {
      let y = 0;
      if (this.fifoCount > 0) {
        y = this.fifo[this.fifoRead];
        this.fifoRead = (this.fifoRead + 1) & (FIFO_SIZE - 1);
        this.fifoCount--;
      }
      const v = this.active ? y : this.mono[i];
      out[i] = v;
      outSq += v * v;
    }

    this.peakIn = Math.max(this.peakIn, Math.sqrt(inSq / n));
    this.peakOut = Math.max(this.peakOut, Math.sqrt(outSq / n));
    if (++this.quanta >= LEVEL_EVERY) {
      this.port.postMessage({
        type: 'levels',
        inRms: this.peakIn,
        outRms: this.peakOut,
        voice: this.vad.speechActive,
      });
      this.quanta = 0;
      this.peakIn = 0;
      this.peakOut = 0;
    }
    return true;
  }

  processFrame() {
    const raw = this.frameRaw;
    const f = this.frameFilt;
    for (let i = 0; i < FRAME; i++) f[i] = this.hp.process(raw[i]);

    let heap = wasm.HEAPF32;
    const inIdx = this.inPtr >> 2;
    for (let i = 0; i < FRAME; i++) heap[inIdx + i] = f[i] * SCALE;
    const prob = wasm._rnnoise_process_frame(this.state, this.outPtr, this.inPtr);
    heap = wasm.HEAPF32;

    const gate = this.vad.detect(rms(f), prob);

    // Emit the oldest look-ahead frame through the gate, then store the new one in its slot
    const slot = this.delay[this.delayPos];
    const g0 = this.prevGate;
    for (let i = 0; i < FRAME; i++) {
      const g = g0 + ((gate - g0) * (i + 1)) / FRAME;
      this.fifo[this.fifoWrite] = g < 0.01 ? 0 : limit(slot[i] * Math.min(1, g));
      this.fifoWrite = (this.fifoWrite + 1) & (FIFO_SIZE - 1);
    }
    this.fifoCount = Math.min(FIFO_SIZE, this.fifoCount + FRAME);
    const outIdx = this.outPtr >> 2;
    for (let i = 0; i < FRAME; i++) slot[i] = heap[outIdx + i] / SCALE;
    this.delayPos = (this.delayPos + 1) % LOOKAHEAD;
    this.prevGate = gate;

    if (this.calibration) this.feedCalibration(f);
  }

  feedCalibration(samples) {
    const result = this.calibration.feed(samples);
    if (!result) return;
    this.calibration = null;
    if (!Calibration.evaluate(sampleRate, result.noise, result.voice)) {
      Calibration.fail(this.port);
      return;
    }
    this.vad.calibrateNoise(result.noise);
    this.vad.calibrateVoice(result.voice);
    this.port.postMessage({
      type: 'calibration',
      phase: 'done',
      profile: {
        engine: 'rnnoise',
        noiseRms: this.vad.noiseRms,
        voiceRms: this.vad.voiceRms,
        separationDb: toDb(this.vad.voiceRms) - toDb(this.vad.noiseRms),
        createdAt: Date.now(),
      },
    });
  }
}

if (wasm) registerProcessor('noiseless-rnnoise', RNNoiseProcessor);
