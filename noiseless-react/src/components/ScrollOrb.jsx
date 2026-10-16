import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/*
 * The scroll journey: one field of particles that tells the Noiseless story as you scroll.
 *
 *   01 Noise    the hero: a turbulent storm of noise
 *   02 Signal   the proof: it unwinds into a jagged, noisy sound wave
 *   03 Model    the downloads: it assembles into the neural network, signals racing through its layers
 *   04 Voice    the setup guide: only a clean voice is left, a calm helix
 *   05 Silence  the footer: everything settles into one quiet ring
 *
 * Every particle has a place in each shape; scrolling morphs between them (staggered, swirling in flight).
 * Scrolling fast stirs the field and smears it into trails, the pointer pushes particles aside, a click
 * sends a shockwave through it, and the headline's slice calms the storm.
 */

// Ashima Arts / Stefan Gustavson 3D simplex noise (MIT)
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoise3(vec3 p){ return vec3(snoise(p), snoise(p + vec3(31.4, 17.0, -9.2)), snoise(p + vec3(-23.1, 47.7, 11.9))); }`

// additive light that never writes alpha (a transparent canvas would otherwise darken what's behind it)
const ADD_LIGHT = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
}

const FOV = 40
const CAM_Z = 7
const CHAPTERS = ['Noise', 'Signal', 'Model', 'Voice', 'Silence']

// per chapter: how noisy, how pink, how bright
const NOISE = [1, 0.32, 0.12, 0.03, 0]
const PINK = [0.85, 0.7, 0.12, 0, 0]
const FADE = [1, 0.9, 0.8, 0.9, 1]
const FADE_NARROW = [1, 0.8, 0.55, 0.45, 0.9]   // on phones the shapes sit behind the text
const GLOW = [0.9, 0.35, 0.45, 0.4, 0.8]

const lerp = (a, b, t) => a + (b - a) * t
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
const at = (arr, s) => { const i = Math.min(arr.length - 2, Math.floor(s)); return lerp(arr[i], arr[i + 1], s - i) }

// ── The five shapes (unit scale: about -1..1, the wave and network wider) ──
function buildShapes(N) {
  const R = Math.random
  const S = Array.from({ length: 5 }, () => new Float32Array(N * 3))
  const dir = () => { const u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(th), u, s * Math.sin(th)] }
  const put = (k, i, x, y, z) => { S[k][i * 3] = x; S[k][i * 3 + 1] = y; S[k][i * 3 + 2] = z }

  const RINGS = [
    { r: 1.42, e: new THREE.Euler(1.15, 0.2, 0.1), ph: 0.3 },
    { r: 1.62, e: new THREE.Euler(1.35, -0.55, 0.4), ph: 2.1 },
    { r: 1.82, e: new THREE.Euler(0.9, 0.7, -0.3), ph: 4.4 },
  ]

  // the network: five layers, like the GRU stack
  const LAYERS = [5, 8, 11, 8, 4]
  const nodes = LAYERS.map((n, l) => Array.from({ length: n }, (_, j) => [
    -1.7 + (l / (LAYERS.length - 1)) * 3.4,
    n === 1 ? 0 : -0.9 + (j / (n - 1)) * 1.8,
    Math.sin(j * 1.7 + l) * 0.18,
  ]))
  const edges = []
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (const a of nodes[l]) {
      const near = [...nodes[l + 1]].sort((p, q) => Math.abs(p[1] - a[1]) - Math.abs(q[1] - a[1])).slice(0, 3)
      for (const b of near) edges.push([a, b])
    }
    for (const b of nodes[l + 1]) {   // and every node has at least one input
      if (!edges.some((e) => e[1] === b)) edges.push([nodes[l].reduce((m, a) => (Math.abs(a[1] - b[1]) < Math.abs(m[1] - b[1]) ? a : m)), b])
    }
  }

  for (let i = 0; i < N; i++) {
    // 01 storm: a ragged shell plus flying debris
    {
      const q = R()
      if (q < 0.62) { const d = dir(), r = 1 + (R() - 0.5) * 0.1; put(0, i, d[0] * r, d[1] * r, d[2] * r) }
      else if (q < 0.86) {
        const ring = RINGS[i % 3], a = R() * Math.PI * 2
        const jag = Math.sin(a * 9 + ring.ph) * 0.05 + Math.sin(a * 23 + ring.ph * 2) * 0.035 + (R() - 0.5) * 0.04
        const v = new THREE.Vector3(Math.cos(a) * (ring.r + jag), Math.sin(a) * (ring.r + jag), (R() - 0.5) * 0.03).applyEuler(ring.e)
        put(0, i, v.x, v.y, v.z)
      } else { const d = dir(), r = 1.15 + R() * R() * 1.3; put(0, i, d[0] * r, d[1] * r, d[2] * r) }
    }

    // 02 noisy sound wave: seven jagged strands
    {
      const st = i % 7, u = R() * 2 - 1, x = u * 2.4
      const env = 0.3 + 0.7 * (1 - Math.abs(u) ** 3)
      let y = 0.42 * Math.sin(u * 7 + st) + 0.22 * Math.sin(u * 23 + st * 2.1) + 0.13 * Math.sin(u * 61 + st * 0.7)
      y = (y + (R() - 0.5) * 0.05) * env * 0.75
      if (R() < 0.05) y += (R() - 0.5) * 0.8 * env
      put(1, i, x, y, (st - 3) * 0.07 + (R() - 0.5) * 0.06)
    }

    // 03 network: nodes and the connections between neighbouring layers
    if (R() < 0.36) {
      const l = Math.floor(R() * LAYERS.length), n = nodes[l][Math.floor(R() * LAYERS[l])], d = dir(), r = 0.05 * Math.cbrt(R())
      put(2, i, n[0] + d[0] * r, n[1] + d[1] * r, n[2] + d[2] * r)
    } else {
      const [a, b] = edges[Math.floor(R() * edges.length)], t = R()
      put(2, i, lerp(a[0], b[0], t), lerp(a[1], b[1], t) + (R() - 0.5) * 0.006, lerp(a[2], b[2], t))
    }

    // 04 clean voice: a smooth double helix with rungs
    {
      const t = R() * 2 - 1, y = t * 1.5, rr = 0.34 * (0.65 + 0.35 * Math.cos(t * Math.PI * 0.5))
      if (R() < 0.16) {
        const tq = Math.round(t * 14) / 14, ang = tq * Math.PI * 4, s = R() * 2 - 1
        put(3, i, Math.cos(ang) * rr * s, tq * 1.5, Math.sin(ang) * rr * s)
      } else {
        const ang = t * Math.PI * 4 + (i % 2) * Math.PI, j = (R() - 0.5) * 0.025
        put(3, i, Math.cos(ang) * (rr + j), y + j, Math.sin(ang) * (rr + j))
      }
    }

    // 05 silence: one thin ring and a little dust
    if (R() < 0.88) { const a = R() * Math.PI * 2, r = 1 + (R() - 0.5) * 0.03; put(4, i, Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.04) }
    else { const a = R() * Math.PI * 2, r = 0.3 + R() * 1.1; put(4, i, Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.4) }
  }
  return S
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(0,255,208,0.42)')
  grd.addColorStop(0.35, 'rgba(0,212,170,0.16)')
  grd.addColorStop(0.7, 'rgba(77,171,255,0.04)')
  grd.addColorStop(0.95, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

export default function ScrollOrb() {
  const canvasRef = useRef(null)
  const railRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return undefined // no WebGL: the page still works without it
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
    camera.position.set(0, 0, CAM_Z)
    const holder = new THREE.Group()   // placed and scaled by scroll
    const group = new THREE.Group()    // tilted by the pointer
    holder.add(group)
    scene.add(holder)

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, ...ADD_LIGHT }))
    glow.scale.set(5, 5, 1)
    glow.position.z = -0.8
    holder.add(glow)

    // ── Particles ──
    const N = coarse ? 7000 : reduced ? 9000 : 16000
    const shapes = buildShapes(N)
    const seeds = new Float32Array(N * 4)
    for (let i = 0; i < N * 4; i++) seeds[i] = Math.random()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3))
    geo.setAttribute('aS1', new THREE.BufferAttribute(shapes[1], 3))
    geo.setAttribute('aS2', new THREE.BufferAttribute(shapes[2], 3))
    geo.setAttribute('aS3', new THREE.BufferAttribute(shapes[3], 3))
    geo.setAttribute('aS4', new THREE.BufferAttribute(shapes[4], 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10)

    const U = {
      uTime: { value: 0 }, uStage: { value: 0 }, uNoise: { value: 1 }, uPink: { value: 0.85 },
      uStir: { value: 0 }, uDir: { value: 1 }, uFade: { value: 1 }, uFlight: { value: reduced ? 0.25 : 1 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) }, uPointerAmt: { value: 0 },
      uShockO: { value: new THREE.Vector3() }, uShockT: { value: -10 },
      uPixel: { value: renderer.getPixelRatio() }, uSize: { value: 1 },
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      ...ADD_LIGHT,
      vertexShader: /* glsl */ `
        attribute vec3 aS1; attribute vec3 aS2; attribute vec3 aS3; attribute vec3 aS4; attribute vec4 aSeed;
        uniform float uTime, uStage, uNoise, uPink, uStir, uDir, uFade, uFlight, uPointerAmt, uShockT, uPixel, uSize;
        uniform vec3 uPointer, uShockO;
        varying vec3 vCol; varying float vA;
        ${SIMPLEX}
        vec3 shapeAt(float k) {
          if (k < 0.5) return position;
          if (k < 1.5) return aS1;
          if (k < 2.5) return aS2;
          if (k < 3.5) return aS3;
          return aS4;
        }
        vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
        void main() {
          float t = uTime;
          float s = clamp(uStage, 0.0, 4.0);
          float k = floor(min(s, 3.999));
          float f = s - k;
          // staggered morph: each particle leaves a little later than the one before
          float lf = smoothstep(0.0, 1.0, clamp((f - aSeed.x * 0.42) / 0.58, 0.0, 1.0));
          vec3 A = shapeAt(k), B = shapeAt(k + 1.0);

          // each shape's own motion
          float wStorm = clamp(1.0 - s, 0.0, 1.0);
          float wWave = clamp(1.0 - abs(s - 1.0), 0.0, 1.0);
          float wNet = clamp(1.0 - abs(s - 2.0), 0.0, 1.0);
          float wHelix = clamp(1.0 - abs(s - 3.0), 0.0, 1.0);
          float wRing = clamp(s - 3.0, 0.0, 1.0);
          vec3 p = mix(A, B, lf);
          p.xz = rot(p.xz, t * 0.22 * wStorm + t * 0.55 * wHelix);
          p.y += (sin(p.x * 4.6 - t * 2.6) * 0.06 + sin(p.x * 13.0 + t * 3.4) * 0.03) * wWave;
          p.xy *= 1.0 + sin(t * 1.1) * 0.02 * wRing;

          // in flight: a swirl through curl-like noise
          float fly = sin(3.14159 * lf) * uFlight;
          p += snoise3(p * 0.7 + vec3(0.0, t * 0.25, aSeed.w * 3.0)) * fly * 0.75;
          p.xz = rot(p.xz, fly * (aSeed.w - 0.5) * 2.4);

          // noise turbulence: the noisy chapters shiver, stirring makes everything shiver
          float turb = uNoise + uStir * 0.7;
          p += snoise3(p * 1.7 + vec3(t * 0.55, -t * 0.4, t * 0.3)) * turb * (0.17 + 0.1 * wStorm);

          // scroll trails: particles smear along the direction of travel
          p.y += uStir * uDir * (0.2 + aSeed.y * aSeed.y * 1.7);

          // the pointer pushes particles away
          vec2 dp = p.xy - uPointer.xy;
          float r2 = dot(dp, dp);
          p.xy += normalize(dp + 1e-5) * exp(-r2 * 5.0) * 0.42 * uPointerAmt;

          // click shockwave
          float age = t - uShockT;
          vec2 ds = p.xy - uShockO.xy;
          float rs = length(ds);
          float shock = exp(-pow((rs - age * 2.4) * 4.0, 2.0)) * exp(-age * 1.4) * step(0.0, age);
          p.xy += normalize(ds + 1e-5) * shock * 0.3;

          // colour: noise is pink and violet, signal is teal, mint and blue
          vec3 pink = mix(vec3(1.0, 0.33, 0.52), vec3(0.62, 0.36, 1.0), aSeed.z);
          vec3 clean = mix(vec3(0.0, 0.86, 0.7), vec3(0.3, 0.68, 1.0), aSeed.z * aSeed.z);
          vec3 col = mix(clean, pink, clamp(uPink + uStir * 0.25, 0.0, 1.0));
          // data racing through the model's layers
          float flow = smoothstep(0.86, 1.0, sin(B.x * 3.2 - t * 3.4 + B.y * 0.6) * 0.5 + 0.5) * wNet;
          col += vec3(0.5, 1.0, 0.9) * flow * 1.4;
          col += vec3(0.6, 1.0, 0.95) * shock * 2.0;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float tw = 0.55 + 0.45 * sin(t * (1.0 + aSeed.w * 2.0) + aSeed.x * 40.0);
          vA = (0.3 + 0.7 * tw) * uFade * (1.0 + flow) * (1.0 + 0.7 * wStorm);
          vCol = col;
          gl_PointSize = (0.9 + aSeed.y * 2.3 + flow * 1.5 + fly * 1.2 + wStorm * 0.9) * uPixel * uSize * (${CAM_Z.toFixed(1)} / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = (smoothstep(0.5, 0.0, d) * 0.6 + smoothstep(0.18, 0.0, d) * 0.6) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vCol, a);
        }`,
    })
    group.add(new THREE.Points(geo, mat))

    // ── Where each chapter happens (scroll keyframes) and where it sits on screen ──
    const vw = () => window.innerWidth
    const vh = () => window.innerHeight
    const narrow = () => vw() < 960
    const anchorState = () => {
      const a = document.querySelector('[data-orb-anchor]')
      if (!a) return { x: 0.72, y: 0.5, d: 0.6 }
      const r = a.getBoundingClientRect()
      return { x: (r.left + r.width / 2) / vw(), y: (r.top + r.height / 2) / vh(), d: (r.width / vh()) * 0.62 }
    }
    const PLACES = () => narrow()
      ? [null, { x: 0.5, y: 0.3, d: 0.42 }, { x: 0.5, y: 0.5, d: 0.42 }, { x: 0.86, y: 0.5, d: 0.5 }, { x: 0.5, y: 0.34, d: 0.5 }]
      : [null, { x: 0.5, y: 0.3, d: 0.55 }, { x: 0.5, y: 0.58, d: 0.78 }, { x: 0.935, y: 0.52, d: 0.78 }, { x: 0.5, y: 0.37, d: 0.56 }]
    let keys = [0, 1, 2, 3, 4]
    const keysFor = () => {
      const end = Math.max(1, document.documentElement.scrollHeight - vh())
      const k = [0]
      for (const sel of ['#proof', '#downloads', '#setup']) {
        const el = document.querySelector(sel)
        let y = k[k.length - 1] + vh()
        if (el) {
          const r = el.getBoundingClientRect(), top = r.top + window.scrollY
          // the wave forms while the proof card is still coming up from below
          y = sel === '#proof' ? top - vh() * 0.45 : Math.min(top + r.height / 2 - vh() / 2, top + vh() * 0.1)
        }
        k.push(Math.min(end - 1, Math.max(k[k.length - 1] + 1, y)))
      }
      k.push(Math.max(end, k[k.length - 1] + 1))
      return k
    }
    const stageAt = (y) => {
      let i = 0
      while (i < keys.length - 2 && y > keys[i + 1]) i++
      const from = Math.max(keys[i], keys[i + 1] - vh() * 1.5)
      const local = (y - from) / (keys[i + 1] - from)
      return Math.min(4, i + smooth(0.12, 0.88, local))
    }

    // ── Input ──
    let stir = 0, scrollV = 0, dir = 1, lastY = window.scrollY, lastT = performance.now()
    let px = -1, py = -1, pointerAmt = 0, calmUntil = 0
    let mx = 0, my = 0, tmx = 0, tmy = 0
    const clock = new THREE.Clock()
    const onScroll = () => {
      const now = performance.now()
      const dy = window.scrollY - lastY
      const v = (Math.abs(dy) / Math.max(1, now - lastT)) * 1000
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1
      scrollV = Math.max(scrollV * 0.6, v)
      lastY = window.scrollY
      lastT = now
    }
    const onMove = (e) => { px = e.clientX; py = e.clientY; tmx = (px / vw() - 0.5) * 2; tmy = (py / vh() - 0.5) * 2 }
    const onLeave = () => { px = py = -1 }
    const toLocal = (cx, cy) => {
      const worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
      const v = new THREE.Vector3((cx / vw() - 0.5) * worldH * camera.aspect, -(cy / vh() - 0.5) * worldH, 0)
      group.updateMatrixWorld()
      return group.worldToLocal(v)
    }
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('a, button, input, select, textarea, video, [role="tab"], [role="slider"]')) return
      U.uShockO.value.copy(toLocal(e.clientX, e.clientY))
      U.uShockT.value = U.uTime.value
    }
    const onCut = () => {
      calmUntil = clock.getElapsedTime() + 2.6
      U.uShockO.value.set(0, 0, 0)
      U.uShockT.value = U.uTime.value
    }
    const onResize = () => {
      renderer.setSize(vw(), vh(), false)
      camera.aspect = vw() / vh()
      camera.updateProjectionMatrix()
      keys = keysFor()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('noiseless:cut', onCut)
    window.addEventListener('resize', onResize)
    onResize()
    const rekey = setInterval(() => { keys = keysFor() }, 1500)   // layout settles as fonts and media load

    // chapter rail: jump to a chapter
    const rail = railRef.current
    const items = rail ? [...rail.querySelectorAll('[data-ch]')] : []
    const fill = rail ? rail.querySelector('.journey-fill') : null
    const onRail = (e) => {
      const b = e.target.closest('[data-ch]')
      if (!b) return
      window.scrollTo({ top: keys[+b.dataset.ch], behavior: reduced ? 'auto' : 'smooth' })
    }
    rail?.addEventListener('click', onRail)
    let lastCh = -1

    let raf
    let last = 0
    let noise = 1
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const t = clock.getElapsedTime()
      const dt = Math.min(0.05, t - last)
      last = t

      const y = window.scrollY
      const s = stageAt(y)
      const i = Math.min(3, Math.floor(s)), f = s - i
      const places = PLACES()
      const pa = i === 0 ? anchorState() : places[i]
      const pb = places[i + 1]
      // the shape travels on screen at the same pace it morphs
      const sx = lerp(pa.x, pb.x, f), sy = lerp(pa.y, pb.y, f), sd = lerp(pa.d, pb.d, f)
      const worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
      holder.position.set((sx - 0.5) * worldH * camera.aspect, -(sy - 0.5) * worldH, 0)
      const scale = (sd * worldH) / 2
      holder.scale.setScalar(scale)
      U.uSize.value = Math.min(1.5, Math.max(0.75, Math.sqrt(scale / 1.4)))

      // scroll speed -> stir (rises fast, settles in about half a second)
      scrollV *= Math.pow(0.03, dt)
      const target = Math.min(1, scrollV / 2600)
      stir += (target - stir) * Math.min(1, dt * (target > stir ? 10 : 3))
      U.uStir.value = reduced ? stir * 0.3 : stir
      U.uDir.value += (dir - U.uDir.value) * Math.min(1, dt * 4)

      const calmNow = t < calmUntil ? 0.12 : 1
      const noiseTarget = at(NOISE, s) * calmNow
      noise += (noiseTarget - noise) * Math.min(1, dt * (noiseTarget < noise ? 3 : 1.5))
      U.uNoise.value = noise
      U.uPink.value = at(PINK, s) * (t < calmUntil ? 0.35 : 1)
      U.uFade.value = at(narrow() ? FADE_NARROW : FADE, s)
      U.uStage.value = s
      U.uTime.value += dt * (reduced ? 0.35 : 1) * (1 + stir * 0.8)
      glow.material.opacity = at(GLOW, s) * (0.7 + 0.3 * (1 - noise))

      // pointer: push particles aside, the hero storm shows it can be touched
      let near = false
      if (px >= 0 && !coarse) {
        const lp = toLocal(px, py)
        U.uPointer.value.copy(lp)
        near = Math.hypot(lp.x, lp.y) < 1.5
      }
      pointerAmt += ((near ? 1 : 0) - pointerAmt) * Math.min(1, dt * 5)
      U.uPointerAmt.value = pointerAmt
      document.body.classList.toggle('orb-hover', near && s < 0.5)

      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      group.rotation.y = mx * 0.28
      group.rotation.x = my * 0.18 + Math.sin(t * 0.2) * 0.04
      group.rotation.z = Math.sin(s * Math.PI) * 0.06

      // rail
      const ch = Math.round(s)
      if (ch !== lastCh) { lastCh = ch; items.forEach((el, k) => el.classList.toggle('on', k === ch)) }
      if (fill) fill.style.transform = `scaleY(${s / 4})`

      renderer.render(scene, camera)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(rekey)
      rail?.removeEventListener('click', onRail)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('noiseless:cut', onCut)
      window.removeEventListener('resize', onResize)
      document.body.classList.remove('orb-hover')
      geo.dispose(); mat.dispose()
      glow.material.map.dispose(); glow.material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <>
      <canvas id="orb-canvas" ref={canvasRef} aria-hidden="true" />
      <nav className="journey" ref={railRef} aria-label="Page journey">
        <div className="journey-track"><div className="journey-fill" /></div>
        {CHAPTERS.map((c, k) => (
          <button type="button" key={c} data-ch={k} className={k === 0 ? 'on' : ''}>
            <i />
            <span><small>0{k + 1}</small>{c}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
