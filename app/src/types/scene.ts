// ── Primitive Types ───────────────────────────────────────────────────

export type ObjectType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus' | 'model'

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale'

export interface Vec3 {
  x: number
  y: number
  z: number
}

// ── Vec2 (UV coordinates) ────────────────────────────────────────────

export interface Vec2 {
  x: number
  y: number
}

// ── Material Types ────────────────────────────────────────────────────

export type MaterialType = 'standard' | 'basic' | 'phong'

export interface TextureMap {
  url: string
  scale: Vec2           // UV tiling (default {x:1, y:1})
  offset: Vec2          // UV offset (default {x:0, y:0})
}

export interface MaterialData {
  type: MaterialType
  color: string
  opacity: number
  transparent: boolean
  wireframe: boolean
  metalness: number     // 0-1, standard material only
  roughness: number     // 0-1, standard material only
  // PBR texture maps (Phase 6) - all optional
  normalMap?: TextureMap
  roughnessMap?: TextureMap
  metalnessMap?: TextureMap
  emissiveMap?: TextureMap
  emissiveColor?: string          // emissive tint (default '#000000')
  emissiveIntensity?: number      // 0-5 (default 0)
  aoMap?: TextureMap
  envMapIntensity?: number        // 0-2 (default 1)
}

// ── Scene Object ──────────────────────────────────────────────────────

export interface SceneObject {
  id: string
  name: string
  type: ObjectType
  position: Vec3
  rotation: Vec3
  scale: Vec3
  color: string
  visible: boolean
  locked: boolean
  material: MaterialData
  parentId?: string    // Object hierarchy - ID of parent object
  gltfUrl?: string     // Model import - URL/path to model file
  modelFormat?: 'gltf' | 'glb' | 'fbx' | 'obj' | 'dae'  // Format of imported model
}

// ── Environment Settings ──────────────────────────────────────────────

export interface EnvironmentSettings {
  backgroundColor: string
  fogEnabled: boolean
  fogColor: string
  fogNear: number
  fogFar: number
  gridVisible: boolean
  gridSize: number
}

// ── Post-Processing Effects ──────────────────────────────────────────

export interface BloomSettings {
  enabled: boolean
  intensity: number     // 0-5
  threshold: number     // 0-1, luminance threshold
  radius: number        // 0-1, blur radius
}

export interface SSAOSettings {
  enabled: boolean
  intensity: number     // 0-50
  radius: number        // 0-10
  bias: number          // 0-0.1
}

export interface VignetteSettings {
  enabled: boolean
  offset: number        // 0-1
  darkness: number      // 0-1
}

export interface PostProcessingSettings {
  enabled: boolean      // master toggle
  bloom: BloomSettings
  ssao: SSAOSettings
  vignette: VignetteSettings
}

// ── Animation Types ──────────────────────────────────────────────────

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export type AnimatableProperty = 'position' | 'rotation' | 'scale' | 'cameraPosition' | 'cameraTarget'

export interface AnimationKeyframe {
  id: string
  time: number          // seconds
  property: AnimatableProperty
  value: Vec3
  easing: EasingType
}

export interface AnimationTrack {
  id: string
  objectId: string      // references SceneObject.id
  keyframes: AnimationKeyframe[]  // sorted by time
}

// ── Camera Presets ───────────────────────────────────────────────────

export interface CameraPreset {
  name: string
  position: [number, number, number]
  target: [number, number, number]
}

// ── Scene Metadata (for serialization) ────────────────────────────────

export interface SceneMetadata {
  name: string
  version: number
  createdAt: string
  updatedAt: string
}

// ── Serializable Scene Data ───────────────────────────────────────────

import type { CameraShot } from './cameraPath'

export interface SceneData {
  metadata: SceneMetadata
  objects: SceneObject[]
  environment: EnvironmentSettings
  postProcessing?: PostProcessingSettings
  animationTracks?: AnimationTrack[]
  animationDuration?: number
  shots?: CameraShot[]
}

// ── History (undo/redo) ───────────────────────────────────────────────

export interface HistoryEntry {
  objects: SceneObject[]
  selectedId: string | null
  selectedIds: string[]
}

// ── Store State ───────────────────────────────────────────────────────

export interface SceneState {
  objects: SceneObject[]
  selectedId: string | null
  selectedIds: string[]
  clipboard: SceneObject[]
  toolMode: ToolMode
  environment: EnvironmentSettings
  snapEnabled: boolean
  snapValue: number

  // History
  history: HistoryEntry[]
  historyIndex: number

  // Actions - objects
  addObject: (type: ObjectType) => void
  addModelObject: (name: string, gltfUrl: string, modelFormat?: SceneObject['modelFormat']) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  toggleSelectObject: (id: string) => void
  selectRange: (fromId: string, toId: string) => void
  selectAll: () => void
  deselectAll: () => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  setToolMode: (mode: ToolMode) => void
  duplicateObject: (id: string) => void

  // Actions - multi-select batch
  removeSelected: () => void
  duplicateSelected: () => void

  // Actions - hierarchy
  setParent: (childId: string, parentId: string | undefined) => void
  getChildren: (parentId: string) => SceneObject[]

  // Actions - clipboard
  copySelected: () => void
  pasteClipboard: () => void

  // Actions - undo/redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Actions - environment
  updateEnvironment: (updates: Partial<EnvironmentSettings>) => void

  // Actions - snap
  setSnapEnabled: (enabled: boolean) => void
  setSnapValue: (value: number) => void

  // Actions - serialization
  saveScene: (name?: string) => SceneData
  loadScene: (data: SceneData) => void
  clearScene: () => void

  // Actions - bulk loading (templates)
  loadObjects: (objects: SceneObject[]) => void
}
