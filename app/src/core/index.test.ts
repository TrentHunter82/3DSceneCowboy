import { describe, it, expect } from 'vitest'
import * as core from './index'

describe('core barrel export', () => {
  it('exports sceneOperations functions', () => {
    expect(core.createSceneObject).toBeTypeOf('function')
    expect(core.duplicateSceneObject).toBeTypeOf('function')
    expect(core.updateSceneObject).toBeTypeOf('function')
    expect(core.removeSceneObject).toBeTypeOf('function')
    expect(core.findSceneObject).toBeTypeOf('function')
    expect(core.vec3).toBeTypeOf('function')
    expect(core.addVec3).toBeTypeOf('function')
    expect(core.scaleVec3).toBeTypeOf('function')
    expect(core.vec3Equal).toBeTypeOf('function')
    expect(core.generateId).toBeTypeOf('function')
    expect(core.resetIdCounter).toBeTypeOf('function')
    expect(core.createDefaultMaterial).toBeTypeOf('function')
    expect(core.createDefaultEnvironment).toBeTypeOf('function')
    expect(core.OBJECT_DEFAULTS).toBeDefined()
    expect(core.OBJECT_LABELS).toBeDefined()
  })

  it('exports serialization functions', () => {
    expect(core.createSceneData).toBeTypeOf('function')
    expect(core.serializeScene).toBeTypeOf('function')
    expect(core.deserializeScene).toBeTypeOf('function')
    expect(core.downloadScene).toBeTypeOf('function')
    expect(core.uploadScene).toBeTypeOf('function')
  })

  it('exports error classes and validators', () => {
    expect(core.SceneError).toBeTypeOf('function')
    expect(core.ObjectNotFoundError).toBeTypeOf('function')
    expect(core.DuplicateObjectError).toBeTypeOf('function')
    expect(core.ValidationError).toBeTypeOf('function')
    expect(core.SerializationError).toBeTypeOf('function')
    expect(core.isValidVec3).toBeTypeOf('function')
    expect(core.isValidHexColor).toBeTypeOf('function')
    expect(core.isValidOpacity).toBeTypeOf('function')
    expect(core.validateVec3).toBeTypeOf('function')
    expect(core.validateMaterial).toBeTypeOf('function')
    expect(core.validateSceneObject).toBeTypeOf('function')
    expect(core.validateSceneData).toBeTypeOf('function')
  })
})
