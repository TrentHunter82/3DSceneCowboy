import { useCallback, useRef, useEffect } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { AnimationTimeline } from './AnimationTimeline'

const MIN_HEIGHT = 120
const MAX_HEIGHT = 500

export function BottomPanel() {
  const panelHeight = useUIStore(s => s.bottomPanelHeight)
  const setPanelHeight = useUIStore(s => s.setBottomPanelHeight)
  const collapsed = useUIStore(s => s.bottomPanelCollapsed)
  const setCollapsed = useUIStore(s => s.setBottomPanelCollapsed)

  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const isDragging = useRef(false)

  const handleDoubleClick = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  // Resize handle drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = panelHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartY.current - moveEvent.clientY
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartHeight.current + delta))
      setPanelHeight(newHeight)
    }

    const onMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [panelHeight, setPanelHeight])

  // Cleanup drag listeners
  useEffect(() => {
    return () => {
      isDragging.current = false
    }
  }, [])

  return (
    <div className="flex flex-col shrink-0 border-t border-dust-600/25 bg-dust-900 relative z-10" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 -2px 8px rgba(0,0,0,0.5), 0 -6px 24px rgba(0,0,0,0.3)' }}>
      {/* Resize handle */}
      {!collapsed && (
        <div
          className="h-1 cursor-row-resize hover:bg-rust-500/30 transition-colors"
          onMouseDown={handleResizeStart}
          onDoubleClick={handleDoubleClick}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize bottom panel"
        />
      )}

      {/* Header bar — entire bar is clickable to toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center w-full border-b border-dust-600/25 shrink-0 hover:bg-dust-600/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-rust-500/60 cursor-pointer"
        aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
        aria-expanded={!collapsed}
      >
        <span className="px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-sand-100 flex items-center gap-1.5 label-engraved">
          <span className="text-[10px]" aria-hidden="true">{collapsed ? '\u25B6' : '\u25BC'}</span>
          Animation Timeline
        </span>
        <div className="flex-1" />
        <span className="px-2 py-1.5 text-[10px] text-dust-400">
          {collapsed ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* Panel content */}
      {!collapsed && (
        <div style={{ height: panelHeight }} className="overflow-hidden">
          <AnimationTimeline />
        </div>
      )}
    </div>
  )
}
