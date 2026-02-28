/** Zustand store for asset library state */

import { create } from 'zustand'
import type {
  Asset,
  AssetFilter,
  AssetSortField,
  AssetSortOrder,
  AssetViewMode,
  AssetLibraryState,
} from '../types/asset'
import { filterAssets, sortAssets } from '../core/assetLibrary'

// ── Store Interface ───────────────────────────────────────────────────

interface AssetStoreActions {
  addAsset: (asset: Asset) => void
  removeAsset: (id: string) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  setFilter: (filter: Partial<AssetFilter>) => void
  clearFilter: () => void
  setSortField: (field: AssetSortField) => void
  setSortOrder: (order: AssetSortOrder) => void
  setViewMode: (mode: AssetViewMode) => void
  selectAsset: (id: string | null) => void
  getFilteredAssets: () => Asset[]
  getAssetById: (id: string) => Asset | undefined
  importAssets: (assets: Asset[]) => void
}

type AssetStore = AssetLibraryState & AssetStoreActions

// ── Default State ─────────────────────────────────────────────────────

function createDefaultAssetState(): AssetLibraryState {
  return {
    assets: [],
    filter: {},
    sortField: 'name',
    sortOrder: 'asc',
    viewMode: 'grid',
    selectedAssetId: null,
  }
}

export { createDefaultAssetState }

// ── Store Creator (exported for testing) ──────────────────────────────

export function createAssetStore() {
  return create<AssetStore>((set, get) => ({
    ...createDefaultAssetState(),

    addAsset: (asset: Asset) => {
      set(state => ({
        assets: [...state.assets, asset],
      }))
    },

    removeAsset: (id: string) => {
      set(state => ({
        assets: state.assets.filter(a => a.id !== id),
        selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
      }))
    },

    updateAsset: (id: string, updates: Partial<Asset>) => {
      set(state => ({
        assets: state.assets.map(a =>
          a.id === id
            ? { ...a, ...updates, updatedAt: new Date().toISOString() } as Asset
            : a,
        ),
      }))
    },

    setFilter: (filter: Partial<AssetFilter>) => {
      set(state => ({
        filter: { ...state.filter, ...filter },
      }))
    },

    clearFilter: () => {
      set({ filter: {} })
    },

    setSortField: (field: AssetSortField) => {
      set({ sortField: field })
    },

    setSortOrder: (order: AssetSortOrder) => {
      set({ sortOrder: order })
    },

    setViewMode: (mode: AssetViewMode) => {
      set({ viewMode: mode })
    },

    selectAsset: (id: string | null) => {
      set({ selectedAssetId: id })
    },

    getFilteredAssets: (): Asset[] => {
      const { assets, filter, sortField, sortOrder } = get()
      const filtered = filterAssets(assets, filter)
      return sortAssets(filtered, sortField, sortOrder)
    },

    getAssetById: (id: string): Asset | undefined => {
      return get().assets.find(a => a.id === id)
    },

    importAssets: (assets: Asset[]) => {
      set(state => ({
        assets: [...state.assets, ...assets],
      }))
    },
  }))
}

// ── Default Store Instance ────────────────────────────────────────────

export const useAssetStore = createAssetStore()
