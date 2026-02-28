import { useStorageStore } from '../../stores/useStorageStore'
import type { SaveStatus } from '../../types/storage'

// ── Relative time helper ────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Status display config ───────────────────────────────────────────

const STATUS_CONFIG: Record<SaveStatus, {
  label: string
  dot: string
  dotShadow: string
  pulse: boolean
}> = {
  saved: {
    label: 'Saved',
    dot: 'bg-green-400',
    dotShadow: '0 0 4px rgba(34,197,94,0.5)',
    pulse: false,
  },
  saving: {
    label: 'Saving...',
    dot: 'bg-amber-400',
    dotShadow: '0 0 4px rgba(245,158,11,0.5)',
    pulse: true,
  },
  unsaved: {
    label: 'Unsaved',
    dot: 'bg-yellow-400',
    dotShadow: '0 0 4px rgba(234,179,8,0.4)',
    pulse: false,
  },
  error: {
    label: 'Save failed',
    dot: 'bg-red-400',
    dotShadow: '0 0 4px rgba(239,68,68,0.5)',
    pulse: false,
  },
}

// ── AutoSaveIndicator ───────────────────────────────────────────────

export function AutoSaveIndicator() {
  const saveStatus = useStorageStore(s => s.saveStatus)
  const lastSavedAt = useStorageStore(s => s.lastSavedAt)
  const autoSave = useStorageStore(s => s.autoSave)
  const setAutoSave = useStorageStore(s => s.setAutoSave)

  const config = STATUS_CONFIG[saveStatus]
  const timeLabel = saveStatus === 'saved' && lastSavedAt ? relativeTime(lastSavedAt) : null
  const tooltipText = lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : 'Never saved'

  const handleClick = () => {
    setAutoSave({ enabled: !autoSave.enabled })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-dust-400 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
      role="button"
      tabIndex={0}
      title={tooltipText}
      aria-label={`Save status: ${config.label}${timeLabel ? `, ${timeLabel}` : ''}. Click to ${autoSave.enabled ? 'disable' : 'enable'} auto-save.`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot}${config.pulse ? ' animate-pulse' : ''}`}
        style={{ boxShadow: config.dotShadow }}
      />
      <span className="text-sand-200">{config.label}</span>
      {timeLabel && (
        <span className="text-dust-400">{timeLabel}</span>
      )}
      {!autoSave.enabled && (
        <span className="text-dust-500 ml-0.5">Auto-save off</span>
      )}
    </div>
  )
}
