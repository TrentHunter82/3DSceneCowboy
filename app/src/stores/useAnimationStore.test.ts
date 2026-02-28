import { describe, it, expect, beforeEach } from 'vitest'
import { useAnimationStore } from './useAnimationStore'
import { resetKeyframeIdCounter, CAMERA_TRACK_OBJECT_ID } from '../core/animation'

function resetStore() {
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

describe('useAnimationStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with empty tracks', () => {
      expect(useAnimationStore.getState().tracks).toEqual([])
    })

    it('starts with default duration of 5 seconds', () => {
      expect(useAnimationStore.getState().duration).toBe(5)
    })

    it('starts with currentTime at 0', () => {
      expect(useAnimationStore.getState().currentTime).toBe(0)
    })

    it('starts not playing', () => {
      expect(useAnimationStore.getState().isPlaying).toBe(false)
    })

    it('starts with playback speed 1x', () => {
      expect(useAnimationStore.getState().playbackSpeed).toBe(1)
    })

    it('starts with loop enabled', () => {
      expect(useAnimationStore.getState().loop).toBe(true)
    })
  })

  describe('track actions', () => {
    it('addTrack creates a new track for an object', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      expect(trackId).toBeTruthy()
      expect(trackId).toMatch(/^track_/)

      const tracks = useAnimationStore.getState().tracks
      expect(tracks).toHaveLength(1)
      expect(tracks[0].objectId).toBe('obj_1')
      expect(tracks[0].keyframes).toEqual([])
    })

    it('addTrack returns unique track IDs', () => {
      const id1 = useAnimationStore.getState().addTrack('obj_1')
      const id2 = useAnimationStore.getState().addTrack('obj_2')
      expect(id1).not.toBe(id2)
    })

    it('removeTrack removes a track by ID', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addTrack('obj_2')
      expect(useAnimationStore.getState().tracks).toHaveLength(2)

      useAnimationStore.getState().removeTrack(trackId)
      expect(useAnimationStore.getState().tracks).toHaveLength(1)
      expect(useAnimationStore.getState().tracks[0].objectId).toBe('obj_2')
    })

    it('removeTrack with non-existent ID does nothing', () => {
      useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().removeTrack('nonexistent')
      expect(useAnimationStore.getState().tracks).toHaveLength(1)
    })

    it('removeTracksForObject removes all tracks for an object', () => {
      useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addTrack('obj_2')

      useAnimationStore.getState().removeTracksForObject('obj_1')
      expect(useAnimationStore.getState().tracks).toHaveLength(1)
      expect(useAnimationStore.getState().tracks[0].objectId).toBe('obj_2')
    })
  })

  describe('keyframe actions', () => {
    let trackId: string

    beforeEach(() => {
      trackId = useAnimationStore.getState().addTrack('obj_1')
    })

    it('addKeyframe adds a keyframe to a track', () => {
      const kfId = useAnimationStore.getState().addKeyframe(
        trackId, 0, 'position', { x: 0, y: 0, z: 0 },
      )
      expect(kfId).toBeTruthy()
      expect(kfId).toMatch(/^kf_/)

      const track = useAnimationStore.getState().tracks[0]
      expect(track.keyframes).toHaveLength(1)
      expect(track.keyframes[0].time).toBe(0)
      expect(track.keyframes[0].property).toBe('position')
      expect(track.keyframes[0].value).toEqual({ x: 0, y: 0, z: 0 })
      expect(track.keyframes[0].easing).toBe('linear')
    })

    it('addKeyframe sorts keyframes by time', () => {
      useAnimationStore.getState().addKeyframe(trackId, 2, 'position', { x: 2, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 1, 'position', { x: 1, y: 0, z: 0 })

      const keyframes = useAnimationStore.getState().tracks[0].keyframes
      expect(keyframes[0].time).toBe(0)
      expect(keyframes[1].time).toBe(1)
      expect(keyframes[2].time).toBe(2)
    })

    it('addKeyframe uses custom easing', () => {
      useAnimationStore.getState().addKeyframe(
        trackId, 0, 'position', { x: 0, y: 0, z: 0 }, 'easeInOut',
      )
      expect(useAnimationStore.getState().tracks[0].keyframes[0].easing).toBe('easeInOut')
    })

    it('addKeyframe deep copies the value', () => {
      const value = { x: 1, y: 2, z: 3 }
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', value)
      value.x = 999
      expect(useAnimationStore.getState().tracks[0].keyframes[0].value.x).toBe(1)
    })

    it('updateKeyframe modifies a keyframe', () => {
      const kfId = useAnimationStore.getState().addKeyframe(
        trackId, 0, 'position', { x: 0, y: 0, z: 0 },
      )
      useAnimationStore.getState().updateKeyframe(trackId, kfId, {
        time: 1.5,
        easing: 'easeOut',
      })

      const kf = useAnimationStore.getState().tracks[0].keyframes[0]
      expect(kf.time).toBe(1.5)
      expect(kf.easing).toBe('easeOut')
    })

    it('updateKeyframe re-sorts keyframes by time', () => {
      const kf1 = useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().addKeyframe(trackId, 2, 'position', { x: 2, y: 0, z: 0 })

      // Move first keyframe to time 3 (should be after second)
      useAnimationStore.getState().updateKeyframe(trackId, kf1, { time: 3 })

      const keyframes = useAnimationStore.getState().tracks[0].keyframes
      expect(keyframes[0].time).toBe(2)
      expect(keyframes[1].time).toBe(3)
    })

    it('removeKeyframe removes a keyframe from a track', () => {
      const kfId = useAnimationStore.getState().addKeyframe(
        trackId, 0, 'position', { x: 0, y: 0, z: 0 },
      )
      useAnimationStore.getState().addKeyframe(trackId, 1, 'position', { x: 1, y: 0, z: 0 })

      useAnimationStore.getState().removeKeyframe(trackId, kfId)
      expect(useAnimationStore.getState().tracks[0].keyframes).toHaveLength(1)
      expect(useAnimationStore.getState().tracks[0].keyframes[0].time).toBe(1)
    })

    it('addKeyframe to non-existent track does not crash', () => {
      useAnimationStore.getState().addKeyframe('nonexistent', 0, 'position', { x: 0, y: 0, z: 0 })
      // Original track unchanged
      expect(useAnimationStore.getState().tracks[0].keyframes).toHaveLength(0)
    })
  })

  describe('playback actions', () => {
    it('play sets isPlaying to true', () => {
      useAnimationStore.getState().play()
      expect(useAnimationStore.getState().isPlaying).toBe(true)
    })

    it('pause sets isPlaying to false', () => {
      useAnimationStore.getState().play()
      useAnimationStore.getState().pause()
      expect(useAnimationStore.getState().isPlaying).toBe(false)
    })

    it('stop resets to time 0 and pauses', () => {
      useAnimationStore.getState().setCurrentTime(2.5)
      useAnimationStore.getState().play()
      useAnimationStore.getState().stop()

      expect(useAnimationStore.getState().isPlaying).toBe(false)
      expect(useAnimationStore.getState().currentTime).toBe(0)
    })

    it('togglePlayback toggles playing state', () => {
      expect(useAnimationStore.getState().isPlaying).toBe(false)
      useAnimationStore.getState().togglePlayback()
      expect(useAnimationStore.getState().isPlaying).toBe(true)
      useAnimationStore.getState().togglePlayback()
      expect(useAnimationStore.getState().isPlaying).toBe(false)
    })

    it('setCurrentTime sets the playhead position', () => {
      useAnimationStore.getState().setCurrentTime(3.5)
      expect(useAnimationStore.getState().currentTime).toBe(3.5)
    })

    it('setCurrentTime clamps to 0 (no negative time)', () => {
      useAnimationStore.getState().setCurrentTime(-5)
      expect(useAnimationStore.getState().currentTime).toBe(0)
    })

    it('setDuration sets timeline length', () => {
      useAnimationStore.getState().setDuration(10)
      expect(useAnimationStore.getState().duration).toBe(10)
    })

    it('setDuration enforces minimum of 0.1', () => {
      useAnimationStore.getState().setDuration(0)
      expect(useAnimationStore.getState().duration).toBe(0.1)

      useAnimationStore.getState().setDuration(-5)
      expect(useAnimationStore.getState().duration).toBe(0.1)
    })

    it('setPlaybackSpeed sets speed multiplier', () => {
      useAnimationStore.getState().setPlaybackSpeed(2)
      expect(useAnimationStore.getState().playbackSpeed).toBe(2)
    })

    it('setPlaybackSpeed clamps to [0.1, 4]', () => {
      useAnimationStore.getState().setPlaybackSpeed(0)
      expect(useAnimationStore.getState().playbackSpeed).toBe(0.1)

      useAnimationStore.getState().setPlaybackSpeed(10)
      expect(useAnimationStore.getState().playbackSpeed).toBe(4)
    })

    it('setLoop enables/disables loop', () => {
      useAnimationStore.getState().setLoop(false)
      expect(useAnimationStore.getState().loop).toBe(false)

      useAnimationStore.getState().setLoop(true)
      expect(useAnimationStore.getState().loop).toBe(true)
    })
  })

  describe('queries', () => {
    it('getTrackForObject returns the track for a given objectId', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      const track = useAnimationStore.getState().getTrackForObject('obj_1')
      expect(track).toBeDefined()
      expect(track!.id).toBe(trackId)
    })

    it('getTrackForObject returns undefined if no track exists', () => {
      const track = useAnimationStore.getState().getTrackForObject('nonexistent')
      expect(track).toBeUndefined()
    })

    it('hasKeyframes returns true when track has keyframes', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
      expect(useAnimationStore.getState().hasKeyframes('obj_1')).toBe(true)
    })

    it('hasKeyframes returns false when track has no keyframes', () => {
      useAnimationStore.getState().addTrack('obj_1')
      expect(useAnimationStore.getState().hasKeyframes('obj_1')).toBe(false)
    })

    it('hasKeyframes returns false when no track exists', () => {
      expect(useAnimationStore.getState().hasKeyframes('nonexistent')).toBe(false)
    })
  })

  describe('camera track queries', () => {
    it('getCameraTrack returns undefined when no camera track exists', () => {
      expect(useAnimationStore.getState().getCameraTrack()).toBeUndefined()
    })

    it('getCameraTrack returns the camera track', () => {
      useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)
      const track = useAnimationStore.getState().getCameraTrack()
      expect(track).toBeDefined()
      expect(track!.objectId).toBe(CAMERA_TRACK_OBJECT_ID)
    })

    it('getCameraTrack does not return regular object tracks', () => {
      useAnimationStore.getState().addTrack('obj_1')
      expect(useAnimationStore.getState().getCameraTrack()).toBeUndefined()
    })

    it('hasCameraTrack returns false when no camera track exists', () => {
      expect(useAnimationStore.getState().hasCameraTrack()).toBe(false)
    })

    it('hasCameraTrack returns true when camera track exists', () => {
      useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)
      expect(useAnimationStore.getState().hasCameraTrack()).toBe(true)
    })

    it('hasCameraTrack returns false with only regular tracks', () => {
      useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addTrack('obj_2')
      expect(useAnimationStore.getState().hasCameraTrack()).toBe(false)
    })
  })

  describe('captureSceneKeyframe', () => {
    const camPos = { x: 5, y: 5, z: 5 }
    const camTarget = { x: 0, y: 1, z: 0 }

    it('creates a camera track if none exists', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])
      expect(useAnimationStore.getState().hasCameraTrack()).toBe(true)
    })

    it('adds cameraPosition and cameraTarget keyframes to camera track', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes).toHaveLength(2)

      const posKf = track.keyframes.find(kf => kf.property === 'cameraPosition')
      const tgtKf = track.keyframes.find(kf => kf.property === 'cameraTarget')
      expect(posKf).toBeDefined()
      expect(tgtKf).toBeDefined()
      expect(posKf!.value).toEqual(camPos)
      expect(tgtKf!.value).toEqual(camTarget)
    })

    it('uses currentTime by default', () => {
      useAnimationStore.getState().setCurrentTime(2.5)
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].time).toBe(2.5)
      expect(track.keyframes[1].time).toBe(2.5)
    })

    it('uses explicit time when provided', () => {
      useAnimationStore.getState().setCurrentTime(0)
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 3.0)

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].time).toBe(3.0)
    })

    it('uses specified easing', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 0, 'easeInOut')

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].easing).toBe('easeInOut')
      expect(track.keyframes[1].easing).toBe('easeInOut')
    })

    it('defaults to linear easing', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].easing).toBe('linear')
    })

    it('creates object tracks for tracked objects', () => {
      const trackedObjects = [
        { id: 'obj_1', position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        { id: 'obj_2', position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 1, z: 0 }, scale: { x: 2, y: 2, z: 2 } },
      ]

      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, trackedObjects)

      const tracks = useAnimationStore.getState().tracks
      // camera track + 2 object tracks
      expect(tracks).toHaveLength(3)

      const obj1Track = tracks.find(t => t.objectId === 'obj_1')!
      expect(obj1Track.keyframes).toHaveLength(3) // position, rotation, scale
      expect(obj1Track.keyframes.find(kf => kf.property === 'position')!.value).toEqual({ x: 1, y: 0, z: 0 })
      expect(obj1Track.keyframes.find(kf => kf.property === 'rotation')!.value).toEqual({ x: 0, y: 0, z: 0 })
      expect(obj1Track.keyframes.find(kf => kf.property === 'scale')!.value).toEqual({ x: 1, y: 1, z: 1 })
    })

    it('does not duplicate camera track on second capture', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 0)
      useAnimationStore.getState().captureSceneKeyframe(
        { x: 10, y: 10, z: 10 }, { x: 1, y: 2, z: 3 }, [], 2,
      )

      const cameraTracks = useAnimationStore.getState().tracks.filter(
        t => t.objectId === CAMERA_TRACK_OBJECT_ID,
      )
      expect(cameraTracks).toHaveLength(1)

      // Should have 4 keyframes: 2 at t=0, 2 at t=2
      expect(cameraTracks[0].keyframes).toHaveLength(4)
    })

    it('upserts keyframes at the same time (replaces existing)', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 0)

      // Capture again at same time with different values
      const newPos = { x: 99, y: 99, z: 99 }
      const newTarget = { x: 1, y: 1, z: 1 }
      useAnimationStore.getState().captureSceneKeyframe(newPos, newTarget, [], 0)

      const track = useAnimationStore.getState().getCameraTrack()!
      // Should still be 2 keyframes (upserted, not duplicated)
      expect(track.keyframes).toHaveLength(2)

      const posKf = track.keyframes.find(kf => kf.property === 'cameraPosition')!
      expect(posKf.value).toEqual(newPos)

      const tgtKf = track.keyframes.find(kf => kf.property === 'cameraTarget')!
      expect(tgtKf.value).toEqual(newTarget)
    })

    it('upserts object keyframes at the same time', () => {
      const obj = { id: 'obj_1', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [obj], 0)

      // Update object position and capture again at same time
      const updatedObj = { ...obj, position: { x: 5, y: 5, z: 5 } }
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [updatedObj], 0)

      const objTrack = useAnimationStore.getState().tracks.find(t => t.objectId === 'obj_1')!
      // Still 3 keyframes (pos, rot, scale) — not 6
      expect(objTrack.keyframes).toHaveLength(3)

      const posKf = objTrack.keyframes.find(kf => kf.property === 'position')!
      expect(posKf.value).toEqual({ x: 5, y: 5, z: 5 })
    })

    it('reuses existing object track instead of creating a new one', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })

      const obj = { id: 'obj_1', position: { x: 5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [obj], 2)

      const obj1Tracks = useAnimationStore.getState().tracks.filter(t => t.objectId === 'obj_1')
      expect(obj1Tracks).toHaveLength(1)

      // Should have the original keyframe at t=0 + 3 new ones at t=2
      expect(obj1Tracks[0].keyframes).toHaveLength(4)
    })

    it('clamps keyframe time to [0, duration]', () => {
      useAnimationStore.getState().setDuration(5)
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 10)

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].time).toBe(5)
    })

    it('clamps negative time to 0', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], -1)

      const track = useAnimationStore.getState().getCameraTrack()!
      expect(track.keyframes[0].time).toBe(0)
    })

    it('deep copies camera position and target values', () => {
      const pos = { x: 1, y: 2, z: 3 }
      const tgt = { x: 4, y: 5, z: 6 }
      useAnimationStore.getState().captureSceneKeyframe(pos, tgt, [])

      // Mutate originals
      pos.x = 999
      tgt.x = 999

      const track = useAnimationStore.getState().getCameraTrack()!
      const posKf = track.keyframes.find(kf => kf.property === 'cameraPosition')!
      expect(posKf.value.x).toBe(1) // not 999
    })

    it('camera track is placed at the beginning of the tracks array', () => {
      // Add object track first
      useAnimationStore.getState().addTrack('obj_1')

      // Capture should place camera track before obj_1
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])

      const tracks = useAnimationStore.getState().tracks
      expect(tracks[0].objectId).toBe(CAMERA_TRACK_OBJECT_ID)
      expect(tracks[1].objectId).toBe('obj_1')
    })

    it('keyframes are sorted by time after capture', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 3)
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [], 1)

      const track = useAnimationStore.getState().getCameraTrack()!
      const times = track.keyframes.map(kf => kf.time)
      // Should be sorted: [1, 1, 3, 3] (cameraPosition and cameraTarget at each time)
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
      }
    })

    it('works with empty tracked objects array', () => {
      useAnimationStore.getState().captureSceneKeyframe(camPos, camTarget, [])

      const tracks = useAnimationStore.getState().tracks
      expect(tracks).toHaveLength(1) // only camera track
      expect(tracks[0].objectId).toBe(CAMERA_TRACK_OBJECT_ID)
    })
  })

  describe('serialization', () => {
    it('loadTracks loads tracks from data', () => {
      const tracks = [
        {
          id: 'track_1',
          objectId: 'obj_1',
          keyframes: [
            { id: 'kf_1', time: 0, property: 'position' as const, value: { x: 0, y: 0, z: 0 }, easing: 'linear' as const },
            { id: 'kf_2', time: 1, property: 'position' as const, value: { x: 5, y: 0, z: 0 }, easing: 'easeOut' as const },
          ],
        },
      ]
      useAnimationStore.getState().loadTracks(tracks, 10)

      const state = useAnimationStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].keyframes).toHaveLength(2)
      expect(state.duration).toBe(10)
      expect(state.currentTime).toBe(0)
      expect(state.isPlaying).toBe(false)
    })

    it('loadTracks deep clones tracks', () => {
      const tracks = [
        {
          id: 'track_1',
          objectId: 'obj_1',
          keyframes: [
            { id: 'kf_1', time: 0, property: 'position' as const, value: { x: 0, y: 0, z: 0 }, easing: 'linear' as const },
          ],
        },
      ]
      useAnimationStore.getState().loadTracks(tracks)

      // Mutate original
      tracks[0].keyframes[0].value.x = 999
      expect(useAnimationStore.getState().tracks[0].keyframes[0].value.x).toBe(0)
    })

    it('loadTracks defaults duration to 5 when not provided', () => {
      useAnimationStore.getState().loadTracks([])
      expect(useAnimationStore.getState().duration).toBe(5)
    })

    it('clearAll resets everything', () => {
      const trackId = useAnimationStore.getState().addTrack('obj_1')
      useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
      useAnimationStore.getState().setDuration(10)
      useAnimationStore.getState().setCurrentTime(3)
      useAnimationStore.getState().play()

      useAnimationStore.getState().clearAll()

      const state = useAnimationStore.getState()
      expect(state.tracks).toEqual([])
      expect(state.duration).toBe(5)
      expect(state.currentTime).toBe(0)
      expect(state.isPlaying).toBe(false)
    })
  })
})
