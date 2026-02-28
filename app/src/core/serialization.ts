/** Scene serialization - save/load scenes as JSON */

import type {
  SceneData,
  SceneMetadata,
  SceneObject,
  EnvironmentSettings,
  PostProcessingSettings,
  AnimationTrack,
  AnimationKeyframe,
  TextureMap,
  Vec2,
} from '../types/scene'
import type { CameraShot } from '../types/cameraPath'
import { createDefaultEnvironment, createDefaultMaterial } from './sceneOperations'
import { createDefaultPostProcessing } from '../stores/usePostProcessingStore'

// Current schema version for forward compatibility
const SCENE_VERSION = 3

// ── Save ──────────────────────────────────────────────────────────────

export function createSceneData(
  objects: SceneObject[],
  environment: EnvironmentSettings,
  name: string = 'Untitled Scene',
  existingMetadata?: SceneMetadata,
  postProcessing?: PostProcessingSettings,
  animationTracks?: AnimationTrack[],
  animationDuration?: number,
  shots?: CameraShot[],
): SceneData {
  const now = new Date().toISOString()

  const data: SceneData = {
    metadata: {
      name,
      version: SCENE_VERSION,
      createdAt: existingMetadata?.createdAt ?? now,
      updatedAt: now,
    },
    objects: structuredClone(objects),
    environment: { ...environment },
  }

  if (postProcessing) {
    data.postProcessing = structuredClone(postProcessing)
  }

  if (animationTracks && animationTracks.length > 0) {
    data.animationTracks = structuredClone(animationTracks)
    data.animationDuration = animationDuration ?? 5
  }

  if (shots && shots.length > 0) {
    // Strip blob URL thumbnails from saved data (not portable)
    data.shots = shots.map(s => ({
      ...s,
      thumbnail: undefined,
    }))
  }

  return data
}

export function serializeScene(sceneData: SceneData): string {
  return JSON.stringify(sceneData, null, 2)
}

// ── Load ──────────────────────────────────────────────────────────────

export function deserializeScene(json: string): SceneData {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: unable to parse scene data')
  }

  return validateAndMigrateScene(parsed)
}

// ── Validation & Migration ────────────────────────────────────────────

function validateAndMigrateScene(data: unknown): SceneData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid scene data: expected an object')
  }

  const scene = data as Record<string, unknown>

  // Validate metadata
  if (!scene.metadata || typeof scene.metadata !== 'object') {
    throw new Error('Invalid scene data: missing metadata')
  }

  const meta = scene.metadata as Record<string, unknown>
  if (typeof meta.name !== 'string') {
    throw new Error('Invalid scene data: metadata.name must be a string')
  }

  // Validate objects array
  if (!Array.isArray(scene.objects)) {
    throw new Error('Invalid scene data: objects must be an array')
  }

  // Migrate objects to current schema
  const objects = (scene.objects as unknown[]).map(migrateObject)

  // Validate/default environment
  const environment = migrateEnvironment(scene.environment)

  const result: SceneData = {
    metadata: {
      name: meta.name,
      version: SCENE_VERSION,
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : new Date().toISOString(),
      updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : new Date().toISOString(),
    },
    objects,
    environment,
  }

  // Migration: add postProcessing if present (Phase 4)
  if (scene.postProcessing && typeof scene.postProcessing === 'object') {
    result.postProcessing = migratePostProcessing(scene.postProcessing)
  }

  // Migration: add animation tracks if present (Phase 4)
  if (Array.isArray(scene.animationTracks)) {
    result.animationTracks = (scene.animationTracks as unknown[])
      .map(migrateAnimationTrack)
      .filter((t): t is AnimationTrack => t !== null)
    result.animationDuration = typeof scene.animationDuration === 'number'
      ? scene.animationDuration : 5
  }

  // Migration: add camera shots if present
  if (Array.isArray(scene.shots)) {
    result.shots = (scene.shots as unknown[])
      .map(migrateShot)
      .filter((s): s is CameraShot => s !== null)
  }

  return result
}

function migrateObject(raw: unknown): SceneObject {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid scene object: expected an object')
  }

  const obj = raw as Record<string, unknown>

  // Required fields
  if (typeof obj.id !== 'string' || !obj.id) {
    throw new Error('Invalid scene object: missing id')
  }
  if (typeof obj.name !== 'string') {
    throw new Error('Invalid scene object: missing name')
  }
  if (typeof obj.type !== 'string') {
    throw new Error('Invalid scene object: missing type')
  }

  const VALID_OBJECT_TYPES = ['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus', 'model']
  if (!VALID_OBJECT_TYPES.includes(obj.type)) {
    throw new Error(`Invalid scene object: unknown type "${obj.type}"`)
  }

  const position = migrateVec3(obj.position, { x: 0, y: 0, z: 0 })
  const rotation = migrateVec3(obj.rotation, { x: 0, y: 0, z: 0 })
  const scale = migrateVec3(obj.scale, { x: 1, y: 1, z: 1 })

  // Migration: add material if missing (older saves)
  const color = typeof obj.color === 'string' ? obj.color : '#c49a5c'
  const material = obj.material && typeof obj.material === 'object'
    ? migrateMaterial(obj.material as Record<string, unknown>, color)
    : createDefaultMaterial(color)

  const result: SceneObject = {
    id: obj.id as string,
    name: obj.name as string,
    type: obj.type as SceneObject['type'],
    position,
    rotation,
    scale,
    color,
    visible: typeof obj.visible === 'boolean' ? obj.visible : true,
    locked: typeof obj.locked === 'boolean' ? obj.locked : false,
    material,
  }

  // Migration: add parentId if present (Phase 3 hierarchy)
  if (typeof obj.parentId === 'string') {
    result.parentId = obj.parentId
  }

  // Migration: add gltfUrl if present (model import)
  if (typeof obj.gltfUrl === 'string') {
    result.gltfUrl = obj.gltfUrl
  }

  // Migration: add modelFormat if present
  const VALID_MODEL_FORMATS = ['gltf', 'glb', 'fbx', 'obj', 'dae']
  if (typeof obj.modelFormat === 'string' && VALID_MODEL_FORMATS.includes(obj.modelFormat)) {
    result.modelFormat = obj.modelFormat as SceneObject['modelFormat']
  }

  return result
}

function migrateVec3(
  raw: unknown,
  fallback: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const v = raw as Record<string, unknown>
  return {
    x: typeof v.x === 'number' && Number.isFinite(v.x) ? v.x : fallback.x,
    y: typeof v.y === 'number' && Number.isFinite(v.y) ? v.y : fallback.y,
    z: typeof v.z === 'number' && Number.isFinite(v.z) ? v.z : fallback.z,
  }
}

function migrateMaterial(
  raw: Record<string, unknown>,
  fallbackColor: string,
): SceneObject['material'] {
  const result: SceneObject['material'] = {
    type: typeof raw.type === 'string' && ['standard', 'basic', 'phong'].includes(raw.type)
      ? raw.type as 'standard' | 'basic' | 'phong' : 'standard',
    color: typeof raw.color === 'string' ? raw.color : fallbackColor,
    opacity: typeof raw.opacity === 'number' ? raw.opacity : 1,
    transparent: typeof raw.transparent === 'boolean' ? raw.transparent : false,
    wireframe: typeof raw.wireframe === 'boolean' ? raw.wireframe : false,
    metalness: typeof raw.metalness === 'number' ? raw.metalness : 0.1,
    roughness: typeof raw.roughness === 'number' ? raw.roughness : 0.7,
  }

  // Phase 6: PBR texture maps
  const normalMap = migrateTextureMap(raw.normalMap)
  if (normalMap) result.normalMap = normalMap

  const roughnessMap = migrateTextureMap(raw.roughnessMap)
  if (roughnessMap) result.roughnessMap = roughnessMap

  const metalnessMap = migrateTextureMap(raw.metalnessMap)
  if (metalnessMap) result.metalnessMap = metalnessMap

  const emissiveMap = migrateTextureMap(raw.emissiveMap)
  if (emissiveMap) result.emissiveMap = emissiveMap

  const aoMap = migrateTextureMap(raw.aoMap)
  if (aoMap) result.aoMap = aoMap

  if (typeof raw.emissiveColor === 'string') result.emissiveColor = raw.emissiveColor
  if (typeof raw.emissiveIntensity === 'number') result.emissiveIntensity = raw.emissiveIntensity
  if (typeof raw.envMapIntensity === 'number') result.envMapIntensity = raw.envMapIntensity

  return result
}

function migrateEnvironment(raw: unknown): EnvironmentSettings {
  if (!raw || typeof raw !== 'object') return createDefaultEnvironment()

  const env = raw as Record<string, unknown>
  const defaults = createDefaultEnvironment()

  return {
    backgroundColor: typeof env.backgroundColor === 'string' ? env.backgroundColor : defaults.backgroundColor,
    fogEnabled: typeof env.fogEnabled === 'boolean' ? env.fogEnabled : defaults.fogEnabled,
    fogColor: typeof env.fogColor === 'string' ? env.fogColor : defaults.fogColor,
    fogNear: typeof env.fogNear === 'number' ? env.fogNear : defaults.fogNear,
    fogFar: typeof env.fogFar === 'number' ? env.fogFar : defaults.fogFar,
    gridVisible: typeof env.gridVisible === 'boolean' ? env.gridVisible : defaults.gridVisible,
    gridSize: typeof env.gridSize === 'number' ? env.gridSize : defaults.gridSize,
  }
}

// ── Post-Processing Migration ────────────────────────────────────────

function migratePostProcessing(raw: unknown): PostProcessingSettings {
  if (!raw || typeof raw !== 'object') return createDefaultPostProcessing()

  const pp = raw as Record<string, unknown>
  const defaults = createDefaultPostProcessing()

  const bloom = pp.bloom && typeof pp.bloom === 'object'
    ? migrateBloom(pp.bloom as Record<string, unknown>)
    : defaults.bloom

  const ssao = pp.ssao && typeof pp.ssao === 'object'
    ? migrateSSAO(pp.ssao as Record<string, unknown>)
    : defaults.ssao

  const vignette = pp.vignette && typeof pp.vignette === 'object'
    ? migrateVignette(pp.vignette as Record<string, unknown>)
    : defaults.vignette

  return {
    enabled: typeof pp.enabled === 'boolean' ? pp.enabled : defaults.enabled,
    bloom,
    ssao,
    vignette,
  }
}

function migrateBloom(raw: Record<string, unknown>) {
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    intensity: typeof raw.intensity === 'number' ? raw.intensity : 1,
    threshold: typeof raw.threshold === 'number' ? raw.threshold : 0.9,
    radius: typeof raw.radius === 'number' ? raw.radius : 0.4,
  }
}

function migrateSSAO(raw: Record<string, unknown>) {
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    intensity: typeof raw.intensity === 'number' ? raw.intensity : 15,
    radius: typeof raw.radius === 'number' ? raw.radius : 5,
    bias: typeof raw.bias === 'number' ? raw.bias : 0.025,
  }
}

function migrateVignette(raw: Record<string, unknown>) {
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    offset: typeof raw.offset === 'number' ? raw.offset : 0.5,
    darkness: typeof raw.darkness === 'number' ? raw.darkness : 0.5,
  }
}

// ── Texture/Vec2 Migration Helpers ───────────────────────────────────

function migrateVec2(
  raw: unknown,
  fallback: Vec2,
): Vec2 {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const v = raw as Record<string, unknown>
  return {
    x: typeof v.x === 'number' && Number.isFinite(v.x) ? v.x : fallback.x,
    y: typeof v.y === 'number' && Number.isFinite(v.y) ? v.y : fallback.y,
  }
}

function migrateTextureMap(raw: unknown): TextureMap | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const t = raw as Record<string, unknown>
  if (typeof t.url !== 'string' || !t.url) return undefined

  return {
    url: t.url,
    scale: migrateVec2(t.scale, { x: 1, y: 1 }),
    offset: migrateVec2(t.offset, { x: 0, y: 0 }),
  }
}

// ── Animation Migration ──────────────────────────────────────────────

function migrateAnimationTrack(raw: unknown): AnimationTrack | null {
  if (!raw || typeof raw !== 'object') return null

  const track = raw as Record<string, unknown>
  if (typeof track.id !== 'string' || typeof track.objectId !== 'string') return null

  const keyframes = Array.isArray(track.keyframes)
    ? (track.keyframes as unknown[])
        .map(migrateKeyframe)
        .filter((kf): kf is AnimationKeyframe => kf !== null)
        .sort((a, b) => a.time - b.time)
    : []

  return {
    id: track.id,
    objectId: track.objectId,
    keyframes,
  }
}

function migrateKeyframe(raw: unknown): AnimationKeyframe | null {
  if (!raw || typeof raw !== 'object') return null

  const kf = raw as Record<string, unknown>
  if (typeof kf.id !== 'string' || typeof kf.time !== 'number') return null

  const property = typeof kf.property === 'string' ? kf.property : 'position'
  if (!['position', 'rotation', 'scale', 'cameraPosition', 'cameraTarget'].includes(property)) return null

  const value = migrateVec3(kf.value, { x: 0, y: 0, z: 0 })
  const easing = typeof kf.easing === 'string' ? kf.easing : 'linear'
  if (!['linear', 'easeIn', 'easeOut', 'easeInOut'].includes(easing)) return null

  return {
    id: kf.id,
    time: kf.time,
    property: property as AnimationKeyframe['property'],
    value,
    easing: easing as AnimationKeyframe['easing'],
  }
}

// ── Shot Migration ──────────────────────────────────────────────────

function migrateShot(raw: unknown): CameraShot | null {
  if (!raw || typeof raw !== 'object') return null

  const s = raw as Record<string, unknown>
  if (typeof s.id !== 'string' || typeof s.name !== 'string') return null

  return {
    id: s.id,
    name: s.name,
    position: migrateVec3(s.position, { x: 5, y: 5, z: 5 }),
    target: migrateVec3(s.target, { x: 0, y: 0, z: 0 }),
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
    notes: typeof s.notes === 'string' ? s.notes : undefined,
    // thumbnail is intentionally not restored (blob URLs aren't portable)
  }
}

// ── File Operations (browser) ─────────────────────────────────────────

/* v8 ignore start -- Browser file I/O requires real DOM; tested via e2e */
export function downloadScene(sceneData: SceneData): void {
  const json = serializeScene(sceneData)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sceneData.metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.scene.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function uploadGltf(): Promise<{ name: string; url: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.glb,.gltf'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const url = URL.createObjectURL(file)
      const name = file.name.replace(/\.(glb|gltf)$/i, '')
      resolve({ name, url })
    }
    input.click()
  })
}

export function uploadScene(): Promise<SceneData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.scene.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = deserializeScene(reader.result as string)
          resolve(data)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    input.click()
  })
}
