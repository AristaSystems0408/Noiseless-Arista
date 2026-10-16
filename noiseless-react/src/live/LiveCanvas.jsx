import { useEffect, useRef, useState } from 'react'

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const LOADERS = {
  core: () => import('./scenes/core.js').then((m) => m.mountCore),
  waves: () => import('./scenes/waves.js').then((m) => m.mountWaves),
}

/*
 * One 3D scene in a canvas. The scene code (and three's post-processing) loads only when the canvas
 * comes near the screen; until then — or for good, without WebGL — the static fallback shows.
 * Rendering pauses while the canvas is off screen or the tab is hidden.
 */
export default function LiveCanvas({ scene, source, className, fallback }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(() => !hasWebGL())

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined
    if (failed) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720
    let handle = null, cancelled = false, visible = false, loading = false

    const update = () => handle?.setRunning(visible && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !handle && !loading && !cancelled) {
        loading = true
        LOADERS[scene]()
          .then((mount) => {
            if (cancelled) return
            handle = mount(canvas, source, { reduced, mobile })
            setReady(true)
            update()
          })
          .catch(() => setFailed(true))
      }
      update()
    }, { rootMargin: '200px 0px' })
    io.observe(canvas)
    document.addEventListener('visibilitychange', update)
    return () => {
      cancelled = true
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
      handle?.dispose()
    }
  }, [scene, source, failed])

  return (
    <div className={`live-canvas ${className || ''} ${ready ? 'is-ready' : ''}`}>
      {!failed && <canvas ref={ref} aria-hidden="true" />}
      {(!ready || failed) && <div className="live-fallback" aria-hidden="true">{fallback}</div>}
    </div>
  )
}
