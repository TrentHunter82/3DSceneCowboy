import { useState, useCallback, useRef, useMemo } from 'react'
import { useSceneStore } from '../stores/useSceneStore'
import { ContextMenu } from './ui/ContextMenu'
import type { ContextMenuItem } from './ui/ContextMenu'
import { SceneSearchFilter } from './ui/SceneSearchFilter'
import type { SceneObject, ObjectType } from '../types/scene'

// ── Type Icons ───────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ObjectType, string> = {
  box: '\u25A7',
  sphere: '\u25CF',
  cylinder: '\u2B2D',
  cone: '\u25B2',
  plane: '\u25AD',
  torus: '\u25CE',
  model: '\uD83D\uDCE6',
}

// ── Tree Helpers ─────────────────────────────────────────────────────────

interface TreeNode {
  object: SceneObject
  children: TreeNode[]
}

function buildTree(objects: SceneObject[]): TreeNode[] {
  const childrenMap = new Map<string | undefined, SceneObject[]>()

  for (const obj of objects) {
    const key = obj.parentId ?? '__root__'
    const list = childrenMap.get(key)
    if (list) {
      list.push(obj)
    } else {
      childrenMap.set(key, [obj])
    }
  }

  function buildNodes(parentKey: string): TreeNode[] {
    const children = childrenMap.get(parentKey) ?? []
    return children.map(obj => ({
      object: obj,
      children: buildNodes(obj.id),
    }))
  }

  return buildNodes('__root__')
}

/** Flatten tree into display order (DFS), respecting expanded state. */
function flattenTree(
  nodes: TreeNode[],
  expanded: Record<string, boolean>,
): SceneObject[] {
  const result: SceneObject[] = []
  function walk(nodeList: TreeNode[]) {
    for (const node of nodeList) {
      result.push(node.object)
      if (node.children.length > 0 && expanded[node.object.id] !== false) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

/** Collect all descendant IDs of a given object. */
function getDescendantIds(objects: SceneObject[], parentId: string): Set<string> {
  const ids = new Set<string>()
  function collect(pid: string) {
    for (const obj of objects) {
      if (obj.parentId === pid) {
        ids.add(obj.id)
        collect(obj.id)
      }
    }
  }
  collect(parentId)
  return ids
}

/** Check if an object has children. */
function hasChildren(objects: SceneObject[], id: string): boolean {
  return objects.some(o => o.parentId === id)
}

/** Compute the nesting depth of an object. */
function getDepth(objects: SceneObject[], obj: SceneObject): number {
  let depth = 0
  let current = obj
  while (current.parentId) {
    depth++
    const parent = objects.find(o => o.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return depth
}

// ── Component ────────────────────────────────────────────────────────────

export function ObjectList() {
  const objects = useSceneStore(s => s.objects)
  const selectedId = useSceneStore(s => s.selectedId)
  const selectedIds = useSceneStore(s => s.selectedIds)
  const selectObject = useSceneStore(s => s.selectObject)
  const toggleSelectObject = useSceneStore(s => s.toggleSelectObject)
  const selectRange = useSceneStore(s => s.selectRange)
  const selectAll = useSceneStore(s => s.selectAll)
  const updateObject = useSceneStore(s => s.updateObject)
  const removeObject = useSceneStore(s => s.removeObject)
  const removeSelected = useSceneStore(s => s.removeSelected)
  const setParent = useSceneStore(s => s.setParent)
  const duplicateSelected = useSceneStore(s => s.duplicateSelected)
  const copySelected = useSceneStore(s => s.copySelected)
  const pasteClipboard = useSceneStore(s => s.pasteClipboard)

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(true)
  const [showLocked, setShowLocked] = useState(true)

  // Expanded state: all parents start expanded (true by default).
  // We track explicit collapses only; absent keys mean expanded.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Drag state for reparenting
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverRoot, setDragOverRoot] = useState(false)
  const dragSourceId = useRef<string | null>(null)
  const isDraggingMulti = useRef(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    objectId: string
  } | null>(null)

  // Filter objects based on search/filter state
  const filteredObjects = useMemo(() => {
    if (!searchQuery && !typeFilter && showHidden && showLocked) return objects
    return objects.filter(obj => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!obj.name.toLowerCase().includes(q) && !obj.type.toLowerCase().includes(q)) return false
      }
      if (typeFilter && obj.type !== typeFilter) return false
      if (!showHidden && !obj.visible) return false
      if (!showLocked && obj.locked) return false
      return true
    })
  }, [objects, searchQuery, typeFilter, showHidden, showLocked])

  const isFiltering = !!(searchQuery || typeFilter || !showHidden || !showLocked)

  // Build tree and flatten for display order
  const tree = buildTree(isFiltering ? filteredObjects : objects)
  const flatList = flattenTree(tree, expanded)

  // ── Toggle expand/collapse ──────────────────────────────────────────

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }))
  }, [])

  // ── Click handling (multi-select) ──────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent, id: string) => {
    if (e.shiftKey && selectedId) {
      selectRange(selectedId, id)
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelectObject(id)
    } else {
      selectObject(id)
    }
  }, [selectedId, selectObject, toggleSelectObject, selectRange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectObject(id)
    }
  }, [selectObject])

  // ── Context Menu ─────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    // Select the object if not already selected
    if (!selectedIds.includes(id)) {
      selectObject(id)
    }
    setContextMenu({ x: e.clientX, y: e.clientY, objectId: id })
  }, [selectedIds, selectObject])

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const obj = objects.find(o => o.id === contextMenu.objectId)
    if (!obj) return []

    const multiCount = selectedIds.length
    const isMulti = multiCount > 1

    return [
      {
        label: isMulti ? `Duplicate ${multiCount} objects` : 'Duplicate',
        icon: '📋',
        onClick: () => duplicateSelected(),
      },
      {
        label: isMulti ? `Copy ${multiCount} objects` : 'Copy',
        icon: '📄',
        onClick: () => copySelected(),
      },
      {
        label: 'Paste',
        icon: '📎',
        onClick: () => pasteClipboard(),
      },
      { label: '', icon: '', onClick: () => {}, separator: true },
      {
        label: obj.visible ? 'Hide' : 'Show',
        icon: obj.visible ? '👁' : '—',
        onClick: () => {
          if (isMulti) {
            for (const sid of selectedIds) updateObject(sid, { visible: !obj.visible })
          } else {
            updateObject(obj.id, { visible: !obj.visible })
          }
        },
      },
      {
        label: obj.locked ? 'Unlock' : 'Lock',
        icon: obj.locked ? '🔓' : '🔒',
        onClick: () => {
          if (isMulti) {
            for (const sid of selectedIds) updateObject(sid, { locked: !obj.locked })
          } else {
            updateObject(obj.id, { locked: !obj.locked })
          }
        },
      },
      {
        label: 'Make Root',
        icon: '🏠',
        onClick: () => {
          if (isMulti) {
            for (const sid of selectedIds) setParent(sid, undefined)
          } else {
            setParent(obj.id, undefined)
          }
        },
        disabled: !obj.parentId && !isMulti,
      },
      { label: '', icon: '', onClick: () => {}, separator: true },
      {
        label: 'Select All',
        icon: '☐',
        onClick: () => selectAll(),
      },
      { label: '', icon: '', onClick: () => {}, separator: true },
      {
        label: isMulti ? `Delete ${multiCount} objects` : 'Delete',
        icon: '🗑',
        onClick: () => {
          if (isMulti) {
            removeSelected()
          } else {
            removeObject(obj.id)
          }
        },
        danger: true,
      },
    ]
  }, [contextMenu, objects, selectedIds, duplicateSelected, copySelected, pasteClipboard, updateObject, setParent, selectAll, removeObject, removeSelected])

  // ── Drag & Drop (reparent + multi-select drag) ──────────────────────

  /* v8 ignore start -- Drag-and-drop requires real browser DnD events; tested via e2e */
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    // Multi-select drag: if dragging a selected item, drag all selected
    isDraggingMulti.current = selectedIds.includes(id) && selectedIds.length > 1
    dragSourceId.current = id
    e.dataTransfer.effectAllowed = 'move'
    if (isDraggingMulti.current) {
      e.dataTransfer.setData('text/plain', selectedIds.join(','))
    } else {
      e.dataTransfer.setData('text/plain', id)
    }
  }, [selectedIds])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = dragSourceId.current
    if (!sourceId || sourceId === targetId) return

    // Prevent dropping on a descendant of the dragged object
    const descendantIds = getDescendantIds(objects, sourceId)
    if (descendantIds.has(targetId)) return

    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    setDragOverRoot(false)
  }, [objects])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = dragSourceId.current
    if (!sourceId || sourceId === targetId) return

    if (isDraggingMulti.current) {
      // Multi-select drag: reparent all selected items
      for (const sid of selectedIds) {
        if (sid === targetId) continue
        const descendantIds = getDescendantIds(objects, sid)
        if (!descendantIds.has(targetId)) {
          setParent(sid, targetId)
        }
      }
    } else {
      // Single drag
      const descendantIds = getDescendantIds(objects, sourceId)
      if (descendantIds.has(targetId)) return
      setParent(sourceId, targetId)
    }
    setDragOverId(null)
    setDragOverRoot(false)
    dragSourceId.current = null
    isDraggingMulti.current = false
  }, [objects, setParent, selectedIds])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
    setDragOverRoot(false)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragOverId(null)
    setDragOverRoot(false)
    dragSourceId.current = null
  }, [])

  // Drop on empty area = make root
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dragSourceId.current) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverRoot(true)
      setDragOverId(null)
    }
  }, [])

  const handleRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (isDraggingMulti.current) {
      for (const sid of selectedIds) {
        setParent(sid, undefined)
      }
    } else {
      const sourceId = dragSourceId.current
      if (sourceId) {
        setParent(sourceId, undefined)
      }
    }
    setDragOverRoot(false)
    setDragOverId(null)
    dragSourceId.current = null
    isDraggingMulti.current = false
  }, [setParent, selectedIds])
  /* v8 ignore stop */

  // ── Render a single row ────────────────────────────────────────────

  const renderRow = (obj: SceneObject) => {
    const depth = getDepth(objects, obj)
    const isParent = hasChildren(objects, obj.id)
    const isExpanded = expanded[obj.id] !== false
    const isPrimary = selectedId === obj.id
    const isSelected = selectedIds.includes(obj.id)
    const isDragTarget = dragOverId === obj.id

    let rowClasses: string
    let rowStyle: React.CSSProperties | undefined
    if (isPrimary) {
      rowClasses = 'bg-rust-500/12 text-sand-50 border-l-2 border-rust-500'
      rowStyle = { boxShadow: 'inset 0 0 30px rgba(255,102,0,0.1), inset 3px 0 12px rgba(255,102,0,0.12)' }
    } else if (isSelected) {
      rowClasses = 'bg-dust-600/25 text-sand-200 border-l-2 border-rust-400/60'
      rowStyle = { boxShadow: 'inset 2px 0 8px rgba(255,102,0,0.06)' }
    } else {
      rowClasses = 'text-dust-300 hover:bg-dust-600/15 hover:border-rust-500/20 border-l-2 border-transparent'
      rowStyle = undefined
    }

    if (isDragTarget) {
      rowClasses += ' ring-1 ring-inset ring-rust-400/60'
    }

    return (
      <div
        key={obj.id}
        role="option"
        aria-selected={isSelected}
        tabIndex={0}
        draggable
        onClick={(e) => handleClick(e, obj.id)}
        onContextMenu={(e) => handleContextMenu(e, obj.id)}
        onKeyDown={(e) => handleKeyDown(e, obj.id)}
        onDragStart={(e) => handleDragStart(e, obj.id)}
        onDragOver={(e) => handleDragOver(e, obj.id)}
        onDrop={(e) => handleDrop(e, obj.id)}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        className={`
          group flex items-center gap-1.5 py-1 pr-3 cursor-pointer transition-all duration-100
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-rust-500/50
          ${rowClasses}
        `}
        style={{ paddingLeft: `${12 + depth * 14}px`, ...rowStyle }}
      >
        {/* Expand/collapse toggle for parents; spacer for leaves */}
        {isParent ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded(obj.id)
            }}
            aria-label={isExpanded ? `Collapse ${obj.name}` : `Expand ${obj.name}`}
            className="w-3.5 text-[9px] text-dust-500 hover:text-dust-300 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50 rounded-sm"
          >
            {isExpanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Type icon */}
        <span className="text-[11px] opacity-40 flex-shrink-0" aria-hidden="true">
          {TYPE_ICONS[obj.type] || '?'}
        </span>

        {/* Name */}
        <span className="flex-1 text-[12px] truncate">{obj.name}</span>

        {/* Lock indicator (always visible when locked) */}
        {obj.locked && (
          <span className="text-[10px] text-sunset-400/70" aria-label="Locked">
            {'\uD83D\uDD12'}
          </span>
        )}

        {/* Lock/Unlock toggle (visible on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            updateObject(obj.id, { locked: !obj.locked })
          }}
          aria-label={obj.locked ? `Unlock ${obj.name}` : `Lock ${obj.name}`}
          className={`text-[10px] opacity-0 group-hover:opacity-70 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50 rounded-sm ${
            obj.locked ? 'text-sunset-400' : 'text-dust-500'
          }`}
          title={obj.locked ? 'Unlock' : 'Lock'}
        >
          {obj.locked ? '\uD83D\uDD13' : '\uD83D\uDD12'}
        </button>

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            updateObject(obj.id, { visible: !obj.visible })
          }}
          aria-label={obj.visible ? `Hide ${obj.name}` : `Show ${obj.name}`}
          className={`text-[10px] opacity-0 group-hover:opacity-70 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50 rounded-sm ${
            obj.visible ? 'text-dust-400' : 'text-dust-600'
          }`}
          title={obj.visible ? 'Hide' : 'Show'}
        >
          {obj.visible ? '\uD83D\uDC41' : '\u2014'}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeObject(obj.id)
          }}
          aria-label={`Delete ${obj.name}`}
          className="text-[10px] text-red-400/40 opacity-0 group-hover:opacity-70 focus-visible:opacity-100 hover:text-red-400 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/50 rounded-sm"
          title="Delete"
        >
          {'\u2715'}
        </button>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-3 border-b border-dust-600/25 section-header">
        <h2 className="text-[11px] font-bold text-dust-100 uppercase tracking-[0.12em]">
          Scene
        </h2>
      </div>

      {/* Search/Filter bar */}
      {objects.length > 0 && (
        <SceneSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          showHidden={showHidden}
          onShowHiddenChange={setShowHidden}
          showLocked={showLocked}
          onShowLockedChange={setShowLocked}
          objectCount={objects.length}
          filteredCount={filteredObjects.length}
        />
      )}

      <div className="flex-1 overflow-y-auto py-0.5" role="listbox" aria-label="Scene objects">
        {objects.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-dust-500 text-[11px]">No objects</p>
            <p className="text-dust-600 text-[10px] mt-1">
              Use the toolbar to add objects
            </p>
          </div>
        ) : (
          <>
            {flatList.map(obj => renderRow(obj))}

            {/* Drop zone at bottom to make object a root */}
            <div
              onDragOver={handleRootDragOver}
              onDrop={handleRootDrop}
              onDragLeave={handleDragLeave}
              className={`h-6 transition-colors ${
                dragOverRoot ? 'bg-rust-500/10 border-t-2 border-rust-400' : ''
              }`}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-dust-600/25 text-dust-400 text-[10px] flex justify-between font-medium tracking-wide led-strip-orange">
        <span>
          {isFiltering
            ? `${filteredObjects.length} of ${objects.length} object${objects.length !== 1 ? 's' : ''}`
            : `${objects.length} object${objects.length !== 1 ? 's' : ''}`
          }
        </span>
        {selectedIds.length > 1 && (
          <span className="text-rust-400/80">{selectedIds.length} selected</span>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
