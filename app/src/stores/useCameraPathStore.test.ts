import { describe, it, expect, beforeEach } from 'vitest'
import { createCameraPathStore, type CameraPathStoreState } from './useCameraPathStore'
import type { StoreApi } from 'zustand'

type Store = StoreApi<CameraPathStoreState>

describe('useCameraPathStore', () => {
  let store: Store

  beforeEach(() => {
    store = createCameraPathStore()
  })

  // ── Initial State ────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty paths', () => {
      expect(store.getState().paths).toEqual([])
    })

    it('starts with no active path', () => {
      expect(store.getState().activePathId).toBeNull()
    })

    it('starts with no selected point', () => {
      expect(store.getState().selectedPointId).toBeNull()
    })

    it('starts with stopped playback', () => {
      expect(store.getState().playbackState).toBe('stopped')
    })

    it('starts with playback time 0', () => {
      expect(store.getState().playbackTime).toBe(0)
    })

    it('starts with preview disabled', () => {
      expect(store.getState().previewEnabled).toBe(false)
    })
  })

  // ── Path CRUD ────────────────────────────────────────────────────────

  describe('addPath', () => {
    it('adds a path with default name', () => {
      const id = store.getState().addPath()
      const { paths } = store.getState()
      expect(paths).toHaveLength(1)
      expect(paths[0].id).toBe(id)
      expect(paths[0].name).toBe('Camera Path 1')
    })

    it('adds a path with custom name', () => {
      store.getState().addPath('Cinematic Flyover')
      expect(store.getState().paths[0].name).toBe('Cinematic Flyover')
    })

    it('sets the new path as active', () => {
      const id = store.getState().addPath()
      expect(store.getState().activePathId).toBe(id)
    })

    it('creates path with default duration of 5s', () => {
      store.getState().addPath()
      expect(store.getState().paths[0].duration).toBe(5)
    })

    it('creates path with empty points', () => {
      store.getState().addPath()
      expect(store.getState().paths[0].points).toEqual([])
    })

    it('creates path with loop=false', () => {
      store.getState().addPath()
      expect(store.getState().paths[0].loop).toBe(false)
    })

    it('creates path with ease-in-out easing', () => {
      store.getState().addPath()
      expect(store.getState().paths[0].easing).toBe('ease-in-out')
    })

    it('increments default name for multiple paths', () => {
      store.getState().addPath()
      store.getState().addPath()
      expect(store.getState().paths[1].name).toBe('Camera Path 2')
    })

    it('returns the created path id', () => {
      const id = store.getState().addPath()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe('removePath', () => {
    it('removes a path by id', () => {
      const id = store.getState().addPath()
      store.getState().removePath(id)
      expect(store.getState().paths).toHaveLength(0)
    })

    it('clears activePathId when the active path is removed', () => {
      const id = store.getState().addPath()
      expect(store.getState().activePathId).toBe(id)
      store.getState().removePath(id)
      expect(store.getState().activePathId).toBeNull()
    })

    it('clears selectedPointId when the active path is removed', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      const ptId = store.getState().selectedPointId
      expect(ptId).not.toBeNull()
      store.getState().removePath(pathId)
      expect(store.getState().selectedPointId).toBeNull()
    })

    it('keeps activePathId if a different path is removed', () => {
      const id1 = store.getState().addPath('Path A')
      const id2 = store.getState().addPath('Path B')
      expect(store.getState().activePathId).toBe(id2)
      store.getState().removePath(id1)
      expect(store.getState().activePathId).toBe(id2)
    })

    it('does nothing for unknown id', () => {
      store.getState().addPath()
      store.getState().removePath('nonexistent')
      expect(store.getState().paths).toHaveLength(1)
    })
  })

  describe('setActivePath', () => {
    it('sets the active path', () => {
      const id1 = store.getState().addPath('A')
      store.getState().addPath('B')
      store.getState().setActivePath(id1)
      expect(store.getState().activePathId).toBe(id1)
    })

    it('clears selectedPointId when switching paths', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      expect(store.getState().selectedPointId).not.toBeNull()
      store.getState().setActivePath(null)
      expect(store.getState().selectedPointId).toBeNull()
    })

    it('can set active path to null', () => {
      store.getState().addPath()
      store.getState().setActivePath(null)
      expect(store.getState().activePathId).toBeNull()
    })
  })

  describe('updatePath', () => {
    it('updates path name', () => {
      const id = store.getState().addPath('Old Name')
      store.getState().updatePath(id, { name: 'New Name' })
      expect(store.getState().paths[0].name).toBe('New Name')
    })

    it('updates path duration', () => {
      const id = store.getState().addPath()
      store.getState().updatePath(id, { duration: 10 })
      expect(store.getState().paths[0].duration).toBe(10)
    })

    it('updates loop setting', () => {
      const id = store.getState().addPath()
      store.getState().updatePath(id, { loop: true })
      expect(store.getState().paths[0].loop).toBe(true)
    })

    it('updates easing', () => {
      const id = store.getState().addPath()
      store.getState().updatePath(id, { easing: 'linear' })
      expect(store.getState().paths[0].easing).toBe('linear')
    })

    it('updates multiple fields at once', () => {
      const id = store.getState().addPath()
      store.getState().updatePath(id, { name: 'X', duration: 20, loop: true })
      const path = store.getState().paths[0]
      expect(path.name).toBe('X')
      expect(path.duration).toBe(20)
      expect(path.loop).toBe(true)
    })

    it('does not affect other paths', () => {
      store.getState().addPath('A')
      const id2 = store.getState().addPath('B')
      store.getState().updatePath(id2, { name: 'Updated' })
      expect(store.getState().paths[0].name).toBe('A')
      expect(store.getState().paths[1].name).toBe('Updated')
    })
  })

  // ── Point CRUD ───────────────────────────────────────────────────────

  describe('addPoint', () => {
    let pathId: string

    beforeEach(() => {
      pathId = store.getState().addPath()
    })

    it('adds a point to the specified path', () => {
      store.getState().addPoint(pathId)
      const path = store.getState().paths[0]
      expect(path.points).toHaveLength(1)
    })

    it('first point defaults to position (5,3,5)', () => {
      store.getState().addPoint(pathId)
      const pt = store.getState().paths[0].points[0]
      expect(pt.position).toEqual({ x: 5, y: 3, z: 5 })
    })

    it('first point defaults to target (0,0,0)', () => {
      store.getState().addPoint(pathId)
      const pt = store.getState().paths[0].points[0]
      expect(pt.target).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('first point has time=0', () => {
      store.getState().addPoint(pathId)
      expect(store.getState().paths[0].points[0].time).toBe(0)
    })

    it('uses custom position when provided', () => {
      store.getState().addPoint(pathId, { x: 10, y: 20, z: 30 })
      expect(store.getState().paths[0].points[0].position).toEqual({ x: 10, y: 20, z: 30 })
    })

    it('uses custom target when provided', () => {
      store.getState().addPoint(pathId, undefined, { x: 1, y: 2, z: 3 })
      expect(store.getState().paths[0].points[0].target).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('second point offsets position from last point', () => {
      store.getState().addPoint(pathId, { x: 0, y: 0, z: 0 })
      store.getState().addPoint(pathId)
      const pts = store.getState().paths[0].points
      expect(pts[1].position.x).toBe(2) // offset +2 from last
    })

    it('sets tension to 0.5', () => {
      store.getState().addPoint(pathId)
      expect(store.getState().paths[0].points[0].tension).toBe(0.5)
    })

    it('selects the newly added point', () => {
      const ptId = store.getState().addPoint(pathId)
      expect(store.getState().selectedPointId).toBe(ptId)
    })

    it('returns the new point id', () => {
      const ptId = store.getState().addPoint(pathId)
      expect(typeof ptId).toBe('string')
      expect(ptId.length).toBeGreaterThan(0)
    })

    it('clamps time to path duration', () => {
      // Path duration is 5. Add 7 points - later ones should clamp to 5
      for (let i = 0; i < 7; i++) {
        store.getState().addPoint(pathId)
      }
      const pts = store.getState().paths[0].points
      pts.forEach(pt => expect(pt.time).toBeLessThanOrEqual(5))
    })

    it('sorts points by time after adding', () => {
      store.getState().addPoint(pathId, { x: 0, y: 0, z: 0 })
      store.getState().addPoint(pathId, { x: 5, y: 0, z: 0 })
      store.getState().addPoint(pathId, { x: 10, y: 0, z: 0 })
      const pts = store.getState().paths[0].points
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].time).toBeGreaterThanOrEqual(pts[i - 1].time)
      }
    })
  })

  describe('removePoint', () => {
    it('removes a point from a path', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      store.getState().removePoint(pathId, ptId)
      expect(store.getState().paths[0].points).toHaveLength(0)
    })

    it('clears selectedPointId when the selected point is removed', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      expect(store.getState().selectedPointId).toBe(ptId)
      store.getState().removePoint(pathId, ptId)
      expect(store.getState().selectedPointId).toBeNull()
    })

    it('keeps selectedPointId when a different point is removed', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      const ptId2 = store.getState().addPoint(pathId)
      const pts = store.getState().paths[0].points
      const otherPtId = pts.find(p => p.id !== ptId2)!.id
      store.getState().removePoint(pathId, otherPtId)
      expect(store.getState().selectedPointId).toBe(ptId2)
    })
  })

  describe('updatePoint', () => {
    it('updates point position', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      store.getState().updatePoint(pathId, ptId, { position: { x: 99, y: 88, z: 77 } })
      const pt = store.getState().paths[0].points.find(p => p.id === ptId)
      expect(pt?.position).toEqual({ x: 99, y: 88, z: 77 })
    })

    it('updates point target', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      store.getState().updatePoint(pathId, ptId, { target: { x: 1, y: 2, z: 3 } })
      const pt = store.getState().paths[0].points.find(p => p.id === ptId)
      expect(pt?.target).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('updates point time', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      store.getState().updatePoint(pathId, ptId, { time: 2.5 })
      const pt = store.getState().paths[0].points.find(p => p.id === ptId)
      expect(pt?.time).toBe(2.5)
    })

    it('updates point tension', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId)
      store.getState().updatePoint(pathId, ptId, { tension: 0.8 })
      const pt = store.getState().paths[0].points.find(p => p.id === ptId)
      expect(pt?.tension).toBe(0.8)
    })

    it('re-sorts points by time after update', () => {
      const pathId = store.getState().addPath()
      const pt1 = store.getState().addPoint(pathId, { x: 0, y: 0, z: 0 })
      store.getState().addPoint(pathId, { x: 5, y: 0, z: 0 })
      // pt1 starts at time 0, set it to time 4 to re-sort
      store.getState().updatePoint(pathId, pt1, { time: 4 })
      const pts = store.getState().paths[0].points
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].time).toBeGreaterThanOrEqual(pts[i - 1].time)
      }
    })
  })

  describe('setSelectedPoint', () => {
    it('sets selected point id', () => {
      store.getState().setSelectedPoint('some-id')
      expect(store.getState().selectedPointId).toBe('some-id')
    })

    it('can set to null', () => {
      store.getState().setSelectedPoint('some-id')
      store.getState().setSelectedPoint(null)
      expect(store.getState().selectedPointId).toBeNull()
    })
  })

  // ── Playback ─────────────────────────────────────────────────────────

  describe('playback', () => {
    it('play sets state to playing', () => {
      store.getState().play()
      expect(store.getState().playbackState).toBe('playing')
    })

    it('pause sets state to paused', () => {
      store.getState().play()
      store.getState().pause()
      expect(store.getState().playbackState).toBe('paused')
    })

    it('stop sets state to stopped and resets time', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      store.getState().play()
      store.getState().setPlaybackTime(2.5)
      store.getState().stop()
      expect(store.getState().playbackState).toBe('stopped')
      expect(store.getState().playbackTime).toBe(0)
    })
  })

  describe('setPlaybackTime', () => {
    it('sets time when active path exists', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      store.getState().setPlaybackTime(2.5)
      expect(store.getState().playbackTime).toBe(2.5)
    })

    it('clamps time to 0 minimum', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      store.getState().setPlaybackTime(-5)
      expect(store.getState().playbackTime).toBe(0)
    })

    it('clamps time to path duration maximum', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      store.getState().setPlaybackTime(999)
      expect(store.getState().playbackTime).toBe(5) // default duration
    })

    it('does nothing when no active path', () => {
      store.getState().setPlaybackTime(2.5)
      expect(store.getState().playbackTime).toBe(0)
    })
  })

  describe('togglePreview', () => {
    it('toggles preview on', () => {
      store.getState().togglePreview()
      expect(store.getState().previewEnabled).toBe(true)
    })

    it('toggles preview off', () => {
      store.getState().togglePreview()
      store.getState().togglePreview()
      expect(store.getState().previewEnabled).toBe(false)
    })
  })

  // ── Queries ──────────────────────────────────────────────────────────

  describe('getActivePath', () => {
    it('returns undefined when no active path', () => {
      expect(store.getState().getActivePath()).toBeUndefined()
    })

    it('returns the active path', () => {
      const id = store.getState().addPath('Test Path')
      const path = store.getState().getActivePath()
      expect(path?.id).toBe(id)
      expect(path?.name).toBe('Test Path')
    })
  })

  describe('getPoint', () => {
    it('returns undefined for unknown path', () => {
      expect(store.getState().getPoint('bad', 'also-bad')).toBeUndefined()
    })

    it('returns undefined for unknown point', () => {
      const pathId = store.getState().addPath()
      expect(store.getState().getPoint(pathId, 'bad')).toBeUndefined()
    })

    it('returns the specified point', () => {
      const pathId = store.getState().addPath()
      const ptId = store.getState().addPoint(pathId, { x: 1, y: 2, z: 3 })
      const pt = store.getState().getPoint(pathId, ptId)
      expect(pt?.id).toBe(ptId)
      expect(pt?.position).toEqual({ x: 1, y: 2, z: 3 })
    })
  })

  // ── Serialization ────────────────────────────────────────────────────

  describe('loadPaths', () => {
    it('loads paths from data', () => {
      const paths = [
        {
          id: 'p1',
          name: 'Loaded Path',
          points: [
            { id: 'pt1', position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, time: 0, tension: 0.5 },
          ],
          duration: 10,
          loop: true,
          easing: 'linear' as const,
        },
      ]
      store.getState().loadPaths(paths)
      expect(store.getState().paths).toHaveLength(1)
      expect(store.getState().paths[0].name).toBe('Loaded Path')
      expect(store.getState().paths[0].duration).toBe(10)
    })

    it('deep clones loaded paths', () => {
      const paths = [
        {
          id: 'p1',
          name: 'Path',
          points: [],
          duration: 5,
          loop: false,
          easing: 'ease-in-out' as const,
        },
      ]
      store.getState().loadPaths(paths)
      paths[0].name = 'Mutated'
      expect(store.getState().paths[0].name).toBe('Path')
    })

    it('resets activePathId on load', () => {
      const id = store.getState().addPath()
      expect(store.getState().activePathId).toBe(id)
      store.getState().loadPaths([])
      expect(store.getState().activePathId).toBeNull()
    })

    it('resets selectedPointId on load', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      expect(store.getState().selectedPointId).not.toBeNull()
      store.getState().loadPaths([])
      expect(store.getState().selectedPointId).toBeNull()
    })

    it('resets playback state on load', () => {
      store.getState().play()
      store.getState().loadPaths([])
      expect(store.getState().playbackState).toBe('stopped')
      expect(store.getState().playbackTime).toBe(0)
    })
  })

  describe('clearAll', () => {
    it('clears all paths', () => {
      store.getState().addPath()
      store.getState().addPath()
      store.getState().clearAll()
      expect(store.getState().paths).toHaveLength(0)
    })

    it('resets all state', () => {
      const pathId = store.getState().addPath()
      store.getState().addPoint(pathId)
      store.getState().play()
      store.getState().togglePreview()
      store.getState().clearAll()

      const state = store.getState()
      expect(state.paths).toEqual([])
      expect(state.activePathId).toBeNull()
      expect(state.selectedPointId).toBeNull()
      expect(state.playbackState).toBe('stopped')
      expect(state.playbackTime).toBe(0)
      expect(state.previewEnabled).toBe(false)
    })
  })
})
