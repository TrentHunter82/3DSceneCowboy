import { useState, useEffect, useRef, useCallback } from 'react'

interface DropdownItem {
  id: string
  icon: string
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}

interface ToolbarDropdownProps {
  trigger: string
  triggerIcon?: string
  items: DropdownItem[]
  columns?: number
  ariaLabel: string
}

export function ToolbarDropdown({ trigger, triggerIcon, items, columns = 1, ariaLabel }: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const isGrid = columns > 1

  const enabledIndices = items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i)
    return acc
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setFocusIndex(0)
  }, [])

  // Click outside to close
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, close])

  // Escape key to close
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  // Focus first enabled item on open
  useEffect(() => {
    if (open) {
      const firstEnabled = enabledIndices[0] ?? 0
      setFocusIndex(firstEnabled)
      requestAnimationFrame(() => {
        itemRefs.current[firstEnabled]?.focus()
      })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync DOM focus with focusIndex
  useEffect(() => {
    if (open) {
      itemRefs.current[focusIndex]?.focus()
    }
  }, [focusIndex, open])

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (enabledIndices.length === 0) return
        const currentPos = enabledIndices.indexOf(focusIndex)
        const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length
        setFocusIndex(enabledIndices[nextPos])
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (enabledIndices.length === 0) return
        const currentPos = enabledIndices.indexOf(focusIndex)
        const prevPos = currentPos === -1 ? enabledIndices.length - 1 : (currentPos - 1 + enabledIndices.length) % enabledIndices.length
        setFocusIndex(enabledIndices[prevPos])
        break
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const item = items[focusIndex]
        if (item && !item.disabled) {
          item.onClick()
          close()
        }
        break
      }
    }
  }, [focusIndex, enabledIndices, items, close])

  const handleTriggerClick = () => {
    setOpen(prev => !prev)
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`px-2 py-1 h-7 flex items-center gap-1 rounded text-[10px] font-semibold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60 ${
          open
            ? 'bg-dust-700/60 text-sand-100'
            : 'text-dust-300 hover:bg-dust-600/40 hover:text-sand-100'
        }`}
      >
        {triggerIcon && <span aria-hidden="true">{triggerIcon}</span>}
        <span>{trigger}</span>
        <span aria-hidden="true" className="text-[8px] ml-0.5">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full left-0 mt-1 z-40 bg-dust-800 border border-dust-600/50 rounded py-1 min-w-[160px] dropdown-menu ${
            isGrid ? 'p-2' : ''
          }`}
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.4)',
            borderTopColor: 'rgba(255,255,255,0.08)',
            ...(isGrid ? { width: 'max-content' } : {}),
          }}
        >
          <div
            className={isGrid ? 'grid gap-1' : ''}
            style={isGrid ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
          >
            {items.map((item, index) => {
              const isFocused = index === focusIndex

              if (isGrid) {
                return (
                  <button
                    key={item.id}
                    ref={el => { itemRefs.current[index] = el }}
                    role="menuitem"
                    tabIndex={isFocused ? 0 : -1}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick()
                        close()
                      }
                    }}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60 ${
                      item.disabled
                        ? 'opacity-30 cursor-not-allowed'
                        : isFocused
                          ? 'bg-dust-700/60 text-sand-200'
                          : 'text-dust-300 hover:bg-dust-700/60 hover:text-sand-200'
                    }`}
                  >
                    <span className="text-sm" aria-hidden="true">{item.icon}</span>
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                )
              }

              return (
                <button
                  key={item.id}
                  ref={el => { itemRefs.current[index] = el }}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick()
                      close()
                    }
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust-500/60 ${
                    item.disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : isFocused
                        ? 'bg-dust-700/60 text-sand-200'
                        : 'text-dust-300 hover:bg-dust-700/60 hover:text-sand-200'
                  }`}
                >
                  <span className="text-[10px] w-4 text-center" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-[9px] text-dust-500">{item.shortcut}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
