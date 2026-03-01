import { useEffect, useRef, useState, useCallback } from 'react'

export interface ContextMenuItem {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const actionItems = items.filter(item => !item.separator)
  const [focusIndex, setFocusIndex] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex(i => (i + 1) % actionItems.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex(i => (i - 1 + actionItems.length) % actionItems.length)
        break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const item = actionItems[focusIndex]
        if (item && !item.disabled) {
          item.onClick()
          onClose()
        }
        break
      }
    }
  }, [onClose, actionItems, focusIndex])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, handleKeyDown])

  // Focus the menu on mount for keyboard accessibility
  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  // Adjust position to stay within viewport
  const [adjustedPos, setAdjustedPos] = useState({ x, y })

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const newX = rect.right > window.innerWidth ? Math.max(0, x - rect.width) : x
    const newY = rect.bottom > window.innerHeight ? Math.max(0, y - rect.height) : y
    if (newX !== adjustedPos.x || newY !== adjustedPos.y) {
      setAdjustedPos({ x: newX, y: newY })
    }
  }, [x, y]) // eslint-disable-line react-hooks/exhaustive-deps

  const style: React.CSSProperties = {
    position: 'fixed',
    left: adjustedPos.x,
    top: adjustedPos.y,
    zIndex: 9999,
  }

  let actionIndex = -1

  return (
    <div
      ref={menuRef}
      style={{ ...style, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.4)', borderTopColor: 'rgba(255,255,255,0.08)' }}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      className="min-w-[160px] bg-dust-800 border border-dust-600/60 rounded-lg py-1 focus:outline-none dropdown-menu"
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} role="separator" className="h-px bg-dust-600/30 my-1" />
        }
        actionIndex++
        const isFocused = actionIndex === focusIndex
        return (
          <button
            key={i}
            role="menuitem"
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            tabIndex={isFocused ? 0 : -1}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rust-500
              ${isFocused ? 'bg-dust-700' : ''}
              ${item.disabled
                ? 'text-dust-500 cursor-not-allowed'
                : item.danger
                  ? 'text-red-400 hover:bg-red-900/20'
                  : 'text-dust-200 hover:bg-dust-700'
              }
            `}
          >
            <span className="w-4 text-center text-xs" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
