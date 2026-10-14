import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.0009)

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      3500
    )
    camera.position.set(0, 0, 220)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    // ─── Nebula / deep-space backdrop (noise-based clouds) ───
    const nebulaGeo = new THREE.PlaneGeometry(3600, 2400, 1, 1)
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uScroll: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2  uMouse;
        uniform float uScroll;
        varying vec2  vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
          return v;
        }

        void main() {
          vec2 p = vUv * 3.5 + vec2(uTime * 0.014, uTime * 0.009);
          p += uMouse * 0.35;
          p.y += uScroll * 1.6;   // the clouds drift as you move down the page
          float n  = fbm(p);
          float n2 = fbm(p + vec2(3.1, 7.3));
          float n3 = fbm(p * 1.7 + vec2(1.2, 4.5));

          vec3 deep   = vec3(0.010, 0.014, 0.035);
          vec3 teal   = vec3(0.00, 0.40, 0.38);
          vec3 purple = vec3(0.22, 0.08, 0.42);
          vec3 pink   = vec3(0.40, 0.10, 0.25);

          vec3 col = deep;
          col = mix(col, teal,   smoothstep(0.42, 0.82, n)  * 0.55);
          col = mix(col, purple, smoothstep(0.48, 0.88, n2) * 0.45);
          col = mix(col, pink,   smoothstep(0.58, 0.92, n3) * 0.25);

          // Vignette
          vec2 c = vUv - 0.5;
          float vig = 1.0 - dot(c, c) * 1.7;
          col *= clamp(vig, 0.25, 1.0);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
      transparent: false,
    })
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat)
    nebula.position.z = -1400
    scene.add(nebula)

    // ─── Starfield layers ───
    function makeStars(count, zMin, zMax, sizeMin, sizeMax, twinkleAmount) {
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const seeds = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 2400
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1700
        positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin)

        const r = Math.random()
        let cr, cg, cb
        if (r < 0.68) {
          const b = 0.85 + Math.random() * 0.15
          cr = b; cg = b; cb = b + 0.02
        } else if (r < 0.84) {
          cr = 0.55 + Math.random() * 0.20
          cg = 0.72 + Math.random() * 0.18
          cb = 1.0
        } else if (r < 0.94) {
          cr = Math.random() * 0.18
          cg = 0.78 + Math.random() * 0.18
          cb = 0.62 + Math.random() * 0.24
        } else {
          cr = 1.0
          cg = 0.70 + Math.random() * 0.15
          cb = 0.38 + Math.random() * 0.18
        }
        colors[i * 3]     = cr
        colors[i * 3 + 1] = cg
        colors[i * 3 + 2] = cb

        sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin)
        seeds[i] = Math.random() * 6.2831853
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
      geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
      geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1))

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: renderer.getPixelRatio() },
          uTwinkle: { value: twinkleAmount },
          uWarp: { value: 0 },
        },
        vertexShader: `
          attribute float aSize;
          attribute float aSeed;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uTwinkle;
          uniform float uWarp;
          varying vec3 vColor;

          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float tw = 1.0 + uTwinkle * sin(uTime * 2.2 + aSeed) * 0.55;
            gl_PointSize = aSize * tw * uPixelRatio * (260.0 / -mv.z) * (1.0 + uWarp * 1.4);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float halo = smoothstep(0.5, 0.0, d);
            float core = smoothstep(0.14, 0.0, d);
            float a = halo * 0.6 + core * 0.9;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vColor, a);
          }
        `,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      const points = new THREE.Points(geo, mat)
      points.userData.baseMat = mat
      return points
    }

    const starsFar  = makeStars(1800, -1100, -700,  0.6, 1.2, 0.35)
    const starsMid  = makeStars(700,  -700,  -250,  1.0, 2.0, 0.55)
    const starsNear = makeStars(220,  -250,   80,   1.8, 3.4, 0.85)
    scene.add(starsFar, starsMid, starsNear)

    // ─── Distant shooting-star streaks (rare visual accent) ───
    const shootingGeo = new THREE.BufferGeometry()
    const shootingCount = 6
    const shootingPositions = new Float32Array(shootingCount * 3)
    const shootingSeeds = new Float32Array(shootingCount)
    for (let i = 0; i < shootingCount; i++) {
      shootingPositions[i * 3]     = (Math.random() - 0.5) * 1600
      shootingPositions[i * 3 + 1] = (Math.random() - 0.5) * 1000
      shootingPositions[i * 3 + 2] = -300 + Math.random() * 200
      shootingSeeds[i] = Math.random() * 10
    }
    shootingGeo.setAttribute('position', new THREE.BufferAttribute(shootingPositions, 3))

    // ─── Mouse + scroll state ───
    let targetMX = 0
    let targetMY = 0
    let mX = 0
    let mY = 0
    let scrollY = 0
    let scrollV = 0           // px per second, decays quickly
    let lastY = window.scrollY
    let lastT = performance.now()
    let warp = 0

    const onMouseMove = (e) => {
      targetMX = (e.clientX / window.innerWidth - 0.5) * 2
      targetMY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    const onScroll = () => {
      const now = performance.now()
      scrollY = window.scrollY
      scrollV = Math.max(scrollV * 0.6, (Math.abs(scrollY - lastY) / Math.max(1, now - lastT)) * 1000)
      lastY = scrollY
      lastT = now
    }
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      starsFar.userData.baseMat.uniforms.uPixelRatio.value = renderer.getPixelRatio()
      starsMid.userData.baseMat.uniforms.uPixelRatio.value = renderer.getPixelRatio()
      starsNear.userData.baseMat.uniforms.uPixelRatio.value = renderer.getPixelRatio()
    }
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)

    // ─── Animation loop ───
    const clock = new THREE.Clock()
    let rafId

    function animate() {
      const t = clock.getElapsedTime()

      // Easing mouse position
      mX += (targetMX - mX) * 0.04
      mY += (targetMY - mY) * 0.04

      // Camera parallax (strong mouse, plus forward drift on scroll)
      camera.position.x = mX * 45
      camera.position.y = -mY * 32 - scrollY * 0.04
      camera.position.z = 220 - scrollY * 0.02
      camera.lookAt(mX * 8, -mY * 6, -200)
      camera.rotation.z = mX * 0.02

      // Warp: a fast scroll kicks the field of view wider and swells the stars
      scrollV *= 0.9
      warp += (Math.min(1, scrollV / 3000) - warp) * 0.12
      camera.fov = 65 + warp * 18
      camera.updateProjectionMatrix()
      const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      nebulaMat.uniforms.uScroll.value = scrollY / docH
      ;[starsFar, starsMid, starsNear].forEach((st, k) => { st.userData.baseMat.uniforms.uWarp.value = warp * (0.4 + k * 0.4) })

      // Nebula time & mouse
      nebulaMat.uniforms.uTime.value = t
      nebulaMat.uniforms.uMouse.value.set(mX, mY)

      // Star twinkle
      starsFar.userData.baseMat.uniforms.uTime.value  = t
      starsMid.userData.baseMat.uniforms.uTime.value  = t * 1.1
      starsNear.userData.baseMat.uniforms.uTime.value = t * 1.25

      // Very slow galactic drift + parallax from mouse (near layer moves more)
      starsFar.rotation.z  = t * 0.004
      starsMid.rotation.z  = t * 0.007
      starsNear.rotation.z = t * 0.012

      starsFar.position.x  = mX * 6
      starsFar.position.y  = -mY * 4
      starsMid.position.x  = mX * 16
      starsMid.position.y  = -mY * 12
      starsNear.position.x = mX * 32
      starsNear.position.y = -mY * 24

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)

      nebulaGeo.dispose()
      nebulaMat.dispose()
      ;[starsFar, starsMid, starsNear].forEach((p) => {
        p.geometry.dispose()
        p.userData.baseMat.dispose()
      })
      shootingGeo.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} />
}
