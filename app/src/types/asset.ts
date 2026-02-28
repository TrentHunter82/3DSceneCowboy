// ── Asset Types ─────────────────────────────────────────────────────

/** Categories of assets in the library */
export type AssetType = 'mesh' | 'material' | 'texture' | 'prefab'

/** Source of an asset */
export type AssetSource = 'local' | 'url' | 'builtin'

/** Asset metadata common to all asset types */
export interface AssetMetadata {
  id: string
  name: string
  type: AssetType
  source: AssetSource
  tags: string[]
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
  fileSize?: number       // bytes
  description?: string
}

// ── Mesh Asset ──────────────────────────────────────────────────────

export interface MeshAssetData {
  /** URL or blob URL to the mesh file (GLTF/GLB) */
  url: string
  /** Original filename */
  filename: string
  /** Mesh format */
  format: 'gltf' | 'glb' | 'obj'
  /** Vertex count (extracted from file) */
  vertexCount?: number
  /** Triangle count */
  triangleCount?: number
}

export interface MeshAsset extends AssetMetadata {
  type: 'mesh'
  data: MeshAssetData
}

// ── Material Asset ──────────────────────────────────────────────────

export interface MaterialAssetData {
  materialType: 'standard' | 'basic' | 'phong'
  color: string
  metalness?: number
  roughness?: number
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
}

export interface MaterialAsset extends AssetMetadata {
  type: 'material'
  data: MaterialAssetData
}

// ── Texture Asset ───────────────────────────────────────────────────

export interface TextureAssetData {
  /** URL or blob URL to the texture file */
  url: string
  /** Original filename */
  filename: string
  /** Image format */
  format: 'png' | 'jpg' | 'jpeg' | 'webp' | 'hdr'
  /** Texture dimensions */
  width?: number
  height?: number
}

export interface TextureAsset extends AssetMetadata {
  type: 'texture'
  data: TextureAssetData
}

// ── Prefab Asset ────────────────────────────────────────────────────

export interface PrefabAssetData {
  /** Serialized SceneObject array (the prefab's objects) */
  objects: Record<string, unknown>[]
  /** Number of objects in the prefab */
  objectCount: number
}

export interface PrefabAsset extends AssetMetadata {
  type: 'prefab'
  data: PrefabAssetData
}

// ── Union Type ──────────────────────────────────────────────────────

export type Asset = MeshAsset | MaterialAsset | TextureAsset | PrefabAsset

// ── Asset Library State ─────────────────────────────────────────────

export type AssetSortField = 'name' | 'createdAt' | 'updatedAt' | 'type'
export type AssetSortOrder = 'asc' | 'desc'
export type AssetViewMode = 'grid' | 'list'

export interface AssetFilter {
  type?: AssetType
  search?: string
  tags?: string[]
  source?: AssetSource
}

export interface AssetLibraryState {
  assets: Asset[]
  filter: AssetFilter
  sortField: AssetSortField
  sortOrder: AssetSortOrder
  viewMode: AssetViewMode
  selectedAssetId: string | null
}
