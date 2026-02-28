import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from './useSceneStore'

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

describe('Model Object Creation', () => {
  beforeEach(resetStore)

  it('addModelObject creates object with type model', () => {
    useSceneStore.getState().addModelObject('Saloon', '/models/saloon.glb')

    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(1)
    expect(objects[0].type).toBe('model')
  })

  it('addModelObject stores gltfUrl', () => {
    const url = '/models/cactus.glb'
    useSceneStore.getState().addModelObject('Cactus', url)

    const { objects } = useSceneStore.getState()
    expect(objects[0].gltfUrl).toBe(url)
  })

  it('addModelObject uses provided name', () => {
    useSceneStore.getState().addModelObject('Horse', '/models/horse.glb')

    const { objects } = useSceneStore.getState()
    expect(objects[0].name).toBe('Horse')
  })

  it('model object has default transforms and material', () => {
    useSceneStore.getState().addModelObject('Barn', '/models/barn.glb')

    const obj = useSceneStore.getState().objects[0]
    expect(obj.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(obj.rotation).toEqual({ x: 0, y: 0, z: 0 })
    expect(obj.scale).toEqual({ x: 1, y: 1, z: 1 })
    expect(obj.material).toBeDefined()
    expect(obj.material.type).toBe('standard')
    expect(obj.visible).toBe(true)
    expect(obj.locked).toBe(false)
  })

  it('model object is selected after creation', () => {
    useSceneStore.getState().addModelObject('Wagon', '/models/wagon.glb')

    const { selectedId, selectedIds, objects } = useSceneStore.getState()
    expect(selectedId).toBe(objects[0].id)
    expect(selectedIds).toContain(objects[0].id)
  })

  it('model object pushes to history', () => {
    const historyBefore = useSceneStore.getState().history.length

    useSceneStore.getState().addModelObject('Fence', '/models/fence.glb')

    const { history, historyIndex } = useSceneStore.getState()
    expect(history.length).toBe(historyBefore + 1)
    expect(historyIndex).toBe(historyBefore) // 0-based, so length-1
  })
})

describe('Model Serialization', () => {
  beforeEach(resetStore)

  it('save/load preserves gltfUrl on model objects', () => {
    const url = '/models/tumbleweed.glb'
    useSceneStore.getState().addModelObject('Tumbleweed', url)

    const saved = useSceneStore.getState().saveScene('Model Scene')

    useSceneStore.getState().clearScene()
    expect(useSceneStore.getState().objects).toHaveLength(0)

    useSceneStore.getState().loadScene(saved)
    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(1)
    expect(objects[0].gltfUrl).toBe(url)
  })

  it('save/load preserves model type', () => {
    useSceneStore.getState().addModelObject('Windmill', '/models/windmill.glb')

    const saved = useSceneStore.getState().saveScene('Type Scene')
    useSceneStore.getState().clearScene()
    useSceneStore.getState().loadScene(saved)

    const { objects } = useSceneStore.getState()
    expect(objects[0].type).toBe('model')
  })

  it('deserialization handles missing gltfUrl gracefully', () => {
    // Simulate loading a model object that was saved without gltfUrl
    // (e.g., from a corrupted or hand-edited save file)
    const sceneData = {
      metadata: {
        name: 'Test',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      objects: [
        {
          id: 'model_1',
          name: 'Broken Model',
          type: 'model' as const,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: '#c49a5c',
          visible: true,
          locked: false,
          material: {
            type: 'standard' as const,
            color: '#c49a5c',
            opacity: 1,
            transparent: false,
            wireframe: false,
            metalness: 0.1,
            roughness: 0.7,
          },
          // intentionally no gltfUrl
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

    useSceneStore.getState().loadScene(sceneData)

    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(1)
    expect(objects[0].type).toBe('model')
    // gltfUrl should be undefined, not cause a crash
    expect(objects[0].gltfUrl).toBeUndefined()
  })
})
