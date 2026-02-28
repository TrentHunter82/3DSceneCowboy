import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  generateSceneId,
  createSceneMetadata,
  updateSceneMetadata,
  searchScenes,
  sortScenes,
  filterScenes,
  createDebouncedSave,
  createVersionEntry,
  pruneVersions,
  validateAutoSaveConfig,
  validateSceneMetadata,
  estimateSceneSize,
  formatStorageSize,
  InMemoryAdapter,
  MAX_SCENE_SIZE,
} from './storageEngine'
import type { SavedSceneMetadata, SceneFilterOptions } from '../types/storage'

// ── Helpers ──────────────────────────────────────────────────────────

function makeMetadata(overrides: Partial<SavedSceneMetadata> = {}): SavedSceneMetadata {
  return {
    id: overrides.id ?? 'test-id',
    name: overrides.name ?? 'Test Scene',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-02T00:00:00.000Z',
    version: overrides.version ?? 2,
    fileSize: overrides.fileSize ?? 1024,
    objectCount: overrides.objectCount ?? 5,
    tags: overrides.tags ?? [],
    ...(overrides.thumbnailUrl !== undefined ? { thumbnailUrl: overrides.thumbnailUrl } : {}),
  }
}

// ── 1. generateSceneId ──────────────────────────────────────────────

describe('generateSceneId', () => {
  it('returns a string in UUID format (5 hyphen-separated segments)', () => {
    const id = generateSceneId()
    const parts = id.split('-')
    expect(parts).toHaveLength(5)
    expect(parts[0]).toHaveLength(8)
    expect(parts[1]).toHaveLength(4)
    expect(parts[2]).toHaveLength(4)
    expect(parts[3]).toHaveLength(4)
    expect(parts[4]).toHaveLength(12)
  })

  it('has version nibble "4" at the start of the third segment', () => {
    const id = generateSceneId()
    const parts = id.split('-')
    expect(parts[2][0]).toBe('4')
  })

  it('has variant nibble 8/9/a/b at the start of the fourth segment', () => {
    // Run multiple times to catch randomness issues
    for (let i = 0; i < 20; i++) {
      const id = generateSceneId()
      const parts = id.split('-')
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0])
    }
  })

  it('contains only lowercase hex characters and hyphens', () => {
    const id = generateSceneId()
    expect(id).toMatch(/^[0-9a-f-]+$/)
  })

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSceneId())
    }
    expect(ids.size).toBe(100)
  })
})

// ── 2. createSceneMetadata ──────────────────────────────────────────

describe('createSceneMetadata', () => {
  it('creates metadata with provided name, objectCount, and version', () => {
    const meta = createSceneMetadata('My Scene', '{"objects":[]}', 3, 2)
    expect(meta.name).toBe('My Scene')
    expect(meta.objectCount).toBe(3)
    expect(meta.version).toBe(2)
  })

  it('generates a valid UUID-like id', () => {
    const meta = createSceneMetadata('S', '{}', 0, 1)
    expect(meta.id.split('-')).toHaveLength(5)
  })

  it('sets createdAt and updatedAt to current time (ISO 8601)', () => {
    const before = new Date().toISOString()
    const meta = createSceneMetadata('S', '{}', 0, 1)
    const after = new Date().toISOString()
    expect(meta.createdAt >= before).toBe(true)
    expect(meta.createdAt <= after).toBe(true)
    expect(meta.createdAt).toBe(meta.updatedAt)
  })

  it('estimates fileSize from sceneData', () => {
    const data = '{"hello":"world"}'
    const meta = createSceneMetadata('S', data, 0, 1)
    expect(meta.fileSize).toBe(estimateSceneSize(data))
    expect(meta.fileSize).toBeGreaterThan(0)
  })

  it('defaults tags to empty array when not provided', () => {
    const meta = createSceneMetadata('S', '{}', 0, 1)
    expect(meta.tags).toEqual([])
  })

  it('uses provided tags', () => {
    const meta = createSceneMetadata('S', '{}', 0, 1, ['western', 'demo'])
    expect(meta.tags).toEqual(['western', 'demo'])
  })
})

// ── 3. updateSceneMetadata ──────────────────────────────────────────

describe('updateSceneMetadata', () => {
  it('updates name while preserving other fields', () => {
    const original = makeMetadata({ name: 'Old Name' })
    const updated = updateSceneMetadata(original, { name: 'New Name' })
    expect(updated.name).toBe('New Name')
    expect(updated.id).toBe(original.id)
    expect(updated.version).toBe(original.version)
    expect(updated.createdAt).toBe(original.createdAt)
  })

  it('updates tags', () => {
    const original = makeMetadata({ tags: ['old'] })
    const updated = updateSceneMetadata(original, { tags: ['new', 'tags'] })
    expect(updated.tags).toEqual(['new', 'tags'])
  })

  it('updates thumbnailUrl', () => {
    const original = makeMetadata()
    const updated = updateSceneMetadata(original, { thumbnailUrl: 'data:image/png;base64,...' })
    expect(updated.thumbnailUrl).toBe('data:image/png;base64,...')
  })

  it('always sets updatedAt to current time', () => {
    const original = makeMetadata({ updatedAt: '2020-01-01T00:00:00.000Z' })
    const before = new Date().toISOString()
    const updated = updateSceneMetadata(original, { name: 'New' })
    expect(updated.updatedAt >= before).toBe(true)
    expect(updated.updatedAt).not.toBe(original.updatedAt)
  })

  it('returns a new object (immutable)', () => {
    const original = makeMetadata()
    const updated = updateSceneMetadata(original, { name: 'Changed' })
    expect(updated).not.toBe(original)
    expect(original.name).toBe('Test Scene') // unchanged
  })
})

// ── 4. searchScenes ─────────────────────────────────────────────────

describe('searchScenes', () => {
  const scenes: SavedSceneMetadata[] = [
    makeMetadata({ id: '1', name: 'Desert Town', tags: ['western', 'outdoor'] }),
    makeMetadata({ id: '2', name: 'Mountain Pass', tags: ['nature'] }),
    makeMetadata({ id: '3', name: 'Saloon Interior', tags: ['western', 'indoor'] }),
  ]

  it('returns all scenes when query is empty', () => {
    expect(searchScenes(scenes, '')).toEqual(scenes)
  })

  it('returns all scenes when query is whitespace', () => {
    expect(searchScenes(scenes, '   ')).toEqual(scenes)
  })

  it('matches scene names case-insensitively', () => {
    const result = searchScenes(scenes, 'DESERT')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Town')
  })

  it('matches partial names', () => {
    const result = searchScenes(scenes, 'ount')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Mountain Pass')
  })

  it('matches tags case-insensitively', () => {
    const result = searchScenes(scenes, 'WESTERN')
    expect(result).toHaveLength(2)
  })

  it('matches partial tags', () => {
    const result = searchScenes(scenes, 'west')
    expect(result).toHaveLength(2)
  })

  it('returns empty array when nothing matches', () => {
    expect(searchScenes(scenes, 'spaceship')).toEqual([])
  })

  it('trims the query before searching', () => {
    const result = searchScenes(scenes, '  desert  ')
    expect(result).toHaveLength(1)
  })
})

// ── 5. sortScenes ───────────────────────────────────────────────────

describe('sortScenes', () => {
  const scenes: SavedSceneMetadata[] = [
    makeMetadata({ id: '1', name: 'Bravo', updatedAt: '2026-01-03T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', fileSize: 3000 }),
    makeMetadata({ id: '2', name: 'Alpha', updatedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-03T00:00:00Z', fileSize: 1000 }),
    makeMetadata({ id: '3', name: 'Charlie', updatedAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-02T00:00:00Z', fileSize: 2000 }),
  ]

  it('sorts by name ascending', () => {
    const result = sortScenes(scenes, { field: 'name', direction: 'asc' })
    expect(result.map(s => s.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by name descending', () => {
    const result = sortScenes(scenes, { field: 'name', direction: 'desc' })
    expect(result.map(s => s.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts by updatedAt ascending', () => {
    const result = sortScenes(scenes, { field: 'updatedAt', direction: 'asc' })
    expect(result.map(s => s.id)).toEqual(['2', '3', '1'])
  })

  it('sorts by updatedAt descending', () => {
    const result = sortScenes(scenes, { field: 'updatedAt', direction: 'desc' })
    expect(result.map(s => s.id)).toEqual(['1', '3', '2'])
  })

  it('sorts by createdAt ascending', () => {
    const result = sortScenes(scenes, { field: 'createdAt', direction: 'asc' })
    expect(result.map(s => s.id)).toEqual(['1', '3', '2'])
  })

  it('sorts by createdAt descending', () => {
    const result = sortScenes(scenes, { field: 'createdAt', direction: 'desc' })
    expect(result.map(s => s.id)).toEqual(['2', '3', '1'])
  })

  it('sorts by fileSize ascending', () => {
    const result = sortScenes(scenes, { field: 'fileSize', direction: 'asc' })
    expect(result.map(s => s.fileSize)).toEqual([1000, 2000, 3000])
  })

  it('sorts by fileSize descending', () => {
    const result = sortScenes(scenes, { field: 'fileSize', direction: 'desc' })
    expect(result.map(s => s.fileSize)).toEqual([3000, 2000, 1000])
  })

  it('does not mutate the original array', () => {
    const original = [...scenes]
    sortScenes(scenes, { field: 'name', direction: 'asc' })
    expect(scenes).toEqual(original)
  })
})

// ── 6. filterScenes ─────────────────────────────────────────────────

describe('filterScenes', () => {
  const scenes: SavedSceneMetadata[] = [
    makeMetadata({ id: '1', name: 'Desert Town', tags: ['western', 'outdoor'], fileSize: 500 }),
    makeMetadata({ id: '2', name: 'Mountain Pass', tags: ['nature', 'outdoor'], fileSize: 1500 }),
    makeMetadata({ id: '3', name: 'Saloon Interior', tags: ['western', 'indoor'], fileSize: 1000 }),
  ]

  it('returns all scenes with empty filter', () => {
    expect(filterScenes(scenes, {})).toEqual(scenes)
  })

  it('applies search filter', () => {
    const result = filterScenes(scenes, { search: 'desert' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('applies tag filter (all tags must match)', () => {
    const result = filterScenes(scenes, { tags: ['western', 'outdoor'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('applies tag filter with single tag', () => {
    const result = filterScenes(scenes, { tags: ['outdoor'] })
    expect(result).toHaveLength(2)
  })

  it('tag filtering is case-insensitive', () => {
    const result = filterScenes(scenes, { tags: ['WESTERN'] })
    expect(result).toHaveLength(2)
  })

  it('applies sort after filtering', () => {
    const result = filterScenes(scenes, {
      tags: ['outdoor'],
      sortBy: { field: 'fileSize', direction: 'desc' },
    })
    expect(result.map(s => s.id)).toEqual(['2', '1'])
  })

  it('combines search + tags + sort', () => {
    const result = filterScenes(scenes, {
      search: 'outdoor',
      tags: ['western'],
      sortBy: { field: 'name', direction: 'asc' },
    })
    // search 'outdoor' matches tags of id 1 and 2; tags ['western'] keeps only id 1
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns empty array when no scenes match all criteria', () => {
    const result = filterScenes(scenes, { search: 'nonexistent' })
    expect(result).toEqual([])
  })
})

// ── 7. createDebouncedSave ──────────────────────────────────────────

describe('createDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call saveFn immediately on save()', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    expect(saveFn).not.toHaveBeenCalled()
  })

  it('calls saveFn after the interval elapses', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    vi.advanceTimersByTime(1000)
    expect(saveFn).toHaveBeenCalledOnce()
    expect(saveFn).toHaveBeenCalledWith('id-1', 'data-1')
  })

  it('debounces: only the last call within interval fires', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    save('id-2', 'data-2')
    save('id-3', 'data-3')
    vi.advanceTimersByTime(1000)
    expect(saveFn).toHaveBeenCalledOnce()
    expect(saveFn).toHaveBeenCalledWith('id-3', 'data-3')
  })

  it('cancel() prevents pending save from firing', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save, cancel } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    cancel()
    vi.advanceTimersByTime(2000)
    expect(saveFn).not.toHaveBeenCalled()
  })

  it('flush() triggers pending save immediately', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save, flush } = createDebouncedSave(saveFn, 5000)
    save('id-1', 'data-1')
    await flush()
    expect(saveFn).toHaveBeenCalledOnce()
    expect(saveFn).toHaveBeenCalledWith('id-1', 'data-1')
  })

  it('flush() is a no-op if nothing is pending', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { flush } = createDebouncedSave(saveFn, 1000)
    await flush()
    expect(saveFn).not.toHaveBeenCalled()
  })

  it('flush() clears the timer so double-flush does not double-call', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save, flush } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    await flush()
    await flush()
    expect(saveFn).toHaveBeenCalledOnce()
  })

  it('cancel() then save() schedules a new debounced save', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined)
    const { save, cancel } = createDebouncedSave(saveFn, 1000)
    save('id-1', 'data-1')
    cancel()
    save('id-2', 'data-2')
    vi.advanceTimersByTime(1000)
    expect(saveFn).toHaveBeenCalledOnce()
    expect(saveFn).toHaveBeenCalledWith('id-2', 'data-2')
  })
})

// ── 8. createVersionEntry ───────────────────────────────────────────

describe('createVersionEntry', () => {
  it('creates a version entry with sceneId and data', () => {
    const entry = createVersionEntry('scene-123', '{"objects":[]}')
    expect(entry.sceneId).toBe('scene-123')
    expect(entry.data).toBe('{"objects":[]}')
  })

  it('generates a unique ID', () => {
    const a = createVersionEntry('s1', 'd1')
    const b = createVersionEntry('s1', 'd2')
    expect(a.id).not.toBe(b.id)
  })

  it('sets timestamp to current ISO time', () => {
    const before = new Date().toISOString()
    const entry = createVersionEntry('s1', 'd1')
    const after = new Date().toISOString()
    expect(entry.timestamp >= before).toBe(true)
    expect(entry.timestamp <= after).toBe(true)
  })
})

// ── 9. pruneVersions ───────────────────────────────────────────────

describe('pruneVersions', () => {
  it('returns the same array if length <= maxVersions', () => {
    const versions = [
      createVersionEntry('s1', 'd1'),
      createVersionEntry('s1', 'd2'),
    ]
    const result = pruneVersions(versions, 5)
    expect(result).toBe(versions)
  })

  it('returns exactly the same array reference when not pruning', () => {
    const versions = [createVersionEntry('s1', 'd1')]
    expect(pruneVersions(versions, 1)).toBe(versions)
  })

  it('keeps the newest N versions when pruning', () => {
    const v1 = { id: 'v1', sceneId: 's1', timestamp: '2026-01-01T00:00:00Z', data: 'd1' }
    const v2 = { id: 'v2', sceneId: 's1', timestamp: '2026-01-02T00:00:00Z', data: 'd2' }
    const v3 = { id: 'v3', sceneId: 's1', timestamp: '2026-01-03T00:00:00Z', data: 'd3' }
    const v4 = { id: 'v4', sceneId: 's1', timestamp: '2026-01-04T00:00:00Z', data: 'd4' }

    const result = pruneVersions([v1, v2, v3, v4], 2)
    expect(result).toHaveLength(2)
    expect(result.map(v => v.id)).toEqual(['v4', 'v3'])
  })

  it('handles maxVersions = 1', () => {
    const v1 = { id: 'v1', sceneId: 's1', timestamp: '2026-01-01T00:00:00Z', data: 'd1' }
    const v2 = { id: 'v2', sceneId: 's1', timestamp: '2026-01-02T00:00:00Z', data: 'd2' }
    const result = pruneVersions([v1, v2], 1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('v2')
  })

  it('does not mutate the original array', () => {
    const v1 = { id: 'v1', sceneId: 's1', timestamp: '2026-01-01T00:00:00Z', data: 'd1' }
    const v2 = { id: 'v2', sceneId: 's1', timestamp: '2026-01-02T00:00:00Z', data: 'd2' }
    const v3 = { id: 'v3', sceneId: 's1', timestamp: '2026-01-03T00:00:00Z', data: 'd3' }
    const original = [v1, v2, v3]
    pruneVersions(original, 1)
    expect(original).toHaveLength(3)
  })
})

// ── 10. validateAutoSaveConfig ──────────────────────────────────────

describe('validateAutoSaveConfig', () => {
  it('returns no errors for valid config', () => {
    expect(validateAutoSaveConfig({ enabled: true, intervalMs: 30000, maxVersions: 10 })).toEqual([])
  })

  it('reports error when enabled is not boolean', () => {
    const errors = validateAutoSaveConfig({ enabled: 'yes' as unknown as boolean, intervalMs: 5000, maxVersions: 5 })
    expect(errors).toContain('enabled must be a boolean')
  })

  it('reports error when intervalMs < 1000', () => {
    const errors = validateAutoSaveConfig({ enabled: true, intervalMs: 500, maxVersions: 5 })
    expect(errors).toContain('intervalMs must be a number >= 1000')
  })

  it('reports error when intervalMs is not a number', () => {
    const errors = validateAutoSaveConfig({ enabled: true, intervalMs: 'fast' as unknown as number, maxVersions: 5 })
    expect(errors).toContain('intervalMs must be a number >= 1000')
  })

  it('reports error when maxVersions < 1', () => {
    const errors = validateAutoSaveConfig({ enabled: true, intervalMs: 5000, maxVersions: 0 })
    expect(errors).toContain('maxVersions must be a number >= 1')
  })

  it('reports error when maxVersions is not a number', () => {
    const errors = validateAutoSaveConfig({ enabled: true, intervalMs: 5000, maxVersions: 'ten' as unknown as number })
    expect(errors).toContain('maxVersions must be a number >= 1')
  })

  it('reports error when maxVersions is non-integer', () => {
    const errors = validateAutoSaveConfig({ enabled: true, intervalMs: 5000, maxVersions: 3.5 })
    expect(errors).toContain('maxVersions must be an integer')
  })

  it('can report multiple errors simultaneously', () => {
    const errors = validateAutoSaveConfig({
      enabled: 123 as unknown as boolean,
      intervalMs: 100,
      maxVersions: 0.5,
    })
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  it('accepts intervalMs exactly 1000', () => {
    expect(validateAutoSaveConfig({ enabled: true, intervalMs: 1000, maxVersions: 1 })).toEqual([])
  })

  it('accepts maxVersions exactly 1', () => {
    expect(validateAutoSaveConfig({ enabled: false, intervalMs: 2000, maxVersions: 1 })).toEqual([])
  })
})

// ── 11. validateSceneMetadata ───────────────────────────────────────

describe('validateSceneMetadata', () => {
  it('returns no errors for valid metadata', () => {
    const meta = makeMetadata()
    expect(validateSceneMetadata(meta)).toEqual([])
  })

  it('reports error for missing id', () => {
    const meta = makeMetadata({ id: '' })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('id is required and must be a string')
  })

  it('reports error for missing name', () => {
    const meta = makeMetadata({ name: '' })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('name is required and must be a string')
  })

  it('reports error for name exceeding 256 characters', () => {
    const meta = makeMetadata({ name: 'A'.repeat(257) })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('name must not exceed 256 characters')
  })

  it('accepts name of exactly 256 characters', () => {
    const meta = makeMetadata({ name: 'A'.repeat(256) })
    const errors = validateSceneMetadata(meta)
    expect(errors).not.toContain('name must not exceed 256 characters')
  })

  it('reports error for missing createdAt', () => {
    const meta = makeMetadata({ createdAt: '' })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('createdAt is required and must be an ISO 8601 string')
  })

  it('reports error for missing updatedAt', () => {
    const meta = makeMetadata({ updatedAt: '' })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('updatedAt is required and must be an ISO 8601 string')
  })

  it('reports error for version < 1', () => {
    const meta = makeMetadata({ version: 0 })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('version must be a number >= 1')
  })

  it('reports error for negative fileSize', () => {
    const meta = makeMetadata({ fileSize: -1 })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('fileSize must be a non-negative number')
  })

  it('accepts fileSize of 0', () => {
    const meta = makeMetadata({ fileSize: 0 })
    const errors = validateSceneMetadata(meta)
    expect(errors).not.toContain('fileSize must be a non-negative number')
  })

  it('reports error for negative objectCount', () => {
    const meta = makeMetadata({ objectCount: -1 })
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('objectCount must be a non-negative number')
  })

  it('reports error when tags is not an array', () => {
    const meta = { ...makeMetadata(), tags: 'notarray' as unknown as string[] }
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('tags must be an array')
  })

  it('reports error when tags contain non-strings', () => {
    const meta = { ...makeMetadata(), tags: ['valid', 42 as unknown as string] }
    const errors = validateSceneMetadata(meta)
    expect(errors).toContain('all tags must be strings')
  })

  it('can report multiple errors', () => {
    const meta = {
      id: '',
      name: '',
      createdAt: '',
      updatedAt: '',
      version: -1,
      fileSize: -1,
      objectCount: -1,
      tags: 'bad' as unknown as string[],
    } as unknown as SavedSceneMetadata
    const errors = validateSceneMetadata(meta)
    expect(errors.length).toBeGreaterThanOrEqual(7)
  })
})

// ── 12. estimateSceneSize ───────────────────────────────────────────

describe('estimateSceneSize', () => {
  it('returns correct byte length for ASCII string', () => {
    const data = 'hello world'
    expect(estimateSceneSize(data)).toBe(11)
  })

  it('returns 0 for empty string', () => {
    expect(estimateSceneSize('')).toBe(0)
  })

  it('handles multi-byte UTF-8 characters', () => {
    // "e" with accent is 2 bytes in UTF-8
    const data = '\u00e9'
    const size = estimateSceneSize(data)
    expect(size).toBe(2)
  })

  it('handles emoji (4-byte UTF-8)', () => {
    const data = '\ud83e\udd20' // cowboy hat face
    const size = estimateSceneSize(data)
    expect(size).toBe(4)
  })
})

// ── 13. formatStorageSize ───────────────────────────────────────────

describe('formatStorageSize', () => {
  it('formats 0 bytes', () => {
    expect(formatStorageSize(0)).toBe('0 B')
  })

  it('formats negative as 0 B', () => {
    expect(formatStorageSize(-100)).toBe('0 B')
  })

  it('formats small byte values', () => {
    expect(formatStorageSize(512)).toBe('512 B')
  })

  it('formats kilobytes with one decimal', () => {
    expect(formatStorageSize(1024)).toBe('1.0 KB')
  })

  it('formats megabytes with one decimal', () => {
    expect(formatStorageSize(1024 * 1024)).toBe('1.0 MB')
  })

  it('formats gigabytes with one decimal', () => {
    expect(formatStorageSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('formats fractional kilobytes', () => {
    expect(formatStorageSize(1536)).toBe('1.5 KB') // 1536 / 1024 = 1.5
  })

  it('formats 1 byte', () => {
    expect(formatStorageSize(1)).toBe('1 B')
  })
})

// ── 14. MAX_SCENE_SIZE constant ─────────────────────────────────────

describe('MAX_SCENE_SIZE', () => {
  it('equals 100 MB', () => {
    expect(MAX_SCENE_SIZE).toBe(100 * 1024 * 1024)
  })
})

// ── 15. InMemoryAdapter ─────────────────────────────────────────────

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter

  beforeEach(() => {
    adapter = new InMemoryAdapter()
  })

  describe('save and load', () => {
    it('saves and loads a scene', async () => {
      const meta = makeMetadata({ id: 'scene-1' })
      await adapter.save('scene-1', '{"data":true}', meta)
      const result = await adapter.load('scene-1')
      expect(result).not.toBeNull()
      expect(result!.data).toBe('{"data":true}')
      expect(result!.metadata).toEqual(meta)
    })

    it('overwrites an existing scene on re-save', async () => {
      const meta1 = makeMetadata({ id: 'scene-1', name: 'V1' })
      const meta2 = makeMetadata({ id: 'scene-1', name: 'V2' })
      await adapter.save('scene-1', 'data-v1', meta1)
      await adapter.save('scene-1', 'data-v2', meta2)
      const result = await adapter.load('scene-1')
      expect(result!.data).toBe('data-v2')
      expect(result!.metadata.name).toBe('V2')
    })

    it('returns null for non-existent scene', async () => {
      const result = await adapter.load('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('deletes an existing scene', async () => {
      const meta = makeMetadata({ id: 'scene-1' })
      await adapter.save('scene-1', 'data', meta)
      await adapter.delete('scene-1')
      const result = await adapter.load('scene-1')
      expect(result).toBeNull()
    })

    it('does nothing when deleting a non-existent scene', async () => {
      // Should not throw
      await adapter.delete('nonexistent')
    })
  })

  describe('list', () => {
    it('returns all metadata when no filter', async () => {
      const meta1 = makeMetadata({ id: '1', name: 'Scene A' })
      const meta2 = makeMetadata({ id: '2', name: 'Scene B' })
      await adapter.save('1', 'd1', meta1)
      await adapter.save('2', 'd2', meta2)
      const list = await adapter.list()
      expect(list).toHaveLength(2)
    })

    it('returns empty array when store is empty', async () => {
      const list = await adapter.list()
      expect(list).toEqual([])
    })

    it('applies search filter', async () => {
      const meta1 = makeMetadata({ id: '1', name: 'Desert Scene' })
      const meta2 = makeMetadata({ id: '2', name: 'Forest Scene' })
      await adapter.save('1', 'd1', meta1)
      await adapter.save('2', 'd2', meta2)
      const list = await adapter.list({ search: 'desert' })
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('Desert Scene')
    })

    it('applies sort filter', async () => {
      const meta1 = makeMetadata({ id: '1', name: 'Bravo', fileSize: 2000 })
      const meta2 = makeMetadata({ id: '2', name: 'Alpha', fileSize: 1000 })
      await adapter.save('1', 'd1', meta1)
      await adapter.save('2', 'd2', meta2)
      const list = await adapter.list({ sortBy: { field: 'name', direction: 'asc' } })
      expect(list[0].name).toBe('Alpha')
      expect(list[1].name).toBe('Bravo')
    })
  })

  describe('exists', () => {
    it('returns true for existing scene', async () => {
      const meta = makeMetadata({ id: 'scene-1' })
      await adapter.save('scene-1', 'data', meta)
      expect(await adapter.exists('scene-1')).toBe(true)
    })

    it('returns false for non-existent scene', async () => {
      expect(await adapter.exists('nonexistent')).toBe(false)
    })
  })

  describe('getMetadata', () => {
    it('returns metadata for existing scene', async () => {
      const meta = makeMetadata({ id: 'scene-1', name: 'Test' })
      await adapter.save('scene-1', 'data', meta)
      const result = await adapter.getMetadata('scene-1')
      expect(result).toEqual(meta)
    })

    it('returns null for non-existent scene', async () => {
      expect(await adapter.getMetadata('nonexistent')).toBeNull()
    })
  })

  describe('clear', () => {
    it('removes all stored scenes', async () => {
      const meta1 = makeMetadata({ id: '1' })
      const meta2 = makeMetadata({ id: '2' })
      await adapter.save('1', 'd1', meta1)
      await adapter.save('2', 'd2', meta2)
      await adapter.clear()
      const list = await adapter.list()
      expect(list).toEqual([])
    })

    it('is idempotent on empty store', async () => {
      await adapter.clear()
      expect(await adapter.list()).toEqual([])
    })
  })
})
