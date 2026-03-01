import { useCallback, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { CameraControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { useSceneStore } from '../stores/useSceneStore'
import { useUIStore } from '../stores/useUIStore'
import { usePostProcessingStore } from '../stores/usePostProcessingStore'
import { useCameraStore } from '../stores/useCameraStore'
import { useCameraPathStore } from '../stores/useCameraPathStore'
import { useAnimationStore } from '../stores/useAnimationStore'
import { evaluatePath } from '../core/cameraPath'
import { isCameraTrack } from '../core/animation'
import type { CameraPath as CoreCameraPath } from '../core/cameraPath'
import { SceneObject3D } from './SceneObject3D'
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu'
import { StatsCollector, SceneStatsOverlay } from './ui/SceneStats'
import { PostProcessingEffects } from './PostProcessing'
import { TimelinePlayback, TimelineScrubInvalidator } from './TimelinePlayback'

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#070707" roughness={0.97} metalness={0.03} />
    </mesh>
  )
}

function SceneFog() {
  const fogEnabled = useSceneStore(s => s.environment.fogEnabled)
  const fogColor = useSceneStore(s => s.environment.fogColor)
  const fogNear = useSceneStore(s => s.environment.fogNear)
  const fogFar = useSceneStore(s => s.environment.fogFar)

  if (!fogEnabled) return null
  return <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
}

function SceneGrid() {
  const gridVisible = useSceneStore(s => s.environment.gridVisible)
  const gridSize = useSceneStore(s => s.environment.gridSize)

  if (!gridVisible) return null
  return (
    <Grid
      position={[0, 0, 0]}
      args={[gridSize, gridSize]}
      cellSize={1}
      cellThickness={0.4}
      cellColor="#141414"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="rgba(255,255,255,0.04)"
      fadeDistance={35}
      fadeStrength={1.0}
      infiniteGrid
    />
  )
}

// Invalidates the demand-mode canvas when store state changes
function StoreInvalidator() {
  const invalidate = useThree(s => s.invalidate)
  const objects = useSceneStore(s => s.objects)
  const selectedId = useSceneStore(s => s.selectedId)
  const selectedIds = useSceneStore(s => s.selectedIds)
  const environment = useSceneStore(s => s.environment)
  const toolMode = useSceneStore(s => s.toolMode)

  // Also invalidate when post-processing settings change
  const ppEnabled = usePostProcessingStore(s => s.enabled)
  const bloom = usePostProcessingStore(s => s.bloom)
  const ssao = usePostProcessingStore(s => s.ssao)
  const vignette = usePostProcessingStore(s => s.vignette)

  // Invalidate when animation playback starts so useFrame loop kicks off
  const isPlaying = useAnimationStore(s => s.isPlaying)

  useEffect(() => {
    invalidate()
  }, [objects, selectedId, selectedIds, environment, toolMode, ppEnabled, bloom, ssao, vignette, isPlaying, invalidate])

  return null
}

// Bridges CameraControls ref to the camera store for preset support
function CameraControlsBridge() {
  const setControlsRef = useCameraStore(s => s.setControlsRef)
  const invalidate = useThree(s => s.invalidate)

  // Callback ref ensures store is updated exactly when CameraControls mounts/unmounts
  const callbackRef = useCallback((controls: CameraControlsImpl | null) => {
    setControlsRef(controls)
  }, [setControlsRef])

  const handleChange = useCallback(() => invalidate(), [invalidate])

  return (
    <CameraControls
      ref={callbackRef}
      makeDefault
      smoothTime={0.25}
      draggingSmoothTime={0.125}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={2}
      maxDistance={50}
      onChange={handleChange}
    />
  )
}

// Drives the camera along an active camera path during playback
function CameraPathPlayback() {
  const controlsRef = useCameraStore(s => s.controlsRef)
  const playbackState = useCameraPathStore(s => s.playbackState)
  const playbackTime = useCameraPathStore(s => s.playbackTime)
  const invalidate = useThree(s => s.invalidate)
  const lastTimeRef = useRef(0)

  useFrame((_, delta) => {
    if (playbackState !== 'playing' || !controlsRef) return

    // Yield to animation timeline when it's playing with a camera track
    const animState = useAnimationStore.getState()
    if (animState.isPlaying && animState.tracks.some(isCameraTrack)) return

    const path = useCameraPathStore.getState().getActivePath()
    if (!path || path.points.length < 2) return

    // Advance playback time
    const newTime = playbackTime + delta
    const shouldLoop = path.loop && newTime >= path.duration
    const clampedTime = shouldLoop ? 0 : Math.min(newTime, path.duration)

    // Stop at end if not looping
    if (!path.loop && newTime >= path.duration) {
      useCameraPathStore.getState().stop()
      return
    }

    useCameraPathStore.getState().setPlaybackTime(clampedTime)

    // Convert store path format to core evaluator format
    const corePath: CoreCameraPath = {
      id: path.id,
      name: path.name,
      duration: path.duration,
      loop: path.loop,
      tension: path.points[0]?.tension ?? 0.5,
      points: path.points.map(pt => ({
        id: pt.id,
        position: pt.position,
        lookAt: pt.target,
        fov: 50,
        time: pt.time,
      })),
    }

    const state = evaluatePath(corePath, clampedTime)

    controlsRef.setLookAt(
      state.position.x, state.position.y, state.position.z,
      state.lookAt.x, state.lookAt.y, state.lookAt.z,
      false, // no smooth transition during playback
    )
    invalidate()
  })

  // Also invalidate when playbackTime changes manually (scrubbing)
  useEffect(() => {
    if (playbackState === 'playing') return // useFrame handles this
    if (!controlsRef) return

    const path = useCameraPathStore.getState().getActivePath()
    if (!path || path.points.length < 2) return

    const corePath: CoreCameraPath = {
      id: path.id,
      name: path.name,
      duration: path.duration,
      loop: path.loop,
      tension: path.points[0]?.tension ?? 0.5,
      points: path.points.map(pt => ({
        id: pt.id,
        position: pt.position,
        lookAt: pt.target,
        fov: 50,
        time: pt.time,
      })),
    }

    const state = evaluatePath(corePath, playbackTime)

    controlsRef.setLookAt(
      state.position.x, state.position.y, state.position.z,
      state.lookAt.x, state.lookAt.y, state.lookAt.z,
      false,
    )
    invalidate()
    lastTimeRef.current = playbackTime
  }, [playbackTime, playbackState, controlsRef, invalidate])

  return null
}

function SceneBackground() {
  const bg = useSceneStore(s => s.environment.backgroundColor)
  return <color attach="background" args={[bg]} />
}

function SceneContent() {
  const objects = useSceneStore(s => s.objects)
  const selectObject = useSceneStore(s => s.selectObject)

  return (
    <>
      {/* Lighting — industrial studio */}
      <ambientLight intensity={0.2} color="#e0d8e8" />
      <directionalLight
        position={[5, 10, 4]}
        intensity={1.0}
        castShadow
        color="#ffffff"
      />
      <directionalLight
        position={[-4, 6, -3]}
        intensity={0.2}
        color="#88ccff"
      />
      {/* Subtle warm rim from below-right */}
      <pointLight position={[8, 0.5, 0]} intensity={0.12} color="#e8e0d8" distance={20} decay={2} />
      {/* Cool fill from back-left */}
      <pointLight position={[-6, 2, -6]} intensity={0.06} color="#d0d0e0" distance={15} decay={2} />

      {/* Environment — dark studio, no visible background */}
      <Environment preset="night" background={false} />

      {/* Fog */}
      <SceneFog />

      {/* Ground */}
      <GroundPlane />

      {/* Grid */}
      <SceneGrid />

      {/* Scene objects */}
      {objects.map(obj => (
        <SceneObject3D key={obj.id} obj={obj} />
      ))}

      {/* Click empty space to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={() => selectObject(null)}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      {/* Camera Controls (replaces OrbitControls for smooth preset transitions) */}
      <CameraControlsBridge />

      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="#e0e0e0" axisHeadScale={0.8} />
      </GizmoHelper>

      {/* Scene background color — reactive to store */}
      <SceneBackground />

      {/* Post-processing effects */}
      <PostProcessingEffects />

      {/* Animation playback */}
      <TimelinePlayback />
      <TimelineScrubInvalidator />

      {/* Camera path playback */}
      <CameraPathPlayback />

      {/* Stats collector (writes FPS/draw calls to shared ref) */}
      <StatsCollector />

      {/* Invalidate canvas on store changes (demand frameloop) */}
      <StoreInvalidator />
    </>
  )
}

function ViewportOverlay() {
  const selectedId = useSceneStore(s => s.selectedId)
  const selectedIds = useSceneStore(s => s.selectedIds)
  const objects = useSceneStore(s => s.objects)
  const toolMode = useSceneStore(s => s.toolMode)

  const selected = objects.find(o => o.id === selectedId)

  return (
    <>
      {/* Selected object info - top left HUD badge */}
      {selected && (
        <div
          className="absolute top-2.5 left-2.5 bg-dust-900/95 border border-dust-600/30 rounded px-2.5 py-1 select-none pointer-events-none backdrop-blur-sm"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)' }}
        >
          <span className="text-sand-200 text-[11px] font-medium tracking-wide">{selected.name}</span>
          {selected.locked && (
            <span className="text-sunset-400 text-[10px] ml-1.5 opacity-80">LOCKED</span>
          )}
          {selectedIds.length > 1 && (
            <span className="text-rust-400 text-[10px] ml-1.5 font-mono">+{selectedIds.length - 1}</span>
          )}
        </div>
      )}

      {/* Controls help - bottom left HUD */}
      <div className="absolute bottom-2.5 left-2.5 select-none pointer-events-none space-y-0.5">
        <div className="text-dust-500/70 text-[10px] font-mono tracking-wide">LMB Orbit · MMB Pan · Scroll Zoom</div>
        <div className="text-dust-600/50 text-[9px] font-mono tracking-wider">
          Q SEL · W MOV · E ROT · R SCL · DEL
        </div>
      </div>

      {/* Tool mode indicator - bottom right */}
      <div
        className="absolute bottom-2.5 right-2.5 bg-dust-900/90 border border-dust-600/30 rounded px-2.5 py-1 select-none pointer-events-none"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)' }}
      >
        <span className="text-rust-400/70 text-[10px] uppercase tracking-[0.1em] font-medium">
          {toolMode}
        </span>
      </div>

      {/* Scene statistics - top right */}
      <SceneStatsOverlay />
    </>
  )
}

function SceneContextMenu() {
  const contextMenu = useUIStore(s => s.contextMenu)
  const hideContextMenu = useUIStore(s => s.hideContextMenu)
  const objects = useSceneStore(s => s.objects)
  const updateObject = useSceneStore(s => s.updateObject)
  const removeObject = useSceneStore(s => s.removeObject)
  const duplicateObject = useSceneStore(s => s.duplicateObject)

  if (!contextMenu) return null

  const obj = objects.find(o => o.id === contextMenu.objectId)
  if (!obj) return null

  const items: ContextMenuItem[] = [
    {
      label: 'Duplicate',
      icon: '⧉',
      onClick: () => duplicateObject(obj.id),
    },
    {
      label: obj.visible ? 'Hide' : 'Show',
      icon: obj.visible ? '👁' : '—',
      onClick: () => updateObject(obj.id, { visible: !obj.visible }),
    },
    {
      label: obj.locked ? 'Unlock' : 'Lock',
      icon: obj.locked ? '🔓' : '🔒',
      onClick: () => updateObject(obj.id, { locked: !obj.locked }),
    },
    {
      label: '',
      icon: '',
      onClick: () => {},
      separator: true,
    },
    {
      label: 'Delete',
      icon: '✕',
      onClick: () => removeObject(obj.id),
      danger: true,
    },
  ]

  return (
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      items={items}
      onClose={hideContextMenu}
    />
  )
}

export function Viewport() {
  const hideContextMenu = useUIStore(s => s.hideContextMenu)
  const backgroundColor = useSceneStore(s => s.environment.backgroundColor)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="flex-1 relative"
      onContextMenu={handleContextMenu}
      onClick={hideContextMenu}
      role="region"
      aria-label="3D viewport"
    >
      <Canvas
        shadows
        frameloop="demand"
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: backgroundColor }}
      >
        <SceneContent />
      </Canvas>

      {/* Viewport overlays */}
      <ViewportOverlay />

      {/* Context menu */}
      <SceneContextMenu />
    </div>
  )
}
