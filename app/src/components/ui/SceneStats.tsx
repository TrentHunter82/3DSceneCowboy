import { useState, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSceneStore } from '../../stores/useSceneStore'
import type { ObjectType } from '../../types/scene'

// ── Module-level shared data ─────────────────────────────────────────
// StatsCollector (inside Canvas) writes here, SceneStatsOverlay (outside Canvas) reads.

const statsData = {
  fps: 0,
  drawCalls: 0,
}

// ── Triangle count lookup ────────────────────────────────────────────

const TRIANGLE_COUNTS: Record<ObjectType, number> = {
  box: 12,
  sphere: 2048,    // 32 width * 32 height * 2
  cylinder: 128,   // 32 radial * 2 caps + 32 radial * 2 sides
  cone: 64,        // 32 radial (base) + 32 radial (side)
  torus: 1024,     // 16 tube * 32 radial * 2
  plane: 2,
  model: 0,        // Unknown until loaded; approximation only
}

// ── StatsCollector (R3F component, goes inside Canvas) ───────────────

/* v8 ignore start -- R3F component, requires WebGL context, tested via e2e */
export function StatsCollector(): null {
  const { gl } = useThree()
  const frameTimesRef = useRef<number[]>([])
  const lastTimeRef = useRef(performance.now())

  useFrame(() => {
    const now = performance.now()
    const delta = now - lastTimeRef.current
    lastTimeRef.current = now

    // Track frame times (keep last 60)
    const frameTimes = frameTimesRef.current
    frameTimes.push(delta)
    if (frameTimes.length > 60) {
      frameTimes.shift()
    }

    // Compute moving average FPS
    const avgDelta = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length
    statsData.fps = avgDelta > 0 ? Math.round(1000 / avgDelta) : 0

    // Read draw calls from renderer info
    statsData.drawCalls = gl.info.render.calls
  })

  return null
}
/* v8 ignore stop */

// ── SceneStatsOverlay (HTML component, goes outside Canvas) ──────────

export function SceneStatsOverlay() {
  const objects = useSceneStore(s => s.objects)
  const [fps, setFps] = useState(0)
  const [drawCalls, setDrawCalls] = useState(0)

  // Poll the module-level statsData every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(statsData.fps)
      setDrawCalls(statsData.drawCalls)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Compute triangle count from object types
  const triangles = objects.reduce(
    (sum, obj) => sum + (TRIANGLE_COUNTS[obj.type] ?? 0),
    0,
  )

  // FPS color coding
  const fpsColor =
    fps > 50 ? 'text-green-400' :
    fps >= 30 ? 'text-yellow-400' :
    'text-red-400'

  return (
    <div
      className="absolute top-2.5 right-2.5 bg-dust-900/95 border border-dust-600/30 rounded px-2.5 py-2 select-none pointer-events-none backdrop-blur-sm"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <div className="flex flex-col gap-1 text-[10px] font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-dust-400 tracking-wider">FPS</span>
          <span className={fpsColor}>{fps}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-dust-400 tracking-wider">OBJ</span>
          <span className="text-sand-200">{objects.length}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-dust-400 tracking-wider">TRI</span>
          <span className="text-sand-200">{triangles.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-dust-400 tracking-wider">DRW</span>
          <span className="text-sand-200">{drawCalls}</span>
        </div>
      </div>
    </div>
  )
}
