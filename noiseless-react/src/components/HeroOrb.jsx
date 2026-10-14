import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/*
 * Hero centrepiece: "the noise orb".
 * A sphere whose surface is pushed around by 3D simplex noise (the room's noise). When Noiseless
 * acts — the slice through "world." in the headline, or hovering the orb — the chaos collapses into a
 * clean, slow sine ripple, the waveform rings straighten into pure tones and the noise particles calm.
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

const ADD_LIGHT = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
}

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

export default function HeroOrb() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return // no WebGL: the hero still reads fine without the orb
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    // framed so the glow and the outer rings fade out inside the canvas (no visible edge)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, 7.0)

    const group = new THREE.Group()
    scene.add(group)

    // ── Orb ──
    const uniforms = {
      uTime: { value: 0 },
      uChaos: { value: 1 },
      uPulse: { value: 0 },
    }
    const orbMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uChaos; uniform float uPulse;
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
          // the Noiseless pulse: a bright shell sweeping over the surface
          float shell = exp(-pow((p.y + 1.2 - uPulse * 2.6) * 3.2, 2.0)) * (1.0 - uPulse) * 0.10;
          d += shell;
          vDisp = d; vObj = p; vNrm = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(p + normal * d, 1.0);
          vPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uChaos; uniform float uTime; uniform float uPulse;
        varying vec3 vPos; varying float vDisp; varying vec3 vObj; varying vec3 vNrm;
        void main() {
          vec3 Nd = normalize(cross(dFdx(vPos), dFdy(vPos)));
          vec3 N = normalize(mix(normalize(vNrm), Nd, clamp(uChaos * 1.2, 0.15, 1.0)));
          vec3 V = normalize(-vPos);
          float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);
          vec3 teal = vec3(0.0, 0.83, 0.67);
          vec3 mint = vec3(0.0, 1.0, 0.82);
          vec3 blue = vec3(0.30, 0.67, 1.0);
          vec3 pink = vec3(1.0, 0.36, 0.52);
          vec3 deep = vec3(0.012, 0.03, 0.06);
          vec3 rim = mix(mix(teal, blue, 0.5 + 0.5 * vObj.y), pink, smoothstep(0.06, 0.32, vDisp) * uChaos);
          vec3 L = normalize(vec3(0.5, 0.9, 0.6));
          float diff = max(dot(N, L), 0.0);
          float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0) * (0.35 + 0.65 * uChaos);
          vec3 col = deep + rim * (0.16 + diff * 0.22) + rim * fres * 1.55 + vec3(spec) * 0.85;
          // fine contour bands, like a scope trace wrapped round the sphere
          float bands = smoothstep(0.92, 1.0, sin(vObj.y * 46.0 + vDisp * 30.0) * 0.5 + 0.5) * (0.25 + 0.5 * (1.0 - uChaos));
          col += mint * bands * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 56), orbMat)
    group.add(orb)

    // soft glow behind the orb
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), transparent: true, depthWrite: false, ...ADD_LIGHT,
    }))
    glow.scale.set(4.9, 4.9, 1)
    glow.position.z = -0.6
    scene.add(glow)

    // ── Waveform rings: jagged noise that straightens into pure tones ──
    const RING_POINTS = 640
    const rings = [
      { r: 1.62, tilt: [1.15, 0.2, 0.1], k: 9, color: 0x00ffd0, speed: 0.6 },
      { r: 1.86, tilt: [1.35, -0.55, 0.4], k: 6, color: 0x4dabff, speed: -0.45 },
      { r: 2.1, tilt: [0.9, 0.7, -0.3], k: 12, color: 0x00d4aa, speed: 0.35 },
    ].map((cfg, idx) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_POINTS * 3), 3))
      const mat = new THREE.LineBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.75, depthWrite: false, ...ADD_LIGHT,
      })
      const line = new THREE.LineLoop(geo, mat)
      line.rotation.set(...cfg.tilt)
      group.add(line)
      const phases = Array.from({ length: 7 }, () => Math.random() * Math.PI * 2)
      return { ...cfg, line, geo, idx, phases }
    })

    // ── Noise particles ──
    const P = reduced ? 500 : 1400
    const pGeo = new THREE.BufferGeometry()
    const pPos = new Float32Array(P * 3)
    const pSeed = new Float32Array(P)
    for (let i = 0; i < P; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const rad = 1.5 + Math.random() * 1.6
      const s = Math.sqrt(1 - u * u)
      pPos[i * 3] = rad * s * Math.cos(th)
      pPos[i * 3 + 1] = rad * u
      pPos[i * 3 + 2] = rad * s * Math.sin(th)
      pSeed[i] = Math.random() * 10
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1))
    const pMat = new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uChaos: uniforms.uChaos, uPixel: { value: renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uChaos; uniform float uPixel;
        varying float vA; varying float vC;
        void main() {
          vec3 p = position;
          float jitter = sin(uTime * 3.0 + aSeed * 7.0) * 0.08 * uChaos;
          p *= 1.0 + jitter + (1.0 - uChaos) * 0.12;   // calm: the noise drifts outward and fades
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (0.35 + 0.65 * uChaos) * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed));
          vC = fract(aSeed * 0.37);
          gl_PointSize = (1.4 + 2.2 * fract(aSeed)) * uPixel * (6.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uChaos; varying float vA; varying float vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          if (a < 0.01) discard;
          vec3 noiseCol = mix(vec3(1.0, 0.36, 0.52), vec3(0.6, 0.35, 1.0), vC);
          vec3 cleanCol = vec3(0.0, 0.83, 0.67);
          gl_FragColor = vec4(mix(cleanCol, noiseCol, uChaos), a);
        }`,
      transparent: true, depthWrite: false, ...ADD_LIGHT,
    })
    group.add(new THREE.Points(pGeo, pMat))

    // ── Interaction & timing ──
    let chaos = 1
    let chaosTarget = 1
    let calmUntil = 0
    let pulseStart = -10
    let hovering = false
    let mx = 0, my = 0, tmx = 0, tmy = 0
    const clock = new THREE.Clock()

    const calm = (seconds) => {
      const now = clock.getElapsedTime()
      calmUntil = Math.max(calmUntil, now + seconds)
      if (now - pulseStart > 1.2) pulseStart = now
    }
    const onCut = () => calm(2.6)
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect()
      tmx = ((e.clientX - r.left) / r.width - 0.5) * 2
      tmy = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    const onEnter = () => { hovering = true; calm(0.1) }
    const onLeave = () => { hovering = false }
    window.addEventListener('noiseless:cut', onCut)
    window.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerenter', onEnter)
    wrap.addEventListener('pointerleave', onLeave)

    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(wrap)

    let raf
    let last = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) return
      const t = clock.getElapsedTime()
      const dt = Math.min(0.05, t - last)
      last = t
      const speed = reduced ? 0.35 : 1

      chaosTarget = hovering || t < calmUntil ? 0.04 : 1
      const rate = chaosTarget < chaos ? 4.5 : 0.55   // calm fast, let the noise creep back slowly
      chaos += (chaosTarget - chaos) * Math.min(1, dt * rate)
      uniforms.uChaos.value = chaos
      uniforms.uTime.value = t * speed
      uniforms.uPulse.value = Math.min(1, (t - pulseStart) / 1.1)

      for (const ring of rings) {
        const pos = ring.geo.attributes.position.array
        const tt = t * speed
        for (let i = 0; i < RING_POINTS; i++) {
          const a = (i / RING_POINTS) * Math.PI * 2
          const tone = Math.sin(a * ring.k + tt * ring.speed * 4) * 0.035
          let noise = 0
          for (let h = 0; h < ring.phases.length; h++) {
            noise += Math.sin(a * (17 + h * 11) + tt * (2 + h) + ring.phases[h]) / (h + 1.5)
          }
          const rr = ring.r + tone * (1 - chaos) + noise * 0.05 * chaos
          pos[i * 3] = Math.cos(a) * rr
          pos[i * 3 + 1] = Math.sin(a) * rr
          pos[i * 3 + 2] = 0
        }
        ring.geo.attributes.position.needsUpdate = true
        ring.line.rotation.z += dt * ring.speed * 0.25 * speed
        ring.line.material.opacity = 0.45 + 0.4 * (1 - chaos)
      }

      mx += (tmx - mx) * 0.05
      my += (tmy - my) * 0.05
      group.rotation.y = t * 0.12 * speed + mx * 0.35
      group.rotation.x = Math.sin(t * 0.2) * 0.08 + my * 0.25
      glow.material.opacity = 0.75 + 0.25 * (1 - chaos)
      renderer.render(scene, camera)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('noiseless:cut', onCut)
      window.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerenter', onEnter)
      wrap.removeEventListener('pointerleave', onLeave)
      ro.disconnect()
      io.disconnect()
      orb.geometry.dispose()
      orbMat.dispose()
      rings.forEach((r) => { r.geo.dispose(); r.line.material.dispose() })
      pGeo.dispose()
      pMat.dispose()
      glow.material.map.dispose()
      glow.material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className="hero-orb" ref={wrapRef} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="hero-orb-hint">Hover to cancel the noise</div>
    </div>
  )
}
