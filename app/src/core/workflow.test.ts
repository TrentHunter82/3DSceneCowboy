import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from '../stores/useSceneStore'
import type { SceneData } from '../types/scene'
import { createDefaultEnvironment } from './sceneOperations'

const MAX_HISTORY = 50

function resetStore() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
    environment: createDefaultEnvironment(),
    snapEnabled: false,
    snapValue: 0.5,
  })
}

/** Helper to get current store state concisely */
function state() {
  return useSceneStore.getState()
}

/** Helper to get actions without re-reading stale closures */
function actions() {
  return useSceneStore.getState()
}

describe('E2E Workflow Tests', () => {
  beforeEach(() => {
    resetStore()
  })

  // ──────────────────────────────────────────────────────────────────────
  // 1. Full Workflow: Add -> Select -> Transform -> Material -> Save -> Load
  // ──────────────────────────────────────────────────────────────────────

  describe('Full Workflow: Add -> Select -> Transform -> Material -> Save -> Load', () => {
    it('completes the entire create-edit-save-load cycle', () => {
      // Add a box, verify it exists
      actions().addObject('box')
      expect(state().objects).toHaveLength(1)
      const box = state().objects[0]
      expect(box.type).toBe('box')
      expect(box.name).toBe('Box 1')

      // Select it, verify selectedId
      actions().selectObject(box.id)
      expect(state().selectedId).toBe(box.id)

      // Update position to (5, 0, 3), verify
      actions().updateObject(box.id, {
        position: { x: 5, y: 0, z: 3 },
      })
      expect(state().objects[0].position).toEqual({ x: 5, y: 0, z: 3 })

      // Update material color to '#ff0000', metalness to 0.5, roughness to 0.3
      actions().updateObject(box.id, {
        material: {
          ...state().objects[0].material,
          color: '#ff0000',
          metalness: 0.5,
          roughness: 0.3,
        },
      })
      const updatedMaterial = state().objects[0].material
      expect(updatedMaterial.color).toBe('#ff0000')
      expect(updatedMaterial.metalness).toBe(0.5)
      expect(updatedMaterial.roughness).toBe(0.3)
      // Verify other material properties are preserved
      expect(updatedMaterial.type).toBe('standard')
      expect(updatedMaterial.opacity).toBe(1)
      expect(updatedMaterial.wireframe).toBe(false)

      // Save scene with name "Test Scene"
      const savedData = actions().saveScene('Test Scene')
      expect(savedData.metadata.name).toBe('Test Scene')
      expect(savedData.objects).toHaveLength(1)

      // Clear scene, verify empty
      actions().clearScene()
      expect(state().objects).toHaveLength(0)
      expect(state().selectedId).toBeNull()

      // Load saved scene, verify all properties match
      actions().loadScene(savedData)
      const loaded = state().objects[0]
      expect(state().objects).toHaveLength(1)
      expect(loaded.type).toBe('box')
      expect(loaded.name).toBe('Box 1')
      expect(loaded.position).toEqual({ x: 5, y: 0, z: 3 })
      expect(loaded.material.color).toBe('#ff0000')
      expect(loaded.material.metalness).toBe(0.5)
      expect(loaded.material.roughness).toBe(0.3)
      expect(loaded.material.type).toBe('standard')
      expect(loaded.material.opacity).toBe(1)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 2. Complex Multi-Object Workflow
  // ──────────────────────────────────────────────────────────────────────

  describe('Complex Multi-Object Workflow', () => {
    it('handles add, move, color, duplicate, delete, undo, redo across multiple objects', () => {
      // Add box, sphere, cylinder
      actions().addObject('box')
      actions().addObject('sphere')
      actions().addObject('cylinder')
      expect(state().objects).toHaveLength(3)

      const boxId = state().objects[0].id
      const sphereId = state().objects[1].id
      const cylinderId = state().objects[2].id

      // Select box, move to (1, 2, 3)
      actions().selectObject(boxId)
      expect(state().selectedId).toBe(boxId)
      actions().updateObject(boxId, { position: { x: 1, y: 2, z: 3 } })
      expect(state().objects.find(o => o.id === boxId)!.position).toEqual({
        x: 1, y: 2, z: 3,
      })

      // Select sphere, change color to '#00ff00'
      actions().selectObject(sphereId)
      expect(state().selectedId).toBe(sphereId)
      actions().updateObject(sphereId, { color: '#00ff00' })
      expect(state().objects.find(o => o.id === sphereId)!.color).toBe('#00ff00')

      // Duplicate cylinder, verify 4 objects
      actions().duplicateObject(cylinderId)
      expect(state().objects).toHaveLength(4)
      const duplicatedCylinder = state().objects[3]
      expect(duplicatedCylinder.type).toBe('cylinder')
      expect(duplicatedCylinder.name).toContain('(copy)')
      // Duplicate should be selected
      expect(state().selectedId).toBe(duplicatedCylinder.id)

      // Delete sphere, verify 3 objects, verify sphere gone
      actions().removeObject(sphereId)
      expect(state().objects).toHaveLength(3)
      expect(state().objects.find(o => o.id === sphereId)).toBeUndefined()
      // Verify the remaining objects are correct types
      expect(state().objects.map(o => o.type)).toEqual(['box', 'cylinder', 'cylinder'])

      // Undo delete, verify sphere is back
      actions().undo()
      expect(state().objects).toHaveLength(4)
      const restoredSphere = state().objects.find(o => o.id === sphereId)
      expect(restoredSphere).toBeDefined()
      expect(restoredSphere!.color).toBe('#00ff00')

      // Redo delete, verify sphere gone again
      actions().redo()
      expect(state().objects).toHaveLength(3)
      expect(state().objects.find(o => o.id === sphereId)).toBeUndefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 3. Undo/Redo Across Multiple Operations
  // ──────────────────────────────────────────────────────────────────────

  describe('Undo/Redo Across Multiple Operations', () => {
    it('can undo and redo add, move, and rename in sequence', () => {
      // Add box
      actions().addObject('box')
      expect(state().objects).toHaveLength(1)
      const boxId = state().objects[0].id
      const originalName = state().objects[0].name
      const originalPosition = { ...state().objects[0].position }

      // Move box to (5, 0, 0)
      actions().updateObject(boxId, { position: { x: 5, y: 0, z: 0 } })
      expect(state().objects[0].position).toEqual({ x: 5, y: 0, z: 0 })

      // Rename box to "Custom Box"
      actions().updateObject(boxId, { name: 'Custom Box' })
      expect(state().objects[0].name).toBe('Custom Box')

      // Undo rename - verify original name
      actions().undo()
      expect(state().objects[0].name).toBe(originalName)
      // Position should still be (5, 0, 0) after undoing only rename
      expect(state().objects[0].position).toEqual({ x: 5, y: 0, z: 0 })

      // Undo move - verify original position
      actions().undo()
      expect(state().objects[0].position).toEqual(originalPosition)
      // Name should be back to original after undoing move
      expect(state().objects[0].name).toBe(originalName)

      // Undo add - verify empty scene
      actions().undo()
      expect(state().objects).toHaveLength(0)
      expect(state().canUndo()).toBe(false)

      // Redo all three - verify final state
      actions().redo() // redo add
      expect(state().objects).toHaveLength(1)
      expect(state().objects[0].id).toBe(boxId)
      expect(state().objects[0].name).toBe(originalName)

      actions().redo() // redo move
      expect(state().objects[0].position).toEqual({ x: 5, y: 0, z: 0 })

      actions().redo() // redo rename
      expect(state().objects[0].name).toBe('Custom Box')
      expect(state().canRedo()).toBe(false)
    })

    it('discards redo history when a new action is performed after undo', () => {
      actions().addObject('box')
      actions().addObject('sphere')
      actions().addObject('cylinder')
      expect(state().objects).toHaveLength(3)

      // Undo twice (removes cylinder and sphere)
      actions().undo()
      actions().undo()
      expect(state().objects).toHaveLength(1)
      expect(state().canRedo()).toBe(true)

      // Perform a new action - this should discard redo history
      actions().addObject('cone')
      expect(state().objects).toHaveLength(2)
      expect(state().canRedo()).toBe(false)

      // The redo-discarded sphere and cylinder are gone
      expect(state().objects[0].type).toBe('box')
      expect(state().objects[1].type).toBe('cone')
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 4. Save/Load Preserves Everything
  // ──────────────────────────────────────────────────────────────────────

  describe('Save/Load Preserves Everything', () => {
    it('preserves all object properties through save and load', () => {
      // Create complex scene: 3 objects with custom positions, materials, visibility, locked states
      actions().addObject('box')
      actions().addObject('sphere')
      actions().addObject('cylinder')

      const boxId = state().objects[0].id
      const sphereId = state().objects[1].id
      const cylinderId = state().objects[2].id

      // Customize box: custom position, locked, custom material
      actions().updateObject(boxId, {
        name: 'Barn Wall',
        position: { x: 10, y: 5, z: -3 },
        rotation: { x: 0, y: Math.PI / 4, z: 0 },
        scale: { x: 2, y: 3, z: 0.5 },
        color: '#8b4513',
        locked: true,
        material: {
          type: 'standard',
          color: '#8b4513',
          opacity: 1,
          transparent: false,
          wireframe: false,
          metalness: 0.0,
          roughness: 0.9,
        },
      })

      // Customize sphere: hidden, transparent material
      actions().updateObject(sphereId, {
        name: 'Ghost Orb',
        position: { x: -2, y: 8, z: 1 },
        visible: false,
        color: '#ffffff',
        material: {
          type: 'phong',
          color: '#ffffff',
          opacity: 0.3,
          transparent: true,
          wireframe: false,
          metalness: 0.8,
          roughness: 0.1,
        },
      })

      // Customize cylinder: wireframe material
      actions().updateObject(cylinderId, {
        name: 'Fence Post',
        position: { x: 0, y: 0.5, z: 7 },
        scale: { x: 0.2, y: 2, z: 0.2 },
        material: {
          type: 'basic',
          color: '#654321',
          opacity: 1,
          transparent: false,
          wireframe: true,
          metalness: 0.5,
          roughness: 0.5,
        },
      })

      // Update environment settings
      actions().updateEnvironment({
        backgroundColor: '#2d1b0e',
        fogEnabled: true,
        fogColor: '#c4a67d',
        fogNear: 5,
        fogFar: 100,
        gridVisible: false,
        gridSize: 20,
      })

      // Capture the full state before save
      const objectsBefore = structuredClone(state().objects)
      const envBefore = { ...state().environment }

      // Save the scene
      const savedData = actions().saveScene('Complex Western Scene')
      expect(savedData.metadata.name).toBe('Complex Western Scene')
      expect(savedData.objects).toHaveLength(3)

      // Clear
      actions().clearScene()
      expect(state().objects).toHaveLength(0)
      // Verify environment was reset on clear
      expect(state().environment.backgroundColor).toBe(createDefaultEnvironment().backgroundColor)

      // Load
      actions().loadScene(savedData)

      // Verify ALL properties match for each object
      expect(state().objects).toHaveLength(3)

      // Verify box
      const loadedBox = state().objects.find(o => o.name === 'Barn Wall')!
      expect(loadedBox).toBeDefined()
      expect(loadedBox.type).toBe('box')
      expect(loadedBox.position).toEqual({ x: 10, y: 5, z: -3 })
      expect(loadedBox.rotation).toEqual({ x: 0, y: Math.PI / 4, z: 0 })
      expect(loadedBox.scale).toEqual({ x: 2, y: 3, z: 0.5 })
      expect(loadedBox.color).toBe('#8b4513')
      expect(loadedBox.locked).toBe(true)
      expect(loadedBox.visible).toBe(true)
      expect(loadedBox.material).toEqual(objectsBefore.find(o => o.name === 'Barn Wall')!.material)

      // Verify sphere
      const loadedSphere = state().objects.find(o => o.name === 'Ghost Orb')!
      expect(loadedSphere).toBeDefined()
      expect(loadedSphere.type).toBe('sphere')
      expect(loadedSphere.position).toEqual({ x: -2, y: 8, z: 1 })
      expect(loadedSphere.visible).toBe(false)
      expect(loadedSphere.material.type).toBe('phong')
      expect(loadedSphere.material.color).toBe('#ffffff')
      expect(loadedSphere.material.opacity).toBe(0.3)
      expect(loadedSphere.material.transparent).toBe(true)
      expect(loadedSphere.material.metalness).toBe(0.8)
      expect(loadedSphere.material.roughness).toBe(0.1)

      // Verify cylinder
      const loadedCylinder = state().objects.find(o => o.name === 'Fence Post')!
      expect(loadedCylinder).toBeDefined()
      expect(loadedCylinder.type).toBe('cylinder')
      expect(loadedCylinder.position).toEqual({ x: 0, y: 0.5, z: 7 })
      expect(loadedCylinder.scale).toEqual({ x: 0.2, y: 2, z: 0.2 })
      expect(loadedCylinder.material.type).toBe('basic')
      expect(loadedCylinder.material.wireframe).toBe(true)
      expect(loadedCylinder.material.color).toBe('#654321')

      // Verify environment settings preserved
      expect(state().environment.backgroundColor).toBe(envBefore.backgroundColor)
      expect(state().environment.fogEnabled).toBe(true)
      expect(state().environment.fogColor).toBe('#c4a67d')
      expect(state().environment.fogNear).toBe(5)
      expect(state().environment.fogFar).toBe(100)
      expect(state().environment.gridVisible).toBe(false)
      expect(state().environment.gridSize).toBe(20)
    })

    it('preserves selection state as null after load', () => {
      actions().addObject('box')
      const boxId = state().objects[0].id
      actions().selectObject(boxId)
      expect(state().selectedId).toBe(boxId)

      const saved = actions().saveScene('Selection Test')
      actions().clearScene()
      actions().loadScene(saved)

      // Load always resets selection to null
      expect(state().selectedId).toBeNull()
    })

    it('resets history after load', () => {
      actions().addObject('box')
      actions().addObject('sphere')
      actions().addObject('cylinder')
      expect(state().historyIndex).toBe(3) // initial + 3 adds

      const saved = actions().saveScene()
      actions().clearScene()
      actions().loadScene(saved)

      // History should be reset to a single entry
      expect(state().historyIndex).toBe(0)
      expect(state().history).toHaveLength(1)
      expect(state().canUndo()).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 5. Object Isolation (state doesn't leak)
  // ──────────────────────────────────────────────────────────────────────

  describe('Object Isolation (state does not leak between objects)', () => {
    it('updating one object material does not affect another', () => {
      actions().addObject('box')
      actions().addObject('sphere')

      const boxId = state().objects[0].id
      const sphereId = state().objects[1].id

      // Capture sphere's original material
      const sphereMaterialBefore = { ...state().objects[1].material }

      // Update object A's (box) material
      actions().updateObject(boxId, {
        material: {
          type: 'phong',
          color: '#ff0000',
          opacity: 0.5,
          transparent: true,
          wireframe: true,
          metalness: 1.0,
          roughness: 0.0,
        },
      })

      // Verify object B's (sphere) material is unchanged
      const sphereAfter = state().objects.find(o => o.id === sphereId)!
      expect(sphereAfter.material).toEqual(sphereMaterialBefore)
    })

    it('updating one object position does not affect another', () => {
      actions().addObject('box')
      actions().addObject('sphere')

      const boxId = state().objects[0].id
      const sphereId = state().objects[1].id

      // Capture sphere's original position
      const spherePositionBefore = { ...state().objects[1].position }

      // Update object A's (box) position
      actions().updateObject(boxId, {
        position: { x: 100, y: 200, z: 300 },
      })

      // Verify object B's (sphere) position is unchanged
      const sphereAfter = state().objects.find(o => o.id === sphereId)!
      expect(sphereAfter.position).toEqual(spherePositionBefore)
    })

    it('removing one object does not alter properties of remaining objects', () => {
      actions().addObject('box')
      actions().addObject('sphere')
      actions().addObject('cylinder')

      const sphereId = state().objects[1].id
      const cylinderId = state().objects[2].id

      // Customize box and cylinder
      const boxId = state().objects[0].id
      actions().updateObject(boxId, {
        position: { x: 5, y: 5, z: 5 },
        name: 'Special Box',
      })
      actions().updateObject(cylinderId, {
        position: { x: -3, y: 0, z: -3 },
        name: 'Special Cylinder',
      })

      // Remove sphere
      actions().removeObject(sphereId)

      // Verify remaining objects are untouched
      const box = state().objects.find(o => o.id === boxId)!
      expect(box.name).toBe('Special Box')
      expect(box.position).toEqual({ x: 5, y: 5, z: 5 })

      const cylinder = state().objects.find(o => o.id === cylinderId)!
      expect(cylinder.name).toBe('Special Cylinder')
      expect(cylinder.position).toEqual({ x: -3, y: 0, z: -3 })
    })

    it('duplicating an object creates an independent copy', () => {
      actions().addObject('box')
      const originalId = state().objects[0].id

      // Customize the original
      actions().updateObject(originalId, {
        color: '#ff0000',
        material: {
          type: 'standard',
          color: '#ff0000',
          opacity: 1,
          transparent: false,
          wireframe: false,
          metalness: 0.9,
          roughness: 0.1,
        },
      })

      // Duplicate
      actions().duplicateObject(originalId)
      const copyId = state().objects[1].id

      // Modify the copy's material
      actions().updateObject(copyId, {
        material: {
          type: 'basic',
          color: '#00ff00',
          opacity: 0.5,
          transparent: true,
          wireframe: true,
          metalness: 0.0,
          roughness: 1.0,
        },
      })

      // Verify original is untouched
      const original = state().objects.find(o => o.id === originalId)!
      expect(original.material.color).toBe('#ff0000')
      expect(original.material.type).toBe('standard')
      expect(original.material.metalness).toBe(0.9)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 6. History Limits
  // ──────────────────────────────────────────────────────────────────────

  describe('History Limits', () => {
    it('caps history at MAX_HISTORY entries', () => {
      const totalAdds = MAX_HISTORY + 5 // 55

      for (let i = 0; i < totalAdds; i++) {
        actions().addObject('box')
      }

      // History should not exceed MAX_HISTORY
      expect(state().history.length).toBeLessThanOrEqual(MAX_HISTORY)
      expect(state().objects).toHaveLength(totalAdds)
    })

    it('undo still works after history overflow', () => {
      const totalAdds = MAX_HISTORY + 5

      for (let i = 0; i < totalAdds; i++) {
        actions().addObject('box')
      }

      const historyLen = state().history.length

      // Should be able to undo (historyLen - 1) times
      let undoCount = 0
      while (state().canUndo()) {
        actions().undo()
        undoCount++
      }

      expect(undoCount).toBe(historyLen - 1)
      // After all undos, we should have some objects remaining (the ones that fell off history)
      // Since we added 55 objects and history holds ~50 entries (initial + 49 adds before overflow starts),
      // after MAX_HISTORY+5 adds the oldest entries are pruned.
      // The earliest surviving history entry should have some objects.
      expect(state().objects.length).toBeLessThan(totalAdds)
      expect(state().canUndo()).toBe(false)
    })

    it('redo works correctly after history overflow and undo', () => {
      const totalAdds = MAX_HISTORY + 5

      for (let i = 0; i < totalAdds; i++) {
        actions().addObject('box')
      }

      // Undo 5 times
      for (let i = 0; i < 5; i++) {
        actions().undo()
      }
      expect(state().objects).toHaveLength(totalAdds - 5)
      expect(state().canRedo()).toBe(true)

      // Redo 5 times
      for (let i = 0; i < 5; i++) {
        actions().redo()
      }
      expect(state().objects).toHaveLength(totalAdds)
      expect(state().canRedo()).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // 7. Environment Workflow
  // ──────────────────────────────────────────────────────────────────────

  describe('Environment Workflow', () => {
    it('updates background color', () => {
      actions().updateEnvironment({ backgroundColor: '#3a2510' })
      expect(state().environment.backgroundColor).toBe('#3a2510')
    })

    it('enables fog with custom settings', () => {
      actions().updateEnvironment({
        fogEnabled: true,
        fogColor: '#d4a76a',
        fogNear: 3,
        fogFar: 80,
      })
      const env = state().environment
      expect(env.fogEnabled).toBe(true)
      expect(env.fogColor).toBe('#d4a76a')
      expect(env.fogNear).toBe(3)
      expect(env.fogFar).toBe(80)
    })

    it('preserves environment through save/clear/load cycle', () => {
      // Update background color
      actions().updateEnvironment({ backgroundColor: '#3a2510' })

      // Enable fog with custom settings
      actions().updateEnvironment({
        fogEnabled: true,
        fogColor: '#d4a76a',
        fogNear: 3,
        fogFar: 80,
      })

      // Also change grid settings
      actions().updateEnvironment({
        gridVisible: false,
        gridSize: 25,
      })

      // Capture environment state before save
      const envBefore = { ...state().environment }

      // Save scene
      const saved = actions().saveScene('Environment Test')
      expect(saved.environment.backgroundColor).toBe('#3a2510')
      expect(saved.environment.fogEnabled).toBe(true)

      // Clear scene
      actions().clearScene()

      // Verify environment was reset to defaults
      const defaults = createDefaultEnvironment()
      expect(state().environment.backgroundColor).toBe(defaults.backgroundColor)
      expect(state().environment.fogEnabled).toBe(defaults.fogEnabled)
      expect(state().environment.gridVisible).toBe(defaults.gridVisible)

      // Load scene
      actions().loadScene(saved)

      // Verify environment settings match what was saved
      expect(state().environment.backgroundColor).toBe(envBefore.backgroundColor)
      expect(state().environment.fogEnabled).toBe(envBefore.fogEnabled)
      expect(state().environment.fogColor).toBe(envBefore.fogColor)
      expect(state().environment.fogNear).toBe(envBefore.fogNear)
      expect(state().environment.fogFar).toBe(envBefore.fogFar)
      expect(state().environment.gridVisible).toBe(envBefore.gridVisible)
      expect(state().environment.gridSize).toBe(envBefore.gridSize)
    })

    it('partial environment updates preserve other settings', () => {
      // First update background
      actions().updateEnvironment({ backgroundColor: '#111111' })
      // Then update fog independently
      actions().updateEnvironment({ fogEnabled: true })

      // Both should be reflected
      expect(state().environment.backgroundColor).toBe('#111111')
      expect(state().environment.fogEnabled).toBe(true)
      // Other defaults should be preserved
      expect(state().environment.gridVisible).toBe(true)
      expect(state().environment.fogNear).toBe(10)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Additional edge-case workflows
  // ──────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('save and load with default scene name', () => {
      actions().addObject('torus')
      const saved = actions().saveScene()
      expect(saved.metadata.name).toBe('Untitled Scene')

      actions().clearScene()
      actions().loadScene(saved)
      expect(state().objects).toHaveLength(1)
      expect(state().objects[0].type).toBe('torus')
    })

    it('undo after clear does not restore (clear resets history)', () => {
      actions().addObject('box')
      actions().addObject('sphere')
      expect(state().objects).toHaveLength(2)

      actions().clearScene()
      expect(state().objects).toHaveLength(0)

      // Clear resets history, so undo should not bring objects back
      expect(state().canUndo()).toBe(false)
      actions().undo()
      expect(state().objects).toHaveLength(0)
    })

    it('multiple saves produce independent snapshots', () => {
      actions().addObject('box')
      const save1 = actions().saveScene('Save 1')

      actions().addObject('sphere')
      const save2 = actions().saveScene('Save 2')

      // save1 should only have 1 object
      expect(save1.objects).toHaveLength(1)
      expect(save1.metadata.name).toBe('Save 1')

      // save2 should have 2 objects
      expect(save2.objects).toHaveLength(2)
      expect(save2.metadata.name).toBe('Save 2')

      // Loading save1 should restore 1 object
      actions().loadScene(save1)
      expect(state().objects).toHaveLength(1)

      // Loading save2 should restore 2 objects
      actions().loadScene(save2)
      expect(state().objects).toHaveLength(2)
    })

    it('snap settings are independent from scene data', () => {
      actions().setSnapEnabled(true)
      actions().setSnapValue(0.25)
      expect(state().snapEnabled).toBe(true)
      expect(state().snapValue).toBe(0.25)

      // Snap settings are not persisted in save/load
      const saved = actions().saveScene()
      actions().clearScene()
      actions().setSnapEnabled(false)
      actions().setSnapValue(1.0)
      actions().loadScene(saved)

      // Snap settings should remain as manually set, not restored from save
      expect(state().snapEnabled).toBe(false)
      expect(state().snapValue).toBe(1.0)
    })

    it('tool mode is independent from scene data', () => {
      actions().setToolMode('rotate')
      expect(state().toolMode).toBe('rotate')

      const saved = actions().saveScene()
      actions().setToolMode('scale')
      actions().loadScene(saved)

      // Tool mode is not part of scene data, should remain as set
      expect(state().toolMode).toBe('scale')
    })

    it('all object types can be added and retrieved', () => {
      const types: Array<'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus'> = [
        'box', 'sphere', 'cylinder', 'cone', 'plane', 'torus',
      ]

      for (const type of types) {
        actions().addObject(type)
      }

      expect(state().objects).toHaveLength(6)
      for (let i = 0; i < types.length; i++) {
        expect(state().objects[i].type).toBe(types[i])
      }

      // Save and load all
      const saved = actions().saveScene('All Types')
      actions().clearScene()
      actions().loadScene(saved)

      expect(state().objects).toHaveLength(6)
      for (let i = 0; i < types.length; i++) {
        expect(state().objects[i].type).toBe(types[i])
      }
    })
  })
})
