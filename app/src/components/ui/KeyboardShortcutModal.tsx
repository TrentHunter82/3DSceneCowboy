import { useEffect, useRef } from 'react'

interface KeyboardShortcutModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
  comingSoon?: boolean
}

interface ShortcutSection {
  title: string
  shortcuts: Shortcut[]
}

const sections: ShortcutSection[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['Q'], description: 'Select tool' },
      { keys: ['W'], description: 'Move tool' },
      { keys: ['E'], description: 'Rotate tool' },
      { keys: ['R'], description: 'Scale tool' },
    ],
  },
  {
    title: 'Objects',
    shortcuts: [
      { keys: ['Delete', '/', 'Backspace'], description: 'Delete selected' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected' },
      { keys: ['Ctrl', 'V'], description: 'Paste' },
      { keys: ['Ctrl', 'A'], description: 'Select all' },
    ],
  },
  {
    title: 'History',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['?'], description: 'Show shortcuts' },
      { keys: ['LMB drag'], description: 'Orbit camera' },
      { keys: ['MMB drag'], description: 'Pan camera' },
      { keys: ['Scroll'], description: 'Zoom' },
    ],
  },
]

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-block bg-dust-700 border border-dust-600/60 rounded px-1.5 py-0.5 text-xs font-mono text-sand-200" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      {children}
    </kbd>
  )
}

export function KeyboardShortcutModal({ isOpen, onClose }: KeyboardShortcutModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

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

  if (!isOpen) return null

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 bg-dust-800 border border-dust-600/50 rounded-lg" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 1px rgba(255,102,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dust-600/20">
          <h2 className="text-lg font-semibold text-sand-200 flex items-center gap-2">
            <span role="img" aria-hidden="true">&#x1F920;</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-dust-400 hover:text-sand-200 hover:bg-dust-700 transition-colors focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:outline-none"
            aria-label="Close shortcuts"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rust-300 mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && key !== '/' && (
                            <span className="text-dust-500 text-xs">+</span>
                          )}
                          {key === '/' ? (
                            <span className="text-dust-500 text-xs">/</span>
                          ) : (
                            <Kbd>{key}</Kbd>
                          )}
                        </span>
                      ))}
                    </span>
                    <span className="text-sm text-dust-300 text-right">
                      {shortcut.description}
                      {shortcut.comingSoon && (
                        <span className="ml-1.5 text-[10px] text-dust-500 italic">
                          coming soon
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-dust-600/20 text-center">
          <span className="text-xs text-dust-500">
            Press <Kbd>?</Kbd> to toggle this dialog
          </span>
        </div>
      </div>
    </div>
  )
}
