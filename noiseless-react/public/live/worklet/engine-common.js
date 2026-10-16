/*
 * Noiseless — shared engine pieces used by both worklet processors.
 * ProximityVAD is a port of the desktop engine's VAD (files/NoiseSuppressor.pyw).
 */

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, buf.length));
}

// numpy.percentile with linear interpolation
export function percentile(values, p) {
  const a = Float64Array.from(values).sort();
  if (!a.length) return 0;
  const idx = ((a.length - 1) * p) / 100;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

export const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-10));

export class Ring {
  constructor(capacity) {
    this.buf = new Float64Array(capacity);
    this.capacity = capacity;
    this.length = 0;
    this.pos = 0;
  }
  push(v) {
    this.buf[this.pos] = v;
    this.pos = (this.pos + 1) % this.capacity;
    if (this.length < this.capacity) this.length++;
  }
  values() {
    return this.buf.subarray(0, this.length);
  }
}

// 3rd-order Butterworth high-pass = 1st-order section + biquad with Q = 1
export class HighPass {
  constructor(fc, fs) {
    const k = Math.tan((Math.PI * fc) / fs);
    this.b0 = 1 / (1 + k);
    this.a1 = (k - 1) / (k + 1);
    this.x1 = 0;
    this.y1 = 0;

    const w0 = (2 * Math.PI * fc) / fs;
    const cw = Math.cos(w0);
    const alpha = Math.sin(w0) / 2; // Q = 1
    const a0 = 1 + alpha;
    this.c0 = (1 + cw) / 2 / a0;
    this.c1 = -(1 + cw) / a0;
    this.c2 = (1 + cw) / 2 / a0;
    this.d1 = (-2 * cw) / a0;
    this.d2 = (1 - alpha) / a0;
    this.s1 = 0;
    this.s2 = 0;
  }
  process(x) {
    const y = this.b0 * (x - this.x1) - this.a1 * this.y1;
    this.x1 = x;
    this.y1 = y;
    // transposed direct form II
    const z = this.c0 * y + this.s1;
    this.s1 = this.c1 * y - this.d1 * z + this.s2;
    this.s2 = this.c2 * y - this.d2 * z;
    return z;
  }
}

// Soft limiter from the desktop engine
export function limit(y) {
  const t = 0.92;
  const a = Math.abs(y);
  return a > t ? Math.sign(y) * (t + (1 - t) * Math.tanh((a - t) / (1 - t + 1e-8))) : y;
}

// ─────────────────────────────────────────────────────────────────
// VOICE ACTIVITY DETECTOR — strength-adaptive proximity gate
//
// detect() takes the frame level and, optionally, a speech probability from a
// neural VAD. With a probability the gate only opens for sound that is both
// speech and loud enough to be the person at the mic.
// ─────────────────────────────────────────────────────────────────
const AUTO_WARMUP_FRAMES = 50; // 10 ms frames

export class ProximityVAD {
  constructor(sr) {
    this.sr = sr;
    this.noiseRms = 0.001;
    this.voiceRms = 0.05;
    this.speechThreshold = 0.01;
    this.hardThreshold = 0.003;
    this.strength = 1.0;
    this.probThreshold = 0.45;

    this.speechActive = false;
    this.silenceFrames = 0;
    this.holdoverFrames = 15;
    this.gateGain = 0;
    this.recent = new Ring(3);
    this.recentProb = new Ring(3);

    this.noiseTracker = new Ring(500);
    this.noiseUpdateCounter = 0;

    // Auto mode (no calibration): background = power average of the last 10 s of non-speaker
    // frames; voice = median of frames that are confidently speech and well above the room
    this.voiceCalibrated = false;
    this.voiceLearned = false;
    this.autoFrames = 0;
    this.levelTracker = new Ring(1000);
    this.levelUpdateCounter = 0;
    this.voiceTracker = new Ring(300);
    this.voiceUpdateCounter = 0;
  }

  frameRms(samples, cb) {
    const frame = Math.round(0.02 * this.sr);
    for (let i = 0; i + frame < samples.length; i += frame) {
      cb(rms(samples.subarray(i, i + frame)));
    }
  }

  calibrateNoise(samples) {
    this.noiseRms = rms(samples);
    this.frameRms(samples, (r) => this.noiseTracker.push(r));
  }

  // Returns the number of 20 ms frames that contained speech
  calibrateVoice(samples) {
    const voiced = [];
    this.frameRms(samples, (r) => {
      if (r > this.noiseRms * 1.5) voiced.push(r);
    });
    if (!voiced.length) return 0;
    this.voiceRms = percentile(voiced, 50);
    this.voiceCalibrated = true;
    this.updateThresholds();
    return voiced.length;
  }

  applyLevels(noiseRms, voiceRms) {
    this.noiseRms = noiseRms;
    this.voiceRms = voiceRms;
    this.voiceCalibrated = true;
    this.updateThresholds();
  }

  updateThresholds() {
    const noiseDb = toDb(this.noiseRms);
    const voiceDb = toDb(this.voiceRms);
    // Same mapping as the desktop engine (files/NoiseSuppressor.pyw v3.1)
    let t, h;
    if (this.strength >= 1.8) {
      // 90-100%: only speech close to your own level passes (crowded rooms)
      t = 0.75;
      h = 0.65;
      this.holdoverFrames = 3;
    } else if (this.strength >= 1.5) {
      t = 0.65;
      h = 0.55;
      this.holdoverFrames = 6;
    } else if (this.strength >= 1.0) {
      t = 0.5;
      h = 0.4;
      this.holdoverFrames = 10;
    } else if (this.strength >= 0.5) {
      t = 0.35;
      h = 0.25;
      this.holdoverFrames = Math.max(8, Math.trunc(20 - this.strength * 10));
    } else {
      t = 0.2;
      h = 0.1;
      this.holdoverFrames = Math.max(8, Math.trunc(20 - this.strength * 10));
    }
    this.speechThreshold = 10 ** ((noiseDb + (voiceDb - noiseDb) * t) / 20);
    this.hardThreshold = 10 ** ((noiseDb + (voiceDb - noiseDb) * h) / 20);
  }

  setStrength(strength) {
    this.strength = strength;
    this.probThreshold = 0.3 + 0.15 * strength;
    if (this.voiceRms > this.noiseRms * 1.5) this.updateThresholds();
  }

  // Desktop behaviour: slowly follow the noise floor from quiet frames
  trackNoiseCalibrated(r) {
    this.noiseUpdateCounter++;
    if (r < this.speechThreshold * 0.7) {
      this.noiseTracker.push(r);
      if (this.noiseUpdateCounter % 100 === 0 && this.noiseTracker.length > 20) {
        const newNoise = percentile(this.noiseTracker.values(), 60);
        this.noiseRms = 0.9 * this.noiseRms + 0.1 * newNoise;
        this.updateThresholds();
      }
    }
  }

  trackAuto(r, prob) {
    // Background level = power average of everything that is not the speaker (as calibration
    // measures it), so nearby chatter counts as background rather than slipping under the gate.
    // Until the speaker's level is known, only frames RNNoise calls non-speech count: the
    // speaker's own words must never be learned as background, or a quiet mic stays muted.
    // Once it is known, anything well under the speaker counts too (chatter): 6 dB under at
    // 90-100%, 10 dB under otherwise. Not closer, or the speaker's own softer syllables raise the
    // threshold, which then cuts more of them.
    this.autoFrames++;
    const margin = this.strength >= 1.8 ? 0.5 : 0.316;
    const underSpeaker = this.voiceLearned && r < Math.min(this.speechThreshold, this.voiceRms * margin);
    if (prob < 0.5 || underSpeaker) this.levelTracker.push(r * r);
    const warmingUp = this.levelTracker.length < 200;
    if (++this.levelUpdateCounter % (warmingUp ? 10 : 50) === 0 && this.levelTracker.length >= 10) {
      const power = this.levelTracker.values();
      let sum = 0;
      for (let i = 0; i < power.length; i++) sum += power[i];
      const noise = Math.max(1e-6, Math.sqrt(sum / power.length));
      this.noiseRms = warmingUp ? noise : 0.7 * this.noiseRms + 0.3 * noise;
      // Provisional voice level until learned: 20 dB above the room (the desktop app's fallback)
      if (!this.voiceLearned) this.voiceRms = this.noiseRms * 10;
      this.updateThresholds();
    }
    // Speaker level = median of confident speech well above the room, whatever the mic gain
    if (prob >= 0.85 && r > this.noiseRms * 4) {
      this.voiceTracker.push(r);
      if (++this.voiceUpdateCounter % 25 === 0 && this.voiceTracker.length >= 50) {
        const median = percentile(this.voiceTracker.values(), 50);
        this.voiceRms = this.voiceLearned ? 0.5 * this.voiceRms + 0.5 * median : median;
        this.voiceLearned = true;
        this.updateThresholds();
      }
    }
  }

  // Auto mode measures the room before the gate may open (falls back after 3 s of non-stop talk)
  warmingUp() {
    return this.levelTracker.length < AUTO_WARMUP_FRAMES && this.autoFrames < 300;
  }

  detect(r, prob = 1) {
    this.recent.push(r);
    this.recentProb.push(prob);

    if (this.voiceCalibrated) this.trackNoiseCalibrated(r);
    else {
      this.trackAuto(r, prob);
      // Stay closed for the first half-second while auto mode measures the room
      if (this.warmingUp()) return (this.gateGain = 0);
    }

    const decay = this.strength >= 1.8 ? 0.7 : this.strength >= 1.0 ? 0.8 : 0.9; // desktop values

    // Hard gate: below threshold = close
    if (r < this.hardThreshold) {
      this.silenceFrames++;
      if (this.silenceFrames > this.holdoverFrames) {
        this.speechActive = false;
        this.gateGain = Math.max(0, this.gateGain * decay);
      }
      return this.gateGain;
    }

    const recent = this.recent.values();
    let smooth = 0;
    for (let i = 0; i < recent.length; i++) smooth += recent[i];
    smooth /= recent.length;

    const probs = this.recentProb.values();
    let peakProb = 0;
    for (let i = 0; i < probs.length; i++) peakProb = Math.max(peakProb, probs[i]);

    if (smooth > this.speechThreshold && peakProb >= this.probThreshold) {
      this.speechActive = true;
      this.silenceFrames = 0;
      this.gateGain = Math.min(1, this.gateGain + 0.35);
    } else {
      this.silenceFrames++;
      if (this.silenceFrames > this.holdoverFrames) {
        this.speechActive = false;
        this.gateGain = Math.max(0, this.gateGain * decay);
      }
    }
    return this.gateGain;
  }
}

// ─────────────────────────────────────────────────────────────────
// CALIBRATION — 0.5 s settle + 3 s quiet, then 0.5 s lead-in + 4 s speech
// ─────────────────────────────────────────────────────────────────
export class Calibration {
  constructor(sr, port, onNoiseCaptured) {
    this.sr = sr;
    this.port = port;
    this.onNoiseCaptured = onNoiseCaptured;
    this.phase = 'noise';
    this.skip = Math.round(0.5 * sr);
    this.noise = new Float32Array(3 * sr);
    this.voice = new Float32Array(4 * sr);
    this.n = 0;
    this.extra = null;
    port.postMessage({ type: 'calibration', phase: 'noise', durationMs: 3500 });
  }

  // Returns the finished {noise, voice, extra} once both phases are captured
  feed(samples) {
    for (let i = 0; i < samples.length; i++) {
      if (this.skip > 0) {
        this.skip--;
        continue;
      }
      if (this.phase === 'noise') {
        this.noise[this.n++] = samples[i];
        if (this.n === this.noise.length) {
          if (this.onNoiseCaptured) this.extra = this.onNoiseCaptured(this.noise);
          this.phase = 'voice';
          this.n = 0;
          this.skip = Math.round(0.5 * this.sr);
          this.port.postMessage({ type: 'calibration', phase: 'voice', durationMs: 4500 });
        }
      } else {
        this.voice[this.n++] = samples[i];
        if (this.n === this.voice.length) return { noise: this.noise, voice: this.voice, extra: this.extra };
      }
    }
    return null;
  }

  // Validates on a scratch VAD so a failed attempt leaves current settings intact
  static evaluate(sr, noise, voice) {
    const probe = new ProximityVAD(sr);
    probe.calibrateNoise(noise);
    if (!probe.calibrateVoice(voice)) return null;
    return { noiseRms: probe.noiseRms, voiceRms: probe.voiceRms };
  }

  static fail(port) {
    port.postMessage({
      type: 'calibration',
      phase: 'error',
      message: 'No speech was detected in step 2. Try again and talk normally when asked.',
    });
  }
}
