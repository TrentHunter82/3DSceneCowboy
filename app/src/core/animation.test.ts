import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyEasing,
  lerpVec3,
  interpolateKeyframes,
  getPropertyKeyframes,
  evaluateTrack,
  generateKeyframeId,
  generateTrackId,
  resetKeyframeIdCounter,
  CAMERA_TRACK_OBJECT_ID,
  isCameraTrack,
} from './animation'
import type { AnimationKeyframe, AnimationTrack } from '../types/scene'

describe('animation', () => {
  beforeEach(() => {
    resetKeyframeIdCounter()
  })

  describe('applyEasing', () => {
    it('linear easing returns input unchanged', () => {
      expect(applyEasing(0, 'linear')).toBe(0)
      expect(applyEasing(0.5, 'linear')).toBe(0.5)
      expect(applyEasing(1, 'linear')).toBe(1)
    })

    it('easeIn starts slow (quadratic)', () => {
      expect(applyEasing(0, 'easeIn')).toBe(0)
      expect(applyEasing(0.5, 'easeIn')).toBe(0.25) // 0.5^2
      expect(applyEasing(1, 'easeIn')).toBe(1)
    })

    it('easeOut starts fast', () => {
      expect(applyEasing(0, 'easeOut')).toBe(0)
      expect(applyEasing(0.5, 'easeOut')).toBe(0.75) // 0.5*(2-0.5)
      expect(applyEasing(1, 'easeOut')).toBe(1)
    })

    it('easeInOut is symmetric', () => {
      expect(applyEasing(0, 'easeInOut')).toBe(0)
      expect(applyEasing(1, 'easeInOut')).toBe(1)
      // At midpoint (0.5): 2 * 0.5^2 = 0.5
      expect(applyEasing(0.5, 'easeInOut')).toBe(0.5)
    })

    it('easeInOut first half is slow, second half is fast', () => {
      const quarter = applyEasing(0.25, 'easeInOut')
      const half = applyEasing(0.5, 'easeInOut')
      const threeQuarter = applyEasing(0.75, 'easeInOut')

      // First half (easeIn behavior)
      expect(quarter).toBeLessThan(0.25)
      // Second half (easeOut behavior)
      expect(threeQuarter).toBeGreaterThan(0.75)
      expect(half).toBe(0.5)
    })

    it('defaults to linear for unknown easing type', () => {
      // The switch has a default case that returns t (same as linear)
      expect(applyEasing(0.5, 'linear')).toBe(0.5)
    })
  })

  describe('lerpVec3', () => {
    it('returns a at t=0', () => {
      const result = lerpVec3({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 0)
      expect(result).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('returns b at t=1', () => {
      const result = lerpVec3({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 1)
      expect(result).toEqual({ x: 10, y: 20, z: 30 })
    })

    it('interpolates at t=0.5', () => {
      const result = lerpVec3({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, 0.5)
      expect(result).toEqual({ x: 5, y: 10, z: 15 })
    })

    it('works with negative values', () => {
      const result = lerpVec3({ x: -10, y: 0, z: 5 }, { x: 10, y: -10, z: -5 }, 0.5)
      expect(result).toEqual({ x: 0, y: -5, z: 0 })
    })

    it('extrapolates beyond t=1', () => {
      const result = lerpVec3({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, 2)
      expect(result.x).toBe(20)
    })
  })

  describe('interpolateKeyframes', () => {
    it('returns null for empty keyframes', () => {
      expect(interpolateKeyframes([], 0)).toBeNull()
    })

    it('returns single keyframe value regardless of time', () => {
      const kf: AnimationKeyframe = {
        id: 'kf_1', time: 1, property: 'position',
        value: { x: 5, y: 5, z: 5 }, easing: 'linear',
      }
      const result = interpolateKeyframes([kf], 0)
      expect(result).toEqual({ x: 5, y: 5, z: 5 })

      const result2 = interpolateKeyframes([kf], 100)
      expect(result2).toEqual({ x: 5, y: 5, z: 5 })
    })

    it('clamps to first keyframe before its time', () => {
      const keyframes: AnimationKeyframe[] = [
        { id: 'kf_1', time: 1, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_2', time: 3, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'linear' },
      ]
      const result = interpolateKeyframes(keyframes, 0)
      expect(result).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('clamps to last keyframe after its time', () => {
      const keyframes: AnimationKeyframe[] = [
        { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_2', time: 2, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'linear' },
      ]
      const result = interpolateKeyframes(keyframes, 5)
      expect(result).toEqual({ x: 10, y: 0, z: 0 })
    })

    it('linearly interpolates between two keyframes', () => {
      const keyframes: AnimationKeyframe[] = [
        { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_2', time: 2, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'linear' },
      ]
      const result = interpolateKeyframes(keyframes, 1)
      expect(result).toEqual({ x: 5, y: 0, z: 0 })
    })

    it('uses easing from the target keyframe', () => {
      const keyframes: AnimationKeyframe[] = [
        { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_2', time: 2, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'easeIn' },
      ]
      // At t=1 (midpoint), rawT = 0.5, easeIn(0.5) = 0.25
      const result = interpolateKeyframes(keyframes, 1)
      expect(result!.x).toBeCloseTo(2.5) // 0 + (10-0) * 0.25
    })

    it('interpolates between multiple keyframes correctly', () => {
      const keyframes: AnimationKeyframe[] = [
        { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_2', time: 1, property: 'position', value: { x: 5, y: 0, z: 0 }, easing: 'linear' },
        { id: 'kf_3', time: 3, property: 'position', value: { x: 15, y: 0, z: 0 }, easing: 'linear' },
      ]
      // Between kf_2 and kf_3: time=2, rawT = (2-1)/(3-1) = 0.5
      const result = interpolateKeyframes(keyframes, 2)
      expect(result!.x).toBeCloseTo(10) // 5 + (15-5) * 0.5
    })

    it('returns a copy, not a reference to keyframe value', () => {
      const kf: AnimationKeyframe = {
        id: 'kf_1', time: 0, property: 'position',
        value: { x: 5, y: 5, z: 5 }, easing: 'linear',
      }
      const result = interpolateKeyframes([kf], 0)
      result!.x = 999
      expect(kf.value.x).toBe(5)
    })
  })

  describe('getPropertyKeyframes', () => {
    it('filters keyframes by property', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 0, property: 'rotation', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_3', time: 1, property: 'position', value: { x: 5, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const posKfs = getPropertyKeyframes(track, 'position')
      expect(posKfs).toHaveLength(2)
      expect(posKfs[0].id).toBe('kf_1')
      expect(posKfs[1].id).toBe('kf_3')

      const rotKfs = getPropertyKeyframes(track, 'rotation')
      expect(rotKfs).toHaveLength(1)
    })

    it('returns sorted keyframes by time', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 2, property: 'position', value: { x: 2, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_3', time: 1, property: 'position', value: { x: 1, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const kfs = getPropertyKeyframes(track, 'position')
      expect(kfs[0].time).toBe(0)
      expect(kfs[1].time).toBe(1)
      expect(kfs[2].time).toBe(2)
    })

    it('returns empty array for property with no keyframes', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        ],
      }
      expect(getPropertyKeyframes(track, 'scale')).toEqual([])
    })
  })

  describe('evaluateTrack', () => {
    it('returns empty object for track with no keyframes', () => {
      const track: AnimationTrack = {
        id: 'track_1', objectId: 'obj_1', keyframes: [],
      }
      expect(evaluateTrack(track, 0)).toEqual({})
    })

    it('evaluates position only if position keyframes exist', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 2, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 1)
      expect(result.position).toEqual({ x: 5, y: 0, z: 0 })
      expect(result.rotation).toBeUndefined()
      expect(result.scale).toBeUndefined()
    })

    it('evaluates all three properties when all have keyframes', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 1, property: 'position', value: { x: 10, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_3', time: 0, property: 'rotation', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_4', time: 1, property: 'rotation', value: { x: 0, y: 3.14, z: 0 }, easing: 'linear' },
          { id: 'kf_5', time: 0, property: 'scale', value: { x: 1, y: 1, z: 1 }, easing: 'linear' },
          { id: 'kf_6', time: 1, property: 'scale', value: { x: 2, y: 2, z: 2 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 0.5)
      expect(result.position).toBeDefined()
      expect(result.rotation).toBeDefined()
      expect(result.scale).toBeDefined()
      expect(result.position!.x).toBeCloseTo(5)
      expect(result.rotation!.y).toBeCloseTo(1.57)
      expect(result.scale!.x).toBeCloseTo(1.5)
    })
  })

  describe('CAMERA_TRACK_OBJECT_ID', () => {
    it('is the string __camera__', () => {
      expect(CAMERA_TRACK_OBJECT_ID).toBe('__camera__')
    })
  })

  describe('isCameraTrack', () => {
    it('returns true for a track with the camera object ID', () => {
      const track: AnimationTrack = {
        id: 'track_1', objectId: CAMERA_TRACK_OBJECT_ID, keyframes: [],
      }
      expect(isCameraTrack(track)).toBe(true)
    })

    it('returns false for a regular object track', () => {
      const track: AnimationTrack = {
        id: 'track_1', objectId: 'obj_1', keyframes: [],
      }
      expect(isCameraTrack(track)).toBe(false)
    })

    it('returns false for an empty string objectId', () => {
      const track: AnimationTrack = {
        id: 'track_1', objectId: '', keyframes: [],
      }
      expect(isCameraTrack(track)).toBe(false)
    })
  })

  describe('evaluateTrack - camera tracks', () => {
    it('evaluates cameraPosition and cameraTarget for a camera track', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: CAMERA_TRACK_OBJECT_ID,
        keyframes: [
          { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 5, z: 10 }, easing: 'linear' },
          { id: 'kf_2', time: 2, property: 'cameraPosition', value: { x: 10, y: 5, z: 0 }, easing: 'linear' },
          { id: 'kf_3', time: 0, property: 'cameraTarget', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_4', time: 2, property: 'cameraTarget', value: { x: 5, y: 1, z: 0 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 1)
      expect(result.cameraPosition).toEqual({ x: 5, y: 5, z: 5 })
      expect(result.cameraTarget).toEqual({ x: 2.5, y: 0.5, z: 0 })
    })

    it('does not return position/rotation/scale for camera tracks', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: CAMERA_TRACK_OBJECT_ID,
        keyframes: [
          { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 5, z: 10 }, easing: 'linear' },
          { id: 'kf_2', time: 1, property: 'cameraTarget', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 0)
      expect(result.position).toBeUndefined()
      expect(result.rotation).toBeUndefined()
      expect(result.scale).toBeUndefined()
    })

    it('does not return cameraPosition/cameraTarget for object tracks', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: 'obj_1',
        keyframes: [
          { id: 'kf_1', time: 0, property: 'position', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 1, property: 'position', value: { x: 5, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 0.5)
      expect(result.cameraPosition).toBeUndefined()
      expect(result.cameraTarget).toBeUndefined()
      expect(result.position).toBeDefined()
    })

    it('returns empty object for camera track with no keyframes', () => {
      const track: AnimationTrack = {
        id: 'track_1', objectId: CAMERA_TRACK_OBJECT_ID, keyframes: [],
      }
      expect(evaluateTrack(track, 0)).toEqual({})
    })

    it('evaluates camera track with only cameraPosition (no cameraTarget)', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: CAMERA_TRACK_OBJECT_ID,
        keyframes: [
          { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 5, z: 10 }, easing: 'linear' },
        ],
      }

      const result = evaluateTrack(track, 0)
      expect(result.cameraPosition).toEqual({ x: 0, y: 5, z: 10 })
      expect(result.cameraTarget).toBeUndefined()
    })

    it('interpolates camera position with easing', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: CAMERA_TRACK_OBJECT_ID,
        keyframes: [
          { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 2, property: 'cameraPosition', value: { x: 10, y: 0, z: 0 }, easing: 'easeIn' },
        ],
      }

      // At t=1 (midpoint), rawT = 0.5, easeIn(0.5) = 0.25
      const result = evaluateTrack(track, 1)
      expect(result.cameraPosition!.x).toBeCloseTo(2.5)
    })
  })

  describe('getPropertyKeyframes - camera properties', () => {
    it('filters cameraPosition keyframes', () => {
      const track: AnimationTrack = {
        id: 'track_1',
        objectId: CAMERA_TRACK_OBJECT_ID,
        keyframes: [
          { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_2', time: 0, property: 'cameraTarget', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
          { id: 'kf_3', time: 1, property: 'cameraPosition', value: { x: 5, y: 0, z: 0 }, easing: 'linear' },
        ],
      }

      const posKfs = getPropertyKeyframes(track, 'cameraPosition')
      expect(posKfs).toHaveLength(2)

      const tgtKfs = getPropertyKeyframes(track, 'cameraTarget')
      expect(tgtKfs).toHaveLength(1)
    })
  })

  describe('ID generation', () => {
    it('generateKeyframeId returns unique IDs', () => {
      const id1 = generateKeyframeId()
      const id2 = generateKeyframeId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^kf_/)
      expect(id2).toMatch(/^kf_/)
    })

    it('generateTrackId returns unique IDs', () => {
      const id1 = generateTrackId()
      const id2 = generateTrackId()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^track_/)
      expect(id2).toMatch(/^track_/)
    })

    it('resetKeyframeIdCounter resets the counter', () => {
      generateKeyframeId()
      generateKeyframeId()
      resetKeyframeIdCounter()
      const id = generateKeyframeId()
      expect(id).toMatch(/^kf_\d+_1$/)
    })
  })
})
