import { create } from 'zustand'
import type { SceneState, ObjectType, SceneObject, HistoryEntry } from '../types/scene'
import {
  createSceneObject,
  createModelObject,
  duplicateSceneObject,
  createDefaultEnvironment,
  removeWithDescendants,
  getChildren as getCoreChildren,
  wouldCreateCycle,
} from '../core/sceneOperations'
import { createSceneData } from '../core/serialization'
import type { SceneData } from '../types/scene'
import { usePostProcessingStore } from './usePostProcessingStore'
import { useAnimationStore } from './useAnimationStore'
import { useCameraStore } from './useCameraStore'

const MAX_HISTORY = 50

// ── History helpers ───────────────────────────────────────────────────

function snapshot(state: {
  objects: SceneObject[]
  selectedId: string | null
  selectedIds: string[]
}): HistoryEntry {
  return {
    objects: structuredClone(state.objects),
    selectedId: state.selectedId,
    selectedIds: [...state.selectedIds],
  }
}

function pushHistory(
  history: HistoryEntry[],
  historyIndex: number,
  entry: HistoryEntry,
): { history: HistoryEntry[]; historyIndex: number } {
  // Discard any redo states after current index
  const newHistory = history.slice(0, historyIndex + 1)
  newHistory.push(entry)
  // Cap history size
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift()
    return { history: newHistory, historyIndex: newHistory.length - 1 }
  }
  return { history: newHistory, historyIndex: newHistory.length - 1 }
}

// ── Store ─────────────────────────────────────────────────────────────

export const useSceneStore = create<SceneState>((set, get) => {
  const initialEntry: HistoryEntry = { objects: [], selectedId: null, selectedIds: [] }

  return {
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    environment: createDefaultEnvironment(),
    snapEnabled: false,
    snapValue: 0.5,
    history: [initialEntry],
    historyIndex: 0,

    // ── Object actions ──────────────────────────────────────────────

    addObject: (type: ObjectType) => {
      const state = get()
      const obj = createSceneObject(type, state.objects)
      const newObjects = [...state.objects, obj]
      const newSelectedId = obj.id
      const newSelectedIds = [obj.id]
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: newSelectedId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: newSelectedId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },

    addModelObject: (name: string, gltfUrl: string, modelFormat?: SceneObject['modelFormat']) => {
      const state = get()
      const obj = createModelObject(name, gltfUrl, state.objects, modelFormat)
      const newObjects = [...state.objects, obj]
      const newSelectedId = obj.id
      const newSelectedIds = [obj.id]
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: newSelectedId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: newSelectedId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },

    removeObject: (id: string) => {
      const state = get()
      // Remove object and its descendants (hierarchy support)
      const newObjects = removeWithDescendants(state.objects, id)
      const removedIds = new Set(state.objects.filter(o => !newObjects.includes(o)).map(o => o.id))
      const newSelectedId = removedIds.has(state.selectedId ?? '') ? null : state.selectedId
      const newSelectedIds = state.selectedIds.filter(sid => !removedIds.has(sid))
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: newSelectedId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: newSelectedId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },

    selectObject: (id: string | null) => {
      set({
        selectedId: id,
        selectedIds: id ? [id] : [],
      })
    },

    toggleSelectObject: (id: string) => {
      const state = get()
      const isAlreadySelected = state.selectedIds.includes(id)

      if (isAlreadySelected) {
        const newIds = state.selectedIds.filter(sid => sid !== id)
        set({
          selectedId: newIds.length > 0 ? newIds[newIds.length - 1] : null,
          selectedIds: newIds,
        })
      } else {
        set({
          selectedId: id,
          selectedIds: [...state.selectedIds, id],
        })
      }
    },

    selectRange: (fromId: string, toId: string) => {
      const state = get()
      const fromIdx = state.objects.findIndex(o => o.id === fromId)
      const toIdx = state.objects.findIndex(o => o.id === toId)
      if (fromIdx === -1 || toIdx === -1) return

      const start = Math.min(fromIdx, toIdx)
      const end = Math.max(fromIdx, toIdx)
      const rangeIds = state.objects.slice(start, end + 1).map(o => o.id)

      set({
        selectedId: toId,
        selectedIds: rangeIds,
      })
    },

    selectAll: () => {
      const state = get()
      const allIds = state.objects.map(o => o.id)
      set({
        selectedId: allIds.length > 0 ? allIds[allIds.length - 1] : null,
        selectedIds: allIds,
      })
    },

    deselectAll: () => {
      set({
        selectedId: null,
        selectedIds: [],
      })
    },

    updateObject: (id: string, updates: Partial<SceneObject>) => {
      const state = get()
      const newObjects = state.objects.map(o =>
        o.id === id ? { ...o, ...updates } : o
      )
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: state.selectedId, selectedIds: state.selectedIds,
      }))

      set({
        objects: newObjects,
        ...hist,
      })
    },

    setToolMode: (mode) => {
      set({ toolMode: mode })
    },

    duplicateObject: (id: string) => {
      const state = get()
      const obj = state.objects.find(o => o.id === id)
      if (!obj) return

      const copy = duplicateSceneObject(obj)
      const newObjects = [...state.objects, copy]
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: copy.id, selectedIds: [copy.id],
      }))

      set({
        objects: newObjects,
        selectedId: copy.id,
        selectedIds: [copy.id],
        ...hist,
      })
    },

    // ── Multi-select batch operations ────────────────────────────────

    removeSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return

      const idsToRemove = new Set<string>()
      for (const id of state.selectedIds) {
        idsToRemove.add(id)
        // Also remove descendants
        const desc = state.objects.filter(o => {
          let current = o
          const visited = new Set<string>()
          while (current.parentId) {
            if (visited.has(current.id)) break // cycle detected
            visited.add(current.id)
            if (state.selectedIds.includes(current.parentId) || idsToRemove.has(current.parentId)) return true
            const parent = state.objects.find(p => p.id === current.parentId)
            if (!parent) break
            current = parent
          }
          return false
        })
        for (const d of desc) idsToRemove.add(d.id)
      }

      const newObjects = state.objects.filter(o => !idsToRemove.has(o.id))
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: null, selectedIds: [],
      }))

      set({
        objects: newObjects,
        selectedId: null,
        selectedIds: [],
        ...hist,
      })
    },

    duplicateSelected: () => {
      const state = get()
      if (state.selectedIds.length === 0) return

      const copies: SceneObject[] = []
      for (const id of state.selectedIds) {
        const obj = state.objects.find(o => o.id === id)
        if (obj) {
          copies.push(duplicateSceneObject(obj))
        }
      }

      const newObjects = [...state.objects, ...copies]
      const newSelectedIds = copies.map(c => c.id)
      const newSelectedId = newSelectedIds[newSelectedIds.length - 1] ?? null
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: newSelectedId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: newSelectedId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },

    // ── Hierarchy ────────────────────────────────────────────────────

    setParent: (childId: string, parentId: string | undefined) => {
      const state = get()
      if (wouldCreateCycle(state.objects, childId, parentId)) return

      const newObjects = state.objects.map(o =>
        o.id === childId ? { ...o, parentId } : o,
      )
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: state.selectedId, selectedIds: state.selectedIds,
      }))

      set({
        objects: newObjects,
        ...hist,
      })
    },

    getChildren: (parentId: string) => {
      return getCoreChildren(get().objects, parentId)
    },

    // ── Clipboard ────────────────────────────────────────────────────

    copySelected: () => {
      const state = get()
      const selected = state.objects.filter(o => state.selectedIds.includes(o.id))
      set({ clipboard: structuredClone(selected) })
    },

    pasteClipboard: () => {
      const state = get()
      if (state.clipboard.length === 0) return

      const copies: SceneObject[] = state.clipboard.map(obj =>
        duplicateSceneObject(obj, { x: 1, y: 0, z: 0 })
      )

      const newObjects = [...state.objects, ...copies]
      const newSelectedIds = copies.map(c => c.id)
      const newSelectedId = newSelectedIds[newSelectedIds.length - 1] ?? null
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: newSelectedId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: newSelectedId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },

    // ── Undo / Redo ─────────────────────────────────────────────────

    undo: () => {
      const { history, historyIndex } = get()
      if (historyIndex <= 0) return

      const prevIndex = historyIndex - 1
      const entry = history[prevIndex]
      set({
        objects: structuredClone(entry.objects),
        selectedId: entry.selectedId,
        selectedIds: entry.selectedIds ? [...entry.selectedIds] : (entry.selectedId ? [entry.selectedId] : []),
        historyIndex: prevIndex,
      })
    },

    redo: () => {
      const { history, historyIndex } = get()
      if (historyIndex >= history.length - 1) return

      const nextIndex = historyIndex + 1
      const entry = history[nextIndex]
      set({
        objects: structuredClone(entry.objects),
        selectedId: entry.selectedId,
        selectedIds: entry.selectedIds ? [...entry.selectedIds] : (entry.selectedId ? [entry.selectedId] : []),
        historyIndex: nextIndex,
      })
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const { history, historyIndex } = get()
      return historyIndex < history.length - 1
    },

    // ── Environment ─────────────────────────────────────────────────

    updateEnvironment: (updates) => {
      set(state => ({
        environment: { ...state.environment, ...updates },
      }))
    },

    // ── Snap ──────────────────────────────────────────────────────────

    setSnapEnabled: (enabled: boolean) => {
      set({ snapEnabled: enabled })
    },

    setSnapValue: (value: number) => {
      set({ snapValue: value })
    },

    // ── Serialization ───────────────────────────────────────────────

    saveScene: (name?: string) => {
      const state = get()
      const ppSettings = usePostProcessingStore.getState().getSettings()
      const animState = useAnimationStore.getState()
      const cameraState = useCameraStore.getState()

      return createSceneData(
        state.objects,
        state.environment,
        name ?? 'Untitled Scene',
        undefined,
        ppSettings,
        animState.tracks,
        animState.duration,
        cameraState.shots,
      )
    },

    loadScene: (data: SceneData) => {
      const newEntry = snapshot({ objects: data.objects, selectedId: null, selectedIds: [] })
      set({
        objects: data.objects,
        selectedId: null,
        selectedIds: [],
        environment: data.environment,
        history: [newEntry],
        historyIndex: 0,
      })

      // Load or reset post-processing settings
      if (data.postProcessing) {
        usePostProcessingStore.getState().loadSettings(data.postProcessing)
      } else {
        usePostProcessingStore.getState().resetDefaults()
      }

      // Load or reset animation tracks
      if (data.animationTracks) {
        useAnimationStore.getState().loadTracks(data.animationTracks, data.animationDuration)
      } else {
        useAnimationStore.getState().clearAll()
      }

      // Load or reset camera shots
      if (data.shots && data.shots.length > 0) {
        useCameraStore.getState().loadShots(data.shots)
      } else {
        useCameraStore.getState().clearShots()
      }
    },

    clearScene: () => {
      const newEntry: HistoryEntry = { objects: [], selectedId: null, selectedIds: [] }
      set({
        objects: [],
        selectedId: null,
        selectedIds: [],
        clipboard: [],
        environment: createDefaultEnvironment(),
        history: [newEntry],
        historyIndex: 0,
      })

      // Reset external stores to clean state
      usePostProcessingStore.getState().resetDefaults()
      useAnimationStore.getState().clearAll()
      useCameraStore.getState().clearShots()
    },

    loadObjects: (objects: SceneObject[]) => {
      const state = get()
      const newObjects = [...state.objects, ...objects]
      const firstId = objects.length > 0 ? objects[0].id : state.selectedId
      const newSelectedIds = objects.map(o => o.id)
      const hist = pushHistory(state.history, state.historyIndex, snapshot({
        objects: newObjects, selectedId: firstId, selectedIds: newSelectedIds,
      }))

      set({
        objects: newObjects,
        selectedId: firstId,
        selectedIds: newSelectedIds,
        ...hist,
      })
    },
  }
})
