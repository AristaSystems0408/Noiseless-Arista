import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/*
 * The noise orb as a scroll companion (one fixed, full-screen canvas between the background and the content).
 *
 *  • Where it is: it starts in the hero's orb slot, grows into a big ghosted glow behind the downloads,
 *    rides the right edge through the setup guide, and settles, calm, above the footer.
 *  • How noisy it is: each section has a base level (noisy hero → silent footer); scrolling fast stirs
 *    the noise up, stopping lets Noiseless calm it. The headline's slice, hovering and clicking calm it too.
 *  • Touch: the surface dents where the pointer meets it; a click sends a shockwave ripple outward.
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
}`

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
const ORB_SPAN = 4.6          // world size of orb + rings, used to map "diameter in px" to scale

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(0,255,208,0.55)')
  grd.addColorStop(0.35, 'rgba(0,212,170,0.22)')
  grd.addColorStop(0.68, 'rgba(77,171,255,0.05)')
  grd.addColorStop(0.92, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * (3 - 2 * t)

export default function ScrollOrb() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return undefined // no WebGL: the page still works without the orb
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
    camera.position.set(0, 0, CAM_Z)

    const holder = new THREE.Group()   // placed and scaled by scroll
    const group = new THREE.Group()    // spun by time / pointer
    holder.add(group)
    scene.add(holder)

    // ── Orb ──
    const uniforms = {
      uTime: { value: 0 },
      uChaos: { value: 1 },
      uPulse: { value: 1 },
      uPointerDir: { value: new THREE.Vector3(0, 0, 1) },
      uPointerAmt: { value: 0 },
      uFade: { value: 1 },
    }
    const orbMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uChaos; uniform float uPulse;
        uniform vec3 uPointerDir; uniform float uPointerAmt;
        varying vec3 vPos; varying float vDisp; varying vec3 vObj; varying vec3 vNrm;
        ${SIMPLEX}
        void main() {
          vec3 p = position;
          float n1 = snoise(p * 1.4 + vec3(0.0, uTime * 0.32, 0.0));
          float n2 = snoise(p * 3.6 + vec3(uTime * 0.85, 0.0, uTime * 0.55));
          float n3 = snoise(p * 8.0 + vec3(0.0, uTime * 1.9, 0.0));
          float noisy = n1 * 0.55 + n2 * 0.32 + n3 * 0.13;
          float clean = sin(p.y * 5.0 - uTime * 1.4) * 0.5 + 0.5;
          float d = mix(clean * 0.05, noisy * 0.36, uChaos);
          // the Noiseless pulse: a bright shell sweeping up the surface
          d += exp(-pow((p.y + 1.2 - uPulse * 2.6) * 3.2, 2.0)) * (1.0 - uPulse) * 0.10;
          // the pointer presses the surface in, with a soft raised rim around the dent
          float pd = dot(normalize(p), uPointerDir);
          d += (-smoothstep(0.82, 1.0, pd) * 0.26 + smoothstep(0.6, 0.82, pd) * (1.0 - smoothstep(0.82, 0.95, pd)) * 0.07) * uPointerAmt;
          vDisp = d; vObj = p; vNrm = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(p + normal * d, 1.0);
          vPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uChaos; uniform float uFade; uniform float uPointerAmt; uniform vec3 uPointerDir;
        varying vec3 vPos; varying float vDisp; varying vec3 vObj; varying vec3 vNrm;
        void main() {
          vec3 Nd = normalize(cross(dFdx(vPos), dFdy(vPos)));
          vec3 N = normalize(mix(normalize(vNrm), Nd, clamp(uChaos * 1.2, 0.15, 1.0)));
          vec3 V = normalize(-vPos);
          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
          vec3 teal = vec3(0.0, 0.83, 0.67), mint = vec3(0.0, 1.0, 0.82), blue = vec3(0.30, 0.67, 1.0);
          vec3 pink = vec3(1.0, 0.36, 0.52), deep = vec3(0.012, 0.03, 0.06);
          vec3 rim = mix(mix(teal, blue, 0.5 + 0.5 * vObj.y), pink, smoothstep(0.06, 0.32, vDisp) * uChaos);
          vec3 L = normalize(vec3(0.5, 0.9, 0.6));
          float diff = max(dot(N, L), 0.0);
          float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0) * (0.35 + 0.65 * uChaos);
          vec3 col = deep + rim * (0.16 + diff * 0.22) + rim * fres * 1.55 + vec3(spec) * 0.85;
          float bands = smoothstep(0.92, 1.0, sin(vObj.y * 46.0 + vDisp * 30.0) * 0.5 + 0.5) * (0.25 + 0.5 * (1.0 - uChaos));
          col += mint * bands * 0.35;
          // where the pointer touches, the surface glows
          col += mint * smoothstep(0.86, 1.0, dot(normalize(vObj), uPointerDir)) * uPointerAmt * 0.5;
          gl_FragColor = vec4(col, uFade);
        }`,
    })
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, coarse ? 40 : 56), orbMat)
    group.add(orb)

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, ...ADD_LIGHT }))
    glow.scale.set(4.9, 4.9, 1)
    glow.position.z = -0.6
    holder.add(glow)

    // ── Waveform rings ──
    const RING_POINTS = 640
    const rings = [
      { r: 1.62, tilt: [1.15, 0.2, 0.1], k: 9, color: 0x00ffd0, speed: 0.6 },
      { r: 1.86, tilt: [1.35, -0.55, 0.4], k: 6, color: 0x4dabff, speed: -0.45 },
      { r: 2.1, tilt: [0.9, 0.7, -0.3], k: 12, color: 0x00d4aa, speed: 0.35 },
    ].map((cfg) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_POINTS * 3), 3))
      const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.75, depthWrite: false, ...ADD_LIGHT }))
      line.rotation.set(...cfg.tilt)
      group.add(line)
      return { ...cfg, line, geo, phases: Array.from({ length: 7 }, () => Math.random() * Math.PI * 2) }
    })

    // ── Shockwave ripples (click) ──
    const ripples = Array.from({ length: 4 }, () => {
      const geo = new THREE.BufferGeometry()
      const pts = new Float32Array(160 * 3)
      for (let i = 0; i < 160; i++) { const a = (i / 160) * Math.PI * 2; pts[i * 3] = Math.cos(a); pts[i * 3 + 1] = Math.sin(a) }
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0x00ffd0, transparent: true, opacity: 0, depthWrite: false, ...ADD_LIGHT }))
      line.visible = false
      holder.add(line)
      return { line, start: -10 }
    })
    let rippleIdx = 0

    // ── Noise particles ──
    const P = reduced || coarse ? 600 : 1400
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(P * 3)
    const pSeed = new Float32Array(P)
    for (let i = 0; i < P; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rad = 1.5 + Math.random() * 1.6, s = Math.sqrt(1 - u * u)
      pPos[i * 3] = rad * s * Math.cos(th); pPos[i * 3 + 1] = rad * u; pPos[i * 3 + 2] = rad * s * Math.sin(th)
      pSeed[i] = Math.random() * 10
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1))
    const pMat = new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uChaos: uniforms.uChaos, uFade: uniforms.uFade, uPixel: { value: renderer.getPixelRatio() }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uChaos; uniform float uPixel; uniform float uScale;
        varying float vA; varying float vC;
        void main() {
          vec3 p = position;
          float jitter = sin(uTime * 3.0 + aSeed * 7.0) * 0.08 * uChaos;
          p *= 1.0 + jitter + (1.0 - uChaos) * 0.12;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (0.35 + 0.65 * uChaos) * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed));
          vC = fract(aSeed * 0.37);
          gl_PointSize = (1.4 + 2.2 * fract(aSeed)) * uPixel * uScale * (6.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uChaos; uniform float uFade; varying float vA; varying float vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uFade;
          if (a < 0.01) discard;
          vec3 noiseCol = mix(vec3(1.0, 0.36, 0.52), vec3(0.6, 0.35, 1.0), vC);
          gl_FragColor = vec4(mix(vec3(0.0, 0.83, 0.67), noiseCol, uChaos), a);
        }`,
      transparent: true, depthWrite: false, ...ADD_LIGHT,
    })
    group.add(new THREE.Points(pGeo, pMat))

    // ── Scroll choreography: viewport-space stops (x, y as 0..1 of the viewport, d = diameter / height) ──
    const vw = () => window.innerWidth
    const vh = () => window.innerHeight
    const anchorState = () => {
      const a = document.querySelector('[data-orb-anchor]')
      if (!a) return { x: 0.72, y: 0.5, d: 0.7 }
      const r = a.getBoundingClientRect()
      return { x: (r.left + r.width / 2) / vw(), y: (r.top + r.height / 2) / vh(), d: r.width / vh() }
    }
    const narrow = () => vw() < 960
    const stopsFor = () => {
      const top = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null }
      const dl = top('#downloads'), st = top('#setup')
      const end = document.documentElement.scrollHeight - vh()
      const list = [{ at: 0, state: 'anchor', base: 1, fade: 1 }]
      if (dl != null) list.push({ at: dl - vh() * 0.25, state: narrow() ? { x: 0.88, y: 0.12, d: 0.24 } : { x: 0.5, y: 0.62, d: 1.15 }, base: 0.55, fade: narrow() ? 0.5 : 0.28 })
      if (st != null) list.push({ at: st - vh() * 0.1, state: narrow() ? { x: 0.9, y: 0.16, d: 0.26 } : { x: 0.955, y: 0.52, d: 0.42 }, base: 0.3, fade: 0.8 })
      list.push({ at: Math.max(end - vh() * 0.15, (list[list.length - 1].at || 0) + 1), state: narrow() ? { x: 0.5, y: 0.3, d: 0.36 } : { x: 0.5, y: 0.34, d: 0.5 }, base: 0.0, fade: 1 })
      return list
    }
    let stops = stopsFor()

    // ── Input ──
    let chaos = 1, calmUntil = 0, pulseStart = -10, lastStop = 0
    let scrollV = 0, lastScrollY = window.scrollY, lastScrollT = performance.now()
    let px = -1, py = -1, pointerAmt = 0
    const pointerDir = new THREE.Vector3(0, 0, 1)
    let mx = 0, my = 0, tmx = 0, tmy = 0
    let hover = false
    const clock = new THREE.Clock()

    const calm = (seconds) => {
      const now = clock.getElapsedTime()
      calmUntil = Math.max(calmUntil, now + seconds)
      if (now - pulseStart > 1.0) pulseStart = now
    }
    const pulse = () => { const now = clock.getElapsedTime(); if (now - pulseStart > 1.0) pulseStart = now }
    const onCut = () => calm(2.6)
    const onScroll = () => {
      const now = performance.now()
      const dt = Math.max(1, now - lastScrollT)
      const v = Math.abs(window.scrollY - lastScrollY) / dt * 1000   // px / s
      scrollV = Math.max(scrollV * 0.6, v)
      lastScrollY = window.scrollY
      lastScrollT = now
    }
    const onMove = (e) => {
      px = e.clientX; py = e.clientY
      tmx = (e.clientX / vw() - 0.5) * 2
      tmy = (e.clientY / vh() - 0.5) * 2
    }
    const onLeaveWindow = () => { px = py = -1 }
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('a, button, input, select, textarea, [role="tab"]')) return
      const rp = ripples[rippleIdx++ % ripples.length]
      rp.start = clock.getElapsedTime()
      rp.line.visible = true
      calm(1.6)
    }
    const onResize = () => {
      renderer.setSize(vw(), vh(), false)
      camera.aspect = vw() / vh()
      camera.updateProjectionMatrix()
      stops = stopsFor()
    }
    window.addEventListener('noiseless:cut', onCut)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeaveWindow)
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('resize', onResize)
    onResize()
    // layout settles after fonts/images load
    const restop = setInterval(() => { stops = stopsFor() }, 1500)

    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hitSphere = new THREE.Sphere(new THREE.Vector3(), 1.05)
    const inv = new THREE.Matrix4()
    const hit = new THREE.Vector3()

    let raf
    let last = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const t = clock.getElapsedTime()
      const dt = Math.min(0.05, t - last)
      last = t
      const speed = reduced ? 0.35 : 1

      // where am I in the choreography?
      const y = window.scrollY
      let i = 0
      while (i < stops.length - 2 && y > stops[i + 1].at) i++
      const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)]
      const f = b.at > a.at ? ease(Math.min(1, Math.max(0, (y - a.at) / (b.at - a.at)))) : 0
      const sa = a.state === 'anchor' ? anchorState() : a.state
      const sb = b.state === 'anchor' ? anchorState() : b.state
      const sx = lerp(sa.x, sb.x, f), sy = lerp(sa.y, sb.y, f), sd = lerp(sa.d, sb.d, f)
      const base = lerp(a.base, b.base, f)
      const fade = lerp(a.fade, b.fade, f)
      const stopNow = f > 0.5 ? i + 1 : i
      if (stopNow !== lastStop) { lastStop = stopNow; pulse() }   // a light sweep as you enter each section (doesn't calm the stir)

      // viewport -> world (at z = 0)
      const worldH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)
      const worldW = worldH * camera.aspect
      holder.position.set((sx - 0.5) * worldW, -(sy - 0.5) * worldH, 0)
      const scale = (sd * worldH) / ORB_SPAN
      holder.scale.setScalar(scale)
      pMat.uniforms.uScale.value = scale

      // pointer: dent where it meets the orb, hover calms
      hover = false
      if (px >= 0 && !coarse) {
        ndc.set((px / vw()) * 2 - 1, -(py / vh()) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        orb.updateMatrixWorld()
        inv.copy(orb.matrixWorld).invert()
        const ray = raycaster.ray.clone().applyMatrix4(inv)
        if (ray.intersectSphere(hitSphere, hit)) {
          hover = true
          pointerDir.lerp(hit.normalize(), 0.35).normalize()
        }
      }
      pointerAmt += ((hover ? 1 : 0) - pointerAmt) * Math.min(1, dt * 6)
      uniforms.uPointerDir.value.copy(pointerDir)
      uniforms.uPointerAmt.value = pointerAmt
      document.body.classList.toggle('orb-hover', hover)

      // noise level: section base + how fast you scroll; calm on cut / hover / click
      scrollV *= Math.pow(0.04, dt)                       // decays in well under a second
      const stir = Math.min(1, scrollV / 2400)
      const target = hover || t < calmUntil ? 0.04 : Math.min(1, base + stir * 0.9)
      chaos += (target - chaos) * Math.min(1, dt * (target < chaos ? 4.5 : 6.0))
      uniforms.uChaos.value = chaos
      uniforms.uTime.value = t * speed + stir * 0.6
      uniforms.uPulse.value = Math.min(1, (t - pulseStart) / 1.1)
      uniforms.uFade.value = fade

      for (const ring of rings) {
        const pos = ring.geo.attributes.position.array
        const tt = t * speed
        for (let k = 0; k < RING_POINTS; k++) {
          const ang = (k / RING_POINTS) * Math.PI * 2
          const tone = Math.sin(ang * ring.k + tt * ring.speed * 4) * 0.035
          let noise = 0
          for (let h = 0; h < ring.phases.length; h++) noise += Math.sin(ang * (17 + h * 11) + tt * (2 + h) + ring.phases[h]) / (h + 1.5)
          const rr = ring.r + tone * (1 - chaos) + noise * 0.05 * chaos
          pos[k * 3] = Math.cos(ang) * rr
          pos[k * 3 + 1] = Math.sin(ang) * rr
          pos[k * 3 + 2] = 0
        }
        ring.geo.attributes.position.needsUpdate = true
        ring.line.rotation.z += dt * ring.speed * (0.25 + stir * 3.5) * speed   // scrolling spins the rings
        ring.line.material.opacity = (0.45 + 0.4 * (1 - chaos)) * fade
      }

      for (const rp of ripples) {
        const age = t - rp.start
        if (age > 1.3) { rp.line.visible = false; continue }
        const k = age / 1.3
        rp.line.scale.setScalar(1.1 + ease(k) * 2.4)
        rp.line.material.opacity = (1 - k) * 0.9
      }

      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      group.rotation.y = t * 0.12 * speed + mx * 0.35 + y * 0.0009       // scrolling turns the orb
      group.rotation.x = Math.sin(t * 0.2) * 0.08 + my * 0.25
      glow.material.opacity = (0.75 + 0.25 * (1 - chaos)) * fade
      renderer.render(scene, camera)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(restop)
      window.removeEventListener('noiseless:cut', onCut)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeaveWindow)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onResize)
      document.body.classList.remove('orb-hover')
      orb.geometry.dispose(); orbMat.dispose()
      rings.forEach((r) => { r.geo.dispose(); r.line.material.dispose() })
      ripples.forEach((r) => { r.line.geometry.dispose(); r.line.material.dispose() })
      pGeo.dispose(); pMat.dispose()
      glow.material.map.dispose(); glow.material.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="orb-canvas" ref={canvasRef} aria-hidden="true" />
}
