import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAssetStore } from './useAssetStore'
import type { MeshAsset, MaterialAsset, TextureAsset, Asset } from '../types/asset'

// ── Helpers ──────────────────────────────────────────────────────────────

let idCounter = 0

function createTestAsset(overrides: Partial<MeshAsset> = {}): MeshAsset {
  idCounter++
  const now = new Date().toISOString()
  return {
    id: `test-asset-${idCounter}`,
    name: `Test Asset ${idCounter}`,
    type: 'mesh',
    source: 'local',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      url: `blob:http://localhost/mesh-${idCounter}`,
      filename: `model-${idCounter}.glb`,
      format: 'glb',
    },
    ...overrides,
  }
}

function createTestMaterialAsset(overrides: Partial<MaterialAsset> = {}): MaterialAsset {
  idCounter++
  const now = new Date().toISOString()
  return {
    id: `test-material-${idCounter}`,
    name: `Test Material ${idCounter}`,
    type: 'material',
    source: 'local',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      materialType: 'standard',
      color: '#ff0000',
    },
    ...overrides,
  }
}

function createTestTextureAsset(overrides: Partial<TextureAsset> = {}): TextureAsset {
  idCounter++
  const now = new Date().toISOString()
  return {
    id: `test-texture-${idCounter}`,
    name: `Test Texture ${idCounter}`,
    type: 'texture',
    source: 'local',
    tags: [],
    createdAt: now,
    updatedAt: now,
    data: {
      url: `blob:http://localhost/texture-${idCounter}`,
      filename: `texture-${idCounter}.png`,
      format: 'png',
    },
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('useAssetStore', () => {
  let store: ReturnType<typeof createAssetStore>

  beforeEach(() => {
    idCounter = 0
    store = createAssetStore()
  })

  // ── Default state ────────────────────────────────────────────────────

  describe('default state', () => {
    it('starts with an empty assets array', () => {
      expect(store.getState().assets).toEqual([])
    })

    it('starts with an empty filter object', () => {
      expect(store.getState().filter).toEqual({})
    })

    it('has correct default sortField, sortOrder, viewMode, and selectedAssetId', () => {
      const state = store.getState()
      expect(state.sortField).toBe('name')
      expect(state.sortOrder).toBe('asc')
      expect(state.viewMode).toBe('grid')
      expect(state.selectedAssetId).toBeNull()
    })
  })

  // ── addAsset ─────────────────────────────────────────────────────────

  describe('addAsset', () => {
    it('adds a single asset to the store', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)

      expect(store.getState().assets).toHaveLength(1)
      expect(store.getState().assets[0]).toEqual(asset)
    })

    it('adds multiple assets sequentially', () => {
      const asset1 = createTestAsset()
      const asset2 = createTestAsset()
      const asset3 = createTestAsset()

      store.getState().addAsset(asset1)
      store.getState().addAsset(asset2)
      store.getState().addAsset(asset3)

      expect(store.getState().assets).toHaveLength(3)
      expect(store.getState().assets[0].id).toBe(asset1.id)
      expect(store.getState().assets[1].id).toBe(asset2.id)
      expect(store.getState().assets[2].id).toBe(asset3.id)
    })

    it('makes added asset visible in getFilteredAssets', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)

      const filtered = store.getState().getFilteredAssets()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe(asset.id)
    })
  })

  // ── removeAsset ──────────────────────────────────────────────────────

  describe('removeAsset', () => {
    it('removes an asset by id', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)
      expect(store.getState().assets).toHaveLength(1)

      store.getState().removeAsset(asset.id)
      expect(store.getState().assets).toHaveLength(0)
    })

    it('does not affect other assets when removing one', () => {
      const asset1 = createTestAsset()
      const asset2 = createTestAsset()
      const asset3 = createTestAsset()

      store.getState().addAsset(asset1)
      store.getState().addAsset(asset2)
      store.getState().addAsset(asset3)

      store.getState().removeAsset(asset2.id)

      const remaining = store.getState().assets
      expect(remaining).toHaveLength(2)
      expect(remaining.map(a => a.id)).toEqual([asset1.id, asset3.id])
    })

    it('clears selection if the removed asset was selected', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)
      store.getState().selectAsset(asset.id)
      expect(store.getState().selectedAssetId).toBe(asset.id)

      store.getState().removeAsset(asset.id)
      expect(store.getState().selectedAssetId).toBeNull()
    })

    it('preserves selection if a different asset is removed', () => {
      const asset1 = createTestAsset()
      const asset2 = createTestAsset()
      store.getState().addAsset(asset1)
      store.getState().addAsset(asset2)
      store.getState().selectAsset(asset1.id)

      store.getState().removeAsset(asset2.id)
      expect(store.getState().selectedAssetId).toBe(asset1.id)
    })
  })

  // ── updateAsset ──────────────────────────────────────────────────────

  describe('updateAsset', () => {
    it('updates the name of an asset', () => {
      const asset = createTestAsset({ name: 'Original Name' })
      store.getState().addAsset(asset)

      store.getState().updateAsset(asset.id, { name: 'Renamed Asset' })

      const updated = store.getState().assets[0]
      expect(updated.name).toBe('Renamed Asset')
    })

    it('updates the tags of an asset', () => {
      const asset = createTestAsset({ tags: ['old'] })
      store.getState().addAsset(asset)

      store.getState().updateAsset(asset.id, { tags: ['new', 'updated'] })

      const updated = store.getState().assets[0]
      expect(updated.tags).toEqual(['new', 'updated'])
    })

    it('bumps updatedAt to a new timestamp', () => {
      vi.useFakeTimers()
      try {
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
        const asset = createTestAsset()
        store.getState().addAsset(asset)
        const originalUpdatedAt = asset.updatedAt

        vi.setSystemTime(new Date('2025-01-01T00:00:01.000Z'))
        store.getState().updateAsset(asset.id, { name: 'Changed' })

        const updated = store.getState().assets[0]
        expect(updated.updatedAt).not.toBe(originalUpdatedAt)
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
          new Date(originalUpdatedAt).getTime(),
        )
      } finally {
        vi.useRealTimers()
      }
    })
  })

  // ── Filter management ────────────────────────────────────────────────

  describe('filter management', () => {
    it('setFilter sets a type filter', () => {
      store.getState().setFilter({ type: 'mesh' })
      expect(store.getState().filter.type).toBe('mesh')
    })

    it('setFilter merges with existing filter', () => {
      store.getState().setFilter({ type: 'mesh' })
      store.getState().setFilter({ search: 'cube' })

      const filter = store.getState().filter
      expect(filter.type).toBe('mesh')
      expect(filter.search).toBe('cube')
    })

    it('clearFilter resets filter to empty object', () => {
      store.getState().setFilter({ type: 'material', search: 'red', tags: ['shiny'] })
      expect(Object.keys(store.getState().filter).length).toBeGreaterThan(0)

      store.getState().clearFilter()
      expect(store.getState().filter).toEqual({})
    })

    it('getFilteredAssets applies type filter', () => {
      const mesh = createTestAsset()
      const material = createTestMaterialAsset()
      store.getState().addAsset(mesh)
      store.getState().addAsset(material)

      store.getState().setFilter({ type: 'mesh' })
      const filtered = store.getState().getFilteredAssets()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('mesh')
    })

    it('getFilteredAssets applies search filter', () => {
      const alpha = createTestAsset({ name: 'Alpha Cube' })
      const beta = createTestAsset({ name: 'Beta Sphere' })
      const gamma = createTestAsset({ name: 'Gamma Cube' })
      store.getState().addAsset(alpha)
      store.getState().addAsset(beta)
      store.getState().addAsset(gamma)

      store.getState().setFilter({ search: 'cube' })
      const filtered = store.getState().getFilteredAssets()

      expect(filtered).toHaveLength(2)
      expect(filtered.map(a => a.name)).toContain('Alpha Cube')
      expect(filtered.map(a => a.name)).toContain('Gamma Cube')
    })
  })

  // ── Sort management ──────────────────────────────────────────────────

  describe('sort management', () => {
    it('setSortField changes the sort field', () => {
      store.getState().setSortField('createdAt')
      expect(store.getState().sortField).toBe('createdAt')
    })

    it('setSortOrder changes the sort order', () => {
      store.getState().setSortOrder('desc')
      expect(store.getState().sortOrder).toBe('desc')
    })

    it('getFilteredAssets returns assets sorted by name ascending by default', () => {
      const charlie = createTestAsset({ name: 'Charlie' })
      const alpha = createTestAsset({ name: 'Alpha' })
      const bravo = createTestAsset({ name: 'Bravo' })
      store.getState().addAsset(charlie)
      store.getState().addAsset(alpha)
      store.getState().addAsset(bravo)

      const sorted = store.getState().getFilteredAssets()
      expect(sorted.map(a => a.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    })

    it('getFilteredAssets respects descending sort order', () => {
      const alpha = createTestAsset({ name: 'Alpha' })
      const bravo = createTestAsset({ name: 'Bravo' })
      const charlie = createTestAsset({ name: 'Charlie' })
      store.getState().addAsset(alpha)
      store.getState().addAsset(bravo)
      store.getState().addAsset(charlie)

      store.getState().setSortOrder('desc')
      const sorted = store.getState().getFilteredAssets()
      expect(sorted.map(a => a.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
    })
  })

  // ── View mode & selection ────────────────────────────────────────────

  describe('view mode and selection', () => {
    it('setViewMode changes the view mode', () => {
      store.getState().setViewMode('list')
      expect(store.getState().viewMode).toBe('list')
    })

    it('selectAsset sets the selected asset id', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)

      store.getState().selectAsset(asset.id)
      expect(store.getState().selectedAssetId).toBe(asset.id)
    })

    it('selectAsset with null clears the selection', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)
      store.getState().selectAsset(asset.id)
      expect(store.getState().selectedAssetId).toBe(asset.id)

      store.getState().selectAsset(null)
      expect(store.getState().selectedAssetId).toBeNull()
    })
  })

  // ── getAssetById ─────────────────────────────────────────────────────

  describe('getAssetById', () => {
    it('returns the asset when found', () => {
      const asset = createTestAsset({ name: 'Target' })
      store.getState().addAsset(createTestAsset())
      store.getState().addAsset(asset)
      store.getState().addAsset(createTestAsset())

      const found = store.getState().getAssetById(asset.id)
      expect(found).toBeDefined()
      expect(found!.name).toBe('Target')
    })

    it('returns undefined when asset is not found', () => {
      store.getState().addAsset(createTestAsset())
      const found = store.getState().getAssetById('nonexistent-id')
      expect(found).toBeUndefined()
    })
  })

  // ── importAssets ─────────────────────────────────────────────────────

  describe('importAssets', () => {
    it('bulk imports multiple assets', () => {
      const assets: Asset[] = [
        createTestAsset({ name: 'Import 1' }),
        createTestAsset({ name: 'Import 2' }),
        createTestAsset({ name: 'Import 3' }),
      ]

      store.getState().importAssets(assets)
      expect(store.getState().assets).toHaveLength(3)
    })

    it('preserves existing assets when importing', () => {
      const existing = createTestAsset({ name: 'Existing' })
      store.getState().addAsset(existing)

      const imports: Asset[] = [
        createTestAsset({ name: 'Imported A' }),
        createTestAsset({ name: 'Imported B' }),
      ]
      store.getState().importAssets(imports)

      const all = store.getState().assets
      expect(all).toHaveLength(3)
      expect(all[0].name).toBe('Existing')
      expect(all[1].name).toBe('Imported A')
      expect(all[2].name).toBe('Imported B')
    })

    it('imported assets appear in getFilteredAssets', () => {
      const imports: Asset[] = [
        createTestAsset({ name: 'Bravo' }),
        createTestAsset({ name: 'Alpha' }),
      ]
      store.getState().importAssets(imports)

      const filtered = store.getState().getFilteredAssets()
      expect(filtered).toHaveLength(2)
      // Sorted by name ascending by default
      expect(filtered[0].name).toBe('Alpha')
      expect(filtered[1].name).toBe('Bravo')
    })
  })

  // ── Additional edge cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('removing a nonexistent asset id does not affect the store', () => {
      const asset = createTestAsset()
      store.getState().addAsset(asset)

      store.getState().removeAsset('nonexistent-id')
      expect(store.getState().assets).toHaveLength(1)
      expect(store.getState().assets[0].id).toBe(asset.id)
    })

    it('updating a nonexistent asset id does not affect the store', () => {
      const asset = createTestAsset({ name: 'Original' })
      store.getState().addAsset(asset)

      store.getState().updateAsset('nonexistent-id', { name: 'Changed' })
      expect(store.getState().assets[0].name).toBe('Original')
    })

    it('getFilteredAssets with combined type and search filter', () => {
      const meshCube = createTestAsset({ name: 'Cube Mesh' })
      const meshSphere = createTestAsset({ name: 'Sphere Mesh' })
      const matCube = createTestMaterialAsset({ name: 'Cube Material' })
      store.getState().addAsset(meshCube)
      store.getState().addAsset(meshSphere)
      store.getState().addAsset(matCube)

      store.getState().setFilter({ type: 'mesh', search: 'cube' })
      const filtered = store.getState().getFilteredAssets()

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Cube Mesh')
    })

    it('getFilteredAssets sorts by type field', () => {
      const texture = createTestTextureAsset({ name: 'A Texture' })
      const mesh = createTestAsset({ name: 'B Mesh' })
      const material = createTestMaterialAsset({ name: 'C Material' })
      store.getState().addAsset(texture)
      store.getState().addAsset(mesh)
      store.getState().addAsset(material)

      store.getState().setSortField('type')
      const sorted = store.getState().getFilteredAssets()

      // 'material' < 'mesh' < 'texture' alphabetically
      expect(sorted.map(a => a.type)).toEqual(['material', 'mesh', 'texture'])
    })

    it('setFilter overwrites a previously set field', () => {
      store.getState().setFilter({ type: 'mesh' })
      store.getState().setFilter({ type: 'texture' })
      expect(store.getState().filter.type).toBe('texture')
    })

    it('switching view mode back and forth preserves the value', () => {
      store.getState().setViewMode('list')
      expect(store.getState().viewMode).toBe('list')

      store.getState().setViewMode('grid')
      expect(store.getState().viewMode).toBe('grid')
    })
  })
})
