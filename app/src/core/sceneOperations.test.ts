import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateId,
  resetIdCounter,
  createDefaultMaterial,
  createDefaultEnvironment,
  createSceneObject,
  duplicateSceneObject,
  updateSceneObject,
  removeSceneObject,
  findSceneObject,
  vec3,
  addVec3,
  scaleVec3,
  vec3Equal,
  OBJECT_DEFAULTS,
  OBJECT_LABELS,
} from './sceneOperations'

describe('sceneOperations', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  describe('generateId', () => {
    it('returns unique ids', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('starts with obj_ prefix', () => {
      expect(generateId()).toMatch(/^obj_/)
    })
  })

  describe('createDefaultMaterial', () => {
    it('creates material with default color', () => {
      const mat = createDefaultMaterial()
      expect(mat.type).toBe('standard')
      expect(mat.color).toBe('#c49a5c')
      expect(mat.opacity).toBe(1)
      expect(mat.transparent).toBe(false)
      expect(mat.wireframe).toBe(false)
    })

    it('uses custom color', () => {
      const mat = createDefaultMaterial('#ff0000')
      expect(mat.color).toBe('#ff0000')
    })
  })

  describe('createDefaultEnvironment', () => {
    it('returns valid environment settings', () => {
      const env = createDefaultEnvironment()
      expect(env.gridVisible).toBe(true)
      expect(typeof env.backgroundColor).toBe('string')
      expect(typeof env.fogNear).toBe('number')
      expect(typeof env.fogFar).toBe('number')
    })
  })

  describe('OBJECT_DEFAULTS', () => {
    it('has defaults for all object types', () => {
      const types = ['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus'] as const
      for (const type of types) {
        expect(OBJECT_DEFAULTS[type]).toBeDefined()
        expect(OBJECT_DEFAULTS[type].color).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(OBJECT_DEFAULTS[type].scale.x).toBeGreaterThan(0)
      }
    })
  })

  describe('OBJECT_LABELS', () => {
    it('has labels for all types', () => {
      const types = ['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus'] as const
      for (const type of types) {
        expect(typeof OBJECT_LABELS[type]).toBe('string')
        expect(OBJECT_LABELS[type].length).toBeGreaterThan(0)
      }
    })
  })

  describe('createSceneObject', () => {
    it('creates a box with correct defaults', () => {
      const obj = createSceneObject('box', [])
      expect(obj.type).toBe('box')
      expect(obj.name).toBe('Box 1')
      expect(obj.position.y).toBe(0.5) // non-plane objects elevated
      expect(obj.visible).toBe(true)
      expect(obj.locked).toBe(false)
      expect(obj.material.type).toBe('standard')
    })

    it('creates a plane at y=0', () => {
      const obj = createSceneObject('plane', [])
      expect(obj.position.y).toBe(0)
    })

    it('auto-numbers by type count', () => {
      const box1 = createSceneObject('box', [])
      const box2 = createSceneObject('box', [box1])
      expect(box1.name).toBe('Box 1')
      expect(box2.name).toBe('Box 2')
    })

    it('numbers independently per type', () => {
      const box1 = createSceneObject('box', [])
      const sphere1 = createSceneObject('sphere', [box1])
      expect(sphere1.name).toBe('Sphere 1')
    })
  })

  describe('duplicateSceneObject', () => {
    it('creates a copy with new id', () => {
      const original = createSceneObject('box', [])
      const copy = duplicateSceneObject(original)
      expect(copy.id).not.toBe(original.id)
      expect(copy.type).toBe(original.type)
      expect(copy.color).toBe(original.color)
    })

    it('appends (copy) to name', () => {
      const original = createSceneObject('box', [])
      const copy = duplicateSceneObject(original)
      expect(copy.name).toContain('(copy)')
    })

    it('offsets position by default', () => {
      const original = createSceneObject('box', [])
      const copy = duplicateSceneObject(original)
      expect(copy.position.x).toBe(original.position.x + 1)
      expect(copy.position.y).toBe(original.position.y)
    })

    it('accepts custom offset', () => {
      const original = createSceneObject('box', [])
      const copy = duplicateSceneObject(original, { x: 0, y: 2, z: 0 })
      expect(copy.position.y).toBe(original.position.y + 2)
    })
  })

  describe('updateSceneObject', () => {
    it('updates a specific object in the array', () => {
      const obj1 = createSceneObject('box', [])
      const obj2 = createSceneObject('sphere', [obj1])
      const result = updateSceneObject([obj1, obj2], obj1.id, { name: 'Changed' })
      expect(result[0].name).toBe('Changed')
      expect(result[1].name).toBe(obj2.name) // unchanged
    })

    it('returns same array structure if id not found', () => {
      const obj = createSceneObject('box', [])
      const result = updateSceneObject([obj], 'nonexistent', { name: 'X' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe(obj.name)
    })
  })

  describe('removeSceneObject', () => {
    it('removes object by id', () => {
      const obj1 = createSceneObject('box', [])
      const obj2 = createSceneObject('sphere', [obj1])
      const result = removeSceneObject([obj1, obj2], obj1.id)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(obj2.id)
    })
  })

  describe('findSceneObject', () => {
    it('finds object by id', () => {
      const obj = createSceneObject('box', [])
      const found = findSceneObject([obj], obj.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(obj.id)
    })

    it('returns undefined for unknown id', () => {
      expect(findSceneObject([], 'nope')).toBeUndefined()
    })
  })

  describe('Vec3 helpers', () => {
    it('vec3 creates with defaults', () => {
      expect(vec3()).toEqual({ x: 0, y: 0, z: 0 })
      expect(vec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('addVec3 adds components', () => {
      expect(addVec3({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toEqual({ x: 5, y: 7, z: 9 })
    })

    it('scaleVec3 multiplies all components', () => {
      expect(scaleVec3({ x: 1, y: 2, z: 3 }, 2)).toEqual({ x: 2, y: 4, z: 6 })
    })

    it('vec3Equal compares components', () => {
      expect(vec3Equal({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true)
      expect(vec3Equal({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })).toBe(false)
    })
  })
})
