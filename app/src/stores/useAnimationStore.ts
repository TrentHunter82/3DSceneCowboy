import { create } from 'zustand'
import type { AnimationKeyframe, AnimationTrack, AnimatableProperty, EasingType, Vec3 } from '../types/scene'
import { generateKeyframeId, generateTrackId, CAMERA_TRACK_OBJECT_ID } from '../core/animation'

interface AnimationState {
  // Timeline data
  tracks: AnimationTrack[]
  duration: number        // total timeline duration in seconds
  currentTime: number     // playhead position

  // Playback state
  isPlaying: boolean
  playbackSpeed: number
  loop: boolean

  // Actions - tracks
  addTrack: (objectId: string) => string
  removeTrack: (trackId: string) => void
  removeTracksForObject: (objectId: string) => void

  // Actions - keyframes
  addKeyframe: (trackId: string, time: number, property: AnimatableProperty, value: Vec3, easing?: EasingType) => string
  updateKeyframe: (trackId: string, keyframeId: string, updates: Partial<AnimationKeyframe>) => void
  removeKeyframe: (trackId: string, keyframeId: string) => void

  // Actions - playback
  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  togglePlayback: () => void
  setDuration: (duration: number) => void
  setPlaybackSpeed: (speed: number) => void
  setLoop: (loop: boolean) => void

  // Queries
  getTrackForObject: (objectId: string) => AnimationTrack | undefined
  hasKeyframes: (objectId: string) => boolean
  getCameraTrack: () => AnimationTrack | undefined
  hasCameraTrack: () => boolean

  // Scene keyframe capture
  captureSceneKeyframe: (
    cameraPos: Vec3,
    cameraTarget: Vec3,
    trackedObjects: Array<{ id: string; position: Vec3; rotation: Vec3; scale: Vec3 }>,
    time?: number,
    easing?: EasingType,
  ) => void

  // Serialization helpers
  loadTracks: (tracks: AnimationTrack[], duration?: number) => void
  clearAll: () => void
}

export const useAnimationStore = create<AnimationState>((set, get) => ({
  tracks: [],
  duration: 5,
  currentTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  loop: true,

  // ── Track Actions ──────────────────────────────────────────────────

  addTrack: (objectId: string) => {
    const id = generateTrackId()
    set(state => ({
      tracks: [...state.tracks, { id, objectId, keyframes: [] }],
    }))
    return id
  },

  removeTrack: (trackId: string) => {
    set(state => ({
      tracks: state.tracks.filter(t => t.id !== trackId),
    }))
  },

  removeTracksForObject: (objectId: string) => {
    set(state => ({
      tracks: state.tracks.filter(t => t.objectId !== objectId),
    }))
  },

  // ── Keyframe Actions ──────────────────────────────────────────────

  addKeyframe: (trackId, time, property, value, easing = 'linear') => {
    const kfId = generateKeyframeId()
    set(state => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              keyframes: [...track.keyframes, { id: kfId, time, property, value: { ...value }, easing }]
                .sort((a, b) => a.time - b.time),
            }
          : track,
      ),
    }))
    return kfId
  },

  updateKeyframe: (trackId, keyframeId, updates) => {
    set(state => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              keyframes: track.keyframes
                .map(kf => kf.id === keyframeId ? { ...kf, ...updates } : kf)
                .sort((a, b) => a.time - b.time),
            }
          : track,
      ),
    }))
  },

  removeKeyframe: (trackId, keyframeId) => {
    set(state => ({
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? { ...track, keyframes: track.keyframes.filter(kf => kf.id !== keyframeId) }
          : track,
      ),
    }))
  },

  // ── Playback Actions ──────────────────────────────────────────────

  setCurrentTime: (time) => {
    const { duration } = get()
    set({ currentTime: Math.max(0, Math.min(duration, time)) })
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  stop: () => set({ isPlaying: false, currentTime: 0 }),

  togglePlayback: () => set(state => ({ isPlaying: !state.isPlaying })),

  setDuration: (duration) => set({ duration: Math.max(0.1, duration) }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(4, speed)) }),

  setLoop: (loop) => set({ loop }),

  // ── Queries ───────────────────────────────────────────────────────

  getTrackForObject: (objectId) => {
    return get().tracks.find(t => t.objectId === objectId)
  },

  hasKeyframes: (objectId) => {
    const track = get().tracks.find(t => t.objectId === objectId)
    return track ? track.keyframes.length > 0 : false
  },

  getCameraTrack: () => {
    return get().tracks.find(t => t.objectId === CAMERA_TRACK_OBJECT_ID)
  },

  hasCameraTrack: () => {
    return get().tracks.some(t => t.objectId === CAMERA_TRACK_OBJECT_ID)
  },

  // ── Scene Keyframe Capture ────────────────────────────────────────

  captureSceneKeyframe: (cameraPos, cameraTarget, trackedObjects, time, easing = 'linear') => {
    const captureTime = time ?? get().currentTime

    set(state => {
      const newTracks = [...state.tracks]

      // ── Helper: upsert keyframes into a track's keyframe array ──
      const upsertKeyframe = (
        keyframes: AnimationKeyframe[],
        t: number,
        property: AnimatableProperty,
        value: Vec3,
      ): AnimationKeyframe[] => {
        const TIME_THRESHOLD = 0.001
        // Remove existing keyframe at this time+property (upsert)
        const filtered = keyframes.filter(
          kf => !(kf.property === property && Math.abs(kf.time - t) < TIME_THRESHOLD),
        )
        filtered.push({
          id: generateKeyframeId(),
          time: Math.max(0, Math.min(state.duration, t)),
          property,
          value: { ...value },
          easing,
        })
        return filtered.sort((a, b) => a.time - b.time)
      }

      // ── Ensure camera track exists ──
      let cameraTrackIdx = newTracks.findIndex(t => t.objectId === CAMERA_TRACK_OBJECT_ID)
      if (cameraTrackIdx === -1) {
        newTracks.unshift({ id: generateTrackId(), objectId: CAMERA_TRACK_OBJECT_ID, keyframes: [] })
        cameraTrackIdx = 0
      }

      // Upsert camera keyframes
      let camKfs = newTracks[cameraTrackIdx].keyframes
      camKfs = upsertKeyframe(camKfs, captureTime, 'cameraPosition', cameraPos)
      camKfs = upsertKeyframe(camKfs, captureTime, 'cameraTarget', cameraTarget)
      newTracks[cameraTrackIdx] = { ...newTracks[cameraTrackIdx], keyframes: camKfs }

      // ── Upsert object keyframes ──
      for (const obj of trackedObjects) {
        let trackIdx = newTracks.findIndex(t => t.objectId === obj.id)
        if (trackIdx === -1) {
          newTracks.push({ id: generateTrackId(), objectId: obj.id, keyframes: [] })
          trackIdx = newTracks.length - 1
        }

        let kfs = newTracks[trackIdx].keyframes
        kfs = upsertKeyframe(kfs, captureTime, 'position', obj.position)
        kfs = upsertKeyframe(kfs, captureTime, 'rotation', obj.rotation)
        kfs = upsertKeyframe(kfs, captureTime, 'scale', obj.scale)
        newTracks[trackIdx] = { ...newTracks[trackIdx], keyframes: kfs }
      }

      return { tracks: newTracks }
    })
  },

  // ── Serialization ─────────────────────────────────────────────────

  loadTracks: (tracks, duration) => {
    set({
      tracks: structuredClone(tracks),
      duration: duration ?? 5,
      currentTime: 0,
      isPlaying: false,
    })
  },

  clearAll: () => {
    set({
      tracks: [],
      duration: 5,
      currentTime: 0,
      isPlaying: false,
    })
  },
}))
