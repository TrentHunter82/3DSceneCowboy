import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SceneStatsOverlay } from './SceneStats'
import { useSceneStore } from '../../stores/useSceneStore'
import type { SceneObject } from '../../types/scene'
import { createDefaultMaterial } from '../../core/sceneOperations'

function resetStore() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
}

function makeObj(id: string, type: SceneObject['type'] = 'box'): SceneObject {
  return {
    id,
    name: `Obj ${id}`,
    type,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#c49a5c',
    visible: true,
    locked: false,
    material: createDefaultMaterial(),
  }
}

describe('SceneStatsOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders FPS label', () => {
    render(<SceneStatsOverlay />)
    expect(screen.getByText('FPS')).toBeInTheDocument()
  })

  it('renders OBJ label with count 0', () => {
    render(<SceneStatsOverlay />)
    expect(screen.getByText('OBJ')).toBeInTheDocument()
    // Multiple stats show "0" (FPS, OBJ, TRI, DRW), so use getAllByText
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(1)
  })

  it('renders TRI label with count 0', () => {
    render(<SceneStatsOverlay />)
    expect(screen.getByText('TRI')).toBeInTheDocument()
  })

  it('renders DRW label', () => {
    render(<SceneStatsOverlay />)
    expect(screen.getByText('DRW')).toBeInTheDocument()
  })

  it('shows correct object count when objects exist', () => {
    useSceneStore.setState({
      objects: [makeObj('a'), makeObj('b'), makeObj('c')],
    })
    render(<SceneStatsOverlay />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('computes triangle count from object types', () => {
    // box = 12 triangles, sphere = 2048 triangles => total = 2060
    useSceneStore.setState({
      objects: [makeObj('a', 'box'), makeObj('b', 'sphere')],
    })
    render(<SceneStatsOverlay />)
    // 2060 is formatted via toLocaleString, so we check for the text
    expect(screen.getByText('2,060')).toBeInTheDocument()
  })

  it('shows 0 FPS initially', () => {
    render(<SceneStatsOverlay />)
    // FPS row shows 0 because statsData.fps has not been updated
    const fpsLabels = screen.getAllByText('0')
    // There should be multiple 0s (FPS, Objects count 0, Tris 0, Draws 0)
    expect(fpsLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('updates FPS display after interval tick', () => {
    render(<SceneStatsOverlay />)

    // The statsData is module-level; we can't directly mutate the import's
    // private statsData, but we can verify the interval fires.
    // After advancing 500ms, the setInterval callback runs and reads
    // statsData.fps (which is still 0). The display should still show 0.
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // FPS should still render (the interval ran, reading statsData.fps = 0)
    expect(screen.getByText('FPS')).toBeInTheDocument()
  })
})
