import { useState, useEffect, useRef, useCallback } from 'react'
import { useStorageStore } from '../stores/useStorageStore'
import { useSceneStore } from '../stores/useSceneStore'
import type { SceneSortField, SortDirection } from '../types/storage'

interface CloudSaveModalProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'save' | 'load'

const SORT_OPTIONS: { field: SceneSortField; label: string }[] = [
  { field: 'updatedAt', label: 'Last Modified' },
  { field: 'name', label: 'Name' },
  { field: 'createdAt', label: 'Date Created' },
  { field: 'fileSize', label: 'File Size' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function CloudSaveModal({ isOpen, onClose }: CloudSaveModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('save')
  const [sceneName, setSceneName] = useState('Untitled Scene')
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const scenes = useStorageStore(s => s.scenes)
  const filter = useStorageStore(s => s.filter)
  const setFilter = useStorageStore(s => s.setFilter)
  const clearFilter = useStorageStore(s => s.clearFilter)
  const getFilteredScenes = useStorageStore(s => s.getFilteredScenes)
  const removeScene = useStorageStore(s => s.removeScene)
  const addScene = useStorageStore(s => s.addScene)
  const setSaveStatus = useStorageStore(s => s.setSaveStatus)
  const setLastSavedAt = useStorageStore(s => s.setLastSavedAt)

  const objects = useSceneStore(s => s.objects)
  const saveScene = useSceneStore(s => s.saveScene)

  const filteredScenes = getFilteredScenes()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('save')
      setTags('')
      setSelectedSceneId(null)
      clearFilter()
    }
  }, [isOpen, clearFilter])

  // Auto-focus close button on mount
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilter({ search: e.target.value || undefined })
    },
    [setFilter],
  )

  const handleSortChange = useCallback(
    (field: SceneSortField) => {
      setFilter({ sortBy: { field, direction: sortDirection } })
    },
    [setFilter, sortDirection],
  )

  const toggleSortDirection = useCallback(() => {
    const newDir: SortDirection = sortDirection === 'desc' ? 'asc' : 'desc'
    setSortDirection(newDir)
    if (filter.sortBy) {
      setFilter({ sortBy: { ...filter.sortBy, direction: newDir } })
    }
  }, [sortDirection, filter.sortBy, setFilter])

  const handleSave = useCallback(() => {
    const trimmedName = sceneName.trim() || 'Untitled Scene'
    const sceneData = saveScene(trimmedName)
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    const now = new Date().toISOString()
    const id = `scene_${Date.now()}`

    addScene({
      id,
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
      version: sceneData.metadata.version,
      fileSize: JSON.stringify(sceneData).length,
      objectCount: objects.length,
      tags: tagList,
    })

    setSaveStatus('saved')
    setLastSavedAt(now)
    onClose()
  }, [sceneName, tags, saveScene, addScene, objects.length, setSaveStatus, setLastSavedAt, onClose])

  const handleDelete = useCallback((sceneId: string) => {
    removeScene(sceneId)
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null)
    }
  }, [removeScene, selectedSceneId])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scene Storage"
        className="relative w-full max-w-lg mx-4 bg-dust-800 border border-dust-600/40 rounded-lg"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 1px rgba(255,102,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-dust-700/50">
          <h2 className="text-[14px] font-semibold text-sand-100 flex items-center gap-2 tracking-wide">
            <span className="text-rust-400" aria-hidden="true">&#x2601;</span>
            Scene Storage
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-dust-400 hover:text-sand-200 hover:bg-dust-600/40 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dust-700/50" role="tablist" aria-label="Storage tabs">
          {(['save', 'load'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.06em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50 focus-visible:ring-inset ${
                activeTab === tab
                  ? 'text-sand-200 border-b-2 border-rust-500 bg-dust-800'
                  : 'text-dust-400 hover:text-sand-300 hover:bg-dust-750/50'
              }`}
            >
              {tab === 'save' ? 'Save' : 'Load'}
            </button>
          ))}
        </div>

        {/* Save Panel */}
        {activeTab === 'save' && (
          <div role="tabpanel" className="px-5 py-4 space-y-3">
            <div>
              <label
                htmlFor="storage-scene-name"
                className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1"
              >
                Scene Name
              </label>
              <input
                id="storage-scene-name"
                type="text"
                value={sceneName}
                onChange={e => setSceneName(e.target.value)}
                maxLength={64}
                className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[12px] text-sand-200 placeholder-dust-500 focus:border-rust-500/50 focus:outline-none transition-all duration-150"
                placeholder="Enter scene name..."
              />
            </div>

            <div>
              <label
                htmlFor="storage-scene-tags"
                className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1"
              >
                Tags <span className="normal-case font-normal text-dust-500">(comma-separated)</span>
              </label>
              <input
                id="storage-scene-tags"
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                maxLength={128}
                className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[12px] text-sand-200 placeholder-dust-500 focus:border-rust-500/50 focus:outline-none transition-all duration-150"
                placeholder="landscape, architecture, demo..."
              />
            </div>

            <div>
              <label
                htmlFor="storage-scene-description"
                className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1"
              >
                Description
              </label>
              <textarea
                id="storage-scene-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={256}
                rows={3}
                className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[12px] text-sand-200 placeholder-dust-500 focus:border-rust-500/50 focus:outline-none transition-all duration-150 resize-none"
                placeholder="Describe your scene..."
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-dust-500 pt-1">
              <span>{objects.length} object{objects.length !== 1 ? 's' : ''} in scene</span>
            </div>

            <button
              onClick={handleSave}
              disabled={objects.length === 0}
              className="w-full px-3 py-2 text-[12px] font-semibold text-white bg-rust-500/90 rounded hover:bg-rust-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60"
              style={{ boxShadow: '0 0 12px rgba(255,102,0,0.15)' }}
            >
              Save to Cloud
            </button>

            <div className="flex gap-2">
              <button
                disabled
                className="flex-1 px-3 py-1.5 text-[11px] font-medium text-sand-200 bg-dust-700/60 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
              >
                Sign In
              </button>
              <button
                disabled
                className="flex-1 px-3 py-1.5 text-[11px] font-medium text-sand-200 bg-dust-700/60 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Load/Browse Panel */}
        {activeTab === 'load' && (
          <div role="tabpanel" className="px-5 py-4 space-y-3">
            {/* Search + Sort */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <label htmlFor="storage-search-saves" className="sr-only">Search Saves</label>
                <input
                  id="storage-search-saves"
                  type="text"
                  value={filter.search || ''}
                  onChange={handleSearchChange}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded pl-7 pr-2.5 py-1.5 text-[11px] text-sand-200 placeholder-dust-500 focus:border-rust-500/50 focus:outline-none transition-all duration-150"
                  placeholder="Search scenes..."
                  aria-label="Search saved scenes"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dust-500 text-[11px]" aria-hidden="true">
                  ⌕
                </span>
              </div>
              <select
                value={filter.sortBy?.field ?? 'updatedAt'}
                onChange={e => handleSortChange(e.target.value as SceneSortField)}
                className="bg-dust-900 border border-dust-600/50 rounded px-2 py-1.5 text-[11px] text-sand-200 focus:border-rust-500/50 focus:outline-none transition-all duration-150"
                aria-label="Sort scenes by"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.field} value={opt.field}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={toggleSortDirection}
                className="w-7 h-7 flex items-center justify-center bg-dust-900 border border-dust-600/50 rounded text-[11px] text-dust-400 hover:text-sand-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
                aria-label={sortDirection === 'desc' ? 'Sort descending' : 'Sort ascending'}
                title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            {/* Scene List */}
            <div className="min-h-[160px] max-h-[280px] overflow-y-auto rounded border border-dust-700/50 bg-dust-900/50">
              {filteredScenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[160px] text-center px-4">
                  <span className="text-dust-500 text-[20px] mb-2" aria-hidden="true">&#x2601;</span>
                  <span className="text-[11px] text-dust-500">
                    {scenes.length === 0
                      ? 'No saved scenes yet'
                      : 'No scenes match your search'}
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-dust-700/50" role="listbox" aria-label="Saved scenes">
                  {filteredScenes.map(scene => (
                    <li
                      key={scene.id}
                      role="option"
                      aria-selected={selectedSceneId === scene.id}
                      onClick={() => setSelectedSceneId(scene.id)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-150 ${
                        selectedSceneId === scene.id
                          ? 'bg-rust-500/15 border-l-2 border-rust-500'
                          : 'hover:bg-dust-800/80 border-l-2 border-transparent'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-dust-700/50 border border-dust-600/40 flex items-center justify-center text-dust-500 text-[10px] shrink-0 overflow-hidden">
                        {scene.thumbnailUrl ? (
                          <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          '3D'
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-sand-200 font-medium truncate">
                          {scene.name}
                        </div>
                        <div className="text-[10px] text-dust-500 flex items-center gap-1.5">
                          <span>{formatDate(scene.updatedAt)}</span>
                          <span>·</span>
                          <span>{scene.objectCount} obj</span>
                          <span>·</span>
                          <span>{formatFileSize(scene.fileSize)}</span>
                        </div>
                        {scene.tags.length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {scene.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="text-[9px] text-dust-400 bg-dust-700/60 px-1 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {scene.tags.length > 3 && (
                              <span className="text-[9px] text-dust-500">+{scene.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(scene.id) }}
                          className="w-6 h-6 flex items-center justify-center rounded text-[10px] text-dust-500 hover:text-red-400 hover:bg-red-900/20 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
                          aria-label={`Delete ${scene.name}`}
                          title="Delete scene"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Scene count */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-dust-500">
                {filteredScenes.length} of {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
              </span>
              <button
                disabled={!selectedSceneId}
                className="px-3 py-1.5 text-[11px] font-medium text-sand-200 bg-rust-500/80 rounded hover:bg-rust-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50"
                aria-label="Load selected scene"
              >
                Load Scene
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
