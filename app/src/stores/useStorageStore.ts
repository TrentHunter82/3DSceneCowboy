/** Zustand store for scene storage management */

import { create } from 'zustand'
import type {
  SavedSceneMetadata, SceneFilterOptions, AutoSaveConfig, SaveStatus,
} from '../types/storage'

// ── Store Interface ─────────────────────────────────────────────────

export interface StorageStoreState {
  // State
  scenes: SavedSceneMetadata[]
  activeSceneId: string | null
  filter: SceneFilterOptions
  autoSave: AutoSaveConfig
  saveStatus: SaveStatus
  lastSavedAt: string | null

  // Actions
  setScenes: (scenes: SavedSceneMetadata[]) => void
  addScene: (scene: SavedSceneMetadata) => void
  removeScene: (id: string) => void
  updateSceneMetadata: (id: string, updates: Partial<SavedSceneMetadata>) => void
  setActiveScene: (id: string | null) => void
  setFilter: (filter: Partial<SceneFilterOptions>) => void
  clearFilter: () => void
  setAutoSave: (config: Partial<AutoSaveConfig>) => void
  setSaveStatus: (status: SaveStatus) => void
  setLastSavedAt: (timestamp: string | null) => void
  clearAll: () => void

  // Getters
  getScene: (id: string) => SavedSceneMetadata | undefined
  getFilteredScenes: () => SavedSceneMetadata[]
}

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_AUTO_SAVE: AutoSaveConfig = {
  enabled: true,
  intervalMs: 30000,
  maxVersions: 10,
}

const DEFAULT_FILTER: SceneFilterOptions = {}

// ── Filtering Helpers ───────────────────────────────────────────────

function matchesFilter(scene: SavedSceneMetadata, filter: SceneFilterOptions): boolean {
  // Search by name or tags
  if (filter.search) {
    const query = filter.search.toLowerCase()
    const nameMatch = scene.name.toLowerCase().includes(query)
    const tagMatch = scene.tags.some(tag => tag.toLowerCase().includes(query))
    if (!nameMatch && !tagMatch) return false
  }

  // Filter by tags (all specified tags must be present)
  if (filter.tags && filter.tags.length > 0) {
    const hasAllTags = filter.tags.every(tag => scene.tags.includes(tag))
    if (!hasAllTags) return false
  }

  return true
}

function sortScenes(scenes: SavedSceneMetadata[], filter: SceneFilterOptions): SavedSceneMetadata[] {
  if (!filter.sortBy) return scenes

  const { field, direction } = filter.sortBy
  const sorted = [...scenes]

  sorted.sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'updatedAt':
        cmp = a.updatedAt.localeCompare(b.updatedAt)
        break
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
      case 'fileSize':
        cmp = a.fileSize - b.fileSize
        break
    }
    return direction === 'desc' ? -cmp : cmp
  })

  return sorted
}

// ── Factory (for testing) ───────────────────────────────────────────

export function createStorageStore() {
  return create<StorageStoreState>((set, get) => ({
    // Initial state
    scenes: [],
    activeSceneId: null,
    filter: { ...DEFAULT_FILTER },
    autoSave: { ...DEFAULT_AUTO_SAVE },
    saveStatus: 'saved',
    lastSavedAt: null,

    // Actions
    setScenes: (scenes) => set({ scenes: [...scenes] }),

    addScene: (scene) => set(state => ({
      scenes: [...state.scenes, scene],
    })),

    removeScene: (id) => set(state => {
      const scene = state.scenes.find(s => s.id === id)
      if (scene?.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(scene.thumbnailUrl)
      }
      return {
        scenes: state.scenes.filter(s => s.id !== id),
        activeSceneId: state.activeSceneId === id ? null : state.activeSceneId,
      }
    }),

    updateSceneMetadata: (id, updates) => set(state => ({
      scenes: state.scenes.map(s =>
        s.id === id
          ? { ...s, ...updates, id: s.id } as SavedSceneMetadata
          : s,
      ),
    })),

    setActiveScene: (id) => set({ activeSceneId: id }),

    setFilter: (filter) => set(state => ({
      filter: { ...state.filter, ...filter },
    })),

    clearFilter: () => set({ filter: { ...DEFAULT_FILTER } }),

    setAutoSave: (config) => set(state => {
      const merged = { ...state.autoSave, ...config }
      return {
        autoSave: {
          ...merged,
          intervalMs: Math.max(5000, merged.intervalMs),
          maxVersions: Math.max(1, Math.min(100, merged.maxVersions)),
        },
      }
    }),

    setSaveStatus: (status) => set({ saveStatus: status }),

    setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

    clearAll: () => {
      // Revoke blob URLs before clearing to prevent memory leaks
      const { scenes } = get()
      for (const scene of scenes) {
        if (scene.thumbnailUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(scene.thumbnailUrl)
        }
      }
      set({
        scenes: [],
        activeSceneId: null,
        filter: { ...DEFAULT_FILTER },
        autoSave: { ...DEFAULT_AUTO_SAVE },
        saveStatus: 'saved',
        lastSavedAt: null,
      })
    },

    // Getters
    getScene: (id) => get().scenes.find(s => s.id === id),

    getFilteredScenes: () => {
      const { scenes, filter } = get()
      const filtered = scenes.filter(s => matchesFilter(s, filter))
      return sortScenes(filtered, filter)
    },
  }))
}

// ── Singleton ───────────────────────────────────────────────────────

export const useStorageStore = createStorageStore()
