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

/** Seed the store with N box objects and return their ids */
function seedObjects(count: number): string[] {
  const { addObject } = useSceneStore.getState()
  for (let i = 0; i < count; i++) {
    addObject('box')
  }
  useSceneStore.getState().deselectAll()
  return useSceneStore.getState().objects.map(o => o.id)
}

describe('Parent/Child Relationships', () => {
  beforeEach(resetStore)

  it('setParent sets parentId on child object', () => {
    const ids = seedObjects(2)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)

    const child = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(child).toBeDefined()
    expect(child!.parentId).toBe(parentId)
  })

  it('setParent with undefined removes parent (makes top-level)', () => {
    const ids = seedObjects(2)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    expect(useSceneStore.getState().objects.find(o => o.id === childId)!.parentId).toBe(parentId)

    useSceneStore.getState().setParent(childId, undefined)
    const child = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(child!.parentId).toBeUndefined()
  })

  it('getChildren returns all objects with matching parentId', () => {
    const ids = seedObjects(4)
    const [parentId, child1, child2] = ids

    useSceneStore.getState().setParent(child1, parentId)
    useSceneStore.getState().setParent(child2, parentId)

    const children = useSceneStore.getState().getChildren(parentId)
    expect(children).toHaveLength(2)
    expect(children.map(c => c.id)).toContain(child1)
    expect(children.map(c => c.id)).toContain(child2)
  })

  it('getChildren returns empty array if no children', () => {
    const ids = seedObjects(2)

    const children = useSceneStore.getState().getChildren(ids[0])
    expect(children).toEqual([])
  })

  it('setParent allows setting parentId to any valid object id', () => {
    const ids = seedObjects(2)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    const child = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(child!.parentId).toBe(parentId)
  })

  it('removing parent object also removes its descendants', () => {
    const ids = seedObjects(3)
    const [parentId, child1, child2] = ids

    useSceneStore.getState().setParent(child1, parentId)
    useSceneStore.getState().setParent(child2, parentId)

    useSceneStore.getState().removeObject(parentId)

    const remaining = useSceneStore.getState().objects
    // removeObject uses removeWithDescendants, so children are removed too
    expect(remaining.find(o => o.id === parentId)).toBeUndefined()
    expect(remaining.find(o => o.id === child1)).toBeUndefined()
    expect(remaining.find(o => o.id === child2)).toBeUndefined()
    expect(remaining).toHaveLength(0)
  })
})

describe('Hierarchy with Other Operations', () => {
  beforeEach(resetStore)

  it('duplicating parent does not duplicate children', () => {
    const ids = seedObjects(3)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    useSceneStore.getState().duplicateObject(parentId)

    const { objects } = useSceneStore.getState()
    // Should have 4 objects: 3 originals + 1 duplicated parent
    expect(objects).toHaveLength(4)
    // The duplicate should not have created an extra copy of the child
    const childCopies = objects.filter(
      o => o.name.includes('(copy)') && o.parentId !== undefined
    )
    // At most the duplicate parent itself, but children are not auto-duped
    expect(childCopies).toHaveLength(0)
  })

  it('duplicating child copies parentId', () => {
    const ids = seedObjects(2)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    useSceneStore.getState().duplicateObject(childId)

    const { objects } = useSceneStore.getState()
    const copy = objects.find(o => o.name.includes('(copy)'))
    expect(copy).toBeDefined()
    expect(copy!.parentId).toBe(parentId)
  })

  it('undo/redo preserves parentId', () => {
    const ids = seedObjects(2)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    const childAfterSet = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(childAfterSet!.parentId).toBe(parentId)

    useSceneStore.getState().undo()
    const childAfterUndo = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(childAfterUndo!.parentId).toBeUndefined()

    useSceneStore.getState().redo()
    const childAfterRedo = useSceneStore.getState().objects.find(o => o.id === childId)
    expect(childAfterRedo!.parentId).toBe(parentId)
  })

  it('save/load preserves hierarchy', () => {
    const ids = seedObjects(3)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    const saved = useSceneStore.getState().saveScene('Hierarchy Scene')

    // Clear and reload
    useSceneStore.getState().clearScene()
    expect(useSceneStore.getState().objects).toHaveLength(0)

    useSceneStore.getState().loadScene(saved)
    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(3)

    const loadedChild = objects.find(o => o.id === childId)
    expect(loadedChild).toBeDefined()
    expect(loadedChild!.parentId).toBe(parentId)
  })

  it('selecting parent does not auto-select children', () => {
    const ids = seedObjects(3)
    const [parentId, childId] = ids

    useSceneStore.getState().setParent(childId, parentId)
    useSceneStore.getState().selectObject(parentId)

    const { selectedId, selectedIds } = useSceneStore.getState()
    expect(selectedId).toBe(parentId)
    // Only the parent should be selected, not children
    expect(selectedIds).not.toContain(childId)
    expect(selectedIds).toHaveLength(1)
  })
})
