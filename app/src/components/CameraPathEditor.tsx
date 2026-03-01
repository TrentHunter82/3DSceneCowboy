import { useId, useCallback } from 'react'
import { useCameraPathStore } from '../stores/useCameraPathStore'
import { CollapsibleSection } from './ui/CollapsibleSection'
import type { CameraPathEasing } from '../types/cameraPath'
import type { Vec3 } from '../types/scene'

const inputClass =
  'w-full bg-dust-900 border border-dust-600 rounded px-1.5 py-1 text-xs text-sand-200 focus:border-rust-500 focus:outline-none transition-colors'

const EASINGS: { value: CameraPathEasing; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
]

function PathSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs text-dust-400">{label}</label>
        <span className="text-xs text-dust-500 font-mono w-12 text-right">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-dust-700 rounded-lg appearance-none cursor-pointer accent-rust-500 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  )
}

function Vec3Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: Vec3
  onChange: (v: Vec3) => void
}) {
  return (
    <div className="mb-2">
      <label className="text-xs text-dust-400 block mb-1">{label}</label>
      <div className="flex gap-1">
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex-1">
            <label className="text-[9px] text-dust-500 uppercase block mb-0.5">{axis}</label>
            <input
              type="number"
              value={Number(value[axis].toFixed(2))}
              step={0.5}
              onChange={e => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              aria-label={`${label} ${axis}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** SVG mini-visualization of the camera path from above (XZ plane) */
function PathPreview({ points }: { points: Array<{ position: Vec3; target: Vec3 }> }) {
  if (points.length === 0) return null

  // Find bounds
  const allX = points.map(p => p.position.x)
  const allZ = points.map(p => p.position.z)
  const minX = Math.min(...allX) - 2
  const maxX = Math.max(...allX) + 2
  const minZ = Math.min(...allZ) - 2
  const maxZ = Math.max(...allZ) + 2
  const rangeX = Math.max(maxX - minX, 1)
  const rangeZ = Math.max(maxZ - minZ, 1)

  const toSvgX = (x: number) => ((x - minX) / rangeX) * 76 + 2
  const toSvgZ = (z: number) => ((z - minZ) / rangeZ) * 36 + 2

  const pathStr = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.position.x).toFixed(1)},${toSvgZ(p.position.z).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox="0 0 80 40" className="w-full h-10 mb-2 bg-dust-900/60 rounded border border-dust-600/30" aria-label="Camera path preview">
      {/* Path line */}
      <path
        d={pathStr}
        fill="none"
        stroke="#c4612a"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Control points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toSvgX(p.position.x)}
          cy={toSvgZ(p.position.z)}
          r="2"
          fill={i === 0 ? '#4ade80' : i === points.length - 1 ? '#ef4444' : '#e8a87c'}
        />
      ))}
      {/* Target arrows */}
      {points.map((p, i) => {
        const tx = toSvgX(p.target.x)
        const tz = toSvgZ(p.target.z)
        const cx = toSvgX(p.position.x)
        const cz = toSvgZ(p.position.z)
        // Show short target direction indicator
        const dx = tx - cx
        const dz = tz - cz
        const len = Math.sqrt(dx * dx + dz * dz)
        if (len < 1) return null
        const scale = Math.min(8, len) / len
        return (
          <line
            key={`t${i}`}
            x1={cx}
            y1={cz}
            x2={cx + dx * scale}
            y2={cz + dz * scale}
            stroke="#e8a87c"
            strokeWidth="0.5"
            strokeDasharray="1,1"
            opacity="0.5"
          />
        )
      })}
    </svg>
  )
}

/** Timeline scrubber for camera path playback */
function PathTimeline({
  duration,
  currentTime,
  points,
  selectedPointId,
  onScrub,
  onSelectPoint,
}: {
  duration: number
  currentTime: number
  points: Array<{ id: string; time: number }>
  selectedPointId: string | null
  onScrub: (time: number) => void
  onSelectPoint: (id: string) => void
}) {
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    onScrub(x * duration)
  }, [duration, onScrub])

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-dust-500">Timeline</span>
        <span className="text-[10px] text-dust-500 font-mono">{currentTime.toFixed(1)}s / {duration.toFixed(1)}s</span>
      </div>
      <svg
        viewBox="0 0 200 20"
        className="w-full h-5 cursor-pointer bg-dust-900/60 rounded border border-dust-600/30"
        onClick={handleClick}
        aria-label="Camera path timeline"
      >
        {/* Track background */}
        <rect x="4" y="8" width="192" height="4" rx="2" fill="#374151" />

        {/* Keyframe markers */}
        {points.map(p => {
          const x = 4 + (p.time / duration) * 192
          const isSelected = p.id === selectedPointId
          return (
            <g key={p.id} onClick={(e) => { e.stopPropagation(); onSelectPoint(p.id) }}>
              <rect
                x={x - 3}
                y={5}
                width="6"
                height="10"
                rx="1"
                fill={isSelected ? '#c4612a' : '#6b7280'}
                stroke={isSelected ? '#e8a87c' : 'none'}
                strokeWidth="0.5"
                className="cursor-pointer"
              />
            </g>
          )
        })}

        {/* Playhead */}
        <line
          x1={4 + (currentTime / duration) * 192}
          y1="2"
          x2={4 + (currentTime / duration) * 192}
          y2="18"
          stroke="#ef4444"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}

export function CameraPathEditor() {
  const paths = useCameraPathStore(s => s.paths)
  const activePathId = useCameraPathStore(s => s.activePathId)
  const selectedPointId = useCameraPathStore(s => s.selectedPointId)
  const playbackState = useCameraPathStore(s => s.playbackState)
  const playbackTime = useCameraPathStore(s => s.playbackTime)
  const previewEnabled = useCameraPathStore(s => s.previewEnabled)

  const addPath = useCameraPathStore(s => s.addPath)
  const removePath = useCameraPathStore(s => s.removePath)
  const setActivePath = useCameraPathStore(s => s.setActivePath)
  const updatePath = useCameraPathStore(s => s.updatePath)
  const addPoint = useCameraPathStore(s => s.addPoint)
  const removePoint = useCameraPathStore(s => s.removePoint)
  const updatePoint = useCameraPathStore(s => s.updatePoint)
  const setSelectedPoint = useCameraPathStore(s => s.setSelectedPoint)
  const play = useCameraPathStore(s => s.play)
  const pause = useCameraPathStore(s => s.pause)
  const stop = useCameraPathStore(s => s.stop)
  const setPlaybackTime = useCameraPathStore(s => s.setPlaybackTime)
  const togglePreview = useCameraPathStore(s => s.togglePreview)

  const activePath = activePathId ? paths.find(p => p.id === activePathId) : null
  const selectedPoint = activePath && selectedPointId
    ? activePath.points.find(pt => pt.id === selectedPointId)
    : null

  const handleAddPath = useCallback(() => {
    addPath()
  }, [addPath])

  const handleAddPoint = useCallback(() => {
    if (activePathId) {
      addPoint(activePathId)
    }
  }, [activePathId, addPoint])

  return (
    <div className="w-64" role="region" aria-label="Camera path editor">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-dust-600/25">
        <span className="text-xs font-bold text-dust-100 uppercase tracking-wider">
          Camera Paths
        </span>
        <label className="flex items-center gap-1 text-[10px] text-dust-400 cursor-pointer">
          <input
            type="checkbox"
            checked={previewEnabled}
            onChange={togglePreview}
            className="accent-rust-500"
            aria-label="Enable camera path preview"
          />
          Preview
        </label>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {/* Path List */}
        <div className="px-4 py-2.5 border-b border-dust-600/25">
          <div className="space-y-1 mb-2">
            {paths.map(path => (
              <div
                key={path.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                  activePathId === path.id
                    ? 'bg-rust-900/40 text-sand-100'
                    : 'text-dust-300 hover:bg-dust-700/50'
                }`}
                onClick={() => setActivePath(path.id)}
                role="button"
                aria-label={`Select ${path.name}`}
              >
                <span className="text-sm shrink-0">🎬</span>
                <span className="flex-1 truncate">{path.name}</span>
                <span className="text-[9px] text-dust-500">{path.points.length}pts</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removePath(path.id) }}
                  className="text-dust-400 hover:text-rust-400"
                  aria-label={`Remove ${path.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddPath}
            className="w-full px-3 py-1.5 btn-raised text-xs text-sand-200 rounded transition-colors"
            aria-label="Add camera path"
          >
            + Add Camera Path
          </button>
        </div>

        {/* Active Path Editor */}
        {activePath && (
          <>
            {/* Path Settings */}
            <CollapsibleSection title="Path Settings">
              <div className="mb-2">
                <label className="text-xs text-dust-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={activePath.name}
                  maxLength={64}
                  onChange={e => updatePath(activePath.id, { name: e.target.value })}
                  className={inputClass}
                  aria-label="Path name"
                />
              </div>
              <PathSlider
                label="Duration (s)"
                value={activePath.duration}
                onChange={v => updatePath(activePath.id, { duration: v })}
                min={0.5}
                max={60}
                step={0.5}
              />
              <div className="mb-2">
                <label className="text-xs text-dust-400 block mb-1">Easing</label>
                <select
                  value={activePath.easing}
                  onChange={e => updatePath(activePath.id, { easing: e.target.value as CameraPathEasing })}
                  className={inputClass}
                  aria-label="Path easing"
                >
                  {EASINGS.map(e => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-dust-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePath.loop}
                  onChange={() => updatePath(activePath.id, { loop: !activePath.loop })}
                  className="accent-rust-500"
                  aria-label="Loop camera path"
                />
                Loop
              </label>
            </CollapsibleSection>

            {/* Playback Controls */}
            <CollapsibleSection title="Playback">
              <div className="flex gap-1 mb-2">
                {playbackState !== 'playing' ? (
                  <button
                    onClick={play}
                    disabled={activePath.points.length < 2}
                    className="flex-1 px-3 py-1.5 bg-rust-600 hover:bg-rust-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                    aria-label="Play camera path"
                  >
                    ▶ Play
                  </button>
                ) : (
                  <button
                    onClick={pause}
                    className="flex-1 px-3 py-1.5 bg-rust-500 hover:bg-rust-400 text-white text-xs rounded transition-colors"
                    aria-label="Pause camera path"
                  >
                    ⏸ Pause
                  </button>
                )}
                <button
                  onClick={stop}
                  disabled={playbackState === 'stopped'}
                  className="px-3 py-1.5 bg-dust-700 hover:bg-dust-600 disabled:opacity-40 disabled:cursor-not-allowed text-dust-300 text-xs rounded transition-colors"
                  aria-label="Stop camera path"
                >
                  ■ Stop
                </button>
              </div>

              <PathTimeline
                duration={activePath.duration}
                currentTime={playbackTime}
                points={activePath.points}
                selectedPointId={selectedPointId}
                onScrub={setPlaybackTime}
                onSelectPoint={setSelectedPoint}
              />

              {/* Path Preview (top-down XZ view) */}
              <PathPreview points={activePath.points} />
            </CollapsibleSection>

            {/* Control Points */}
            <CollapsibleSection title="Control Points">
              <div className="space-y-1 mb-2">
                {activePath.points.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                      selectedPointId === pt.id
                        ? 'bg-rust-900/40 text-sand-100'
                        : 'text-dust-300 hover:bg-dust-700/50'
                    }`}
                    onClick={() => setSelectedPoint(pt.id)}
                    role="button"
                    aria-label={`Select point ${idx + 1}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      idx === 0 ? 'bg-green-400' : idx === activePath.points.length - 1 ? 'bg-red-400' : 'bg-rust-400'
                    }`} />
                    <span className="flex-1 truncate">Point {idx + 1}</span>
                    <span className="text-[9px] text-dust-500 font-mono">{pt.time.toFixed(1)}s</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removePoint(activePath.id, pt.id) }}
                      className="text-dust-400 hover:text-rust-400"
                      aria-label={`Remove point ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddPoint}
                className="w-full px-3 py-1.5 btn-raised text-xs text-sand-200 rounded transition-colors"
                aria-label="Add control point"
              >
                + Add Point
              </button>
            </CollapsibleSection>

            {/* Selected Point Editor */}
            {selectedPoint && (
              <CollapsibleSection title="Point Settings">
                <Vec3Input
                  label="Position"
                  value={selectedPoint.position}
                  onChange={pos => updatePoint(activePath.id, selectedPoint.id, { position: pos })}
                />
                <Vec3Input
                  label="Look At"
                  value={selectedPoint.target}
                  onChange={tgt => updatePoint(activePath.id, selectedPoint.id, { target: tgt })}
                />
                <PathSlider
                  label="Time (s)"
                  value={selectedPoint.time}
                  onChange={v => updatePoint(activePath.id, selectedPoint.id, { time: v })}
                  min={0}
                  max={activePath.duration}
                  step={0.1}
                />
                <PathSlider
                  label="Tension"
                  value={selectedPoint.tension}
                  onChange={v => updatePoint(activePath.id, selectedPoint.id, { tension: v })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </CollapsibleSection>
            )}
          </>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-dust-600/25 flex justify-between items-center">
          <span className="text-[10px] text-dust-500">
            {paths.length} path{paths.length !== 1 ? 's' : ''}
          </span>
          {activePath && (
            <span className="text-[10px] text-dust-500">
              {activePath.points.length} point{activePath.points.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
