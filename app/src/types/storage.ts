// Cloud/Local Storage Types (Phase 8)

/** Storage provider type */
export type StorageProvider = 'indexeddb' | 'cloud'

/** Saved scene metadata (stored in index) */
export interface SavedSceneMetadata {
  id: string
  name: string
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
  version: number          // scene format version
  thumbnailUrl?: string    // data URL or blob URL
  fileSize: number         // bytes
  objectCount: number
  tags: string[]
}

/** Scene sort options */
export type SceneSortField = 'name' | 'updatedAt' | 'createdAt' | 'fileSize'
export type SortDirection = 'asc' | 'desc'

export interface SceneSortOptions {
  field: SceneSortField
  direction: SortDirection
}

/** Scene search/filter */
export interface SceneFilterOptions {
  search?: string          // name/tag search
  tags?: string[]          // filter by tags
  sortBy?: SceneSortOptions
}

/** Auto-save configuration */
export interface AutoSaveConfig {
  enabled: boolean
  intervalMs: number       // debounce interval (default 30000 = 30s)
  maxVersions: number      // how many versions to keep (default 10)
}

/** Save status indicator */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

/** Storage provider interface (abstraction) */
export interface StorageAdapter {
  save: (id: string, data: string, metadata: SavedSceneMetadata) => Promise<void>
  load: (id: string) => Promise<{ data: string; metadata: SavedSceneMetadata } | null>
  delete: (id: string) => Promise<void>
  list: (filter?: SceneFilterOptions) => Promise<SavedSceneMetadata[]>
  exists: (id: string) => Promise<boolean>
  getMetadata: (id: string) => Promise<SavedSceneMetadata | null>
  clear: () => Promise<void>
}
