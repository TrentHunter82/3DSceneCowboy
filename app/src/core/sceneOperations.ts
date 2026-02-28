/** Pure functions for scene object manipulation */

import type {
  ObjectType,
  SceneObject,
  Vec3,
  MaterialData,
  EnvironmentSettings,
} from '../types/scene'

// ── ID Generation ─────────────────────────────────────────────────────

let nextId = 1

export function generateId(): string {
  return `obj_${Date.now()}_${nextId++}`
}

export function resetIdCounter(): void {
  nextId = 1
}

// ── Default Factories ─────────────────────────────────────────────────

export function createDefaultMaterial(color: string = '#c49a5c'): MaterialData {
  return {
    type: 'standard',
    color,
    opacity: 1,
    transparent: false,
    wireframe: false,
    metalness: 0.1,
    roughness: 0.7,
  }
}

export function createDefaultEnvironment(): EnvironmentSettings {
  return {
    backgroundColor: '#1a1108',
    fogEnabled: false,
    fogColor: '#8c7b6a',
    fogNear: 10,
    fogFar: 50,
    gridVisible: true,
    gridSize: 10,
  }
}

// ── Object Defaults ───────────────────────────────────────────────────

const OBJECT_DEFAULTS: Record<ObjectType, { color: string; scale: Vec3 }> = {
  box: { color: '#c49a5c', scale: { x: 1, y: 1, z: 1 } },
  sphere: { color: '#e07040', scale: { x: 0.5, y: 0.5, z: 0.5 } },
  cylinder: { color: '#d88830', scale: { x: 0.5, y: 1, z: 0.5 } },
  cone: { color: '#a04520', scale: { x: 0.5, y: 1, z: 0.5 } },
  plane: { color: '#8c7b6a', scale: { x: 2, y: 2, z: 1 } },
  torus: { color: '#b07d3a', scale: { x: 0.5, y: 0.5, z: 0.5 } },
  model: { color: '#c49a5c', scale: { x: 1, y: 1, z: 1 } },
}

const OBJECT_LABELS: Record<ObjectType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  plane: 'Plane',
  torus: 'Torus',
  model: 'Model',
}

export { OBJECT_DEFAULTS, OBJECT_LABELS }

// ── Object Factory ────────────────────────────────────────────────────

export function createSceneObject(
  type: ObjectType,
  existingObjects: SceneObject[],
): SceneObject {
  const id = generateId()
  const defaults = OBJECT_DEFAULTS[type]
  const label = OBJECT_LABELS[type]
  const count = existingObjects.filter(o => o.type === type).length + 1

  return {
    id,
    name: `${label} ${count}`,
    type,
    position: { x: 0, y: type === 'plane' ? 0 : 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { ...defaults.scale },
    color: defaults.color,
    visible: true,
    locked: false,
    material: createDefaultMaterial(defaults.color),
  }
}

// ── Object Operations (pure) ──────────────────────────────────────────

export function createModelObject(
  name: string,
  gltfUrl: string,
  existingObjects: SceneObject[],
  modelFormat?: SceneObject['modelFormat'],
): SceneObject {
  const id = generateId()
  const count = existingObjects.filter(o => o.type === 'model').length + 1
  const displayName = name || `Model ${count}`

  const obj: SceneObject = {
    id,
    name: displayName,
    type: 'model',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#c49a5c',
    visible: true,
    locked: false,
    material: createDefaultMaterial('#c49a5c'),
    gltfUrl,
  }

  if (modelFormat) {
    obj.modelFormat = modelFormat
  }

  return obj
}

export function duplicateSceneObject(
  obj: SceneObject,
  offset: Vec3 = { x: 1, y: 0, z: 0 },
): SceneObject {
  return {
    ...obj,
    id: generateId(),
    name: `${obj.name} (copy)`,
    position: {
      x: obj.position.x + offset.x,
      y: obj.position.y + offset.y,
      z: obj.position.z + offset.z,
    },
    material: { ...obj.material },
    parentId: obj.parentId,
    gltfUrl: obj.gltfUrl,
  }
}

export function updateSceneObject(
  objects: SceneObject[],
  id: string,
  updates: Partial<SceneObject>,
): SceneObject[] {
  return objects.map(o => (o.id === id ? { ...o, ...updates } : o))
}

export function removeSceneObject(
  objects: SceneObject[],
  id: string,
): SceneObject[] {
  return objects.filter(o => o.id !== id)
}

export function findSceneObject(
  objects: SceneObject[],
  id: string,
): SceneObject | undefined {
  return objects.find(o => o.id === id)
}

// ── Vec3 Helpers ──────────────────────────────────────────────────────

export function vec3(x: number = 0, y: number = 0, z: number = 0): Vec3 {
  return { x, y, z }
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function vec3Equal(a: Vec3, b: Vec3): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z
}

// ── Hierarchy Helpers ────────────────────────────────────────────────

export function getChildren(objects: SceneObject[], parentId: string): SceneObject[] {
  return objects.filter(o => o.parentId === parentId)
}

export function getDescendants(objects: SceneObject[], parentId: string): SceneObject[] {
  const children = getChildren(objects, parentId)
  const descendants: SceneObject[] = [...children]
  for (const child of children) {
    descendants.push(...getDescendants(objects, child.id))
  }
  return descendants
}

export function removeWithDescendants(objects: SceneObject[], id: string): SceneObject[] {
  const descendantIds = new Set(getDescendants(objects, id).map(d => d.id))
  descendantIds.add(id)
  return objects.filter(o => !descendantIds.has(o.id))
}

/**
 * Returns true if setting `parentId` as the parent of `childId` would
 * create a cycle in the hierarchy (including the trivial self-parent case).
 */
export function wouldCreateCycle(
  objects: SceneObject[],
  childId: string,
  parentId: string | undefined,
): boolean {
  if (parentId === undefined) return false
  if (parentId === childId) return true

  // Walk up the ancestor chain from parentId; if we reach childId it's a cycle.
  const objectMap = new Map(objects.map(o => [o.id, o]))
  const visited = new Set<string>()
  let currentId: string | undefined = parentId

  while (currentId !== undefined) {
    if (currentId === childId) return true
    if (visited.has(currentId)) break // already a cycle in existing data; stop
    visited.add(currentId)
    currentId = objectMap.get(currentId)?.parentId
  }

  return false
}

export function setParentId(
  objects: SceneObject[],
  childId: string,
  parentId: string | undefined,
): SceneObject[] {
  if (wouldCreateCycle(objects, childId, parentId)) return objects

  return objects.map(o =>
    o.id === childId ? { ...o, parentId } : o,
  )
}

