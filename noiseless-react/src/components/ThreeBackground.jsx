import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05070a, 0.0015)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    camera.position.set(0, 40, 180)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const gridSize = 180
    const segments = 80
    const geometry = new THREE.PlaneGeometry(gridSize * 2, gridSize * 2, segments, segments)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00d4aa) },
        uColor2: { value: new THREE.Color(0x4dabff) },
        uMouseX: { value: 0 },
        uMouseY: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uMouseX;
        uniform float uMouseY;
        varying vec3 vPosition;
        varying float vElevation;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vPosition = position;
          vec3 pos = position;

          float dist = length(pos.xy) * 0.015;
          float wave1 = sin(dist * 3.0 - uTime * 1.5) * 3.0;
          float wave2 = sin(dist * 6.0 - uTime * 2.2) * 1.5;
          float noise = snoise(vec3(pos.xy * 0.015, uTime * 0.3)) * 4.0;

          float elevation = wave1 + wave2 + noise;
          elevation *= smoothstep(${gridSize}.0, 0.0, dist * 100.0);
          elevation *= 0.8;

          vElevation = elevation;
          pos.z += elevation;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vPosition;
        varying float vElevation;

        void main() {
          float mixStrength = (vElevation + 4.0) / 8.0;
          vec3 color = mix(uColor2, uColor1, mixStrength);

          float dist = length(vPosition.xy);
          float alpha = smoothstep(180.0, 30.0, dist);
          alpha *= 0.4 + abs(vElevation) * 0.15;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      wireframe: true,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2.5
    mesh.position.y = -30
    scene.add(mesh)

    const particleCount = 200
    const particles = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 400
      positions[i * 3 + 1] = (Math.random() - 0.3) * 150
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300

      const isAccent = Math.random() > 0.5
      colors[i * 3] = isAccent ? 0.0 : 0.3
      colors[i * 3 + 1] = isAccent ? 0.83 : 0.67
      colors[i * 3 + 2] = isAccent ? 0.67 : 1.0
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particleSystem = new THREE.Points(particles, particleMaterial)
    scene.add(particleSystem)

    let mouseX = 0
    let mouseY = 0
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    document.addEventListener('mousemove', onMouseMove)

    let scrollY = 0
    const onScroll = () => {
      scrollY = window.scrollY
    }
    window.addEventListener('scroll', onScroll)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    let rafId

    function animate() {
      const elapsed = clock.getElapsedTime()
      material.uniforms.uTime.value = elapsed

      camera.position.x += (mouseX * 15 - camera.position.x) * 0.04
      camera.position.y += (40 - scrollY * 0.02 + mouseY * 5 - camera.position.y) * 0.04
      camera.lookAt(0, -30, 0)

      const posAttr = particles.attributes.position
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3 + 1] += 0.1
        if (posAttr.array[i * 3 + 1] > 150) posAttr.array[i * 3 + 1] = -50
      }
      posAttr.needsUpdate = true
      particleSystem.rotation.y = elapsed * 0.02

      renderer.render(scene, camera)
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      material.dispose()
      particles.dispose()
      particleMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas id="bg-canvas" ref={canvasRef} />
}
