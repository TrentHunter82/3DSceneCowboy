import { useState, useCallback } from 'react'
import { useCameraStore } from '../stores/useCameraStore'
import { CollapsibleSection } from './ui/CollapsibleSection'

export function ShotList() {
  const shots = useCameraStore(s => s.shots)
  const activeShotId = useCameraStore(s => s.activeShotId)
  const captureShot = useCameraStore(s => s.captureShot)
  const removeShot = useCameraStore(s => s.removeShot)
  const updateShot = useCameraStore(s => s.updateShot)
  const goToShot = useCameraStore(s => s.goToShot)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCapture = useCallback(() => {
    captureShot()
  }, [captureShot])

  const handleGoToShot = useCallback((id: string) => {
    goToShot(id)
  }, [goToShot])

  const handleStartEdit = useCallback((id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }, [])

  const handleFinishEdit = useCallback((id: string) => {
    if (editName.trim()) {
      updateShot(id, { name: editName.trim() })
    }
    setEditingId(null)
  }, [editName, updateShot])

  const handleDelete = useCallback((id: string) => {
    if (confirmDeleteId === id) {
      removeShot(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      // Auto-revert confirmation after 2 seconds
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 2000)
    }
  }, [confirmDeleteId, removeShot])

  return (
    <CollapsibleSection title="Camera Shots" variant="primary" defaultOpen>
      <div className="p-2 space-y-2">
        {/* Capture button */}
        <button
          onClick={handleCapture}
          className="w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] bg-rust-500/20 border border-rust-500/30 rounded hover:bg-rust-500/30 hover:border-rust-500/50 text-rust-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60"
          title="Save current camera position as a new shot (Ctrl+Shift+S)"
          style={{ boxShadow: '0 0 8px rgba(255,102,0,0.1)' }}
        >
          + Capture Current View
        </button>

        {/* Shot list */}
        {shots.length === 0 ? (
          <p className="text-dust-500 text-[10px] text-center py-3">
            No shots saved. Position the camera and capture a view.
          </p>
        ) : (
          <div className="space-y-1">
            {shots.map((shot, index) => {
              const isActive = shot.id === activeShotId
              const isConfirmDelete = confirmDeleteId === shot.id

              return (
                <div
                  key={shot.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-rust-500/15 border border-rust-500/30'
                      : 'border border-transparent hover:bg-dust-600/20 hover:border-dust-600/20'
                  }`}
                  onClick={() => handleGoToShot(shot.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleGoToShot(shot.id)
                    }
                  }}
                  aria-label={`Go to ${shot.name}`}
                >
                  {/* Shot number */}
                  <span className={`text-[10px] font-mono w-4 text-center shrink-0 ${isActive ? 'text-rust-400' : 'text-dust-500'}`}>
                    {index + 1}
                  </span>

                  {/* Thumbnail or placeholder */}
                  <div className="w-10 h-7 rounded bg-dust-700/50 border border-dust-600/20 shrink-0 overflow-hidden flex items-center justify-center">
                    {shot.thumbnail ? (
                      <img src={shot.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-dust-500 text-[8px]">{'\u25CE'}</span>
                    )}
                  </div>

                  {/* Name (editable) */}
                  {editingId === shot.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleFinishEdit(shot.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleFinishEdit(shot.id)
                        if (e.key === 'Escape') setEditingId(null)
                        e.stopPropagation()
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-dust-700 border border-rust-500/40 rounded px-1.5 py-0.5 text-[11px] text-sand-200 focus:outline-none"
                      autoFocus
                      maxLength={64}
                    />
                  ) : (
                    <span
                      className={`flex-1 min-w-0 truncate text-[11px] ${isActive ? 'text-sand-100' : 'text-dust-300'}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(shot.id, shot.name)
                      }}
                      title="Double-click to rename"
                    >
                      {shot.name}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(shot.id)
                      }}
                      className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-all ${
                        isConfirmDelete
                          ? 'bg-red-600/40 text-red-300'
                          : 'text-dust-500 hover:text-red-400 hover:bg-red-900/20'
                      }`}
                      aria-label={isConfirmDelete ? 'Confirm delete' : `Delete ${shot.name}`}
                      title={isConfirmDelete ? 'Click again to confirm' : 'Delete shot'}
                    >
                      {'\u2715'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
