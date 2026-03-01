import { useState, useCallback, useMemo, useRef, type MouseEvent } from 'react'
import { Vector3 } from 'three'
import { useAnimationStore } from '../stores/useAnimationStore'
import { useSceneStore } from '../stores/useSceneStore'
import { useCameraStore } from '../stores/useCameraStore'
import { AnimationCurvesEditor } from './AnimationCurvesEditor'
import { CAMERA_TRACK_OBJECT_ID, isCameraTrack } from '../core/animation'
import type { AnimationTrack } from '../types/scene'

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTime(t: number): string {
  return t.toFixed(2) + 's'
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4]

const TRACK_LABEL_WIDTH = 140
const TRACK_HEIGHT = 28
const RULER_HEIGHT = 24

// ── Component ────────────────────────────────────────────────────────────

export function AnimationTimeline() {
  const [durationInput, setDurationInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [curveEditor, setCurveEditor] = useState<{ trackId: string; keyframeId: string; x: number; y: number } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Animation store
  const tracks = useAnimationStore(s => s.tracks)
  const duration = useAnimationStore(s => s.duration)
  const currentTime = useAnimationStore(s => s.currentTime)
  const isPlaying = useAnimationStore(s => s.isPlaying)
  const playbackSpeed = useAnimationStore(s => s.playbackSpeed)
  const loop = useAnimationStore(s => s.loop)

  const togglePlayback = useAnimationStore(s => s.togglePlayback)
  const stop = useAnimationStore(s => s.stop)
  const setCurrentTime = useAnimationStore(s => s.setCurrentTime)
  const setDuration = useAnimationStore(s => s.setDuration)
  const setPlaybackSpeed = useAnimationStore(s => s.setPlaybackSpeed)
  const setLoop = useAnimationStore(s => s.setLoop)
  const addTrack = useAnimationStore(s => s.addTrack)
  const removeTrack = useAnimationStore(s => s.removeTrack)
  const addKeyframe = useAnimationStore(s => s.addKeyframe)
  const removeKeyframe = useAnimationStore(s => s.removeKeyframe)
  const getTrackForObject = useAnimationStore(s => s.getTrackForObject)
  const captureSceneKeyframe = useAnimationStore(s => s.captureSceneKeyframe)

  // Scene store
  const objects = useSceneStore(s => s.objects)
  const selectedId = useSceneStore(s => s.selectedId)
  const selectedIds = useSceneStore(s => s.selectedIds)

  // Derived state
  const selectedHasTrack = selectedId ? !!getTrackForObject(selectedId) : false
  const canAddTrack = !!selectedId && !selectedHasTrack

  // Sort tracks: camera first, then objects
  const sortedTracks = useMemo(() => {
    const cameraTracks = tracks.filter(isCameraTrack)
    const objectTracks = tracks.filter(t => !isCameraTrack(t))
    return [...cameraTracks, ...objectTracks]
  }, [tracks])

  // ── Time position from mouse ───────────────────────────────────────

  const getTimeFromMouseX = useCallback(
    (clientX: number): number => {
      const el = timelineRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const x = clientX - rect.left - TRACK_LABEL_WIDTH
      const width = rect.width - TRACK_LABEL_WIDTH
      if (width <= 0) return 0
      const ratio = Math.max(0, Math.min(1, x / width))
      return ratio * duration
    },
    [duration],
  )

  // ── Playhead drag ──────────────────────────────────────────────────

  const handleTimelineMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only respond to clicks in the timeline area (past the label column)
      const el = timelineRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (e.clientX - rect.left < TRACK_LABEL_WIDTH) return

      const time = getTimeFromMouseX(e.clientX)
      setCurrentTime(time)
      setIsDragging(true)

      const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const t = getTimeFromMouseX(moveEvent.clientX)
        setCurrentTime(t)
      }

      const onMouseUp = () => {
        setIsDragging(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [getTimeFromMouseX, setCurrentTime],
  )

  // ── Capture scene keyframe ──────────────────────────────────────────

  const handleCaptureKeyframe = useCallback(() => {
    const controlsRef = useCameraStore.getState().controlsRef
    if (!controlsRef) return

    // Read current camera position and target
    const _pos = new Vector3()
    const _tgt = new Vector3()
    controlsRef.getPosition(_pos)
    controlsRef.getTarget(_tgt)

    // Gather selected objects (or all objects with existing tracks)
    const trackedObjectIds = new Set<string>()
    // Include all objects that already have tracks
    for (const track of tracks) {
      if (!isCameraTrack(track)) trackedObjectIds.add(track.objectId)
    }
    // Include currently selected objects
    for (const id of selectedIds) {
      trackedObjectIds.add(id)
    }

    const trackedObjects = objects
      .filter(o => trackedObjectIds.has(o.id))
      .map(o => ({
        id: o.id,
        position: { ...o.position },
        rotation: { ...o.rotation },
        scale: { ...o.scale },
      }))

    captureSceneKeyframe(
      { x: _pos.x, y: _pos.y, z: _pos.z },
      { x: _tgt.x, y: _tgt.y, z: _tgt.z },
      trackedObjects,
    )
  }, [tracks, objects, selectedIds, captureSceneKeyframe])

  // ── Add track for selected object ──────────────────────────────────

  const handleAddTrack = useCallback(() => {
    if (!selectedId) return
    addTrack(selectedId)
  }, [selectedId, addTrack])

  // ── Duration commit ────────────────────────────────────────────────

  const handleDurationCommit = useCallback(() => {
    const parsed = parseFloat(durationInput)
    if (!isNaN(parsed) && parsed > 0) {
      setDuration(parsed)
    }
    setDurationInput('')
  }, [durationInput, setDuration])

  // ── Speed cycle ────────────────────────────────────────────────────

  const handleCycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setPlaybackSpeed(next)
  }, [playbackSpeed, setPlaybackSpeed])

  // ── Keyframe editing ──────────────────────────────────────────────

  const handleKeyframeClick = useCallback((trackId: string, keyframeId: string, e: globalThis.MouseEvent) => {
    e.stopPropagation()
    setCurveEditor({ trackId, keyframeId, x: e.clientX, y: e.clientY })
  }, [])

  const handleKeyframeRightClick = useCallback((trackId: string, keyframeId: string, e: globalThis.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeKeyframe(trackId, keyframeId)
  }, [removeKeyframe])

  const handleTrackDoubleClick = useCallback((trackId: string, e: globalThis.MouseEvent) => {
    const time = getTimeFromMouseX(e.clientX)
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    if (isCameraTrack(track)) {
      // Camera track: capture current camera position/target at this time
      const controlsRef = useCameraStore.getState().controlsRef
      if (!controlsRef) return
      const _p = new Vector3()
      const _t = new Vector3()
      controlsRef.getPosition(_p)
      controlsRef.getTarget(_t)
      addKeyframe(trackId, time, 'cameraPosition', { x: _p.x, y: _p.y, z: _p.z })
      addKeyframe(trackId, time, 'cameraTarget', { x: _t.x, y: _t.y, z: _t.z })
    } else {
      // Object track: capture current position
      const obj = objects.find(o => o.id === track.objectId)
      const value = obj ? { ...obj.position } : { x: 0, y: 0, z: 0 }
      addKeyframe(trackId, time, 'position', value)
    }
  }, [getTimeFromMouseX, addKeyframe, tracks, objects])

  // ── Resolve object name for a track ────────────────────────────────

  const getObjectName = useCallback(
    (objectId: string): string => {
      if (objectId === CAMERA_TRACK_OBJECT_ID) return 'Camera'
      const obj = objects.find(o => o.id === objectId)
      return obj ? obj.name : '(deleted)'
    },
    [objects],
  )

  // ── Ruler tick marks ───────────────────────────────────────────────

  const tickInterval = 0.5
  const tickCount = Math.floor(duration / tickInterval) + 1
  const ticks: number[] = []
  for (let i = 0; i < tickCount; i++) {
    ticks.push(i * tickInterval)
  }

  // ── Playhead position ─────────────────────────────────────────────

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="bg-dust-900 flex flex-col h-full relative z-10">
      {/* ── Control bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-dust-600/25 shrink-0">
        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
            isPlaying
              ? 'bg-rust-500 text-white'
              : 'bg-dust-700 text-sand-200 hover:bg-dust-600'
          }`}
          style={isPlaying ? { boxShadow: '0 0 8px rgba(255,255,255,0.08)' } : undefined}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          aria-label="Stop animation"
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-[0.06em] btn-raised text-sand-200 hover:text-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
        >
          ⏹
        </button>

        {/* Time display */}
        <span className="text-xs text-sand-200 tabular-nums min-w-[120px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Speed button */}
        <button
          onClick={handleCycleSpeed}
          aria-label={`Playback speed ${playbackSpeed}x, click to change`}
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-[0.06em] btn-raised text-sand-200 hover:text-sand-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
        >
          {playbackSpeed}x
        </button>

        {/* Loop toggle */}
        <button
          onClick={() => setLoop(!loop)}
          aria-label={loop ? 'Disable loop' : 'Enable loop'}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
            loop
              ? 'bg-rust-500/30 text-rust-300 border border-rust-500/50'
              : 'bg-dust-700 text-dust-400 hover:bg-dust-600'
          }`}
          style={loop ? { boxShadow: '0 0 6px rgba(255,255,255,0.06)' } : undefined}
        >
          🔁
        </button>

        {/* Duration input */}
        <label className="flex items-center gap-1 text-xs text-dust-400">
          <span>Dur:</span>
          <input
            type="text"
            value={durationInput}
            onChange={e => setDurationInput(e.target.value)}
            onBlur={handleDurationCommit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleDurationCommit()
            }}
            placeholder={duration.toString()}
            aria-label="Timeline duration in seconds"
            className="w-12 px-1 py-0.5 rounded bg-dust-900 border border-dust-600 text-sand-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-rust-500"
            maxLength={6}
          />
          <span>s</span>
        </label>

        {/* Separator */}
        <div className="w-px h-4 bg-dust-600 mx-1" />

        {/* Capture Keyframe */}
        <button
          onClick={handleCaptureKeyframe}
          aria-label="Capture scene keyframe"
          title="Capture camera + selected objects at current time"
          className="px-2 py-0.5 rounded text-xs font-medium btn-glass-cyan text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          Capture Keyframe
        </button>

        {/* Add Track */}
        <button
          onClick={handleAddTrack}
          disabled={!canAddTrack}
          aria-label="Add animation track for selected object"
          title={!selectedId ? 'Select an object first' : selectedHasTrack ? 'Selected object already has a track' : 'Add animation track for selected object'}
          className={`px-2 py-0.5 rounded text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
            canAddTrack
              ? 'btn-glass text-rust-300'
              : 'bg-dust-700/50 text-dust-500 cursor-default'
          }`}
        >
          + Add Track
        </button>
      </div>

      {/* ── Timeline area ───────────────────────────────────────────── */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative select-none"
        onMouseDown={handleTimelineMouseDown}
        role="slider"
        aria-label="Animation timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            setCurrentTime(Math.min(duration, currentTime + 0.1))
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setCurrentTime(Math.max(0, currentTime - 0.1))
          }
        }}
      >
        {/* Ruler */}
        <div
          className="flex border-b border-dust-600/25 bg-dust-900 sticky top-0 z-10"
          style={{ height: RULER_HEIGHT }}
        >
          {/* Label gutter */}
          <div
            className="shrink-0 border-r border-dust-600/25 flex items-center px-2"
            style={{ width: TRACK_LABEL_WIDTH }}
          >
            <span className="text-[10px] text-dust-500 uppercase tracking-wider">Tracks</span>
          </div>

          {/* Ruler ticks */}
          <div className="flex-1 relative">
            {ticks.map(t => {
              const pct = (t / duration) * 100
              const isWhole = t % 1 === 0
              return (
                <div
                  key={t}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${pct}%` }}
                >
                  <div
                    className={`w-px ${isWhole ? 'h-3 bg-dust-400' : 'h-2 bg-dust-600'}`}
                  />
                  {isWhole && (
                    <span className="text-[9px] text-dust-500 mt-0.5 tabular-nums">
                      {t.toFixed(0)}s
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Track rows */}
        {sortedTracks.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-dust-500">
            No tracks. Click &quot;Capture Keyframe&quot; or select an object and click &quot;+ Add Track&quot;.
          </div>
        ) : (
          sortedTracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              objectName={getObjectName(track.objectId)}
              duration={duration}
              isCamera={isCameraTrack(track)}
              onRemove={removeTrack}
              onKeyframeClick={handleKeyframeClick}
              onKeyframeRightClick={handleKeyframeRightClick}
              onTrackDoubleClick={handleTrackDoubleClick}
            />
          ))
        )}

        {/* Playhead */}
        <PlayheadLine
          percent={playheadPercent}
          labelWidth={TRACK_LABEL_WIDTH}
          isDragging={isDragging}
        />

        {/* Curves editor popup */}
        {curveEditor && (
          <div style={{ position: 'fixed', left: curveEditor.x - 128, top: curveEditor.y - 320, zIndex: 100 }}>
            <AnimationCurvesEditor
              trackId={curveEditor.trackId}
              keyframeId={curveEditor.keyframeId}
              onClose={() => setCurveEditor(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Playhead overlay ──────────────────────────────────────────────────────

function PlayheadLine({
  percent,
  labelWidth,
  isDragging,
}: {
  percent: number
  labelWidth: number
  isDragging: boolean
}) {
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-20"
      style={{ left: labelWidth, right: 0 }}
    >
      <div
        className={`absolute top-0 bottom-0 w-0.5 ${isDragging ? 'bg-rust-400' : 'bg-rust-500'}`}
        style={{ left: `${percent}%` }}
      >
        {/* Playhead handle at top */}
        <div className="absolute -top-0.5 -left-1 w-2.5 h-2 bg-rust-500 rounded-b-sm" />
      </div>
    </div>
  )
}

// ── Track row ─────────────────────────────────────────────────────────────

function TrackRow({
  track,
  objectName,
  duration,
  isCamera,
  onRemove,
  onKeyframeClick,
  onKeyframeRightClick,
  onTrackDoubleClick,
}: {
  track: AnimationTrack
  objectName: string
  duration: number
  isCamera: boolean
  onRemove: (trackId: string) => void
  onKeyframeClick: (trackId: string, keyframeId: string, e: globalThis.MouseEvent) => void
  onKeyframeRightClick: (trackId: string, keyframeId: string, e: globalThis.MouseEvent) => void
  onTrackDoubleClick: (trackId: string, e: globalThis.MouseEvent) => void
}) {
  const handleRemove = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onRemove(track.id)
    },
    [track.id, onRemove],
  )

  // For camera tracks, deduplicate diamonds by time (cameraPosition+cameraTarget come in pairs)
  const displayKeyframes = useMemo(() => {
    if (!isCamera) return track.keyframes

    const seenTimes = new Set<string>()
    return track.keyframes.filter(kf => {
      const timeKey = kf.time.toFixed(4)
      if (seenTimes.has(timeKey)) return false
      seenTimes.add(timeKey)
      return true
    })
  }, [isCamera, track.keyframes])

  return (
    <div
      className="flex border-b border-dust-700/50 hover:bg-dust-600/15 transition-colors"
      style={{ height: TRACK_HEIGHT }}
    >
      {/* Track label */}
      <div
        className="shrink-0 border-r border-dust-600/25 flex items-center gap-1 px-2 overflow-hidden"
        style={{ width: TRACK_LABEL_WIDTH }}
      >
        {isCamera && (
          <span className="text-cyan-400 text-[10px] mr-0.5">🎥</span>
        )}
        <span
          className={`text-xs truncate flex-1 ${isCamera ? 'text-cyan-300 font-medium' : 'text-sand-200'}`}
          title={objectName}
        >
          {objectName}
        </span>
        {!isCamera && (
          <button
            onClick={handleRemove}
            aria-label={`Remove track for ${objectName}`}
            className="text-[10px] text-dust-500 hover:text-rust-400 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* Keyframe lane - double-click to add keyframe */}
      <div
        className="flex-1 relative"
        onDoubleClick={e => onTrackDoubleClick(track.id, e.nativeEvent)}
      >
        {displayKeyframes.map(kf => {
          const pct = duration > 0 ? (kf.time / duration) * 100 : 0
          return (
            <div
              key={kf.id}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] leading-none cursor-pointer hover:scale-150 transition-transform ${
                isCamera
                  ? 'text-cyan-400 hover:text-cyan-300'
                  : 'text-sunset-400 hover:text-sunset-300'
              }`}
              style={{ left: `${pct}%` }}
              title={isCamera
                ? `Camera @ ${kf.time.toFixed(2)}s - Click: edit easing, Right-click: delete`
                : `${kf.property} @ ${kf.time.toFixed(2)}s (${kf.easing}) - Click: edit easing, Right-click: delete`
              }
              onClick={e => onKeyframeClick(track.id, kf.id, e.nativeEvent)}
              onContextMenu={e => onKeyframeRightClick(track.id, kf.id, e.nativeEvent)}
            >
              ◆
            </div>
          )
        })}
      </div>
    </div>
  )
}
