/** Pure functions that return pre-positioned SceneObject arrays for scene templates */

import type { SceneObject, ObjectType, Vec3 } from '../types/scene'
import { generateId, createDefaultMaterial } from './sceneOperations'

// ── Helper ───────────────────────────────────────────────────────────────

interface TemplateObjectOverrides {
  name?: string
  type?: ObjectType
  position?: Vec3
  rotation?: Vec3
  scale?: Vec3
  color?: string
  visible?: boolean
  locked?: boolean
  parentId?: string
}

/**
 * Creates a SceneObject with sensible defaults, generating a unique id
 * and building a material from the given color. Any field can be overridden.
 */
export function createTemplateObject(overrides: TemplateObjectOverrides = {}): SceneObject {
  const color = overrides.color ?? '#c49a5c'
  return {
    id: generateId(),
    name: overrides.name ?? 'Object',
    type: overrides.type ?? 'box',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0 },
    scale: overrides.scale ?? { x: 1, y: 1, z: 1 },
    color,
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    material: createDefaultMaterial(color),
    ...(overrides.parentId !== undefined ? { parentId: overrides.parentId } : {}),
  }
}

// ── Templates ────────────────────────────────────────────────────────────

/**
 * Basic scene with a ground plane, box, sphere, and cylinder.
 * Good starting point for experimenting with transforms and materials.
 */
export function createBasicSceneTemplate(): SceneObject[] {
  return [
    createTemplateObject({
      name: 'Ground',
      type: 'plane',
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 5, y: 5, z: 1 },
      color: '#8c7b6a',
    }),
    createTemplateObject({
      name: 'Box',
      type: 'box',
      position: { x: -1.5, y: 0.5, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#c49a5c',
    }),
    createTemplateObject({
      name: 'Sphere',
      type: 'sphere',
      position: { x: 0, y: 0.5, z: 0 },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      color: '#e07040',
    }),
    createTemplateObject({
      name: 'Cylinder',
      type: 'cylinder',
      position: { x: 1.5, y: 0.5, z: 0 },
      scale: { x: 0.5, y: 1, z: 0.5 },
      color: '#d88830',
    }),
  ]
}

/**
 * Three-point lighting setup represented as small spheres (key, fill, back)
 * placed around a ground plane. Useful as a starting arrangement for
 * scenes that will use emissive materials or actual light sources.
 */
export function createLightSetupTemplate(): SceneObject[] {
  return [
    createTemplateObject({
      name: 'Ground',
      type: 'plane',
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 5, y: 5, z: 1 },
      color: '#8c7b6a',
    }),
    createTemplateObject({
      name: 'Key Light',
      type: 'sphere',
      position: { x: 3, y: 2, z: 2 },
      scale: { x: 0.3, y: 0.3, z: 0.3 },
      color: '#ffcc66',
    }),
    createTemplateObject({
      name: 'Fill Light',
      type: 'sphere',
      position: { x: -2, y: 1.5, z: 2 },
      scale: { x: 0.3, y: 0.3, z: 0.3 },
      color: '#6699cc',
    }),
    createTemplateObject({
      name: 'Back Light',
      type: 'sphere',
      position: { x: 0, y: 3, z: -3 },
      scale: { x: 0.3, y: 0.3, z: 0.3 },
      color: '#ffffff',
    }),
  ]
}

/**
 * Simple architectural shell: floor, two side walls, a back wall, and a roof.
 * Demonstrates parent-less box composition for building interiors.
 */
export function createArchitectureTemplate(): SceneObject[] {
  return [
    createTemplateObject({
      name: 'Floor',
      type: 'plane',
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 4, y: 4, z: 1 },
      color: '#999999',
    }),
    createTemplateObject({
      name: 'Wall Left',
      type: 'box',
      position: { x: -2, y: 1.5, z: 0 },
      scale: { x: 0.2, y: 3, z: 4 },
      color: '#c49a5c',
    }),
    createTemplateObject({
      name: 'Wall Right',
      type: 'box',
      position: { x: 2, y: 1.5, z: 0 },
      scale: { x: 0.2, y: 3, z: 4 },
      color: '#c49a5c',
    }),
    createTemplateObject({
      name: 'Wall Back',
      type: 'box',
      position: { x: 0, y: 0, z: -2 },
      scale: { x: 4, y: 3, z: 0.2 },
      color: '#b08050',
    }),
    createTemplateObject({
      name: 'Roof',
      type: 'box',
      position: { x: 0, y: 3, z: 0 },
      scale: { x: 4.4, y: 0.2, z: 4.4 },
      color: '#a07040',
    }),
  ]
}
