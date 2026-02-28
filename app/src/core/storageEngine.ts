/** Cloud storage abstraction and IndexedDB adapter */

import type {
  SavedSceneMetadata,
  SceneFilterOptions,
  SceneSortOptions,
  AutoSaveConfig,
  StorageAdapter,
} from '../types/storage'

// ── ID Generation (pure) ──────────────────────────────────────────────

export function generateSceneId(): string {
  // UUID v4-like: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = '0123456789abcdef'
  const segments = [8, 4, 4, 4, 12]
  const parts: string[] = []

  for (const len of segments) {
    let segment = ''
    for (let i = 0; i < len; i++) {
      if (len === 4 && parts.length === 2 && i === 0) {
        // Version nibble: always '4'
        segment += '4'
      } else if (len === 4 && parts.length === 3 && i === 0) {
        // Variant nibble: 8, 9, a, or b
        segment += hex[8 + Math.floor(Math.random() * 4)]
      } else {
        segment += hex[Math.floor(Math.random() * 16)]
      }
    }
    parts.push(segment)
  }

  return parts.join('-')
}

// ── Metadata Creation (pure) ──────────────────────────────────────────

export function createSceneMetadata(
  name: string,
  sceneData: string,
  objectCount: number,
  version: number,
  tags?: string[],
): SavedSceneMetadata {
  const now = new Date().toISOString()
  return {
    id: generateSceneId(),
    name,
    createdAt: now,
    updatedAt: now,
    version,
    fileSize: estimateSceneSize(sceneData),
    objectCount,
    tags: tags ?? [],
  }
}

// ── Metadata Update (pure) ────────────────────────────────────────────

export function updateSceneMetadata(
  existing: SavedSceneMetadata,
  updates: Partial<Pick<SavedSceneMetadata, 'name' | 'tags' | 'thumbnailUrl'>>,
): SavedSceneMetadata {
  return {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

// ── Filtering (pure) ──────────────────────────────────────────────────

export function searchScenes(
  scenes: SavedSceneMetadata[],
  query: string,
): SavedSceneMetadata[] {
  if (!query.trim()) return scenes

  const lower = query.toLowerCase().trim()
  return scenes.filter((scene) => {
    if (scene.name.toLowerCase().includes(lower)) return true
    return scene.tags.some((tag) => tag.toLowerCase().includes(lower))
  })
}

export function sortScenes(
  scenes: SavedSceneMetadata[],
  sort: SceneSortOptions,
): SavedSceneMetadata[] {
  const sorted = [...scenes]
  const dir = sort.direction === 'asc' ? 1 : -1

  sorted.sort((a, b) => {
    switch (sort.field) {
      case 'name':
        return dir * a.name.localeCompare(b.name)
      case 'updatedAt':
        return dir * a.updatedAt.localeCompare(b.updatedAt)
      case 'createdAt':
        return dir * a.createdAt.localeCompare(b.createdAt)
      case 'fileSize':
        return dir * (a.fileSize - b.fileSize)
      default:
        return 0
    }
  })

  return sorted
}

export function filterScenes(
  scenes: SavedSceneMetadata[],
  filter: SceneFilterOptions,
): SavedSceneMetadata[] {
  let result = scenes

  // Search by name/tags
  if (filter.search) {
    result = searchScenes(result, filter.search)
  }

  // Filter by tags (all tags must match)
  if (filter.tags && filter.tags.length > 0) {
    const filterTags = filter.tags.map((t) => t.toLowerCase())
    result = result.filter((scene) => {
      const sceneTags = scene.tags.map((t) => t.toLowerCase())
      return filterTags.every((ft) => sceneTags.includes(ft))
    })
  }

  // Sort
  if (filter.sortBy) {
    result = sortScenes(result, filter.sortBy)
  }

  return result
}

// ── Auto-save Debounce (pure) ─────────────────────────────────────────

export function createDebouncedSave(
  saveFn: (id: string, data: string) => Promise<void>,
  intervalMs: number,
): { save: (id: string, data: string) => void; cancel: () => void; flush: () => Promise<void> } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingId: string | null = null
  let pendingData: string | null = null

  const save = (id: string, data: string): void => {
    pendingId = id
    pendingData = data

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (pendingId !== null && pendingData !== null) {
        const capturedId = pendingId
        const capturedData = pendingData
        pendingId = null
        pendingData = null
        saveFn(capturedId, capturedData)
      }
    }, intervalMs)
  }

  const cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    pendingId = null
    pendingData = null
  }

  const flush = async (): Promise<void> => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (pendingId !== null && pendingData !== null) {
      const capturedId = pendingId
      const capturedData = pendingData
      pendingId = null
      pendingData = null
      await saveFn(capturedId, capturedData)
    }
  }

  return { save, cancel, flush }
}

// ── Version Management (pure) ─────────────────────────────────────────

export interface VersionEntry {
  id: string
  sceneId: string
  timestamp: string
  data: string
}

export function createVersionEntry(sceneId: string, data: string): VersionEntry {
  return {
    id: generateSceneId(),
    sceneId,
    timestamp: new Date().toISOString(),
    data,
  }
}

export function pruneVersions(
  versions: VersionEntry[],
  maxVersions: number,
): VersionEntry[] {
  if (versions.length <= maxVersions) return versions

  // Sort by timestamp descending (newest first), keep only maxVersions
  const sorted = [...versions].sort(
    (a, b) => b.timestamp.localeCompare(a.timestamp),
  )
  return sorted.slice(0, maxVersions)
}

// ── Validation (pure) ─────────────────────────────────────────────────

export function validateAutoSaveConfig(config: AutoSaveConfig): string[] {
  const errors: string[] = []

  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean')
  }

  if (typeof config.intervalMs !== 'number' || config.intervalMs < 1000) {
    errors.push('intervalMs must be a number >= 1000')
  }

  if (typeof config.maxVersions !== 'number' || config.maxVersions < 1) {
    errors.push('maxVersions must be a number >= 1')
  }

  if (typeof config.maxVersions === 'number' && !Number.isInteger(config.maxVersions)) {
    errors.push('maxVersions must be an integer')
  }

  return errors
}

export function validateSceneMetadata(metadata: SavedSceneMetadata): string[] {
  const errors: string[] = []

  if (!metadata.id || typeof metadata.id !== 'string') {
    errors.push('id is required and must be a string')
  }

  if (!metadata.name || typeof metadata.name !== 'string') {
    errors.push('name is required and must be a string')
  }

  if (typeof metadata.name === 'string' && metadata.name.length > 256) {
    errors.push('name must not exceed 256 characters')
  }

  if (!metadata.createdAt || typeof metadata.createdAt !== 'string') {
    errors.push('createdAt is required and must be an ISO 8601 string')
  }

  if (!metadata.updatedAt || typeof metadata.updatedAt !== 'string') {
    errors.push('updatedAt is required and must be an ISO 8601 string')
  }

  if (typeof metadata.version !== 'number' || metadata.version < 1) {
    errors.push('version must be a number >= 1')
  }

  if (typeof metadata.fileSize !== 'number' || metadata.fileSize < 0) {
    errors.push('fileSize must be a non-negative number')
  }

  if (typeof metadata.objectCount !== 'number' || metadata.objectCount < 0) {
    errors.push('objectCount must be a non-negative number')
  }

  if (!Array.isArray(metadata.tags)) {
    errors.push('tags must be an array')
  } else if (metadata.tags.some((t) => typeof t !== 'string')) {
    errors.push('all tags must be strings')
  }

  return errors
}

// ── Size Utilities (pure) ─────────────────────────────────────────────

/** Maximum allowed scene file size: 100 MB */
export const MAX_SCENE_SIZE = 100 * 1024 * 1024

/** Estimate the byte size of scene data (UTF-8 encoded string length) */
export function estimateSceneSize(sceneData: string): number {
  // TextEncoder gives accurate UTF-8 byte length
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(sceneData).byteLength
  }
  // Fallback: approximate for ASCII-heavy JSON
  return sceneData.length * 2
}

/** Format a byte count to human-readable string */
export function formatStorageSize(bytes: number): string {
  if (bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  let unitIndex = 0

  let value = bytes
  while (value >= k && unitIndex < units.length - 1) {
    value /= k
    unitIndex++
  }

  // Use integer for bytes, 1 decimal for KB+
  if (unitIndex === 0) {
    return `${Math.round(value)} B`
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

// ── IndexedDB Adapter (browser) ───────────────────────────────────────

/* v8 ignore start */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName: string
  private dbVersion: number

  constructor(dbName = '3dscene-cowboy', dbVersion = 1) {
    this.dbName = dbName
    this.dbVersion = dbVersion
  }

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('scenes')) {
          db.createObjectStore('scenes', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', {
            keyPath: 'id',
            autoIncrement: false,
          })
          versionStore.createIndex('sceneId', 'sceneId', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async save(
    id: string,
    data: string,
    metadata: SavedSceneMetadata,
  ): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readwrite')
      const store = tx.objectStore('scenes')
      store.put({ id, data, metadata })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async load(
    id: string,
  ): Promise<{ data: string; metadata: SavedSceneMetadata } | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readonly')
      const store = tx.objectStore('scenes')
      const request = store.get(id)
      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
        } else {
          resolve({ data: result.data, metadata: result.metadata })
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readwrite')
      const store = tx.objectStore('scenes')
      store.delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async list(filter?: SceneFilterOptions): Promise<SavedSceneMetadata[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readonly')
      const store = tx.objectStore('scenes')
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as Array<{
          id: string
          data: string
          metadata: SavedSceneMetadata
        }>
        let metadataList = entries.map((e) => e.metadata)

        if (filter) {
          metadataList = filterScenes(metadataList, filter)
        }

        resolve(metadataList)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async exists(id: string): Promise<boolean> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readonly')
      const store = tx.objectStore('scenes')
      const request = store.count(id)
      request.onsuccess = () => resolve(request.result > 0)
      request.onerror = () => reject(request.error)
    })
  }

  async getMetadata(id: string): Promise<SavedSceneMetadata | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', 'readonly')
      const store = tx.objectStore('scenes')
      const request = store.get(id)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.metadata : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['scenes', 'versions'], 'readwrite')
      tx.objectStore('scenes').clear()
      tx.objectStore('versions').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
/* v8 ignore stop */

// ── In-Memory Adapter (for testing) ───────────────────────────────────

export class InMemoryAdapter implements StorageAdapter {
  private store: Map<string, { data: string; metadata: SavedSceneMetadata }>

  constructor() {
    this.store = new Map()
  }

  async save(
    id: string,
    data: string,
    metadata: SavedSceneMetadata,
  ): Promise<void> {
    this.store.set(id, { data, metadata })
  }

  async load(
    id: string,
  ): Promise<{ data: string; metadata: SavedSceneMetadata } | null> {
    const entry = this.store.get(id)
    return entry ?? null
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async list(filter?: SceneFilterOptions): Promise<SavedSceneMetadata[]> {
    let metadataList = Array.from(this.store.values()).map((e) => e.metadata)

    if (filter) {
      metadataList = filterScenes(metadataList, filter)
    }

    return metadataList
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id)
  }

  async getMetadata(id: string): Promise<SavedSceneMetadata | null> {
    const entry = this.store.get(id)
    return entry ? entry.metadata : null
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}
