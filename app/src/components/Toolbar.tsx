import { useState, useCallback, useRef, useMemo } from 'react'
import { useSceneStore } from '../stores/useSceneStore'
import { useUIStore, type PivotMode } from '../stores/useUIStore'
import { useCameraStore } from '../stores/useCameraStore'
import { AutoSaveIndicator } from './ui/AutoSaveIndicator'
import { ToolbarDropdown } from './ui/ToolbarDropdown'
import { downloadScene, uploadScene } from '../core/serialization'
import { CAMERA_PRESETS } from '../core/cameraPresets'
import { detectModelFormat, getAcceptString } from '../core/modelLoader'
import type { ToolMode, ObjectType } from '../types/scene'

const CAMERA_ICONS: Record<string, string> = {
  Front: '\u22A1',
  Back: '\u229F',
  Top: '\u22A4',
  Right: '\u22A2',
  Left: '\u22A3',
  Perspective: '\u25C8',
}

const PIVOT_MODES: { mode: PivotMode; label: string; icon: string; title: string }[] = [
  { mode: 'individual', label: 'Individual', icon: '\u2299', title: 'Pivot: Individual origins' },
  { mode: 'median', label: 'Median', icon: '\u25CE', title: 'Pivot: Median point' },
  { mode: 'active', label: 'Active', icon: '\u2295', title: 'Pivot: Active object' },
]

const TOOLS: { mode: ToolMode; label: string; icon: string; key: string }[] = [
  { mode: 'select', label: 'Select', icon: '\u25C7', key: 'Q' },
  { mode: 'move', label: 'Move', icon: '\u2725', key: 'W' },
  { mode: 'rotate', label: 'Rotate', icon: '\u21BB', key: 'E' },
  { mode: 'scale', label: 'Scale', icon: '\u2922', key: 'R' },
]

const PRIMITIVES: { type: ObjectType; label: string; icon: string }[] = [
  { type: 'box', label: 'Box', icon: '\u25A7' },
  { type: 'sphere', label: 'Sphere', icon: '\u25CF' },
  { type: 'cylinder', label: 'Cylinder', icon: '\u2B2D' },
  { type: 'cone', label: 'Cone', icon: '\u25B2' },
  { type: 'torus', label: 'Torus', icon: '\u25CE' },
  { type: 'plane', label: 'Plane', icon: '\u25AD' },
]

// Reusable button classes — refined for industrial aesthetic
const btnBase = 'w-7 h-7 flex items-center justify-center rounded text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500/50'
const btnDefault = `${btnBase} btn-raised text-dust-300 hover:text-sand-100`
const btnDisabled = `${btnBase} btn-raised text-dust-300 disabled:opacity-20 disabled:cursor-not-allowed hover:text-sand-100`
const divider = 'w-px h-5 bg-dust-500/30 mx-2'

export function Toolbar() {
  const toolMode = useSceneStore(s => s.toolMode)
  const setToolMode = useSceneStore(s => s.setToolMode)
  const addObject = useSceneStore(s => s.addObject)
  const selectedId = useSceneStore(s => s.selectedId)
  const removeObject = useSceneStore(s => s.removeObject)
  const duplicateObject = useSceneStore(s => s.duplicateObject)
  const removeSelected = useSceneStore(s => s.removeSelected)
  const duplicateSelected = useSceneStore(s => s.duplicateSelected)
  const undo = useSceneStore(s => s.undo)
  const redo = useSceneStore(s => s.redo)
  const canUndo = useSceneStore(s => s.canUndo)
  const canRedo = useSceneStore(s => s.canRedo)
  const saveScene = useSceneStore(s => s.saveScene)
  const loadScene = useSceneStore(s => s.loadScene)
  const clearScene = useSceneStore(s => s.clearScene)
  const objects = useSceneStore(s => s.objects)
  const snapEnabled = useSceneStore(s => s.snapEnabled)
  const setSnapEnabled = useSceneStore(s => s.setSnapEnabled)
  const addModelObject = useSceneStore(s => s.addModelObject)

  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const pivotMode = useUIStore(s => s.pivotMode)
  const setPivotMode = useUIStore(s => s.setPivotMode)
  const theme = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)
  const setShowWelcome = useUIStore(s => s.setShowWelcome)
  const selectedIds = useSceneStore(s => s.selectedIds)

  const goToPreset = useCameraStore(s => s.goToPreset)
  const activePreset = useCameraStore(s => s.activePreset)

  const [sceneName, setSceneName] = useState('Untitled Scene')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = useCallback(() => {
    const data = saveScene(sceneName)
    downloadScene(data)
  }, [saveScene, sceneName])

  const handleLoad = useCallback(async () => {
    try {
      const data = await uploadScene()
      loadScene(data)
      setSceneName(data.metadata.name)
    } catch {
      // User cancelled or invalid file - silently ignore
    }
  }, [loadScene])

  const handleReset = useCallback(() => {
    if (objects.length === 0) {
      clearScene()
      return
    }
    setShowResetConfirm(true)
  }, [objects.length, clearScene])

  const confirmReset = useCallback(() => {
    clearScene()
    setShowResetConfirm(false)
  }, [clearScene])

  const handleImportModel = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const format = detectModelFormat(file.name)
    if (!format) {
      console.warn(`Unsupported model format: ${file.name}`)
      e.target.value = ''
      return
    }

    setIsImporting(true)
    const url = URL.createObjectURL(file)
    const name = file.name.replace(/\.(glb|gltf|fbx|obj|dae)$/i, '')
    addModelObject(name, url, format)
    setIsImporting(false)

    // Reset input so the same file can be re-imported
    e.target.value = ''
  }, [addModelObject])

  const handleExport = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-export-dialog'))
  }, [])

  const handleShowWelcome = useCallback(() => {
    setShowWelcome(true)
  }, [setShowWelcome])

  // ── Dropdown items ────────────────────────────────────────────────

  const addItems = useMemo(() => [
    ...PRIMITIVES.map(prim => ({
      id: prim.type,
      icon: prim.icon,
      label: prim.label,
      onClick: () => addObject(prim.type),
    })),
    {
      id: 'import',
      icon: isImporting ? '\u23F3' : '\uD83D\uDCE6',
      label: 'Import Model',
      disabled: isImporting,
      onClick: handleImportModel,
    },
  ], [addObject, isImporting, handleImportModel])

  const fileItems = useMemo(() => [
    { id: 'save', icon: '\uD83D\uDCBE', label: 'Save Scene', shortcut: 'Ctrl+S', onClick: handleSave },
    { id: 'load', icon: '\uD83D\uDCC2', label: 'Load Scene', onClick: handleLoad },
    { id: 'new', icon: '\uD83D\uDCC4', label: 'New Scene', onClick: handleReset },
    { id: 'cloud', icon: '\u2601', label: 'Cloud Storage', onClick: () => window.dispatchEvent(new CustomEvent('toggle-cloud-save')) },
    { id: 'export', icon: '\u2197', label: 'Export', onClick: handleExport },
  ], [handleSave, handleLoad, handleReset, handleExport])

  const cameraItems = useMemo(() =>
    CAMERA_PRESETS.map(preset => ({
      id: preset.name,
      icon: CAMERA_ICONS[preset.name] || '\u25C9',
      label: preset.name,
      onClick: () => goToPreset(preset.name),
    })),
  [goToPreset])

  return (
    <div className="h-11 bg-dust-900 flex items-center px-3 gap-0.5 shrink-0" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5)' }}>
      {/* App logo — clickable to reopen welcome screen */}
      <div className="flex items-center gap-2 mr-3 select-none">
        <button
          onClick={handleShowWelcome}
          className="w-7 h-7 rounded-md flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500/50"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 4px rgba(0,0,0,0.5)', background: 'linear-gradient(135deg, #333333, #222222)', border: '1px solid rgba(255,255,255,0.1)' }}
          aria-label="Show welcome screen"
          title="Welcome screen"
        >
          <span className="text-[10px] font-black text-white leading-none tracking-wider">3D</span>
        </button>
        <span className="text-[10px] font-semibold text-dust-400 tracking-[0.12em] uppercase hidden lg:inline label-engraved">Scene</span>
      </div>

      {/* Editable scene name */}
      <input
        type="text"
        value={sceneName}
        onChange={e => setSceneName(e.target.value)}
        aria-label="Scene name"
        maxLength={64}
        className="bg-transparent border border-transparent hover:border-dust-600/20 focus:border-rust-500/40 rounded px-2 py-0.5 text-[12px] text-sand-200 font-medium tracking-wide w-36 focus:outline-none transition-all"
        title="Scene name (used as save filename)"
      />

      {/* Auto-save status indicator */}
      <AutoSaveIndicator />

      <div className={divider} />

      {/* ═══ TOOLS GROUP ═══ */}
      <div role="toolbar" aria-label="Transform tools" className="flex items-center gap-0.5 toolbar-group">
        {TOOLS.map(tool => (
          <button
            key={tool.mode}
            onClick={() => setToolMode(tool.mode)}
            aria-label={tool.label}
            aria-pressed={toolMode === tool.mode}
            title={`${tool.label} (${tool.key})`}
            className={`
              w-7 h-7 inline-flex items-center justify-center rounded text-xs transition-all duration-150
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60
              ${toolMode === tool.mode
                ? 'tool-active text-white'
                : 'text-dust-300 hover:bg-dust-600/50 hover:text-sand-200'
              }
            `}
          >
            {tool.icon}
            <span className="hidden lg:inline ml-1 text-[9px] font-medium tracking-wide">{tool.key}</span>
          </button>
        ))}
      </div>

      <div className={divider} />

      {/* ═══ ADD DROPDOWN ═══ */}
      <ToolbarDropdown
        trigger="Add"
        items={addItems}
        columns={3}
        ariaLabel="Add objects"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
      />

      <div className={divider} />

      {/* ═══ EDIT GROUP ═══ */}
      <div role="toolbar" aria-label="Edit actions" className="flex items-center gap-0.5">
        <button
          onClick={() => selectedIds.length > 1 ? duplicateSelected() : selectedId && duplicateObject(selectedId)}
          disabled={selectedIds.length === 0}
          aria-label="Duplicate selected"
          title="Duplicate (Ctrl+D)"
          className={btnDisabled}
        >
          {'\u29C9'}
        </button>
        <button
          onClick={() => selectedIds.length > 1 ? removeSelected() : selectedId && removeObject(selectedId)}
          disabled={selectedIds.length === 0}
          aria-label="Delete selected"
          title="Delete (Del)"
          className={`${btnBase} text-red-400/60 hover:bg-red-900/20 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed`}
        >
          {'\u2715'}
        </button>

        <div className="w-px h-4 bg-dust-600/20 mx-0.5" />

        <button onClick={undo} disabled={!canUndo()} aria-label="Undo" title="Undo (Ctrl+Z)" className={btnDisabled}>
          {'\u21B6'}
        </button>
        <button onClick={redo} disabled={!canRedo()} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={btnDisabled}>
          {'\u21B7'}
        </button>
      </div>

      <div className={divider} />

      {/* ═══ FILE DROPDOWN ═══ */}
      <ToolbarDropdown
        trigger="File"
        items={fileItems}
        ariaLabel="File operations"
      />

      <div className={divider} />

      {/* ═══ SNAP ═══ */}
      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        aria-label={snapEnabled ? 'Disable grid snap' : 'Enable grid snap'}
        aria-pressed={snapEnabled}
        title={`Grid snap: ${snapEnabled ? 'ON' : 'OFF'} (Ctrl+G)`}
        className={`
          w-7 h-7 flex items-center justify-center rounded text-xs transition-all duration-150
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60
          ${snapEnabled
            ? 'tool-active text-white'
            : 'text-dust-300 hover:bg-dust-600/50 hover:text-sand-200'
          }
        `}
      >
        {'\u229E'}
      </button>

      <div className={divider} />

      {/* ═══ CAMERA DROPDOWN ═══ */}
      <ToolbarDropdown
        trigger="Cam"
        triggerIcon={CAMERA_ICONS[activePreset ?? ''] || '\u25C8'}
        items={cameraItems}
        ariaLabel="Camera presets"
      />

      {/* Pivot mode selector - visible when multiple objects selected */}
      {selectedIds.length > 1 && (
        <>
          <div className={divider} />
          <span className="text-dust-400 text-[9px] mr-1.5 select-none uppercase tracking-[0.12em] font-semibold">Pivot</span>
          {PIVOT_MODES.map(pm => (
            <button
              key={pm.mode}
              onClick={() => setPivotMode(pm.mode)}
              aria-label={pm.label}
              aria-pressed={pivotMode === pm.mode}
              title={pm.title}
              className={`
                w-6 h-6 flex items-center justify-center rounded text-[10px] transition-all duration-150
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60
                ${pivotMode === pm.mode
                  ? 'tool-active text-white'
                  : 'text-dust-300 hover:bg-dust-600/50 hover:text-sand-200'
                }
              `}
            >
              {pm.icon}
            </button>
          ))}
        </>
      )}

      <div className={divider} />

      {/* ═══ VIEW GROUP ═══ */}
      <div role="toolbar" aria-label="View controls" className="flex items-center gap-0.5">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Show panels' : 'Hide panels'}
          title={sidebarCollapsed ? 'Show panels' : 'Hide panels'}
          className={btnDefault}
        >
          {sidebarCollapsed ? '\u25E8' : '\u25A3'}
        </button>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className={btnDefault}
        >
          {theme === 'dark' ? '\u2600' : '\uD83C\uDF19'}
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-shortcut-help'))}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className={btnDefault}
        >
          {'\u2328'}
        </button>
      </div>

      {/* Spacer + tool info badge */}
      <div className="flex-1" />
      <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-dust-800/60 border border-dust-600/20">
        <div className="led-dot-orange" />
        <span className="text-dust-300 text-[9px] uppercase tracking-[0.12em] select-none font-semibold">
          {toolMode}
        </span>
      </div>

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-dust-800 border border-rust-500/20 rounded-lg p-5 max-w-sm" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.4)' }}>
            <h3 className="text-sand-100 text-[13px] font-semibold mb-2 tracking-wide">Clear Scene?</h3>
            <p className="text-dust-300 text-[11px] mb-5 leading-relaxed">
              This will remove all {objects.length} object{objects.length !== 1 ? 's' : ''} from the scene. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-[11px] text-dust-300 bg-dust-700 hover:bg-dust-600 rounded transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-3 py-1.5 text-[11px] text-white bg-red-600/80 hover:bg-red-500 rounded transition-all"
                style={{ boxShadow: '0 0 12px rgba(239,68,68,0.25)' }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
