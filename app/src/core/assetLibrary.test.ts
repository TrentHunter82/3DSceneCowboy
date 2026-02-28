import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateAssetId,
  resetAssetIdCounter,
  createMeshAsset,
  createMaterialAsset,
  createTextureAsset,
  createPrefabAsset,
  validateAsset,
  filterAssets,
  sortAssets,
  searchAssets,
  getAssetsByType,
  getAssetsByTags,
  updateAssetMetadata,
} from './assetLibrary'
import type { Asset, MeshAsset, MaterialAsset, TextureAsset, PrefabAsset } from '../types/asset'

// ── Helpers ───────────────────────────────────────────────────────────

function makeMesh(overrides: Partial<MeshAsset> = {}): MeshAsset {
  return {
    id: 'mesh-1',
    name: 'Test Mesh',
    type: 'mesh',
    source: 'local',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    data: { url: 'blob:mesh', filename: 'model.glb', format: 'glb' },
    ...overrides,
  }
}

function makeMaterial(overrides: Partial<MaterialAsset> = {}): MaterialAsset {
  return {
    id: 'mat-1',
    name: 'Test Material',
    type: 'material',
    source: 'local',
    tags: [],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    data: { materialType: 'standard', color: '#ff0000' },
    ...overrides,
  }
}

function makeTexture(overrides: Partial<TextureAsset> = {}): TextureAsset {
  return {
    id: 'tex-1',
    name: 'Test Texture',
    type: 'texture',
    source: 'url',
    tags: [],
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    data: { url: 'blob:tex', filename: 'sky.png', format: 'png' },
    ...overrides,
  }
}

function makePrefab(overrides: Partial<PrefabAsset> = {}): PrefabAsset {
  return {
    id: 'pre-1',
    name: 'Test Prefab',
    type: 'prefab',
    source: 'builtin',
    tags: [],
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
    data: { objects: [{ id: 'obj1' }], objectCount: 1 },
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  resetAssetIdCounter()
})

describe('generateAssetId', () => {
  it('returns a non-empty string', () => {
    const id = generateAssetId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns unique IDs on successive calls', () => {
    const id1 = generateAssetId()
    const id2 = generateAssetId()
    expect(id1).not.toBe(id2)
  })

  it('starts with "asset_" prefix', () => {
    const id = generateAssetId()
    expect(id.startsWith('asset_')).toBe(true)
  })
})

describe('createMeshAsset', () => {
  it('creates a valid mesh asset with all required fields', () => {
    const asset = createMeshAsset('Cowboy Hat', 'blob:hat', 'hat.glb', 'glb')
    expect(asset.type).toBe('mesh')
    expect(asset.name).toBe('Cowboy Hat')
    expect(asset.data.url).toBe('blob:hat')
    expect(asset.data.filename).toBe('hat.glb')
    expect(asset.data.format).toBe('glb')
    expect(asset.source).toBe('local')
    expect(asset.tags).toEqual([])
    expect(asset.id).toBeTruthy()
    expect(asset.createdAt).toBeTruthy()
    expect(asset.updatedAt).toBe(asset.createdAt)
  })

  it('uses custom source when provided', () => {
    const asset = createMeshAsset('Hat', 'url', 'hat.gltf', 'gltf', 'url')
    expect(asset.source).toBe('url')
  })

  it('defaults source to local', () => {
    const asset = createMeshAsset('Hat', 'url', 'hat.gltf', 'gltf')
    expect(asset.source).toBe('local')
  })
})

describe('createMaterialAsset', () => {
  it('creates a valid material asset with all required fields', () => {
    const data = { materialType: 'standard' as const, color: '#c49a5c', metalness: 0.5, roughness: 0.8 }
    const asset = createMaterialAsset('Leather', data)
    expect(asset.type).toBe('material')
    expect(asset.name).toBe('Leather')
    expect(asset.data.materialType).toBe('standard')
    expect(asset.data.color).toBe('#c49a5c')
    expect(asset.data.metalness).toBe(0.5)
    expect(asset.data.roughness).toBe(0.8)
    expect(asset.source).toBe('local')
    expect(asset.tags).toEqual([])
  })

  it('uses custom source when provided', () => {
    const asset = createMaterialAsset('Mat', { materialType: 'basic', color: '#000' }, 'builtin')
    expect(asset.source).toBe('builtin')
  })

  it('deep copies the data object', () => {
    const data = { materialType: 'phong' as const, color: '#fff' }
    const asset = createMaterialAsset('Mat', data)
    data.color = '#000'
    expect(asset.data.color).toBe('#fff')
  })
})

describe('createTextureAsset', () => {
  it('creates a valid texture asset with all required fields', () => {
    const asset = createTextureAsset('Sky', 'blob:sky', 'sky.hdr', 'hdr')
    expect(asset.type).toBe('texture')
    expect(asset.name).toBe('Sky')
    expect(asset.data.url).toBe('blob:sky')
    expect(asset.data.filename).toBe('sky.hdr')
    expect(asset.data.format).toBe('hdr')
    expect(asset.source).toBe('local')
    expect(asset.tags).toEqual([])
  })

  it('uses custom source when provided', () => {
    const asset = createTextureAsset('Tex', 'url', 'tex.png', 'png', 'url')
    expect(asset.source).toBe('url')
  })
})

describe('createPrefabAsset', () => {
  it('creates a valid prefab asset with objectCount', () => {
    const objects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const asset = createPrefabAsset('Scene Kit', objects)
    expect(asset.type).toBe('prefab')
    expect(asset.name).toBe('Scene Kit')
    expect(asset.data.objectCount).toBe(3)
    expect(asset.data.objects).toHaveLength(3)
    expect(asset.source).toBe('local')
    expect(asset.tags).toEqual([])
  })

  it('deep clones objects array', () => {
    const objects = [{ id: 'x', nested: { val: 1 } }]
    const asset = createPrefabAsset('Prefab', objects)
    ;(objects[0] as Record<string, unknown>).id = 'changed'
    expect(asset.data.objects[0]).toEqual({ id: 'x', nested: { val: 1 } })
  })

  it('uses custom source when provided', () => {
    const asset = createPrefabAsset('Prefab', [], 'builtin')
    expect(asset.source).toBe('builtin')
  })
})

describe('validateAsset', () => {
  it('accepts a valid mesh asset', () => {
    expect(validateAsset(makeMesh())).toBe(true)
  })

  it('accepts a valid material asset', () => {
    expect(validateAsset(makeMaterial())).toBe(true)
  })

  it('accepts a valid texture asset', () => {
    expect(validateAsset(makeTexture())).toBe(true)
  })

  it('accepts a valid prefab asset', () => {
    expect(validateAsset(makePrefab())).toBe(true)
  })

  it('rejects null', () => {
    expect(validateAsset(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(validateAsset(undefined)).toBe(false)
  })

  it('rejects a primitive', () => {
    expect(validateAsset('not an asset')).toBe(false)
  })

  it('rejects missing id', () => {
    const asset = makeMesh()
    const obj = { ...asset, id: '' }
    expect(validateAsset(obj)).toBe(false)
  })

  it('rejects missing name', () => {
    const asset = makeMesh()
    const obj = { ...asset, name: '' }
    expect(validateAsset(obj)).toBe(false)
  })

  it('rejects missing type', () => {
    const obj = { ...makeMesh(), type: undefined }
    expect(validateAsset(obj)).toBe(false)
  })

  it('rejects unknown asset type', () => {
    const obj = { ...makeMesh(), type: 'audio' }
    expect(validateAsset(obj)).toBe(false)
  })

  it('rejects missing data', () => {
    const obj = { ...makeMesh(), data: undefined }
    expect(validateAsset(obj)).toBe(false)
  })

  it('rejects data that is not an object', () => {
    const obj = { ...makeMesh(), data: 'not-an-object' }
    expect(validateAsset(obj)).toBe(false)
  })
})

describe('filterAssets', () => {
  const assets: Asset[] = [
    makeMesh({ name: 'Desert Rock', tags: ['terrain', 'rock'], source: 'local', description: 'A desert rock formation' }),
    makeMaterial({ name: 'Sand Material', tags: ['terrain', 'sand'], source: 'builtin' }),
    makeTexture({ name: 'Cactus Texture', tags: ['plant', 'green'], source: 'url' }),
    makePrefab({ name: 'Town Prefab', tags: ['building', 'western'], source: 'local' }),
  ]

  it('returns all assets with empty filter', () => {
    expect(filterAssets(assets, {})).toHaveLength(4)
  })

  it('filters by type', () => {
    const result = filterAssets(assets, { type: 'mesh' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Rock')
  })

  it('filters by source', () => {
    const result = filterAssets(assets, { source: 'local' })
    expect(result).toHaveLength(2)
  })

  it('filters by tags (intersection: all tags must match)', () => {
    const result = filterAssets(assets, { tags: ['terrain'] })
    expect(result).toHaveLength(2)
  })

  it('filters by tags requiring ALL specified tags', () => {
    const result = filterAssets(assets, { tags: ['terrain', 'rock'] })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Rock')
  })

  it('filters by search query matching name', () => {
    const result = filterAssets(assets, { search: 'cactus' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Cactus Texture')
  })

  it('filters by search query matching description', () => {
    const result = filterAssets(assets, { search: 'formation' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Rock')
  })

  it('filters by search query matching tags', () => {
    const result = filterAssets(assets, { search: 'western' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Town Prefab')
  })

  it('applies multiple filters with AND logic', () => {
    const result = filterAssets(assets, { type: 'mesh', source: 'local' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Rock')
  })

  it('returns empty for contradictory filters', () => {
    const result = filterAssets(assets, { type: 'mesh', source: 'url' })
    expect(result).toHaveLength(0)
  })
})

describe('sortAssets', () => {
  const assets: Asset[] = [
    makeMesh({ name: 'Bravo', createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-05T00:00:00Z' }),
    makeMaterial({ name: 'Alpha', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' }),
    makeTexture({ name: 'Charlie', createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' }),
  ]

  it('sorts by name ascending', () => {
    const sorted = sortAssets(assets, 'name', 'asc')
    expect(sorted.map(a => a.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by name descending', () => {
    const sorted = sortAssets(assets, 'name', 'desc')
    expect(sorted.map(a => a.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts by createdAt ascending', () => {
    const sorted = sortAssets(assets, 'createdAt', 'asc')
    expect(sorted.map(a => a.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by createdAt descending', () => {
    const sorted = sortAssets(assets, 'createdAt', 'desc')
    expect(sorted.map(a => a.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts by updatedAt ascending', () => {
    const sorted = sortAssets(assets, 'updatedAt', 'asc')
    expect(sorted.map(a => a.name)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })

  it('sorts by type alphabetically', () => {
    const sorted = sortAssets(assets, 'type', 'asc')
    expect(sorted.map(a => a.type)).toEqual(['material', 'mesh', 'texture'])
  })

  it('does not mutate original array', () => {
    const original = [...assets]
    sortAssets(assets, 'name', 'asc')
    expect(assets.map(a => a.name)).toEqual(original.map(a => a.name))
  })
})

describe('searchAssets', () => {
  const assets: Asset[] = [
    makeMesh({ name: 'Cowboy Hat', tags: ['western', 'accessory'], description: 'A rugged leather hat' }),
    makeMaterial({ name: 'Rust Metal', tags: ['metallic'], description: 'Weathered metal surface' }),
    makeTexture({ name: 'Desert Sand', tags: ['terrain', 'sandy'] }),
  ]

  it('returns all assets for empty query', () => {
    expect(searchAssets(assets, '')).toHaveLength(3)
  })

  it('returns all assets for whitespace-only query', () => {
    expect(searchAssets(assets, '   ')).toHaveLength(3)
  })

  it('matches by name (case-insensitive)', () => {
    const result = searchAssets(assets, 'COWBOY')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Cowboy Hat')
  })

  it('matches by description', () => {
    const result = searchAssets(assets, 'leather')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Cowboy Hat')
  })

  it('matches by tags', () => {
    const result = searchAssets(assets, 'sandy')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Sand')
  })

  it('matches partial strings', () => {
    const result = searchAssets(assets, 'metal')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Rust Metal')
  })
})

describe('getAssetsByType', () => {
  const assets: Asset[] = [makeMesh(), makeMesh({ id: 'mesh-2', name: 'Mesh 2' }), makeMaterial(), makeTexture()]

  it('returns only assets of the specified type', () => {
    const meshes = getAssetsByType(assets, 'mesh')
    expect(meshes).toHaveLength(2)
    expect(meshes.every(a => a.type === 'mesh')).toBe(true)
  })

  it('returns empty array when no assets of type exist', () => {
    expect(getAssetsByType(assets, 'prefab')).toHaveLength(0)
  })
})

describe('getAssetsByTags', () => {
  const assets: Asset[] = [
    makeMesh({ tags: ['terrain', 'rock', 'large'] }),
    makeMaterial({ tags: ['terrain', 'sand'] }),
    makeTexture({ tags: ['plant'] }),
  ]

  it('returns assets that have ALL specified tags', () => {
    const result = getAssetsByTags(assets, ['terrain', 'rock'])
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('mesh')
  })

  it('returns all assets with single matching tag', () => {
    const result = getAssetsByTags(assets, ['terrain'])
    expect(result).toHaveLength(2)
  })

  it('returns all assets for empty tags array', () => {
    expect(getAssetsByTags(assets, [])).toHaveLength(3)
  })

  it('is case-insensitive', () => {
    const result = getAssetsByTags(assets, ['TERRAIN'])
    expect(result).toHaveLength(2)
  })

  it('returns empty when no assets match all tags', () => {
    const result = getAssetsByTags(assets, ['terrain', 'plant'])
    expect(result).toHaveLength(0)
  })
})

describe('updateAssetMetadata', () => {
  it('updates name and preserves other fields', () => {
    const original = makeMesh({ name: 'Old Name' })
    const updated = updateAssetMetadata(original, { name: 'New Name' })
    expect(updated.name).toBe('New Name')
    expect(updated.type).toBe('mesh')
    expect(updated.id).toBe(original.id)
  })

  it('updates tags', () => {
    const original = makeMesh({ tags: ['old'] })
    const updated = updateAssetMetadata(original, { tags: ['new', 'tags'] })
    expect(updated.tags).toEqual(['new', 'tags'])
  })

  it('updates description', () => {
    const original = makeMesh()
    const updated = updateAssetMetadata(original, { description: 'A new description' })
    expect(updated.description).toBe('A new description')
  })

  it('updates updatedAt timestamp', () => {
    const original = makeMesh({ updatedAt: '2020-01-01T00:00:00.000Z' })
    const updated = updateAssetMetadata(original, { name: 'Changed' })
    expect(updated.updatedAt).not.toBe(original.updatedAt)
    // The new timestamp should be more recent
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(original.updatedAt).getTime())
  })

  it('does not mutate the original asset', () => {
    const original = makeMesh({ name: 'Original' })
    updateAssetMetadata(original, { name: 'Modified' })
    expect(original.name).toBe('Original')
  })
})
