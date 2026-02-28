import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from '../stores/useSceneStore'
import { usePostProcessingStore, createDefaultPostProcessing } from '../stores/usePostProcessingStore'
import { useAnimationStore } from '../stores/useAnimationStore'
import { resetKeyframeIdCounter, evaluateTrack } from './animation'
import { serializeScene, deserializeScene } from './serialization'
import type { SceneData } from '../types/scene'

function resetStores() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
  usePostProcessingStore.setState(createDefaultPostProcessing())
  useAnimationStore.setState({
    tracks: [],
    duration: 5,
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    loop: true,
  })
  resetKeyframeIdCounter()
}

describe('Phase 4 Workflow Integration', () => {
  beforeEach(() => {
    resetStores()
  })

  describe('scene creation -> effects -> animation -> save -> reload', () => {
    it('full E2E workflow: create, configure, animate, save, load', () => {
      // 1. Create scene objects
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      const objects = useSceneStore.getState().objects
      expect(objects).toHaveLength(2)

      // 2. Configure post-processing effects
      usePostProcessingStore.getState().setEnabled(true)
      usePostProcessingStore.getState().updateBloom({ enabled: true, intensity: 2, threshold: 0.7 })
      usePostProcessingStore.getState().updateVignette({ enabled: true, darkness: 0.6 })

      // 3. Create animation tracks for the box
      const boxId = objects[0].id
      const trackId = useAnimationStore.getState().addTrack(boxId)
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0.5, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 2, 'position', { x: 5, y: 0.5, z: 0 }, 'easeInOut')
      useAnimationStore.getState().addKeyframe(trackId, 0, 'rotation', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 2, 'rotation', { x: 0, y: 3.14, z: 0 })
      useAnimationStore.getState().setDuration(4)

      // 4. Save scene
      const sceneData = useSceneStore.getState().saveScene('Animated Scene')

      // Verify saved data
      expect(sceneData.metadata.name).toBe('Animated Scene')
      expect(sceneData.objects).toHaveLength(2)
      expect(sceneData.postProcessing).toBeDefined()
      expect(sceneData.postProcessing!.enabled).toBe(true)
      expect(sceneData.postProcessing!.bloom.enabled).toBe(true)
      expect(sceneData.animationTracks).toBeDefined()
      expect(sceneData.animationTracks!).toHaveLength(1)
      expect(sceneData.animationTracks![0].keyframes).toHaveLength(4)

      // 5. Serialize to JSON and back
      const json = serializeScene(sceneData)
      const restored = deserializeScene(json)

      // 6. Clear everything
      useSceneStore.getState().clearScene()
      usePostProcessingStore.getState().resetDefaults()
      useAnimationStore.getState().clearAll()

      expect(useSceneStore.getState().objects).toHaveLength(0)
      expect(usePostProcessingStore.getState().enabled).toBe(false)
      expect(useAnimationStore.getState().tracks).toHaveLength(0)

      // 7. Load restored data
      useSceneStore.getState().loadScene(restored)

      // 8. Verify everything was restored
      expect(useSceneStore.getState().objects).toHaveLength(2)
      expect(useSceneStore.getState().objects[0].type).toBe('box')
      expect(useSceneStore.getState().objects[1].type).toBe('sphere')

      expect(usePostProcessingStore.getState().enabled).toBe(true)
      expect(usePostProcessingStore.getState().bloom.enabled).toBe(true)
      expect(usePostProcessingStore.getState().bloom.intensity).toBe(2)
      expect(usePostProcessingStore.getState().vignette.enabled).toBe(true)

      expect(useAnimationStore.getState().tracks).toHaveLength(1)
      expect(useAnimationStore.getState().tracks[0].keyframes).toHaveLength(4)
    })
  })

  describe('animation evaluation with scene objects', () => {
    it('evaluates track at different times and gets correct interpolated values', () => {
      useSceneStore.getState().addObject('box')
      const boxId = useSceneStore.getState().objects[0].id

      const trackId = useAnimationStore.getState().addTrack(boxId)
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 4, 'position', { x: 8, y: 4, z: 0 }, 'linear')

      const track = useAnimationStore.getState().tracks[0]

      // At t=0
      const at0 = evaluateTrack(track, 0)
      expect(at0.position).toEqual({ x: 0, y: 0, z: 0 })

      // At t=2 (midpoint)
      const at2 = evaluateTrack(track, 2)
      expect(at2.position!.x).toBeCloseTo(4)
      expect(at2.position!.y).toBeCloseTo(2)

      // At t=4
      const at4 = evaluateTrack(track, 4)
      expect(at4.position).toEqual({ x: 8, y: 4, z: 0 })
    })
  })

  describe('object deletion cleans up animation tracks', () => {
    it('removing an object also allows cleaning up its animation tracks', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      const boxId = useSceneStore.getState().objects[0].id

      const trackId = useAnimationStore.getState().addTrack(boxId)
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })

      expect(useAnimationStore.getState().hasKeyframes(boxId)).toBe(true)

      // Remove the box
      useSceneStore.getState().removeObject(boxId)
      // Clean up animation tracks for the deleted object
      useAnimationStore.getState().removeTracksForObject(boxId)

      expect(useAnimationStore.getState().hasKeyframes(boxId)).toBe(false)
      expect(useAnimationStore.getState().tracks).toHaveLength(0)
    })
  })

  describe('post-processing settings survive undo/redo cycle', () => {
    it('post-processing is in separate store, not affected by undo/redo of scene objects', () => {
      usePostProcessingStore.getState().setEnabled(true)
      usePostProcessingStore.getState().updateBloom({ enabled: true, intensity: 3 })

      // Add and undo an object
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().objects).toHaveLength(1)

      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)

      // PP settings should be unaffected
      expect(usePostProcessingStore.getState().enabled).toBe(true)
      expect(usePostProcessingStore.getState().bloom.intensity).toBe(3)
    })
  })

  describe('save/load preserves version 3 schema', () => {
    it('saved scenes have version 3', () => {
      useSceneStore.getState().addObject('box')
      const data = useSceneStore.getState().saveScene('V3 Test')
      expect(data.metadata.version).toBe(3)
    })
  })

  describe('loading a Phase 3 scene into Phase 4', () => {
    it('loads Phase 3 scene without errors (no PP, no animation)', () => {
      const phase3Data: SceneData = {
        metadata: { name: 'Phase 3 Scene', version: 1, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
        objects: [
          {
            id: 'obj_1',
            name: 'Box 1',
            type: 'box',
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#c49a5c',
            visible: true,
            locked: false,
            material: { type: 'standard', color: '#c49a5c', opacity: 1, transparent: false, wireframe: false, metalness: 0.1, roughness: 0.7 },
          },
        ],
        environment: {
          backgroundColor: '#1a1108',
          fogEnabled: false,
          fogColor: '#8c7b6a',
          fogNear: 10,
          fogFar: 50,
          gridVisible: true,
          gridSize: 10,
        },
      }

      useSceneStore.getState().loadScene(phase3Data)

      expect(useSceneStore.getState().objects).toHaveLength(1)
      expect(useSceneStore.getState().objects[0].name).toBe('Box 1')
      // PP and animation stores should remain at defaults
      expect(usePostProcessingStore.getState().enabled).toBe(false)
      expect(useAnimationStore.getState().tracks).toHaveLength(0)
    })
  })

  describe('multiple tracks for different objects', () => {
    it('supports independent animation tracks for multiple objects', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      const [box, sphere] = useSceneStore.getState().objects

      const boxTrackId = useAnimationStore.getState().addTrack(box.id)
      const sphereTrackId = useAnimationStore.getState().addTrack(sphere.id)

      useAnimationStore.getState().addKeyframe(boxTrackId, 0, 'position', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(boxTrackId, 2, 'position', { x: 5, y: 0, z: 0 })

      useAnimationStore.getState().addKeyframe(sphereTrackId, 0, 'scale', { x: 1, y: 1, z: 1 })
      useAnimationStore.getState().addKeyframe(sphereTrackId, 2, 'scale', { x: 3, y: 3, z: 3 })

      expect(useAnimationStore.getState().tracks).toHaveLength(2)
      expect(useAnimationStore.getState().hasKeyframes(box.id)).toBe(true)
      expect(useAnimationStore.getState().hasKeyframes(sphere.id)).toBe(true)

      // Evaluate independently
      const boxTrack = useAnimationStore.getState().getTrackForObject(box.id)!
      const sphereTrack = useAnimationStore.getState().getTrackForObject(sphere.id)!

      const boxAt1 = evaluateTrack(boxTrack, 1)
      expect(boxAt1.position!.x).toBeCloseTo(2.5)
      expect(boxAt1.scale).toBeUndefined() // box has no scale keyframes

      const sphereAt1 = evaluateTrack(sphereTrack, 1)
      expect(sphereAt1.scale!.x).toBeCloseTo(2)
      expect(sphereAt1.position).toBeUndefined() // sphere has no position keyframes
    })
  })
})
