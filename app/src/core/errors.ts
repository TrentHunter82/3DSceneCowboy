/** Custom error types and validation utilities for 3D Scene Cowboy */

import type {
  MaterialData,
  SceneData,
  SceneObject,
  Vec3,
} from '../types/scene'

// ── Custom Errors ─────────────────────────────────────────────────────

export class SceneError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SceneError'
  }
}

export class ObjectNotFoundError extends SceneError {
  constructor(id: string) {
    super(`Object not found: ${id}`)
    this.name = 'ObjectNotFoundError'
  }
}

export class DuplicateObjectError extends SceneError {
  constructor(id: string) {
    super(`Object already exists: ${id}`)
    this.name = 'DuplicateObjectError'
  }
}

export class ValidationError extends SceneError {
  public readonly field: string

  constructor(field: string, message: string) {
    super(`Validation error on '${field}': ${message}`)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class SerializationError extends SceneError {
  constructor(message: string) {
    super(`Serialization error: ${message}`)
    this.name = 'SerializationError'
  }
}

// ── Validation Functions ──────────────────────────────────────────────

export function isValidVec3(v: unknown): v is Vec3 {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj.x === 'number' && Number.isFinite(obj.x) &&
    typeof obj.y === 'number' && Number.isFinite(obj.y) &&
    typeof obj.z === 'number' && Number.isFinite(obj.z)
  )
}

export function isValidHexColor(color: unknown): color is string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
}

export function isValidOpacity(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1
}

export function validateVec3(v: Vec3, field: string): void {
  if (!isValidVec3(v)) {
    throw new ValidationError(field, 'Must be a valid {x, y, z} object with finite numbers')
  }
}

export function validateMaterial(m: MaterialData): void {
  if (!isValidHexColor(m.color)) {
    throw new ValidationError('material.color', 'Must be a valid hex color (#RRGGBB)')
  }
  if (!isValidOpacity(m.opacity)) {
    throw new ValidationError('material.opacity', 'Must be between 0 and 1')
  }
  if (m.metalness < 0 || m.metalness > 1) {
    throw new ValidationError('material.metalness', 'Must be between 0 and 1')
  }
  if (m.roughness < 0 || m.roughness > 1) {
    throw new ValidationError('material.roughness', 'Must be between 0 and 1')
  }
}

export function validateSceneObject(obj: SceneObject): void {
  if (!obj.id || typeof obj.id !== 'string') {
    throw new ValidationError('id', 'Must be a non-empty string')
  }
  if (!obj.name || typeof obj.name !== 'string') {
    throw new ValidationError('name', 'Must be a non-empty string')
  }

  validateVec3(obj.position, 'position')
  validateVec3(obj.rotation, 'rotation')
  validateVec3(obj.scale, 'scale')

  if (!isValidHexColor(obj.color)) {
    throw new ValidationError('color', 'Must be a valid hex color (#RRGGBB)')
  }

  if (obj.material) {
    validateMaterial(obj.material)
  }
}

export function validateSceneData(scene: SceneData): void {
  if (!scene.metadata?.name) {
    throw new SerializationError('Scene must have a name')
  }
  if (typeof scene.metadata.version !== 'number') {
    throw new SerializationError('Scene must have a version number')
  }
  if (!Array.isArray(scene.objects)) {
    throw new SerializationError('Scene must have an objects array')
  }

  for (const obj of scene.objects) {
    validateSceneObject(obj)
  }
}
