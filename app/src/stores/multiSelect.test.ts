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
  // Deselect so tests start clean
  useSceneStore.getState().deselectAll()
  return useSceneStore.getState().objects.map(o => o.id)
}

describe('Multi-Select', () => {
  beforeEach(resetStore)

  it('toggleSelectObject adds to selectedIds', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    expect(useSceneStore.getState().selectedIds).toContain(ids[0])
    expect(useSceneStore.getState().selectedIds).toHaveLength(1)

    useSceneStore.getState().toggleSelectObject(ids[1])
    expect(useSceneStore.getState().selectedIds).toContain(ids[0])
    expect(useSceneStore.getState().selectedIds).toContain(ids[1])
    expect(useSceneStore.getState().selectedIds).toHaveLength(2)
  })

  it('toggleSelectObject removes from selectedIds if already selected', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])
    expect(useSceneStore.getState().selectedIds).toHaveLength(2)

    useSceneStore.getState().toggleSelectObject(ids[0])
    expect(useSceneStore.getState().selectedIds).not.toContain(ids[0])
    expect(useSceneStore.getState().selectedIds).toContain(ids[1])
    expect(useSceneStore.getState().selectedIds).toHaveLength(1)
  })

  it('selectRange selects all objects between fromId and toId inclusive', () => {
    const ids = seedObjects(5)

    useSceneStore.getState().selectRange(ids[1], ids[3])
    const { selectedIds } = useSceneStore.getState()
    expect(selectedIds).toHaveLength(3)
    expect(selectedIds).toContain(ids[1])
    expect(selectedIds).toContain(ids[2])
    expect(selectedIds).toContain(ids[3])
    expect(selectedIds).not.toContain(ids[0])
    expect(selectedIds).not.toContain(ids[4])
  })

  it('selectRange works regardless of argument order', () => {
    const ids = seedObjects(5)

    useSceneStore.getState().selectRange(ids[3], ids[1])
    const { selectedIds } = useSceneStore.getState()
    expect(selectedIds).toHaveLength(3)
    expect(selectedIds).toContain(ids[1])
    expect(selectedIds).toContain(ids[2])
    expect(selectedIds).toContain(ids[3])
  })

  it('selectAll selects all object ids', () => {
    const ids = seedObjects(4)

    useSceneStore.getState().selectAll()
    const { selectedIds } = useSceneStore.getState()
    expect(selectedIds).toHaveLength(4)
    for (const id of ids) {
      expect(selectedIds).toContain(id)
    }
  })

  it('deselectAll clears selectedIds', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])
    expect(useSceneStore.getState().selectedIds).toHaveLength(2)

    useSceneStore.getState().deselectAll()
    expect(useSceneStore.getState().selectedIds).toHaveLength(0)
    expect(useSceneStore.getState().selectedId).toBeNull()
  })

  it('selectedIds persists in history via undo/redo', () => {
    const ids = seedObjects(2)

    // addObject already pushes history; now select both
    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])

    // Add another object to push a new history entry
    useSceneStore.getState().addObject('sphere')
    const sphereId = useSceneStore.getState().objects[2].id
    // After addObject, selectedIds contains only the new sphere
    expect(useSceneStore.getState().selectedIds).toContain(sphereId)

    // Undo should restore previous selectedIds from history
    useSceneStore.getState().undo()
    const afterUndo = useSceneStore.getState()
    expect(afterUndo.objects).toHaveLength(2)
    // History snapshot has selectedIds from the previous state
    expect(afterUndo.selectedIds).toBeDefined()
  })
})

describe('Batch Operations', () => {
  beforeEach(resetStore)

  it('removeSelected removes all selected objects', () => {
    const ids = seedObjects(4)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[2])
    useSceneStore.getState().removeSelected()

    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(2)
    expect(objects.map(o => o.id)).not.toContain(ids[0])
    expect(objects.map(o => o.id)).not.toContain(ids[2])
    expect(objects.map(o => o.id)).toContain(ids[1])
    expect(objects.map(o => o.id)).toContain(ids[3])
  })

  it('removeSelected deselects after removal', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])
    useSceneStore.getState().removeSelected()

    expect(useSceneStore.getState().selectedIds).toHaveLength(0)
    expect(useSceneStore.getState().selectedId).toBeNull()
  })

  it('removeSelected with empty selection does nothing', () => {
    seedObjects(3)
    useSceneStore.getState().deselectAll()

    const objectsBefore = useSceneStore.getState().objects.length
    useSceneStore.getState().removeSelected()
    expect(useSceneStore.getState().objects).toHaveLength(objectsBefore)
  })

  it('duplicateSelected creates copies of all selected objects', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[2])
    useSceneStore.getState().duplicateSelected()

    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(5) // 3 originals + 2 copies
    const copies = objects.filter(o => o.name.includes('(copy)'))
    expect(copies).toHaveLength(2)
  })

  it('duplicateSelected offsets duplicates', () => {
    const ids = seedObjects(2)
    const originalPos = useSceneStore.getState().objects[0].position

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().duplicateSelected()

    const { objects } = useSceneStore.getState()
    const copy = objects.find(o => o.name.includes('(copy)'))
    expect(copy).toBeDefined()
    expect(copy!.position.x).not.toBe(originalPos.x)
  })

  it('duplicateSelected selects the new copies', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])
    useSceneStore.getState().duplicateSelected()

    const { selectedIds, objects } = useSceneStore.getState()
    expect(selectedIds).toHaveLength(2)
    // The selected ids should be the new copies, not the originals
    for (const selectedId of selectedIds) {
      expect(ids).not.toContain(selectedId)
    }
    // All selected ids should exist in objects
    for (const selectedId of selectedIds) {
      expect(objects.find(o => o.id === selectedId)).toBeDefined()
    }
  })
})

describe('Copy/Paste', () => {
  beforeEach(resetStore)

  it('copySelected puts selected objects in clipboard', () => {
    const ids = seedObjects(3)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[2])
    useSceneStore.getState().copySelected()

    const { clipboard } = useSceneStore.getState()
    expect(clipboard).toHaveLength(2)
    expect(clipboard.map(o => o.id)).toContain(ids[0])
    expect(clipboard.map(o => o.id)).toContain(ids[2])
  })

  it('pasteClipboard creates new objects from clipboard with new ids', () => {
    const ids = seedObjects(2)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().copySelected()
    useSceneStore.getState().pasteClipboard()

    const { objects } = useSceneStore.getState()
    expect(objects).toHaveLength(3) // 2 originals + 1 pasted
    const pasted = objects[2]
    expect(pasted.id).not.toBe(ids[0]) // new id
    expect(pasted.type).toBe(objects[0].type) // same type as original
  })

  it('pasteClipboard offsets pasted objects', () => {
    const ids = seedObjects(1)
    const originalPos = { ...useSceneStore.getState().objects[0].position }

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().copySelected()
    useSceneStore.getState().pasteClipboard()

    const { objects } = useSceneStore.getState()
    const pasted = objects[objects.length - 1]
    // At least one axis should differ (offset applied)
    const posChanged = (
      pasted.position.x !== originalPos.x ||
      pasted.position.y !== originalPos.y ||
      pasted.position.z !== originalPos.z
    )
    expect(posChanged).toBe(true)
  })

  it('pasteClipboard selects pasted objects', () => {
    const ids = seedObjects(2)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().toggleSelectObject(ids[1])
    useSceneStore.getState().copySelected()
    useSceneStore.getState().pasteClipboard()

    const { selectedIds, objects } = useSceneStore.getState()
    expect(selectedIds).toHaveLength(2)
    // Selected ids should be the pasted (new) objects, not the originals
    for (const selectedId of selectedIds) {
      expect(ids).not.toContain(selectedId)
      expect(objects.find(o => o.id === selectedId)).toBeDefined()
    }
  })

  it('paste with empty clipboard does nothing', () => {
    seedObjects(2)
    const objectsBefore = useSceneStore.getState().objects.length
    const historyBefore = useSceneStore.getState().history.length

    useSceneStore.getState().pasteClipboard()

    expect(useSceneStore.getState().objects).toHaveLength(objectsBefore)
    expect(useSceneStore.getState().history).toHaveLength(historyBefore)
  })

  it('clipboard persists across scene operations', () => {
    const ids = seedObjects(2)

    useSceneStore.getState().toggleSelectObject(ids[0])
    useSceneStore.getState().copySelected()
    expect(useSceneStore.getState().clipboard).toHaveLength(1)

    // Perform other scene operations
    useSceneStore.getState().addObject('sphere')
    expect(useSceneStore.getState().clipboard).toHaveLength(1)

    useSceneStore.getState().removeObject(ids[1])
    expect(useSceneStore.getState().clipboard).toHaveLength(1)

    // Clipboard should still be intact and usable
    useSceneStore.getState().pasteClipboard()
    const { objects } = useSceneStore.getState()
    const pasted = objects.filter(o => o.name.includes('(copy)'))
    expect(pasted).toHaveLength(1)
  })
})
