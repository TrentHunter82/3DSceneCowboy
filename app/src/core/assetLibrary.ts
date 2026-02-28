/** Pure functions for asset library operations */

import type {
  Asset,
  AssetFilter,
  AssetMetadata,
  AssetSource,
  AssetSortField,
  AssetSortOrder,
  AssetType,
  MaterialAsset,
  MaterialAssetData,
  MeshAsset,
  MeshAssetData,
  PrefabAsset,
  TextureAsset,
  TextureAssetData,
} from '../types/asset'

// ── ID Generation ─────────────────────────────────────────────────────

let nextAssetId = 1

export function generateAssetId(): string {
  return `asset_${Date.now()}_${nextAssetId++}`
}

export function resetAssetIdCounter(): void {
  nextAssetId = 1
}

// ── Asset Creation ────────────────────────────────────────────────────

export function createMeshAsset(
  name: string,
  url: string,
  filename: string,
  format: MeshAssetData['format'],
  source: AssetSource = 'local',
): MeshAsset {
  const now = new Date().toISOString()
  return {
    id: generateAssetId(),
    name,
    type: 'mesh',
    source,
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      url,
      filename,
      format,
    },
  }
}

export function createMaterialAsset(
  name: string,
  data: MaterialAssetData,
  source: AssetSource = 'local',
): MaterialAsset {
  const now = new Date().toISOString()
  return {
    id: generateAssetId(),
    name,
    type: 'material',
    source,
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: { ...data },
  }
}

export function createTextureAsset(
  name: string,
  url: string,
  filename: string,
  format: TextureAssetData['format'],
  source: AssetSource = 'local',
): TextureAsset {
  const now = new Date().toISOString()
  return {
    id: generateAssetId(),
    name,
    type: 'texture',
    source,
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      url,
      filename,
      format,
    },
  }
}

export function createPrefabAsset(
  name: string,
  objects: Record<string, unknown>[],
  source: AssetSource = 'local',
): PrefabAsset {
  const now = new Date().toISOString()
  return {
    id: generateAssetId(),
    name,
    type: 'prefab',
    source,
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      objects: structuredClone(objects),
      objectCount: objects.length,
    },
  }
}

// ── Validation ────────────────────────────────────────────────────────

const VALID_ASSET_TYPES: readonly string[] = ['mesh', 'material', 'texture', 'prefab']

export function validateAsset(asset: unknown): asset is Asset {
  if (!asset || typeof asset !== 'object') return false

  const a = asset as Record<string, unknown>

  if (typeof a.id !== 'string' || a.id.length === 0) return false
  if (typeof a.name !== 'string' || a.name.length === 0) return false
  if (typeof a.type !== 'string' || !VALID_ASSET_TYPES.includes(a.type)) return false
  if (typeof a.source !== 'string') return false
  if (!Array.isArray(a.tags)) return false
  if (typeof a.createdAt !== 'string') return false
  if (typeof a.updatedAt !== 'string') return false
  if (!a.data || typeof a.data !== 'object') return false

  return true
}

/** @deprecated Use validateAsset instead */
export const validateAssetMetadata = validateAsset

// ── Filtering ─────────────────────────────────────────────────────────

export function filterAssets(assets: Asset[], filter: AssetFilter): Asset[] {
  let result = assets

  if (filter.type) {
    result = result.filter(a => a.type === filter.type)
  }

  if (filter.source) {
    result = result.filter(a => a.source === filter.source)
  }

  if (filter.tags && filter.tags.length > 0) {
    const filterTags = filter.tags.map(t => t.toLowerCase())
    result = result.filter(a =>
      filterTags.every(ft => a.tags.some(at => at.toLowerCase() === ft)),
    )
  }

  if (filter.search && filter.search.trim() !== '') {
    const query = filter.search.toLowerCase().trim()
    result = result.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(query)
      const tagMatch = a.tags.some(t => t.toLowerCase().includes(query))
      const descMatch = a.description?.toLowerCase().includes(query) ?? false
      return nameMatch || tagMatch || descMatch
    })
  }

  return result
}

// ── Sorting ───────────────────────────────────────────────────────────

export function sortAssets(
  assets: Asset[],
  field: AssetSortField,
  order: AssetSortOrder,
): Asset[] {
  const sorted = [...assets]
  const direction = order === 'asc' ? 1 : -1

  sorted.sort((a, b) => {
    switch (field) {
      case 'name':
        return direction * a.name.localeCompare(b.name)
      case 'createdAt':
        return direction * a.createdAt.localeCompare(b.createdAt)
      case 'updatedAt':
        return direction * a.updatedAt.localeCompare(b.updatedAt)
      case 'type':
        return direction * a.type.localeCompare(b.type)
    }
  })

  return sorted
}

// ── Search ────────────────────────────────────────────────────────────

export function searchAssets(assets: Asset[], query: string): Asset[] {
  if (!query || query.trim() === '') return assets

  const q = query.toLowerCase().trim()
  return assets.filter(a => {
    const nameMatch = a.name.toLowerCase().includes(q)
    const descMatch = a.description?.toLowerCase().includes(q) ?? false
    const tagMatch = a.tags.some(t => t.toLowerCase().includes(q))
    return nameMatch || descMatch || tagMatch
  })
}

// ── Type-Narrowing Query ──────────────────────────────────────────────

export function getAssetsByType<T extends AssetType>(
  assets: Asset[],
  type: T,
): Extract<Asset, { type: T }>[] {
  return assets.filter(a => a.type === type) as Extract<Asset, { type: T }>[]
}

// ── Tag Filtering ─────────────────────────────────────────────────────

export function getAssetsByTags(assets: Asset[], tags: string[]): Asset[] {
  if (tags.length === 0) return assets
  const lowerTags = tags.map(t => t.toLowerCase())
  return assets.filter(a =>
    lowerTags.every(ft => a.tags.some(at => at.toLowerCase() === ft)),
  )
}

// ── Metadata Update ───────────────────────────────────────────────────

export function updateAssetMetadata(
  asset: Asset,
  updates: Partial<Pick<AssetMetadata, 'name' | 'description' | 'tags'>>,
): Asset {
  return {
    ...asset,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

// ── Tag Operations ────────────────────────────────────────────────────

export function addTagToAsset(asset: Asset, tag: string): Asset {
  const normalizedTag = tag.trim()
  if (normalizedTag === '') return asset
  if (asset.tags.some(t => t.toLowerCase() === normalizedTag.toLowerCase())) {
    return asset
  }
  return {
    ...asset,
    tags: [...asset.tags, normalizedTag],
    updatedAt: new Date().toISOString(),
  }
}

export function removeTagFromAsset(asset: Asset, tag: string): Asset {
  const normalizedTag = tag.toLowerCase()
  const filtered = asset.tags.filter(t => t.toLowerCase() !== normalizedTag)
  if (filtered.length === asset.tags.length) return asset
  return {
    ...asset,
    tags: filtered,
    updatedAt: new Date().toISOString(),
  }
}
