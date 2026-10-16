import * as THREE from 'three'
import { BG } from './shared.js'

/*
 * Destructive interference, at a glance: three ribbons.
 *   top     the noise in the room (warm) — built from the live input's frequency bands
 *   middle  what the call hears (the result) — built from the processed output's bands, so it
 *           flattens toward zero while Noiseless is on and only your voice is left
 *   bottom  the "anti-noise": the noise, inverted (cool) — it grows in as Noiseless switches on
 * Noise + anti-noise = silence; that is the idea the middle ribbon shows.
 */
const PTS = 240
const LANES = [
  { key: 'noise', y: 1.15, z: -0.25, core: 0xff6b8a, glow: 0xff4d6a },
  { key: 'result', y: 0, z: 0.25, core: 0xd8fff6, glow: 0x00ffd0 },
  { key: 'anti', y: -1.15, z: -0.25, core: 0x8fc8ff, glow: 0x4dabff },
]
// one fixed set of partials, so the noise and its inverse stay exactly in phase
const PARTIALS = Array.from({ length: 8 }, (_, k) => ({ f: 1.1 * Math.pow(k + 1, 1.28), w: 0.9 + k * 0.55, ph: Math.random() * Math.PI * 2 }))

function ribbon(width, color, opacity) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(PTS * 2 * 3)
  const side = new Float32Array(PTS * 2), along = new Float32Array(PTS * 2)
  const idx = []
  for (let i = 0; i < PTS; i++) {
    side[i * 2] = -1; side[i * 2 + 1] = 1
    along[i * 2] = along[i * 2 + 1] = i / (PTS - 1)
    if (i < PTS - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1))
  geo.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  geo.setIndex(idx)
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20)
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `attribute float aSide; attribute float aAlong; varying float vS; varying float vU;
      void main() { vS = aSide; vU = aAlong; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uOpacity; varying float vS; varying float vU;
      void main() {
        float edge = 1.0 - smoothstep(0.0, 1.0, abs(vS));
        float ends = smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.92, vU);
        float a = (0.35 + 0.65 * edge) * ends * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  })
  return { mesh: new THREE.Mesh(geo, mat), pos, width, mat }
}

export function mountWaves(canvas, source, { reduced = false, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2))
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace   // display colours as written
  renderer.setClearColor(new THREE.Color().setHex(BG, THREE.LinearSRGBColorSpace), 1)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, -0.35, 7)
  camera.lookAt(0, 0, 0)
  const root = new THREE.Group()
  root.rotation.x = -0.16
  scene.add(root)

  const lanes = LANES.map((l) => {
    const glow = ribbon(0.2, l.glow, 0.22)
    const core = ribbon(0.03, l.core, 1)
    const axis = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.006), new THREE.MeshBasicMaterial({ color: 0x1c2b33 }))
    axis.position.set(0, l.y, l.z - 0.01)
    root.add(axis, glow.mesh, core.mesh)
    return { ...l, glow, core, axis, ys: new Float32Array(PTS) }
  })

  let halfW = 3
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const visH = 2 * 7 * Math.tan((32 * Math.PI) / 360)
    halfW = (visH * camera.aspect) / 2 * 0.98
    lanes.forEach((l) => { l.axis.scale.x = halfW * 2 })
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  let tx = 0, px = 0
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2 }
  const onLeave = () => { tx = 0 }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)

  const write = (lane, rib, zWave) => {
    const p = rib.pos
    for (let i = 0; i < PTS; i++) {
      const x = -halfW + (i / (PTS - 1)) * halfW * 2
      const y = lane.y + lane.ys[i]
      const z = lane.z + zWave[i]
      // offset along the curve's normal so steep parts keep their width
      const i0 = Math.max(0, i - 1), i1 = Math.min(PTS - 1, i + 1)
      const dx = ((i1 - i0) / (PTS - 1)) * halfW * 2, dy = lane.ys[i1] - lane.ys[i0]
      const l = Math.hypot(dx, dy) || 1
      const nx = (-dy / l) * rib.width * 0.5, ny = (dx / l) * rib.width * 0.5
      p[i * 6] = x - nx; p[i * 6 + 1] = y - ny; p[i * 6 + 2] = z
      p[i * 6 + 3] = x + nx; p[i * 6 + 4] = y + ny; p[i * 6 + 5] = z
    }
    rib.mesh.geometry.attributes.position.needsUpdate = true
  }

  const zWave = new Float32Array(PTS)
  const noiseAmp = new Float32Array(8), outAmp = new Float32Array(8)
  let running = false, raf = 0, last = performance.now(), time = 0
  const speed = reduced ? 0.12 : 1

  const frame = () => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const f = source.getFrame()
    const calm = reduced ? (f.active ? 1 : 0) : f.calm
    time += dt * speed
    const cancel = calm * (0.55 + 0.45 * f.strength)
    for (let k = 0; k < 8; k++) {
      noiseAmp[k] += (f.inBands[k] - noiseAmp[k]) * 0.2
      outAmp[k] += (f.outBands[k] - outAmp[k]) * 0.2
    }
    const [noise, result, anti] = lanes
    for (let i = 0; i < PTS; i++) {
      const u = i / (PTS - 1), x = (u - 0.5) * 2
      let yn = 0, yo = 0
      for (let k = 0; k < 8; k++) {
        const P = PARTIALS[k]
        const s = Math.sin(P.f * x * 3.2 - time * P.w * 2.2 + P.ph)
        const a = 0.42 / (1 + k * 0.38)
        yn += s * noiseAmp[k] * a
        yo += s * outAmp[k] * a
      }
      // a little grit on the noise while nothing is cancelling it
      const grit = Math.sin(x * 61 + time * 23) * Math.sin(x * 37 - time * 17) * 0.05 * (1 - calm) * (0.4 + f.inLevel)
      noise.ys[i] = yn + grit
      anti.ys[i] = -(yn + grit) * cancel
      result.ys[i] = yo + grit * (1 - cancel)
      zWave[i] = Math.sin(x * 2.4 + time * 0.6) * 0.12
    }
    lanes.forEach((l) => { write(l, l.glow, zWave); write(l, l.core, zWave) })
    anti.core.mat.uniforms.uOpacity.value = 0.25 + 0.75 * cancel
    anti.glow.mat.uniforms.uOpacity.value = 0.22 * (0.3 + 0.7 * cancel)
    px += (tx - px) * 0.05
    root.rotation.y = px * 0.12
    renderer.render(scene, camera)
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
      renderer.dispose()
    },
  }
}
