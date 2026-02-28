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

describe('useSceneStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('addObject', () => {
    it('adds a box to empty scene', () => {
      useSceneStore.getState().addObject('box')
      const { objects, selectedId } = useSceneStore.getState()
      expect(objects).toHaveLength(1)
      expect(objects[0].type).toBe('box')
      expect(objects[0].name).toBe('Box 1')
      expect(selectedId).toBe(objects[0].id)
    })

    it('auto-increments names per type', () => {
      const { addObject } = useSceneStore.getState()
      addObject('sphere')
      addObject('sphere')
      addObject('box')
      const { objects } = useSceneStore.getState()
      expect(objects[0].name).toBe('Sphere 1')
      expect(objects[1].name).toBe('Sphere 2')
      expect(objects[2].name).toBe('Box 1')
    })

    it('selects the newly added object', () => {
      const { addObject } = useSceneStore.getState()
      addObject('box')
      addObject('sphere')
      const { objects, selectedId } = useSceneStore.getState()
      expect(selectedId).toBe(objects[1].id)
    })

    it('sets correct defaults per object type', () => {
      useSceneStore.getState().addObject('plane')
      const { objects } = useSceneStore.getState()
      const plane = objects[0]
      expect(plane.position.y).toBe(0) // planes sit on ground
      expect(plane.visible).toBe(true)
      expect(plane.locked).toBe(false)
    })

    it('pushes to undo history', () => {
      useSceneStore.getState().addObject('box')
      const { history, historyIndex } = useSceneStore.getState()
      expect(history.length).toBe(2) // initial + after add
      expect(historyIndex).toBe(1)
    })
  })

  describe('removeObject', () => {
    it('removes an object by id', () => {
      const { addObject } = useSceneStore.getState()
      addObject('box')
      addObject('sphere')
      const { objects } = useSceneStore.getState()
      const boxId = objects[0].id

      useSceneStore.getState().removeObject(boxId)
      const state = useSceneStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].type).toBe('sphere')
    })

    it('deselects if removed object was selected', () => {
      useSceneStore.getState().addObject('box')
      const { objects } = useSceneStore.getState()
      const id = objects[0].id

      useSceneStore.getState().removeObject(id)
      expect(useSceneStore.getState().selectedId).toBeNull()
    })

    it('preserves selection if different object removed', () => {
      const { addObject } = useSceneStore.getState()
      addObject('box')
      addObject('sphere')
      const { objects } = useSceneStore.getState()
      const sphereId = objects[1].id
      // sphere is selected (last added)

      useSceneStore.getState().removeObject(objects[0].id)
      expect(useSceneStore.getState().selectedId).toBe(sphereId)
    })
  })

  describe('selectObject', () => {
    it('selects an object by id', () => {
      useSceneStore.getState().addObject('box')
      const { objects } = useSceneStore.getState()
      useSceneStore.getState().selectObject(objects[0].id)
      expect(useSceneStore.getState().selectedId).toBe(objects[0].id)
    })

    it('deselects with null', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().selectObject(null)
      expect(useSceneStore.getState().selectedId).toBeNull()
    })
  })

  describe('updateObject', () => {
    it('updates position', () => {
      useSceneStore.getState().addObject('box')
      const { objects } = useSceneStore.getState()
      const id = objects[0].id

      useSceneStore.getState().updateObject(id, {
        position: { x: 5, y: 10, z: 15 },
      })

      const updated = useSceneStore.getState().objects[0]
      expect(updated.position).toEqual({ x: 5, y: 10, z: 15 })
    })

    it('updates name', () => {
      useSceneStore.getState().addObject('box')
      const id = useSceneStore.getState().objects[0].id
      useSceneStore.getState().updateObject(id, { name: 'My Box' })
      expect(useSceneStore.getState().objects[0].name).toBe('My Box')
    })

    it('preserves other properties', () => {
      useSceneStore.getState().addObject('box')
      const original = { ...useSceneStore.getState().objects[0] }
      const id = original.id

      useSceneStore.getState().updateObject(id, { name: 'Changed' })
      const updated = useSceneStore.getState().objects[0]
      expect(updated.type).toBe(original.type)
      expect(updated.color).toBe(original.color)
      expect(updated.visible).toBe(original.visible)
    })
  })

  describe('setToolMode', () => {
    it('changes the tool mode', () => {
      useSceneStore.getState().setToolMode('move')
      expect(useSceneStore.getState().toolMode).toBe('move')

      useSceneStore.getState().setToolMode('rotate')
      expect(useSceneStore.getState().toolMode).toBe('rotate')
    })
  })

  describe('duplicateObject', () => {
    it('duplicates an object', () => {
      useSceneStore.getState().addObject('box')
      const originalId = useSceneStore.getState().objects[0].id

      useSceneStore.getState().duplicateObject(originalId)
      const { objects, selectedId } = useSceneStore.getState()
      expect(objects).toHaveLength(2)
      expect(objects[1].name).toContain('(copy)')
      expect(objects[1].type).toBe('box')
      expect(selectedId).toBe(objects[1].id)
    })

    it('offsets duplicate position', () => {
      useSceneStore.getState().addObject('box')
      const original = useSceneStore.getState().objects[0]
      useSceneStore.getState().duplicateObject(original.id)
      const duplicate = useSceneStore.getState().objects[1]
      expect(duplicate.position.x).not.toBe(original.position.x)
    })

    it('does nothing for non-existent id', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().duplicateObject('nonexistent')
      expect(useSceneStore.getState().objects).toHaveLength(1)
    })
  })

  describe('undo/redo', () => {
    it('undoes the last action', () => {
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().objects).toHaveLength(1)

      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)
    })

    it('redoes an undone action', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)

      useSceneStore.getState().redo()
      expect(useSceneStore.getState().objects).toHaveLength(1)
    })

    it('canUndo is false at initial state', () => {
      expect(useSceneStore.getState().canUndo()).toBe(false)
    })

    it('canUndo is true after an action', () => {
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().canUndo()).toBe(true)
    })

    it('canRedo is false without undo', () => {
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().canRedo()).toBe(false)
    })

    it('canRedo is true after undo', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().undo()
      expect(useSceneStore.getState().canRedo()).toBe(true)
    })

    it('new action after undo discards redo history', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().undo() // undo sphere
      useSceneStore.getState().addObject('cone') // new action
      expect(useSceneStore.getState().canRedo()).toBe(false)
    })

    it('does not undo past initial state', () => {
      useSceneStore.getState().undo()
      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)
      expect(useSceneStore.getState().historyIndex).toBe(0)
    })
  })

  describe('environment', () => {
    it('has default environment settings', () => {
      const { environment } = useSceneStore.getState()
      expect(environment.gridVisible).toBe(true)
      expect(typeof environment.backgroundColor).toBe('string')
    })

    it('updates environment settings', () => {
      useSceneStore.getState().updateEnvironment({ gridVisible: false })
      expect(useSceneStore.getState().environment.gridVisible).toBe(false)
    })

    it('preserves other environment settings on partial update', () => {
      const original = { ...useSceneStore.getState().environment }
      useSceneStore.getState().updateEnvironment({ fogEnabled: true })
      const updated = useSceneStore.getState().environment
      expect(updated.fogEnabled).toBe(true)
      expect(updated.backgroundColor).toBe(original.backgroundColor)
    })
  })

  describe('serialization', () => {
    it('saves scene data', () => {
      useSceneStore.getState().addObject('box')
      const data = useSceneStore.getState().saveScene('Test Scene')
      expect(data.metadata.name).toBe('Test Scene')
      expect(data.objects).toHaveLength(1)
      expect(data.environment).toBeDefined()
    })

    it('clears scene', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().clearScene()
      const state = useSceneStore.getState()
      expect(state.objects).toHaveLength(0)
      expect(state.selectedId).toBeNull()
      expect(state.historyIndex).toBe(0)
    })

    it('loads scene data', () => {
      useSceneStore.getState().addObject('box')
      const saved = useSceneStore.getState().saveScene('Saved')

      useSceneStore.getState().clearScene()
      expect(useSceneStore.getState().objects).toHaveLength(0)

      useSceneStore.getState().loadScene(saved)
      const state = useSceneStore.getState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects[0].type).toBe('box')
    })
  })
})
