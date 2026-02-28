import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useSceneStore } from '../stores/useSceneStore'
import type { SceneObject } from '../types/scene'

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

function createTestObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: 'test-obj-1',
    name: 'Box 1',
    type: 'box',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#b45309',
    visible: true,
    locked: false,
    material: {
      type: 'standard',
      color: '#b45309',
      opacity: 1,
      transparent: false,
      wireframe: false,
      metalness: 0.1,
      roughness: 0.8,
    },
    ...overrides,
  }
}

function fireKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...opts }),
  )
}

function fireKeyWithTarget(
  key: string,
  tagName: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...opts })
  Object.defineProperty(event, 'target', { value: { tagName } })
  window.dispatchEvent(event)
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    resetStore()
  })

  // ── Tool mode shortcuts ────────────────────────────────────────────

  describe('tool mode shortcuts', () => {
    it('Q key sets tool mode to select', () => {
      // Start in a different mode so we can verify the change
      useSceneStore.setState({ toolMode: 'move' })
      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('q')

      expect(useSceneStore.getState().toolMode).toBe('select')
      unmount()
    })

    it('W key sets tool mode to move', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('w')

      expect(useSceneStore.getState().toolMode).toBe('move')
      unmount()
    })

    it('E key sets tool mode to rotate', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('e')

      expect(useSceneStore.getState().toolMode).toBe('rotate')
      unmount()
    })

    it('R key sets tool mode to scale', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('r')

      expect(useSceneStore.getState().toolMode).toBe('scale')
      unmount()
    })
  })

  // ── Undo / Redo shortcuts ─────────────────────────────────────────

  describe('undo / redo shortcuts', () => {
    it('Ctrl+Z triggers undo', () => {
      // Build up history: add an object so undo has something to revert
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().objects).toHaveLength(1)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('z', { ctrlKey: true })

      expect(useSceneStore.getState().objects).toHaveLength(0)
      unmount()
    })

    it('Ctrl+Shift+Z triggers redo', () => {
      // Add object then undo, so redo can restore it
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('z', { ctrlKey: true, shiftKey: true })

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })

    it('Ctrl+Y triggers redo', () => {
      // Add object then undo, so redo can restore it
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().undo()
      expect(useSceneStore.getState().objects).toHaveLength(0)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('y', { ctrlKey: true })

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })
  })

  // ── Duplicate shortcut ─────────────────────────────────────────────

  describe('duplicate shortcut', () => {
    it('Ctrl+D duplicates the selected object', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: obj.id,
        selectedIds: [obj.id],
        history: [{ objects: [obj], selectedId: obj.id, selectedIds: [obj.id] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('d', { ctrlKey: true })

      const { objects, selectedId } = useSceneStore.getState()
      expect(objects).toHaveLength(2)
      // The duplicate should be a different object
      expect(objects[1].id).not.toBe(obj.id)
      // Selection should move to the new duplicate
      expect(selectedId).toBe(objects[1].id)
      unmount()
    })

    it('Ctrl+D does nothing when no object is selected', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: null,
        history: [{ objects: [obj], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('d', { ctrlKey: true })

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })
  })

  // ── Delete shortcuts ───────────────────────────────────────────────

  describe('delete shortcuts', () => {
    it('Delete key removes the selected object', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: obj.id,
        selectedIds: [obj.id],
        history: [{ objects: [obj], selectedId: obj.id, selectedIds: [obj.id] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Delete')

      expect(useSceneStore.getState().objects).toHaveLength(0)
      expect(useSceneStore.getState().selectedId).toBeNull()
      unmount()
    })

    it('Backspace key removes the selected object', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: obj.id,
        selectedIds: [obj.id],
        history: [{ objects: [obj], selectedId: obj.id, selectedIds: [obj.id] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Backspace')

      expect(useSceneStore.getState().objects).toHaveLength(0)
      expect(useSceneStore.getState().selectedId).toBeNull()
      unmount()
    })

    it('Delete key does nothing when no object is selected', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: null,
        history: [{ objects: [obj], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Delete')

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })

    it('Backspace key does nothing when no object is selected', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: null,
        history: [{ objects: [obj], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Backspace')

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })
  })

  // ── Input element filtering ────────────────────────────────────────

  describe('ignores shortcuts in text inputs', () => {
    it('ignores keys when target is an INPUT element', () => {
      useSceneStore.setState({ toolMode: 'select' })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKeyWithTarget('w', 'INPUT')

      expect(useSceneStore.getState().toolMode).toBe('select')
      unmount()
    })

    it('ignores keys when target is a TEXTAREA element', () => {
      useSceneStore.setState({ toolMode: 'select' })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKeyWithTarget('e', 'TEXTAREA')

      expect(useSceneStore.getState().toolMode).toBe('select')
      unmount()
    })

    it('ignores Ctrl shortcuts when target is an INPUT element', () => {
      useSceneStore.getState().addObject('box')
      expect(useSceneStore.getState().objects).toHaveLength(1)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKeyWithTarget('z', 'INPUT', { ctrlKey: true })

      // Undo should NOT have fired
      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })

    it('ignores Ctrl shortcuts when target is a TEXTAREA element', () => {
      const obj = createTestObject()
      useSceneStore.setState({
        objects: [obj],
        selectedId: obj.id,
        selectedIds: [obj.id],
        history: [{ objects: [obj], selectedId: obj.id, selectedIds: [obj.id] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKeyWithTarget('d', 'TEXTAREA', { ctrlKey: true })

      // Duplicate should NOT have fired
      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })
  })

  // ── Copy/Paste shortcuts ──────────────────────────────────────────

  describe('copy/paste shortcuts', () => {
    it('Ctrl+C copies selected objects to clipboard', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      useSceneStore.setState({
        objects: [obj1, obj2],
        selectedId: 'obj-2',
        selectedIds: ['obj-1', 'obj-2'],
        history: [{ objects: [obj1, obj2], selectedId: 'obj-2', selectedIds: ['obj-1', 'obj-2'] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('c', { ctrlKey: true })

      const { clipboard } = useSceneStore.getState()
      expect(clipboard).toHaveLength(2)
      expect(clipboard.map((o: SceneObject) => o.id)).toEqual(
        expect.arrayContaining(['obj-1', 'obj-2']),
      )
      unmount()
    })

    it('Ctrl+V pastes clipboard objects', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      useSceneStore.setState({
        objects: [obj1, obj2],
        selectedId: 'obj-2',
        selectedIds: ['obj-1', 'obj-2'],
        history: [{ objects: [obj1, obj2], selectedId: 'obj-2', selectedIds: ['obj-1', 'obj-2'] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      // Copy first, then paste
      fireKey('c', { ctrlKey: true })
      fireKey('v', { ctrlKey: true })

      const { objects } = useSceneStore.getState()
      expect(objects).toHaveLength(4)
      unmount()
    })

    it('Ctrl+C with no selection copies empty clipboard', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      useSceneStore.setState({
        objects: [obj1],
        selectedId: null,
        selectedIds: [],
        history: [{ objects: [obj1], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('c', { ctrlKey: true })

      expect(useSceneStore.getState().clipboard).toHaveLength(0)
      unmount()
    })

    it('Ctrl+V with empty clipboard does nothing', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      useSceneStore.setState({
        objects: [obj1],
        selectedId: null,
        selectedIds: [],
        clipboard: [],
        history: [{ objects: [obj1], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('v', { ctrlKey: true })

      expect(useSceneStore.getState().objects).toHaveLength(1)
      unmount()
    })
  })

  // ── Select All shortcut ─────────────────────────────────────────────

  describe('select all shortcut', () => {
    it('Ctrl+A selects all objects', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      const obj3 = createTestObject({ id: 'obj-3', name: 'Cylinder 1', type: 'cylinder' })
      useSceneStore.setState({
        objects: [obj1, obj2, obj3],
        selectedId: null,
        selectedIds: [],
        history: [{ objects: [obj1, obj2, obj3], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('a', { ctrlKey: true })

      const { selectedIds } = useSceneStore.getState()
      expect(selectedIds).toHaveLength(3)
      expect(selectedIds).toEqual(expect.arrayContaining(['obj-1', 'obj-2', 'obj-3']))
      unmount()
    })

    it('Ctrl+A with empty scene results in empty selectedIds', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('a', { ctrlKey: true })

      expect(useSceneStore.getState().selectedIds).toHaveLength(0)
      unmount()
    })
  })

  // ── Multi-select Delete ─────────────────────────────────────────────

  describe('multi-select delete', () => {
    it('Delete key with selectedIds calls removeSelected', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      const obj3 = createTestObject({ id: 'obj-3', name: 'Cylinder 1', type: 'cylinder' })
      useSceneStore.setState({
        objects: [obj1, obj2, obj3],
        selectedId: 'obj-2',
        selectedIds: ['obj-1', 'obj-2'],
        history: [{ objects: [obj1, obj2, obj3], selectedId: 'obj-2', selectedIds: ['obj-1', 'obj-2'] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Delete')

      const { objects } = useSceneStore.getState()
      expect(objects).toHaveLength(1)
      expect(objects[0].id).toBe('obj-3')
      unmount()
    })

    it('Backspace key with selectedIds calls removeSelected', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      const obj3 = createTestObject({ id: 'obj-3', name: 'Cylinder 1', type: 'cylinder' })
      useSceneStore.setState({
        objects: [obj1, obj2, obj3],
        selectedId: 'obj-2',
        selectedIds: ['obj-1', 'obj-2'],
        history: [{ objects: [obj1, obj2, obj3], selectedId: 'obj-2', selectedIds: ['obj-1', 'obj-2'] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('Backspace')

      const { objects } = useSceneStore.getState()
      expect(objects).toHaveLength(1)
      expect(objects[0].id).toBe('obj-3')
      unmount()
    })
  })

  // ── Multi-select Duplicate ──────────────────────────────────────────

  describe('multi-select duplicate', () => {
    it('Ctrl+D with selectedIds calls duplicateSelected', () => {
      const obj1 = createTestObject({ id: 'obj-1' })
      const obj2 = createTestObject({ id: 'obj-2', name: 'Sphere 1', type: 'sphere' })
      useSceneStore.setState({
        objects: [obj1, obj2],
        selectedId: 'obj-2',
        selectedIds: ['obj-1', 'obj-2'],
        history: [{ objects: [obj1, obj2], selectedId: 'obj-2', selectedIds: ['obj-1', 'obj-2'] }],
        historyIndex: 0,
      })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('d', { ctrlKey: true })

      const { objects } = useSceneStore.getState()
      expect(objects).toHaveLength(4)
      unmount()
    })
  })

  // ── ? key (shortcut help) ──────────────────────────────────────────

  describe('? key shortcut help', () => {
    it('? key dispatches toggle-shortcut-help event', () => {
      let fired = false
      const listener = () => { fired = true }
      window.addEventListener('toggle-shortcut-help', listener)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKey('?')

      expect(fired).toBe(true)

      window.removeEventListener('toggle-shortcut-help', listener)
      unmount()
    })

    it('ignores ? when in input field', () => {
      let fired = false
      const listener = () => { fired = true }
      window.addEventListener('toggle-shortcut-help', listener)

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      fireKeyWithTarget('?', 'INPUT')

      expect(fired).toBe(false)

      window.removeEventListener('toggle-shortcut-help', listener)
      unmount()
    })
  })

  // ── Cleanup ────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('removes the event listener on unmount', () => {
      useSceneStore.setState({ toolMode: 'select' })

      const { unmount } = renderHook(() => useKeyboardShortcuts())

      // Verify the shortcut works while mounted
      fireKey('w')
      expect(useSceneStore.getState().toolMode).toBe('move')

      // Unmount the hook
      unmount()

      // Reset tool mode and fire the key again
      useSceneStore.setState({ toolMode: 'select' })
      fireKey('r')

      // Should still be 'select' because the listener was removed
      expect(useSceneStore.getState().toolMode).toBe('select')
    })
  })
})
