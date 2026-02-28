import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCameraStore, resetShotIdCounter } from './useCameraStore'
import type { CameraShot } from '../types/cameraPath'

// Mock CameraControls interface - minimal mock matching what the store uses
function createMockControls(cameraPos = { x: 3, y: 4, z: 5 }) {
  return {
    normalizeRotations: vi.fn(),
    setLookAt: vi.fn(),
    camera: {
      position: { ...cameraPos },
    },
    getTarget: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
  }
}

function resetStore() {
  resetShotIdCounter()
  useCameraStore.setState({
    activePreset: null,
    controlsRef: null,
    shots: [],
    activeShotId: null,
  })
}

describe('useCameraStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('starts with no active preset', () => {
      expect(useCameraStore.getState().activePreset).toBeNull()
    })

    it('starts with no controls ref', () => {
      expect(useCameraStore.getState().controlsRef).toBeNull()
    })
  })

  describe('setControlsRef', () => {
    it('stores camera controls reference', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)
      expect(useCameraStore.getState().controlsRef).toBe(mock)
    })

    it('clears camera controls reference', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)
      useCameraStore.getState().setControlsRef(null)
      expect(useCameraStore.getState().controlsRef).toBeNull()
    })
  })

  describe('goToPreset', () => {
    it('does nothing when controlsRef is null', () => {
      useCameraStore.getState().goToPreset('Front')
      expect(useCameraStore.getState().activePreset).toBeNull()
    })

    it('does nothing for unknown preset name', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('NonExistent')
      expect(mock.normalizeRotations).not.toHaveBeenCalled()
      expect(mock.setLookAt).not.toHaveBeenCalled()
      expect(useCameraStore.getState().activePreset).toBeNull()
    })

    it('calls normalizeRotations before setLookAt', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const callOrder: string[] = []
      mock.normalizeRotations.mockImplementation(() => callOrder.push('normalize'))
      mock.setLookAt.mockImplementation(() => callOrder.push('setLookAt'))

      useCameraStore.getState().goToPreset('Front')
      expect(callOrder).toEqual(['normalize', 'setLookAt'])
    })

    it('sets active preset name after navigating', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Front')
      expect(useCameraStore.getState().activePreset).toBe('Front')
    })

    it('calls setLookAt with correct Front preset values', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Front')
      // Front: position [0, 2, 10], target [0, 0, 0]
      expect(mock.setLookAt).toHaveBeenCalledWith(0, 2, 10, 0, 0, 0, true)
    })

    it('calls setLookAt with correct Top preset values', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Top')
      // Top: position [0, 10, 0.01], target [0, 0, 0]
      expect(mock.setLookAt).toHaveBeenCalledWith(0, 10, 0.01, 0, 0, 0, true)
    })

    it('calls setLookAt with correct Perspective preset values', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Perspective')
      // Perspective: position [5, 5, 5], target [0, 0, 0]
      expect(mock.setLookAt).toHaveBeenCalledWith(5, 5, 5, 0, 0, 0, true)
    })

    it('switches between presets', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Front')
      expect(useCameraStore.getState().activePreset).toBe('Front')

      useCameraStore.getState().goToPreset('Top')
      expect(useCameraStore.getState().activePreset).toBe('Top')
      expect(mock.setLookAt).toHaveBeenCalledTimes(2)
    })
  })

  describe('resetCamera', () => {
    it('does nothing when controlsRef is null', () => {
      useCameraStore.setState({ activePreset: 'Front' })
      useCameraStore.getState().resetCamera()
      // activePreset stays unchanged since controlsRef is null
      expect(useCameraStore.getState().activePreset).toBe('Front')
    })

    it('resets to default view position [5, 5, 5] looking at origin', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().resetCamera()
      expect(mock.normalizeRotations).toHaveBeenCalled()
      expect(mock.setLookAt).toHaveBeenCalledWith(5, 5, 5, 0, 0, 0, true)
    })

    it('clears active preset', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().goToPreset('Front')
      expect(useCameraStore.getState().activePreset).toBe('Front')

      useCameraStore.getState().resetCamera()
      expect(useCameraStore.getState().activePreset).toBeNull()
    })
  })

  // ── Shot tests ────────────────────────────────────────────────────

  describe('shots - initial state', () => {
    it('starts with empty shots array', () => {
      expect(useCameraStore.getState().shots).toEqual([])
    })

    it('starts with null activeShotId', () => {
      expect(useCameraStore.getState().activeShotId).toBeNull()
    })
  })

  describe('captureShot', () => {
    it('returns null when no controls ref', () => {
      const id = useCameraStore.getState().captureShot()
      expect(id).toBeNull()
      expect(useCameraStore.getState().shots).toEqual([])
    })

    it('captures a shot from current camera position', () => {
      const mock = createMockControls({ x: 3, y: 4, z: 5 })
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()
      expect(id).toBeTruthy()

      const { shots, activeShotId } = useCameraStore.getState()
      expect(shots).toHaveLength(1)
      expect(shots[0].position).toEqual({ x: 3, y: 4, z: 5 })
      expect(shots[0].target).toEqual({ x: 0, y: 0, z: 0 })
      expect(shots[0].name).toBe('Shot 1')
      expect(activeShotId).toBe(id)
    })

    it('uses custom name when provided', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot('Hero Shot')
      expect(useCameraStore.getState().shots[0].name).toBe('Hero Shot')
    })

    it('auto-increments shot names', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot()
      useCameraStore.getState().captureShot()
      useCameraStore.getState().captureShot()

      const names = useCameraStore.getState().shots.map(s => s.name)
      expect(names).toEqual(['Shot 1', 'Shot 2', 'Shot 3'])
    })
  })

  describe('removeShot', () => {
    it('removes a shot by id', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id1 = useCameraStore.getState().captureShot()!
      useCameraStore.getState().captureShot()

      useCameraStore.getState().removeShot(id1)
      expect(useCameraStore.getState().shots).toHaveLength(1)
    })

    it('clears activeShotId when removing the active shot', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()!
      expect(useCameraStore.getState().activeShotId).toBe(id)

      useCameraStore.getState().removeShot(id)
      expect(useCameraStore.getState().activeShotId).toBeNull()
    })

    it('preserves activeShotId when removing a different shot', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot()
      const id2 = useCameraStore.getState().captureShot()!

      // id2 is now active (last captured)
      const id1 = useCameraStore.getState().shots[0].id
      useCameraStore.getState().removeShot(id1)
      expect(useCameraStore.getState().activeShotId).toBe(id2)
    })
  })

  describe('updateShot', () => {
    it('updates shot name', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()!
      useCameraStore.getState().updateShot(id, { name: 'Close-up' })
      expect(useCameraStore.getState().shots[0].name).toBe('Close-up')
    })

    it('updates shot notes', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()!
      useCameraStore.getState().updateShot(id, { notes: 'Wide establishing shot' })
      expect(useCameraStore.getState().shots[0].notes).toBe('Wide establishing shot')
    })
  })

  describe('goToShot', () => {
    it('does nothing without controls ref', () => {
      const shot: CameraShot = {
        id: 'test',
        name: 'Test',
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        createdAt: new Date().toISOString(),
      }
      useCameraStore.setState({ shots: [shot] })
      useCameraStore.getState().goToShot('test')
      expect(useCameraStore.getState().activeShotId).toBeNull()
    })

    it('transitions camera to shot position', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()!
      mock.setLookAt.mockClear()

      useCameraStore.getState().goToShot(id)
      expect(mock.normalizeRotations).toHaveBeenCalled()
      expect(mock.setLookAt).toHaveBeenCalledWith(
        3, 4, 5, 0, 0, 0, true,
      )
      expect(useCameraStore.getState().activeShotId).toBe(id)
    })

    it('does nothing for nonexistent shot id', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)
      mock.setLookAt.mockClear()

      useCameraStore.getState().goToShot('nonexistent')
      expect(mock.setLookAt).not.toHaveBeenCalled()
    })
  })

  describe('reorderShots', () => {
    it('reorders shots', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot('A')
      useCameraStore.getState().captureShot('B')
      useCameraStore.getState().captureShot('C')

      useCameraStore.getState().reorderShots(2, 0)
      const names = useCameraStore.getState().shots.map(s => s.name)
      expect(names).toEqual(['C', 'A', 'B'])
    })

    it('ignores invalid indices', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot('A')
      useCameraStore.getState().reorderShots(-1, 0)
      useCameraStore.getState().reorderShots(0, 5)
      expect(useCameraStore.getState().shots).toHaveLength(1)
    })
  })

  describe('loadShots / clearShots', () => {
    it('loads an array of shots', () => {
      const shots: CameraShot[] = [
        { id: 'a', name: 'A', position: { x: 1, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, createdAt: '' },
        { id: 'b', name: 'B', position: { x: 2, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, createdAt: '' },
      ]
      useCameraStore.getState().loadShots(shots)
      expect(useCameraStore.getState().shots).toHaveLength(2)
      expect(useCameraStore.getState().activeShotId).toBeNull()
    })

    it('clearShots empties the shots array', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      useCameraStore.getState().captureShot()
      useCameraStore.getState().captureShot()
      expect(useCameraStore.getState().shots).toHaveLength(2)

      useCameraStore.getState().clearShots()
      expect(useCameraStore.getState().shots).toEqual([])
      expect(useCameraStore.getState().activeShotId).toBeNull()
    })
  })

  describe('setShotThumbnail', () => {
    it('sets thumbnail blob URL on a shot', () => {
      const mock = createMockControls()
      useCameraStore.getState().setControlsRef(mock as never)

      const id = useCameraStore.getState().captureShot()!
      useCameraStore.getState().setShotThumbnail(id, 'blob:http://test/thumb')
      expect(useCameraStore.getState().shots[0].thumbnail).toBe('blob:http://test/thumb')
    })
  })
})
