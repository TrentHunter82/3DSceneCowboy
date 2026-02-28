import { describe, it, expect } from 'vitest'
import {
  SceneError,
  ObjectNotFoundError,
  DuplicateObjectError,
  ValidationError,
  SerializationError,
  isValidVec3,
  isValidHexColor,
  isValidOpacity,
  validateVec3,
  validateMaterial,
  validateSceneObject,
  validateSceneData,
} from './errors'

describe('Custom Errors', () => {
  it('SceneError has correct name', () => {
    const err = new SceneError('test')
    expect(err.name).toBe('SceneError')
    expect(err.message).toBe('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('ObjectNotFoundError includes id', () => {
    const err = new ObjectNotFoundError('abc123')
    expect(err.name).toBe('ObjectNotFoundError')
    expect(err.message).toContain('abc123')
    expect(err).toBeInstanceOf(SceneError)
  })

  it('DuplicateObjectError includes id', () => {
    const err = new DuplicateObjectError('abc123')
    expect(err.name).toBe('DuplicateObjectError')
    expect(err.message).toContain('abc123')
  })

  it('ValidationError includes field', () => {
    const err = new ValidationError('position', 'invalid')
    expect(err.name).toBe('ValidationError')
    expect(err.field).toBe('position')
    expect(err.message).toContain('position')
  })

  it('SerializationError', () => {
    const err = new SerializationError('bad data')
    expect(err.name).toBe('SerializationError')
    expect(err.message).toContain('bad data')
  })
})

describe('Validation Functions', () => {
  describe('isValidVec3', () => {
    it('accepts valid Vec3 object', () => {
      expect(isValidVec3({ x: 0, y: 1, z: -2.5 })).toBe(true)
    })

    it('rejects null', () => {
      expect(isValidVec3(null)).toBe(false)
    })

    it('rejects non-object', () => {
      expect(isValidVec3('string')).toBe(false)
      expect(isValidVec3(42)).toBe(false)
    })

    it('rejects missing fields', () => {
      expect(isValidVec3({ x: 0, y: 1 })).toBe(false)
      expect(isValidVec3({ x: 0 })).toBe(false)
    })

    it('rejects NaN values', () => {
      expect(isValidVec3({ x: NaN, y: 0, z: 0 })).toBe(false)
    })

    it('rejects Infinity', () => {
      expect(isValidVec3({ x: Infinity, y: 0, z: 0 })).toBe(false)
    })
  })

  describe('isValidHexColor', () => {
    it('accepts valid hex colors', () => {
      expect(isValidHexColor('#ff0000')).toBe(true)
      expect(isValidHexColor('#000000')).toBe(true)
      expect(isValidHexColor('#ABCDEF')).toBe(true)
    })

    it('rejects invalid colors', () => {
      expect(isValidHexColor('red')).toBe(false)
      expect(isValidHexColor('#fff')).toBe(false) // 3-char not allowed
      expect(isValidHexColor('#gggggg')).toBe(false)
      expect(isValidHexColor(42)).toBe(false)
    })
  })

  describe('isValidOpacity', () => {
    it('accepts values in [0, 1]', () => {
      expect(isValidOpacity(0)).toBe(true)
      expect(isValidOpacity(0.5)).toBe(true)
      expect(isValidOpacity(1)).toBe(true)
    })

    it('rejects out of range', () => {
      expect(isValidOpacity(-0.1)).toBe(false)
      expect(isValidOpacity(1.1)).toBe(false)
    })

    it('rejects non-numbers', () => {
      expect(isValidOpacity('0.5')).toBe(false)
    })
  })

  describe('validateVec3', () => {
    it('passes for valid vec3', () => {
      expect(() => validateVec3({ x: 0, y: 1, z: 2 }, 'position')).not.toThrow()
    })

    it('throws ValidationError for invalid', () => {
      expect(() => validateVec3({ x: NaN, y: 0, z: 0 } as any, 'position')).toThrow(ValidationError)
    })
  })

  describe('validateMaterial', () => {
    const validMaterial = {
      type: 'standard' as const,
      color: '#c49a5c',
      opacity: 1,
      transparent: false,
      wireframe: false,
      metalness: 0.1,
      roughness: 0.7,
    }

    it('passes for valid material', () => {
      expect(() => validateMaterial(validMaterial)).not.toThrow()
    })

    it('throws for invalid color', () => {
      expect(() => validateMaterial({ ...validMaterial, color: 'bad' })).toThrow(ValidationError)
    })

    it('throws for invalid opacity', () => {
      expect(() => validateMaterial({ ...validMaterial, opacity: 2 })).toThrow(ValidationError)
    })

    it('throws for metalness out of range', () => {
      expect(() => validateMaterial({ ...validMaterial, metalness: -1 })).toThrow(ValidationError)
    })

    it('throws for roughness out of range', () => {
      expect(() => validateMaterial({ ...validMaterial, roughness: 2 })).toThrow(ValidationError)
    })
  })

  describe('validateSceneObject', () => {
    const validObj = {
      id: 'obj_1',
      name: 'Box 1',
      type: 'box' as const,
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
    }

    it('passes for valid object', () => {
      expect(() => validateSceneObject(validObj)).not.toThrow()
    })

    it('throws for empty id', () => {
      expect(() => validateSceneObject({ ...validObj, id: '' })).toThrow(ValidationError)
    })

    it('throws for empty name', () => {
      expect(() => validateSceneObject({ ...validObj, name: '' })).toThrow(ValidationError)
    })

    it('throws for invalid color', () => {
      expect(() => validateSceneObject({ ...validObj, color: 'bad' })).toThrow(ValidationError)
    })
  })

  describe('validateSceneData', () => {
    const validScene = {
      metadata: { name: 'Test', version: 1, createdAt: '', updatedAt: '' },
      objects: [],
      environment: {
        backgroundColor: '#000000',
        fogEnabled: false,
        fogColor: '#ffffff',
        fogNear: 10,
        fogFar: 50,
        gridVisible: true,
        gridSize: 10,
      },
    }

    it('passes for valid scene', () => {
      expect(() => validateSceneData(validScene)).not.toThrow()
    })

    it('throws for missing name', () => {
      expect(() =>
        validateSceneData({ ...validScene, metadata: { ...validScene.metadata, name: '' } })
      ).toThrow(SerializationError)
    })

    it('throws for missing version', () => {
      expect(() =>
        validateSceneData({ ...validScene, metadata: { ...validScene.metadata, version: undefined as any } })
      ).toThrow(SerializationError)
    })

    it('throws for non-array objects', () => {
      expect(() =>
        validateSceneData({ ...validScene, objects: {} as any })
      ).toThrow(SerializationError)
    })
  })
})
