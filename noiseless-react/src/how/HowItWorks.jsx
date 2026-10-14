import { useEffect, useState } from 'react'
import ThreeBackground from '../components/ThreeBackground.jsx'
import BrandBar from '../components/BrandBar.jsx'
import Footer from '../components/Footer.jsx'
import {
  Tex, PipelineFigure, HighPassFigure, BandsFigure, NetworkFigure, GateFigure, LimiterFigure, EnvelopeFigure,
} from './figures.jsx'

const SECTIONS = [
  ['overview', 'Overview'],
  ['path', 'The signal path'],
  ['proof', 'Before & after'],
  ['highpass', '1 · High-pass filter'],
  ['rnnoise', '2 · RNNoise network'],
  ['gate', '3 · Proximity gate'],
  ['smooth', '4 · Look-ahead & limiter'],
  ['routing', 'Getting it to the meeting'],
  ['numbers', 'By the numbers'],
  ['credits', 'Credits'],
]

function Figure({ children, caption, wide }) {
  return (
    <figure className={`hw-figure ${wide ? 'wide' : ''}`}>
      <div className="hw-figure-body">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

function Section({ id, kicker, title, children }) {
  return (
    <section id={id} className="hw-section">
      {kicker && <div className="hw-kicker">{kicker}</div>}
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export default function HowItWorks() {
  const [active, setActive] = useState('overview')
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) })
    }, { rootMargin: '-40% 0px -55% 0px' })
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <ThreeBackground />
      <BrandBar />
      <main className="hw">
        <header className="hw-hero">
          <a href="/" className="hw-back">← Noiseless</a>
          <div className="hw-kicker">How it works</div>
          <h1>
            How Noiseless removes <b>everything that isn't you</b>.
          </h1>
          <p className="hw-lede">
            Every 10 milliseconds Noiseless asks two questions about the sound from your microphone:
            <em> is this speech?</em> and <em>is it loud enough to be the person at the mic?</em> A recurrent
            neural network answers the first and strips the noise out of your voice; a small piece of signal
            processing answers the second. Only sound that passes both reaches your meeting — everything else
            becomes true digital silence.
          </p>
          <div className="hw-stats">
            <div><b>10 ms</b><span>analysis frames, 100 per second</span></div>
            <div><b>~1 ms</b><span>of CPU per frame on a laptop</span></div>
            <div><b>30 ms</b><span>look-ahead, so first syllables aren't clipped</span></div>
            <div><b>0 bytes</b><span>of audio leave your computer</span></div>
          </div>
        </header>

        <div className="hw-layout">
          <nav className="hw-toc" aria-label="On this page">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>{label}</a>
            ))}
          </nav>

          <article className="hw-body">
            <Section id="overview" kicker="The idea" title="Two problems, two tools">
              <div className="hw-cards">
                <div className="hw-card">
                  <div className="hw-card-icon">≋</div>
                  <h3>Noise inside your words</h3>
                  <p>
                    A fan, an air conditioner or traffic sits <em>under</em> your voice in the same frequencies.
                    Cutting it needs to know what speech looks like — that's the job of <b>RNNoise</b>, a small
                    recurrent neural network trained on hours of clean speech and noise.
                  </p>
                </div>
                <div className="hw-card">
                  <div className="hw-card-icon">◐</div>
                  <h3>Noise between your words</h3>
                  <p>
                    Keyboard clicks, a tap on the mic cable, a colleague's call. When you are not speaking,
                    nothing should be sent at all. The <b>proximity gate</b> opens only for sound that is both
                    speech <em>and</em> close to your own level, and outputs exact zeros otherwise.
                  </p>
                </div>
              </div>
            </Section>

            <Section id="path" kicker="Architecture" title="The signal path">
              <p>
                Audio is processed in 480-sample frames (10 ms at 48 kHz). Each frame flows left to right; the
                network also hands the gate a speech probability for the same frame.
              </p>
              <Figure wide caption="The same chain runs in the Windows app and in the Chrome extension — they share the identical RNNoise build, so they behave the same.">
                <PipelineFigure />
              </Figure>
            </Section>

            <Section id="proof" kicker="Real recordings" title="Before and after">
              <p>
                These spectrograms are real: a recording from an office was run through the Noiseless engine
                exactly as the app runs it. Brightness is energy; height is frequency; time runs left to right.
              </p>
              <Figure wide caption="Office: a nearby colleague, keyboard and fan (top) and what the meeting receives (bottom). Background between your words becomes silence; your voice keeps its full spectrum.">
                <img src="/how/spectrogram-office.webp" alt="Spectrogram of an office recording before and after Noiseless" loading="lazy" />
              </Figure>
              <Figure wide caption="Your test: tapping the mic cable every 0.7 s. Taps between words are removed completely — a tap is loud, but RNNoise says it isn't speech, so the gate stays shut. Clicks that land on top of your own words are reduced, not removed: the gate has to stay open while you talk.">
                <img src="/how/spectrogram-taps.webp" alt="Spectrogram of speech with cable taps before and after Noiseless" loading="lazy" />
              </Figure>
              <Figure wide caption="Loudness over the same office recording: microphone (pink) vs. what the meeting hears (teal).">
                <EnvelopeFigure />
              </Figure>
            </Section>

            <Section id="highpass" kicker="Stage 1 · DSP" title="A 70 Hz high-pass filter">
              <p>
                Desk thumps, footsteps and electrical hum live below 70 Hz, where there is no useful speech.
                A third-order high-pass removes them before anything else sees the signal. It is a first-order
                section followed by a biquad (Q = 1), both designed with the bilinear transform:
              </p>
              <Tex block>{String.raw`H(z) = \underbrace{\frac{b_0\,(1 - z^{-1})}{1 + a_1 z^{-1}}}_{\text{1st order}} \cdot \underbrace{\frac{c_0 + c_1 z^{-1} + c_2 z^{-2}}{1 + d_1 z^{-1} + d_2 z^{-2}}}_{\text{biquad, } Q=1}`}</Tex>
              <Tex block>{String.raw`k = \tan\frac{\pi f_c}{f_s},\quad b_0 = \frac{1}{1+k},\quad a_1 = \frac{k-1}{k+1},\qquad \omega_0 = \frac{2\pi f_c}{f_s},\quad \alpha = \frac{\sin\omega_0}{2Q}`}</Tex>
              <Tex block>{String.raw`c_0 = c_2 = \frac{1+\cos\omega_0}{2(1+\alpha)},\quad c_1 = -\frac{1+\cos\omega_0}{1+\alpha},\quad d_1 = \frac{-2\cos\omega_0}{1+\alpha},\quad d_2 = \frac{1-\alpha}{1+\alpha}`}</Tex>
              <Figure caption="Magnitude response computed live from the exact coefficients the engine uses (f_c = 70 Hz, f_s = 48 kHz). Speech, from about 100 Hz up, passes untouched.">
                <HighPassFigure />
              </Figure>
            </Section>

            <Section id="rnnoise" kicker="Stage 2 · Neural network" title="RNNoise: a recurrent network that knows what speech sounds like">
              <p>
                RNNoise (Jean-Marc Valin, Xiph.Org / Mozilla, 2018) is a hybrid: classic signal processing
                computes compact features, and a small recurrent neural network decides how much of each frequency
                band to keep. Because it only predicts <b>22 gains</b> instead of a full spectrum, it is tiny and
                fast — and very hard to fool into producing artefacts.
              </p>

              <h3>Framing</h3>
              <p>
                Each 10 ms hop is analysed with a 20 ms window (50 % overlap) using the power-complementary
                Vorbis window, so overlapping frames add back up perfectly:
              </p>
              <Tex block>{String.raw`w(n) = \sin\!\Big[\frac{\pi}{2}\,\sin^2\!\Big(\frac{\pi\,(n+\tfrac12)}{N}\Big)\Big],\qquad X(k) = \sum_{n=0}^{N-1} w(n)\,x(n)\,e^{-j2\pi kn/N}`}</Tex>

              <h3>22 bands that follow the ear</h3>
              <p>
                Instead of 481 FFT bins, energy is pooled into 22 overlapping triangular bands spaced like
                the ear's critical bands — narrow at low frequencies, wide at high ones:
              </p>
              <Tex block>{String.raw`E_b = \sum_{k} w_b(k)\,\lvert X(k)\rvert^2,\qquad \sum_b w_b(k) = 1`}</Tex>
              <Figure caption="The 22 band weights w_b(k) (RNNoise's band edges: 0, 200, 400 … 20 000 Hz). Low bands are 200 Hz wide; the top band spans 4.4 kHz.">
                <BandsFigure />
              </Figure>

              <h3>42 input features</h3>
              <div className="hw-feature-grid">
                <div><b>22</b><span>Bark-frequency cepstral coefficients — DCT of log band energies</span></div>
                <div><b>12</b><span>first and second time derivatives of the first 6 coefficients</span></div>
                <div><b>6</b><span>pitch correlation in the lowest bands (how "voiced" it is)</span></div>
                <div><b>1</b><span>pitch period</span></div>
                <div><b>1</b><span>spectral non-stationarity (how fast the spectrum changes)</span></div>
              </div>

              <h3>The network</h3>
              <Figure wide caption="RNNoise's architecture (Valin, 2018). Three gated recurrent layers carry memory across frames: one detects voice activity, one tracks the noise, one computes the 22 band gains. The voice-activity output is the speech probability the gate uses.">
                <NetworkFigure />
              </Figure>
              <p>Each gated recurrent unit (GRU) updates its memory once per frame:</p>
              <Tex block>{String.raw`\begin{aligned} z_t &= \sigma(W_z x_t + U_z h_{t-1} + b_z) && \text{update gate}\\ r_t &= \sigma(W_r x_t + U_r h_{t-1} + b_r) && \text{reset gate}\\ \tilde h_t &= \tanh\big(W x_t + U (r_t \odot h_{t-1}) + b\big)\\ h_t &= z_t \odot h_{t-1} + (1 - z_t) \odot \tilde h_t \end{aligned}`}</Tex>

              <h3>From 22 gains back to clean audio</h3>
              <p>
                The network was trained to output the ideal gain for each band — the share of the band's energy
                that is speech — using a loss that is gentle on small errors in quiet bands:
              </p>
              <Tex block>{String.raw`g_b = \sqrt{\frac{E_{s}(b)}{E_{x}(b)}},\qquad \mathcal{L}(g_b,\hat g_b) = \big(g_b^{\,\gamma} - \hat g_b^{\,\gamma}\big)^2,\ \ \gamma = \tfrac12`}</Tex>
              <p>
                The predicted gains are interpolated back to every FFT bin and applied, and a pitch comb-filter
                removes noise that sits between the harmonics of your voice:
              </p>
              <Tex block>{String.raw`r(k) = \sum_b w_b(k)\,\hat g_b,\qquad \hat S(k) = r(k)\,X(k),\qquad \hat s(n) = \mathrm{IFFT}\{\hat S\}\ \text{(overlap-add)}`}</Tex>
            </Section>

            <Section id="gate" kicker="Stage 3 · Decision" title="The proximity gate">
              <p>
                RNNoise removes noise from speech, but it can't tell <em>your</em> speech from a colleague's —
                and a sudden click can still leave a residue. The gate decides, frame by frame, whether anything
                is sent at all. It measures the frame level of the high-passed signal,
              </p>
              <Tex block>{String.raw`r = \sqrt{\tfrac{1}{480}\textstyle\sum_{n} x(n)^2},\qquad L = 20\log_{10} r\ \ \text{(dBFS)}`}</Tex>
              <p>
                and compares it with two thresholds placed between the room's level <Tex>N</Tex> and your voice's
                level <Tex>V</Tex> (from calibration, or learned automatically):
              </p>
              <Tex block>{String.raw`T = N + t\,(V - N),\qquad H = N + h\,(V - N)\qquad\text{(in dB)}`}</Tex>
              <p>The gate opens only when, over the last three frames,</p>
              <Tex block>{String.raw`\overline{r}_{t-2..t} > T \quad\text{and}\quad \max_{t-2..t} p \;\ge\; p_{\min} = 0.30 + 0.15\,s`}</Tex>
              <p>
                where <Tex>p</Tex> is RNNoise's speech probability and <Tex>s</Tex> the strength (0–2). Opening is
                fast (+0.35 per frame); closing waits a short hold time and then fades
                (<Tex>{String.raw`g \leftarrow \rho\, g`}</Tex>). Below <Tex>H</Tex> it closes regardless.
              </p>
              <Figure wide caption="Illustration of the real decision rule. The tap is loud but not speech (p ≈ 0) — gate stays shut. The colleague is speech but too far below your level — shut. Only you open it.">
                <GateFigure />
              </Figure>
              <div className="hw-table-wrap">
                <table className="hw-table">
                  <thead><tr><th>Strength</th><th>t (open)</th><th>h (hard close)</th><th>hold</th><th>release ρ</th><th>p<sub>min</sub></th></tr></thead>
                  <tbody>
                    <tr><td>90–100 % (default 95)</td><td>0.75</td><td>0.65</td><td>30 ms</td><td>0.7 / frame</td><td>0.57–0.60</td></tr>
                    <tr><td>75–89 %</td><td>0.65</td><td>0.55</td><td>60 ms</td><td>0.8</td><td>0.53–0.57</td></tr>
                    <tr><td>50–74 %</td><td>0.50</td><td>0.40</td><td>100 ms</td><td>0.8</td><td>0.45–0.52</td></tr>
                    <tr><td>below 50 %</td><td>0.20–0.35</td><td>0.10–0.25</td><td>100–200 ms</td><td>0.9</td><td>0.30–0.45</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>Auto mode: learning the room and your voice</h3>
              <p>Without calibration, Noiseless keeps two running estimates. The room is the power average of frames that are not you:</p>
              <Tex block>{String.raw`N = \sqrt{\operatorname{mean}\{\,r^2 \;:\; p < 0.5 \ \lor\ r < \min(T,\ m\,V)\,\}},\qquad m = \tfrac12\ (\text{6 dB, at }\ge 90\%)`}</Tex>
              <p>and your voice is the median of frames that are confidently speech and well above the room:</p>
              <Tex block>{String.raw`V = \operatorname{median}\{\,r \;:\; p \ge 0.85,\ r > 4N\,\}\qquad (\text{until learned: } V = 10\,N,\ \text{i.e. } +20\text{ dB})`}</Tex>
              <p>
                Because the voice level is learned from what RNNoise calls speech — not from a fixed threshold — it
                works at any microphone gain, even when the browser's automatic gain is switched off.
              </p>
            </Section>

            <Section id="smooth" kicker="Stage 4 · Polish" title="Look-ahead, smooth gain and a soft limiter">
              <p>
                The gate's decision for a frame is applied to audio 30 ms older (three frames). That small delay
                lets the gate open <em>before</em> your first syllable instead of clipping it. Within each frame the
                gain glides linearly, so it never clicks:
              </p>
              <Tex block>{String.raw`y(n) = \operatorname{lim}\!\Big(\big[g_{k-1} + (g_k - g_{k-1})\tfrac{n+1}{480}\big]\;\hat s(n - 1440)\Big),\qquad g<0.01 \Rightarrow y=0`}</Tex>
              <p>A soft limiter keeps sudden shouts from clipping: linear up to τ, then a tanh knee that never exceeds full scale.</p>
              <Tex block>{String.raw`\operatorname{lim}(x) = \begin{cases} x & |x| \le \tau\\ \operatorname{sgn}(x)\big(\tau + (1-\tau)\tanh\frac{|x|-\tau}{1-\tau}\big) & |x| > \tau \end{cases}\qquad \tau = 0.92`}</Tex>
              <Figure caption="Limiter transfer curve.">
                <LimiterFigure />
              </Figure>
            </Section>

            <Section id="routing" kicker="Plumbing" title="Getting clean audio into the meeting">
              <div className="hw-cards">
                <div className="hw-card">
                  <h3>Windows app</h3>
                  <p>
                    The engine runs natively (RNNoise as WebAssembly in the wasmtime runtime) and plays the
                    cleaned audio into <b>VB-CABLE</b>, a virtual audio cable. While Noiseless runs, Windows' default
                    microphone is <b>"CABLE Output"</b>, so Zoom, Teams, Webex and browser calls pick it up from the
                    start. A watcher reads Windows' live audio sessions to notice meetings and to warn if an app is
                    using a microphone directly.
                  </p>
                </div>
                <div className="hw-card">
                  <h3>Chrome extension</h3>
                  <p>
                    The extension wraps the page's <code>getUserMedia</code>: it requests the raw microphone,
                    runs the same engine in an <b>AudioWorklet</b> (a real-time audio thread inside the browser) and
                    hands the meeting the processed track. No driver, no settings to change — it cleans whichever
                    microphone the meeting picks.
                  </p>
                </div>
              </div>
            </Section>

            <Section id="numbers" kicker="Measured" title="By the numbers">
              <p>From our test recordings (desktop engine, strength 95 %).</p>
              <div className="hw-numbers">
                <div><b>0 %</b><span>of mic-cable taps audible in a quiet room (the previous level-only engine let 100 % through)</span></div>
                <div><b>−0.6 dB</b><span>change in your speech level — your voice is kept as it is</span></div>
                <div><b>100 %</b><span>of output samples match the browser extension within 0.001</span></div>
                <div><b>~1.2 ms</b><span>of CPU for every 10 ms of audio in the desktop app</span></div>
              </div>
            </Section>

            <Section id="credits" kicker="Open source" title="Credits">
              <ul className="hw-credits">
                <li><b>RNNoise</b> — Jean-Marc Valin, Xiph.Org Foundation / Mozilla (BSD-3-Clause). J.-M. Valin, "A Hybrid DSP/Deep Learning Approach to Real-Time Full-Band Speech Enhancement", IEEE MMSP 2018.</li>
                <li><b>@jitsi/rnnoise-wasm</b> — RNNoise compiled to WebAssembly (Apache-2.0).</li>
                <li><b>wasmtime</b> — Bytecode Alliance WebAssembly runtime (Apache-2.0), used by the Windows app.</li>
                <li><b>VB-CABLE</b> — VB-Audio Software (V. Burel), the virtual audio cable used by the Windows app.</li>
                <li>Proximity gate, auto mode, meeting detection and apps: AI Automation Team, Arista Systems Pvt Ltd.</li>
              </ul>
              <a href="/#downloads" className="btn btn-primary hw-cta"><span className="btn-icon">↓</span> Get Noiseless</a>
            </Section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
