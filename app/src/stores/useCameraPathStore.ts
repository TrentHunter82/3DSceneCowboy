import { create } from 'zustand'
import type { Vec3 } from '../types/scene'
import type { CameraPath, CameraPathPoint, CameraPathPlaybackState } from '../types/cameraPath'
import { generatePathId, generatePointId, resetPathIdCounters } from '../core/cameraPath'

export interface CameraPathStoreState {
  paths: CameraPath[]
  activePathId: string | null
  selectedPointId: string | null
  playbackState: CameraPathPlaybackState
  playbackTime: number
  previewEnabled: boolean

  // Path CRUD
  addPath: (name?: string) => string
  removePath: (id: string) => void
  setActivePath: (id: string | null) => void
  updatePath: (id: string, updates: Partial<Pick<CameraPath, 'name' | 'duration' | 'loop' | 'easing'>>) => void

  // Point CRUD
  addPoint: (pathId: string, position?: Vec3, target?: Vec3) => string
  removePoint: (pathId: string, pointId: string) => void
  updatePoint: (pathId: string, pointId: string, updates: Partial<Pick<CameraPathPoint, 'position' | 'target' | 'time' | 'tension'>>) => void
  setSelectedPoint: (pointId: string | null) => void

  // Playback
  play: () => void
  pause: () => void
  stop: () => void
  setPlaybackTime: (time: number) => void
  togglePreview: () => void

  // Queries
  getActivePath: () => CameraPath | undefined
  getPoint: (pathId: string, pointId: string) => CameraPathPoint | undefined

  // Serialization
  loadPaths: (paths: CameraPath[]) => void
  clearAll: () => void
}

export function createCameraPathStore() {
  resetPathIdCounters()

  return create<CameraPathStoreState>((set, get) => ({
    paths: [],
    activePathId: null,
    selectedPointId: null,
    playbackState: 'stopped',
    playbackTime: 0,
    previewEnabled: false,

    // ── Path CRUD ──────────────────────────────────────────────────────

    addPath: (name?: string) => {
      const id = generatePathId()
      const newPath: CameraPath = {
        id,
        name: name ?? `Camera Path ${get().paths.length + 1}`,
        points: [],
        duration: 5,
        loop: false,
        easing: 'ease-in-out',
      }
      set(state => ({
        paths: [...state.paths, newPath],
        activePathId: id,
      }))
      return id
    },

    removePath: (id: string) => {
      set(state => ({
        paths: state.paths.filter(p => p.id !== id),
        activePathId: state.activePathId === id ? null : state.activePathId,
        selectedPointId: state.activePathId === id ? null : state.selectedPointId,
      }))
    },

    setActivePath: (id: string | null) => {
      set({ activePathId: id, selectedPointId: null })
    },

    updatePath: (id, updates) => {
      set(state => ({
        paths: state.paths.map(p =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      }))
    },

    // ── Point CRUD ─────────────────────────────────────────────────────

    addPoint: (pathId, position, target) => {
      const pointId = generatePointId()
      set(state => ({
        paths: state.paths.map(p => {
          if (p.id !== pathId) return p
          const lastPoint = p.points[p.points.length - 1]
          const newPoint: CameraPathPoint = {
            id: pointId,
            position: position ? { ...position } : lastPoint
              ? { x: lastPoint.position.x + 2, y: lastPoint.position.y, z: lastPoint.position.z }
              : { x: 5, y: 3, z: 5 },
            target: target ? { ...target } : { x: 0, y: 0, z: 0 },
            time: lastPoint ? Math.min(lastPoint.time + 1, p.duration) : 0,
            tension: 0.5,
          }
          const points = [...p.points, newPoint].sort((a, b) => a.time - b.time)
          return { ...p, points }
        }),
        selectedPointId: pointId,
      }))
      return pointId
    },

    removePoint: (pathId, pointId) => {
      set(state => ({
        paths: state.paths.map(p =>
          p.id === pathId
            ? { ...p, points: p.points.filter(pt => pt.id !== pointId) }
            : p,
        ),
        selectedPointId: state.selectedPointId === pointId ? null : state.selectedPointId,
      }))
    },

    updatePoint: (pathId, pointId, updates) => {
      set(state => ({
        paths: state.paths.map(p => {
          if (p.id !== pathId) return p
          const points = p.points
            .map(pt => pt.id === pointId ? { ...pt, ...updates } : pt)
            .sort((a, b) => a.time - b.time)
          return { ...p, points }
        }),
      }))
    },

    setSelectedPoint: (pointId) => {
      set({ selectedPointId: pointId })
    },

    // ── Playback ───────────────────────────────────────────────────────

    play: () => set({ playbackState: 'playing' }),
    pause: () => set({ playbackState: 'paused' }),

    stop: () => set({ playbackState: 'stopped', playbackTime: 0 }),

    setPlaybackTime: (time) => {
      const path = get().getActivePath()
      if (!path) return
      set({ playbackTime: Math.max(0, Math.min(path.duration, time)) })
    },

    togglePreview: () => set(state => ({ previewEnabled: !state.previewEnabled })),

    // ── Queries ────────────────────────────────────────────────────────

    getActivePath: () => {
      const { paths, activePathId } = get()
      return paths.find(p => p.id === activePathId)
    },

    getPoint: (pathId, pointId) => {
      const path = get().paths.find(p => p.id === pathId)
      return path?.points.find(pt => pt.id === pointId)
    },

    // ── Serialization ──────────────────────────────────────────────────

    loadPaths: (paths) => {
      set({
        paths: structuredClone(paths),
        activePathId: null,
        selectedPointId: null,
        playbackState: 'stopped',
        playbackTime: 0,
      })
    },

    clearAll: () => {
      set({
        paths: [],
        activePathId: null,
        selectedPointId: null,
        playbackState: 'stopped',
        playbackTime: 0,
        previewEnabled: false,
      })
    },
  }))
}

export const useCameraPathStore = createCameraPathStore()
