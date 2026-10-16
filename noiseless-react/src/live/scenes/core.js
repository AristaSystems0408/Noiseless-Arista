import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { SIMPLEX, BG } from './shared.js'

/*
 * The live core: three things in one scene, all driven by source.getFrame().
 *   • the noise field: particles drifting chaotically; with Noiseless on they are pulled into a calm,
 *     slowly turning ring (and scatter back out when it is switched off)
 *   • the blob: its surface shakes with the sound's frequency bands — the room's sound while Noiseless
 *     is off, the processed sound while it is on, so it visibly goes calm
 *   • the gauge: a ring around it that fills with the measured reduction (0 to 50 dB)
 */
export function mountCore(canvas, source, { reduced = false, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))
  // the shaders write display colours directly, so nothing is colour-converted on the way to the screen
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setClearColor(new THREE.Color().setHex(BG, THREE.LinearSRGBColorSpace), 1)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
  camera.position.set(0, 0, 8.2)
  const root = new THREE.Group()
  scene.add(root)

  const bandsU = { value: new Float32Array(8) }
  const U = {
    uTime: { value: 0 }, uCalm: { value: 0 }, uLevel: { value: 0 }, uBands: bandsU, uStrength: { value: 0.85 },
  }

  // ── the blob ──
  const blobMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      uniform float uTime, uCalm, uLevel; uniform float uBands[8];
      varying vec3 vN; varying vec3 vView; varying float vE; varying float vD;
      ${SIMPLEX}
      float bandAt(float y) {
        float f = clamp((y * 0.5 + 0.5) * 7.0, 0.0, 7.0);
        int i = int(floor(f)); float t = fract(f);
        float a = 0.0, b = 0.0;
        for (int k = 0; k < 8; k++) { if (k == i) a = uBands[k]; if (k == i + 1) b = uBands[k]; }
        if (i >= 7) b = a;
        return mix(a, b, t);
      }
      void main() {
        vec3 dir = normalize(position);
        float e = bandAt(dir.y);
        float jit = 1.0 - uCalm;
        float d = snoise(dir * 1.8 + vec3(0.0, uTime * 0.5, 0.0)) * (0.05 + e * 0.32)
                + snoise(dir * 4.6 + vec3(uTime * 1.3, 0.0, uTime)) * e * (0.12 + 0.18 * jit)
                + snoise(dir * 11.0 + uTime * 3.0) * e * 0.07 * jit;
        vE = e; vD = d;
        vec3 p = position + normal * d;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vView = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCalm; varying vec3 vN; varying vec3 vView; varying float vE; varying float vD;
      void main() {
        vec3 N = normalize(cross(dFdx(-vView), dFdy(-vView)));
        vec3 V = normalize(vView);
        float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.2);
        vec3 warm = vec3(1.0, 0.36, 0.5), cool = vec3(0.0, 0.85, 0.7), blue = vec3(0.3, 0.66, 1.0);
        vec3 rim = mix(mix(cool, blue, 0.4), warm, smoothstep(0.08, 0.45, vE) * (1.0 - uCalm * 0.85));
        float diff = max(dot(N, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
        vec3 col = vec3(0.01, 0.025, 0.04) + rim * (0.1 + diff * 0.2) + rim * fres * 1.35;
        col += rim * smoothstep(0.1, 0.3, vD) * 0.5;
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1, mobile ? 28 : 48), blobMat)
  root.add(blob)

  // ── the noise field ──
  const N = mobile ? 1600 : 3600
  const chaos = new Float32Array(N * 3), ring = new Float32Array(N * 3), seed = new Float32Array(N * 4)
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 1.7 + Math.random() * 1.9
    chaos[i * 3] = s * Math.cos(th) * r * 1.35; chaos[i * 3 + 1] = u * r * 0.85; chaos[i * 3 + 2] = s * Math.sin(th) * r
    const a = Math.random() * Math.PI * 2, rr = 2.05 + (Math.random() - 0.5) * 0.16 + (Math.random() < 0.15 ? Math.random() * 0.5 : 0)
    ring[i * 3] = Math.cos(a) * rr; ring[i * 3 + 1] = (Math.random() - 0.5) * 0.05; ring[i * 3 + 2] = Math.sin(a) * rr
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random()
  }
  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(chaos, 3))
  pGeo.setAttribute('aRing', new THREE.BufferAttribute(ring, 3))
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8)
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uPixel: { value: renderer.getPixelRatio() } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aRing; attribute vec4 aSeed;
      uniform float uTime, uCalm, uLevel, uPixel;
      varying vec3 vCol; varying float vA;
      ${SIMPLEX}
      vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
      void main() {
        float k = smoothstep(aSeed.x * 0.35, 0.65 + aSeed.x * 0.35, uCalm);    // staggered pull-in
        vec3 c = position;
        c += vec3(snoise(c * 0.6 + uTime * 0.25), snoise(c * 0.6 + 7.0 + uTime * 0.25), snoise(c * 0.6 - 5.0 + uTime * 0.25)) * (0.35 + uLevel * 0.6);
        c += vec3(snoise(c * 3.0 + uTime * 2.5), snoise(c * 3.0 + 3.0 + uTime * 2.5), 0.0) * 0.08 * (0.4 + uLevel);  // jitter
        vec3 r = aRing; r.xz = rot(r.xz, uTime * 0.18 + aSeed.y * 0.02);
        vec3 p = mix(c, r, k);
        p += normalize(p) * sin(3.14159 * k) * 0.5;                                // a breath outward in flight
        p.yz = rot(p.yz, 0.42 * k);                                                // the ring tilts toward you
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 warm = mix(vec3(1.0, 0.35, 0.52), vec3(0.62, 0.38, 1.0), aSeed.z);
        vec3 cool = mix(vec3(0.0, 0.86, 0.7), vec3(0.3, 0.68, 1.0), aSeed.z);
        vCol = mix(warm, cool, k);
        vA = (0.35 + 0.65 * aSeed.w) * (0.55 + 0.45 * sin(uTime * (1.0 + aSeed.y * 3.0) + aSeed.x * 30.0)) * mix(0.75 + uLevel * 0.6, 0.8, k);
        gl_PointSize = (1.2 + aSeed.y * 2.2) * uPixel * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol * a, a);
      }`,
  })
  root.add(new THREE.Points(pGeo, pMat))

  // ── the gauge: a track and a fill that grows clockwise from the top ──
  const gaugeR = 1.5
  const track = new THREE.Mesh(new THREE.TorusGeometry(gaugeR, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0x1b2a33 }))
  const fillU = { uFill: { value: 0 }, uTime: U.uTime }
  const fill = new THREE.Mesh(new THREE.TorusGeometry(gaugeR, 0.03, 12, 200), new THREE.ShaderMaterial({
    uniforms: fillU, transparent: true,
    vertexShader: /* glsl */ `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uFill, uTime; varying vec3 vP;
      void main() {
        float a = atan(vP.x, vP.y);                 // 0 at the top, clockwise
        float f = (a < 0.0 ? a + 6.28318 : a) / 6.28318;
        if (f > uFill) discard;
        vec3 col = mix(vec3(0.0, 0.83, 0.67), vec3(0.3, 0.68, 1.0), f);
        float head = smoothstep(uFill - 0.03, uFill, f);
        col += vec3(0.8) * head;
        gl_FragColor = vec4(col * (1.1 + 0.15 * sin(uTime * 2.0)), 1.0);
      }`,
  }))
  const ticks = new THREE.Group()
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2, big = i % 10 === 0
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.008, big ? 0.09 : 0.045), new THREE.MeshBasicMaterial({ color: big ? 0x3a5560 : 0x22343c }))
    m.position.set(Math.sin(a) * (gaugeR + 0.1), Math.cos(a) * (gaugeR + 0.1), 0)
    m.rotation.z = -a
    ticks.add(m)
  }
  const gauge = new THREE.Group()
  gauge.add(track, fill, ticks)
  scene.add(gauge)          // the gauge faces you; it isn't tilted with the field

  // ── restrained bloom ──
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.45, 0.42)
  composer.addPass(bloom)

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
    bloom.resolution.set(w / 2, h / 2)
    camera.aspect = w / h
    // keep the whole ring in view on narrow canvases
    camera.position.z = w / h < 1 ? 8.2 / Math.max(0.62, w / h) : 8.2
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // pointer parallax
  let px = 0, py = 0, tx = 0, ty = 0
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2
  }
  const onLeave = () => { tx = ty = 0 }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)

  let running = false, raf = 0, last = performance.now(), time = 0, fillV = 0
  const speed = reduced ? 0.12 : 1
  const frame = () => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const f = source.getFrame()
    const calm = reduced ? (f.active ? 1 : 0) : f.calm
    // calm motion when on, jittery when off
    time += dt * speed * (1 + (1 - calm) * 0.6)
    U.uTime.value = time
    U.uCalm.value = calm
    U.uStrength.value = f.strength
    const bands = calm > 0.5 ? f.outBands : f.inBands
    for (let i = 0; i < 8; i++) bandsU.value[i] = bands[i]
    U.uLevel.value = f.inLevel
    fillV += (Math.min(1, f.reductionDb / 50) - fillV) * Math.min(1, dt * 4)
    fillU.uFill.value = fillV
    blob.scale.setScalar(0.95 + (calm > 0.5 ? f.outLevel : f.inLevel) * 0.12)
    px += (tx - px) * 0.05; py += (ty - py) * 0.05
    root.rotation.y = px * 0.35 + (reduced ? 0 : time * 0.05)
    root.rotation.x = py * 0.2
    gauge.rotation.y = px * 0.12
    gauge.rotation.x = py * 0.08
    composer.render()
  }

  return {
    setRunning(on) {
      if (on === running) return
      running = on
      if (on) { last = performance.now(); frame() } else cancelAnimationFrame(raf)
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose() })
      composer.dispose()
      renderer.dispose()
    },
  }
}
