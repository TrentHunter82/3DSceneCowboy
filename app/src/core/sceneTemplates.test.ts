import { describe, it, expect } from 'vitest'
import {
  createBasicSceneTemplate,
  createLightSetupTemplate,
  createArchitectureTemplate,
  createTemplateObject,
} from './sceneTemplates'

describe('createTemplateObject', () => {
  it('fills defaults when no overrides given', () => {
    const obj = createTemplateObject()

    expect(obj.id).toBeDefined()
    expect(obj.id).toContain('obj_')
    expect(obj.name).toBe('Object')
    expect(obj.type).toBe('box')
    expect(obj.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(obj.rotation).toEqual({ x: 0, y: 0, z: 0 })
    expect(obj.scale).toEqual({ x: 1, y: 1, z: 1 })
    expect(obj.color).toBe('#c49a5c')
    expect(obj.visible).toBe(true)
    expect(obj.locked).toBe(false)
    expect(obj.material).toBeDefined()
  })

  it('applies overrides', () => {
    const obj = createTemplateObject({
      name: 'Custom',
      type: 'sphere',
      position: { x: 1, y: 2, z: 3 },
      color: '#ff0000',
    })

    expect(obj.name).toBe('Custom')
    expect(obj.type).toBe('sphere')
    expect(obj.position).toEqual({ x: 1, y: 2, z: 3 })
    expect(obj.color).toBe('#ff0000')
  })

  it('generates unique ids', () => {
    const obj1 = createTemplateObject()
    const obj2 = createTemplateObject()

    expect(obj1.id).not.toBe(obj2.id)
  })

  it('includes parentId when provided', () => {
    const obj = createTemplateObject({ parentId: 'parent_123' })

    expect(obj.parentId).toBe('parent_123')
  })

  it('does not include parentId when not provided', () => {
    const obj = createTemplateObject()

    expect('parentId' in obj).toBe(false)
  })
})

describe('createBasicSceneTemplate', () => {
  it('returns 4 objects', () => {
    const objects = createBasicSceneTemplate()

    expect(objects).toHaveLength(4)
  })

  it('objects have correct types', () => {
    const objects = createBasicSceneTemplate()
    const types = objects.map(o => o.type)

    expect(types).toEqual(['plane', 'box', 'sphere', 'cylinder'])
  })

  it('objects have correct names', () => {
    const objects = createBasicSceneTemplate()
    const names = objects.map(o => o.name)

    expect(names).toEqual(['Ground', 'Box', 'Sphere', 'Cylinder'])
  })

  it('objects have correct positions (not all at origin)', () => {
    const objects = createBasicSceneTemplate()
    const positions = objects.map(o => o.position)

    // Ground is at origin
    expect(positions[0]).toEqual({ x: 0, y: 0, z: 0 })
    // Other objects are elevated and spread out
    expect(positions[1]).toEqual({ x: -1.5, y: 0.5, z: 0 })
    expect(positions[2]).toEqual({ x: 0, y: 0.5, z: 0 })
    expect(positions[3]).toEqual({ x: 1.5, y: 0.5, z: 0 })

    // Verify not all positions are the same
    const allSame = positions.every(
      p => p.x === positions[0].x && p.y === positions[0].y && p.z === positions[0].z
    )
    expect(allSame).toBe(false)
  })

  it('each object has a unique id', () => {
    const objects = createBasicSceneTemplate()
    const ids = objects.map(o => o.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(objects.length)
  })
})

describe('createLightSetupTemplate', () => {
  it('returns 4 objects', () => {
    const objects = createLightSetupTemplate()

    expect(objects).toHaveLength(4)
  })

  it('objects have light-related names', () => {
    const objects = createLightSetupTemplate()
    const names = objects.map(o => o.name)

    expect(names).toContain('Key Light')
    expect(names).toContain('Fill Light')
    expect(names).toContain('Back Light')
    expect(names).toContain('Ground')
  })

  it('each object has a unique id', () => {
    const objects = createLightSetupTemplate()
    const ids = objects.map(o => o.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(objects.length)
  })

  it('light objects are spheres', () => {
    const objects = createLightSetupTemplate()
    const lights = objects.filter(o => o.name.includes('Light'))

    expect(lights).toHaveLength(3)
    for (const light of lights) {
      expect(light.type).toBe('sphere')
    }
  })

  it('light objects are positioned in 3D space (not at origin)', () => {
    const objects = createLightSetupTemplate()
    const lights = objects.filter(o => o.name.includes('Light'))

    for (const light of lights) {
      const { x, y, z } = light.position
      // At least one coordinate should be non-zero
      expect(Math.abs(x) + Math.abs(y) + Math.abs(z)).toBeGreaterThan(0)
    }
  })
})

describe('createArchitectureTemplate', () => {
  it('returns 5 objects', () => {
    const objects = createArchitectureTemplate()

    expect(objects).toHaveLength(5)
  })

  it('objects have wall/roof/floor names', () => {
    const objects = createArchitectureTemplate()
    const names = objects.map(o => o.name)

    expect(names).toContain('Floor')
    expect(names).toContain('Wall Left')
    expect(names).toContain('Wall Right')
    expect(names).toContain('Wall Back')
    expect(names).toContain('Roof')
  })

  it('each object has a unique id', () => {
    const objects = createArchitectureTemplate()
    const ids = objects.map(o => o.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(objects.length)
  })

  it('floor is a plane and walls/roof are boxes', () => {
    const objects = createArchitectureTemplate()
    const floor = objects.find(o => o.name === 'Floor')
    const walls = objects.filter(o => o.name.startsWith('Wall'))
    const roof = objects.find(o => o.name === 'Roof')

    expect(floor?.type).toBe('plane')
    expect(roof?.type).toBe('box')
    for (const wall of walls) {
      expect(wall.type).toBe('box')
    }
  })

  it('roof is elevated above floor', () => {
    const objects = createArchitectureTemplate()
    const floor = objects.find(o => o.name === 'Floor')!
    const roof = objects.find(o => o.name === 'Roof')!

    expect(roof.position.y).toBeGreaterThan(floor.position.y)
  })
})
