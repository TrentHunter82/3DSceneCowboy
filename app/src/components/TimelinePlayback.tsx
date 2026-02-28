import { useFrame, useThree } from '@react-three/fiber'
import { useAnimationStore } from '../stores/useAnimationStore'
import { useSceneStore } from '../stores/useSceneStore'
import { useCameraStore } from '../stores/useCameraStore'
import { evaluateTrack, isCameraTrack } from '../core/animation'
import { useEffect, useRef } from 'react'

/**
 * Drives the animation timeline playback within the R3F render loop.
 * Must be placed inside <Canvas>.
 *
 * - Advances currentTime based on delta and playbackSpeed
 * - Evaluates animation tracks and applies values to scene objects via store
 * - Calls invalidate() for on-demand rendering
 */
export function TimelinePlayback() {
  const invalidate = useThree(s => s.invalidate)
  const savedSmoothTimeRef = useRef<number | null>(null)

  // Set smoothTime=0 on play start, restore on stop
  const isPlaying = useAnimationStore(s => s.isPlaying)
  useEffect(() => {
    const controlsRef = useCameraStore.getState().controlsRef
    if (!controlsRef) return

    if (isPlaying) {
      // Check if there's a camera track to drive
      const hasCamTrack = useAnimationStore.getState().tracks.some(isCameraTrack)
      if (hasCamTrack) {
        savedSmoothTimeRef.current = controlsRef.smoothTime
        controlsRef.smoothTime = 0
      }
    } else {
      // Restore smoothTime when playback stops
      if (savedSmoothTimeRef.current !== null) {
        controlsRef.smoothTime = savedSmoothTimeRef.current
        savedSmoothTimeRef.current = null
      }
    }
  }, [isPlaying])

  useFrame((_, delta) => {
    const animState = useAnimationStore.getState()
    if (!animState.isPlaying) return

    // Advance time
    let newTime = animState.currentTime + delta * animState.playbackSpeed

    if (newTime >= animState.duration) {
      if (animState.loop) {
        newTime = newTime % animState.duration
      } else {
        newTime = animState.duration
        useAnimationStore.setState({ isPlaying: false })
      }
    }

    // Update currentTime directly (no React re-render needed for 3D objects)
    useAnimationStore.setState({ currentTime: newTime })

    // Apply animation values to scene objects (and camera)
    applyAnimationValues(newTime, animState.tracks)

    // Request next frame for demand mode
    invalidate()
  })

  return null
}

/**
 * Apply interpolated animation values to scene objects and camera.
 * Called from useFrame and scrub invalidator — optimized for hot-path performance.
 */
function applyAnimationValues(
  time: number,
  tracks: ReturnType<typeof useAnimationStore.getState>['tracks'],
) {
  if (tracks.length === 0) return

  const sceneState = useSceneStore.getState()

  // Build a Map for O(1) object lookup instead of O(n) find per track
  const objectMap = new Map<string, number>()
  for (let i = 0; i < sceneState.objects.length; i++) {
    objectMap.set(sceneState.objects[i].id, i)
  }

  const updateMap = new Map<string, Partial<Pick<import('../types/scene').SceneObject, 'position' | 'rotation' | 'scale'>>>()

  for (const track of tracks) {
    // Handle camera tracks separately
    if (isCameraTrack(track)) {
      const values = evaluateTrack(track, time)
      const camPos = values.cameraPosition
      const camTarget = values.cameraTarget
      if (camPos && camTarget) {
        const controlsRef = useCameraStore.getState().controlsRef
        if (controlsRef) {
          controlsRef.setLookAt(
            camPos.x, camPos.y, camPos.z,
            camTarget.x, camTarget.y, camTarget.z,
            false,
          )
        }
      }
      continue
    }

    const values = evaluateTrack(track, time)

    // Check for any animated properties without Object.keys allocation
    const hasValues = values.position !== undefined || values.rotation !== undefined || values.scale !== undefined
    if (!hasValues) continue

    // Check object exists via Map
    if (!objectMap.has(track.objectId)) continue

    updateMap.set(track.objectId, values)
  }

  // Batch update objects without pushing to history (animation is ephemeral)
  if (updateMap.size > 0) {
    useSceneStore.setState(state => ({
      objects: state.objects.map(obj => {
        const changes = updateMap.get(obj.id)
        if (!changes) return obj
        return { ...obj, ...changes }
      }),
    }))
  }
}

/**
 * Renders as a child of Canvas. Subscribes to animation store
 * and invalidates the canvas when scrubbing (not playing).
 */
export function TimelineScrubInvalidator() {
  const invalidate = useThree(s => s.invalidate)
  const currentTime = useAnimationStore(s => s.currentTime)
  const isPlaying = useAnimationStore(s => s.isPlaying)
  const tracks = useAnimationStore(s => s.tracks)

  // When scrubbing (not playing), apply animation values and invalidate
  useEffect(() => {
    if (isPlaying) return
    if (tracks.length === 0) return

    applyAnimationValues(currentTime, tracks)
    invalidate()
  }, [currentTime, isPlaying, tracks, invalidate])

  return null
}
