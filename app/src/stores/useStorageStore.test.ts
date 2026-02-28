import { describe, it, expect, beforeEach } from 'vitest'
import { createStorageStore } from './useStorageStore'
import type { StoreApi } from 'zustand'
import type { StorageStoreState } from './useStorageStore'
import type { SavedSceneMetadata } from '../types/storage'

// ── Helpers ──────────────────────────────────────────────────────────

let store: StoreApi<StorageStoreState>
const get = () => store.getState()

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
  }
}

beforeEach(() => {
  store = createStorageStore()
})

// ── 1. Initial State ────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with empty scenes array', () => {
    expect(get().scenes).toEqual([])
  })

  it('starts with null activeSceneId', () => {
    expect(get().activeSceneId).toBeNull()
  })

  it('starts with empty filter', () => {
    expect(get().filter).toEqual({})
  })

  it('starts with default autoSave config', () => {
    expect(get().autoSave).toEqual({
      enabled: true,
      intervalMs: 30000,
      maxVersions: 10,
    })
  })

  it('starts with saveStatus "saved"', () => {
    expect(get().saveStatus).toBe('saved')
  })

  it('starts with null lastSavedAt', () => {
    expect(get().lastSavedAt).toBeNull()
  })
})

// ── 2. setScenes ────────────────────────────────────────────────────

describe('setScenes', () => {
  it('sets the scenes array', () => {
    const scenes = [makeMetadata({ id: '1' }), makeMetadata({ id: '2' })]
    get().setScenes(scenes)
    expect(get().scenes).toHaveLength(2)
    expect(get().scenes[0].id).toBe('1')
    expect(get().scenes[1].id).toBe('2')
  })

  it('replaces existing scenes', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    get().setScenes([makeMetadata({ id: '2' }), makeMetadata({ id: '3' })])
    expect(get().scenes).toHaveLength(2)
    expect(get().scenes[0].id).toBe('2')
  })

  it('creates a shallow copy of the input array', () => {
    const scenes = [makeMetadata({ id: '1' })]
    get().setScenes(scenes)
    // Modifying original should not affect store
    scenes.push(makeMetadata({ id: '2' }))
    expect(get().scenes).toHaveLength(1)
  })

  it('can set to empty array', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    get().setScenes([])
    expect(get().scenes).toEqual([])
  })
})

// ── 3. addScene ─────────────────────────────────────────────────────

describe('addScene', () => {
  it('appends a scene to the list', () => {
    get().addScene(makeMetadata({ id: '1', name: 'First' }))
    expect(get().scenes).toHaveLength(1)
    expect(get().scenes[0].name).toBe('First')
  })

  it('appends to existing scenes', () => {
    get().addScene(makeMetadata({ id: '1' }))
    get().addScene(makeMetadata({ id: '2' }))
    expect(get().scenes).toHaveLength(2)
    expect(get().scenes[1].id).toBe('2')
  })

  it('does not remove existing scenes', () => {
    get().addScene(makeMetadata({ id: '1', name: 'First' }))
    get().addScene(makeMetadata({ id: '2', name: 'Second' }))
    expect(get().scenes[0].name).toBe('First')
  })
})

// ── 4. removeScene ──────────────────────────────────────────────────

describe('removeScene', () => {
  it('removes a scene by id', () => {
    get().setScenes([
      makeMetadata({ id: '1' }),
      makeMetadata({ id: '2' }),
      makeMetadata({ id: '3' }),
    ])
    get().removeScene('2')
    expect(get().scenes).toHaveLength(2)
    expect(get().scenes.map(s => s.id)).toEqual(['1', '3'])
  })

  it('clears activeSceneId if the removed scene was active', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    get().setActiveScene('1')
    get().removeScene('1')
    expect(get().activeSceneId).toBeNull()
  })

  it('preserves activeSceneId if a different scene is removed', () => {
    get().setScenes([makeMetadata({ id: '1' }), makeMetadata({ id: '2' })])
    get().setActiveScene('1')
    get().removeScene('2')
    expect(get().activeSceneId).toBe('1')
  })

  it('is a no-op for non-existent id', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    get().removeScene('nonexistent')
    expect(get().scenes).toHaveLength(1)
  })
})

// ── 5. updateSceneMetadata ──────────────────────────────────────────

describe('updateSceneMetadata', () => {
  it('updates name of a scene', () => {
    get().setScenes([makeMetadata({ id: '1', name: 'Old' })])
    get().updateSceneMetadata('1', { name: 'New' })
    expect(get().scenes[0].name).toBe('New')
  })

  it('updates tags of a scene', () => {
    get().setScenes([makeMetadata({ id: '1', tags: [] })])
    get().updateSceneMetadata('1', { tags: ['western', 'demo'] })
    expect(get().scenes[0].tags).toEqual(['western', 'demo'])
  })

  it('preserves the scene id even if updates try to override it', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    get().updateSceneMetadata('1', { id: 'hacked' } as Partial<SavedSceneMetadata>)
    expect(get().scenes[0].id).toBe('1')
  })

  it('does not modify other scenes', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'First' }),
      makeMetadata({ id: '2', name: 'Second' }),
    ])
    get().updateSceneMetadata('1', { name: 'Updated First' })
    expect(get().scenes[1].name).toBe('Second')
  })

  it('is a no-op for non-existent id', () => {
    get().setScenes([makeMetadata({ id: '1', name: 'Original' })])
    get().updateSceneMetadata('nonexistent', { name: 'Changed' })
    expect(get().scenes[0].name).toBe('Original')
  })
})

// ── 6. setActiveScene ───────────────────────────────────────────────

describe('setActiveScene', () => {
  it('sets the active scene id', () => {
    get().setActiveScene('scene-42')
    expect(get().activeSceneId).toBe('scene-42')
  })

  it('can set to null to deselect', () => {
    get().setActiveScene('scene-42')
    get().setActiveScene(null)
    expect(get().activeSceneId).toBeNull()
  })

  it('can change from one scene to another', () => {
    get().setActiveScene('scene-1')
    get().setActiveScene('scene-2')
    expect(get().activeSceneId).toBe('scene-2')
  })
})

// ── 7. setFilter ────────────────────────────────────────────────────

describe('setFilter', () => {
  it('sets the search field', () => {
    get().setFilter({ search: 'desert' })
    expect(get().filter.search).toBe('desert')
  })

  it('sets tags filter', () => {
    get().setFilter({ tags: ['western'] })
    expect(get().filter.tags).toEqual(['western'])
  })

  it('sets sortBy', () => {
    get().setFilter({ sortBy: { field: 'name', direction: 'asc' } })
    expect(get().filter.sortBy).toEqual({ field: 'name', direction: 'asc' })
  })

  it('merges with existing filter (partial update)', () => {
    get().setFilter({ search: 'desert' })
    get().setFilter({ tags: ['outdoor'] })
    expect(get().filter.search).toBe('desert')
    expect(get().filter.tags).toEqual(['outdoor'])
  })

  it('can override a previously set field', () => {
    get().setFilter({ search: 'desert' })
    get().setFilter({ search: 'forest' })
    expect(get().filter.search).toBe('forest')
  })
})

// ── 8. clearFilter ──────────────────────────────────────────────────

describe('clearFilter', () => {
  it('resets filter to default empty object', () => {
    get().setFilter({ search: 'test', tags: ['a'], sortBy: { field: 'name', direction: 'asc' } })
    get().clearFilter()
    expect(get().filter).toEqual({})
  })

  it('is idempotent on already cleared filter', () => {
    get().clearFilter()
    get().clearFilter()
    expect(get().filter).toEqual({})
  })
})

// ── 9. setAutoSave ──────────────────────────────────────────────────

describe('setAutoSave', () => {
  it('updates enabled flag', () => {
    get().setAutoSave({ enabled: false })
    expect(get().autoSave.enabled).toBe(false)
  })

  it('updates intervalMs', () => {
    get().setAutoSave({ intervalMs: 60000 })
    expect(get().autoSave.intervalMs).toBe(60000)
  })

  it('updates maxVersions', () => {
    get().setAutoSave({ maxVersions: 20 })
    expect(get().autoSave.maxVersions).toBe(20)
  })

  it('merges with existing config (partial update)', () => {
    get().setAutoSave({ enabled: false })
    get().setAutoSave({ intervalMs: 5000 })
    expect(get().autoSave.enabled).toBe(false)
    expect(get().autoSave.intervalMs).toBe(5000)
    expect(get().autoSave.maxVersions).toBe(10) // unchanged default
  })
})

// ── 10. setSaveStatus ───────────────────────────────────────────────

describe('setSaveStatus', () => {
  it('sets to "saving"', () => {
    get().setSaveStatus('saving')
    expect(get().saveStatus).toBe('saving')
  })

  it('sets to "unsaved"', () => {
    get().setSaveStatus('unsaved')
    expect(get().saveStatus).toBe('unsaved')
  })

  it('sets to "error"', () => {
    get().setSaveStatus('error')
    expect(get().saveStatus).toBe('error')
  })

  it('sets back to "saved"', () => {
    get().setSaveStatus('error')
    get().setSaveStatus('saved')
    expect(get().saveStatus).toBe('saved')
  })
})

// ── 11. setLastSavedAt ──────────────────────────────────────────────

describe('setLastSavedAt', () => {
  it('sets a timestamp', () => {
    const ts = '2026-02-27T12:00:00.000Z'
    get().setLastSavedAt(ts)
    expect(get().lastSavedAt).toBe(ts)
  })

  it('can reset to null', () => {
    get().setLastSavedAt('2026-01-01T00:00:00Z')
    get().setLastSavedAt(null)
    expect(get().lastSavedAt).toBeNull()
  })
})

// ── 12. clearAll ────────────────────────────────────────────────────

describe('clearAll', () => {
  it('resets all state to defaults', () => {
    // Set up non-default state
    get().setScenes([makeMetadata({ id: '1' })])
    get().setActiveScene('1')
    get().setFilter({ search: 'test' })
    get().setAutoSave({ enabled: false, intervalMs: 60000, maxVersions: 5 })
    get().setSaveStatus('error')
    get().setLastSavedAt('2026-01-01T00:00:00Z')

    get().clearAll()

    expect(get().scenes).toEqual([])
    expect(get().activeSceneId).toBeNull()
    expect(get().filter).toEqual({})
    expect(get().autoSave).toEqual({
      enabled: true,
      intervalMs: 30000,
      maxVersions: 10,
    })
    expect(get().saveStatus).toBe('saved')
    expect(get().lastSavedAt).toBeNull()
  })

  it('is idempotent', () => {
    get().clearAll()
    get().clearAll()
    expect(get().scenes).toEqual([])
    expect(get().saveStatus).toBe('saved')
  })
})

// ── 13. getScene ────────────────────────────────────────────────────

describe('getScene', () => {
  it('returns a scene by id', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'First' }),
      makeMetadata({ id: '2', name: 'Second' }),
    ])
    const scene = get().getScene('2')
    expect(scene).toBeDefined()
    expect(scene!.name).toBe('Second')
  })

  it('returns undefined for non-existent id', () => {
    get().setScenes([makeMetadata({ id: '1' })])
    expect(get().getScene('nonexistent')).toBeUndefined()
  })

  it('returns undefined when scenes are empty', () => {
    expect(get().getScene('any')).toBeUndefined()
  })
})

// ── 14. getFilteredScenes ───────────────────────────────────────────

describe('getFilteredScenes', () => {
  it('returns all scenes when filter is empty', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Alpha' }),
      makeMetadata({ id: '2', name: 'Bravo' }),
    ])
    const result = get().getFilteredScenes()
    expect(result).toHaveLength(2)
  })

  it('filters by search query (name match)', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Desert Town' }),
      makeMetadata({ id: '2', name: 'Mountain Pass' }),
    ])
    get().setFilter({ search: 'desert' })
    const result = get().getFilteredScenes()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Desert Town')
  })

  it('filters by search query (tag match)', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Scene A', tags: ['western'] }),
      makeMetadata({ id: '2', name: 'Scene B', tags: ['nature'] }),
    ])
    get().setFilter({ search: 'western' })
    const result = get().getFilteredScenes()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('filters by tags (all must match)', () => {
    get().setScenes([
      makeMetadata({ id: '1', tags: ['western', 'outdoor'] }),
      makeMetadata({ id: '2', tags: ['western', 'indoor'] }),
      makeMetadata({ id: '3', tags: ['nature'] }),
    ])
    get().setFilter({ tags: ['western', 'outdoor'] })
    const result = get().getFilteredScenes()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('sorts results by specified field', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Charlie' }),
      makeMetadata({ id: '2', name: 'Alpha' }),
      makeMetadata({ id: '3', name: 'Bravo' }),
    ])
    get().setFilter({ sortBy: { field: 'name', direction: 'asc' } })
    const result = get().getFilteredScenes()
    expect(result.map(s => s.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts descending', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Alpha', fileSize: 100 }),
      makeMetadata({ id: '2', name: 'Bravo', fileSize: 300 }),
      makeMetadata({ id: '3', name: 'Charlie', fileSize: 200 }),
    ])
    get().setFilter({ sortBy: { field: 'fileSize', direction: 'desc' } })
    const result = get().getFilteredScenes()
    expect(result.map(s => s.fileSize)).toEqual([300, 200, 100])
  })

  it('combines search and sort', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Desert Alpha', tags: ['outdoor'] }),
      makeMetadata({ id: '2', name: 'Forest Bravo', tags: ['outdoor'] }),
      makeMetadata({ id: '3', name: 'Desert Charlie', tags: ['indoor'] }),
    ])
    get().setFilter({ search: 'desert', sortBy: { field: 'name', direction: 'desc' } })
    const result = get().getFilteredScenes()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Desert Charlie')
    expect(result[1].name).toBe('Desert Alpha')
  })

  it('returns empty array when no scenes match', () => {
    get().setScenes([makeMetadata({ id: '1', name: 'Desert' })])
    get().setFilter({ search: 'nonexistent' })
    expect(get().getFilteredScenes()).toEqual([])
  })

  it('returns empty array when scenes are empty', () => {
    get().setFilter({ search: 'something' })
    expect(get().getFilteredScenes()).toEqual([])
  })
})

// ── 15. Workflow Scenarios ──────────────────────────────────────────

describe('workflow scenarios', () => {
  it('add scenes, set active, remove active, verify cleared', () => {
    const s1 = makeMetadata({ id: '1', name: 'Scene One' })
    const s2 = makeMetadata({ id: '2', name: 'Scene Two' })
    get().addScene(s1)
    get().addScene(s2)
    get().setActiveScene('1')
    expect(get().activeSceneId).toBe('1')

    get().removeScene('1')
    expect(get().activeSceneId).toBeNull()
    expect(get().scenes).toHaveLength(1)
    expect(get().scenes[0].id).toBe('2')
  })

  it('update metadata then retrieve via getScene', () => {
    get().addScene(makeMetadata({ id: '1', name: 'Original', tags: [] }))
    get().updateSceneMetadata('1', { name: 'Updated', tags: ['new-tag'] })
    const scene = get().getScene('1')
    expect(scene!.name).toBe('Updated')
    expect(scene!.tags).toEqual(['new-tag'])
  })

  it('setFilter then clearFilter restores full list in getFilteredScenes', () => {
    get().setScenes([
      makeMetadata({ id: '1', name: 'Alpha' }),
      makeMetadata({ id: '2', name: 'Bravo' }),
    ])
    get().setFilter({ search: 'alpha' })
    expect(get().getFilteredScenes()).toHaveLength(1)

    get().clearFilter()
    expect(get().getFilteredScenes()).toHaveLength(2)
  })

  it('save status lifecycle: saved -> unsaved -> saving -> saved', () => {
    expect(get().saveStatus).toBe('saved')
    get().setSaveStatus('unsaved')
    expect(get().saveStatus).toBe('unsaved')
    get().setSaveStatus('saving')
    expect(get().saveStatus).toBe('saving')
    get().setSaveStatus('saved')
    expect(get().saveStatus).toBe('saved')
    get().setLastSavedAt(new Date().toISOString())
    expect(get().lastSavedAt).not.toBeNull()
  })
})
