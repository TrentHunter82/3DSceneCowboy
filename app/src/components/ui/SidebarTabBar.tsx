import { useRef, useCallback, type KeyboardEvent } from 'react'

interface SidebarTab {
  id: string
  icon: string
  label: string
}

interface SidebarTabBarProps {
  tabs: SidebarTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function SidebarTabBar({ tabs, activeTab, onTabChange }: SidebarTabBarProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const setTabRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(id, el)
    } else {
      tabRefs.current.delete(id)
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (tabs.length === 0) return

    const currentIndex = tabs.findIndex(t => t.id === activeTab)
    let nextIndex: number | null = null

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    }

    if (nextIndex !== null) {
      const nextTab = tabs[nextIndex]
      onTabChange(nextTab.id)
      tabRefs.current.get(nextTab.id)?.focus()
    }
  }, [tabs, activeTab, onTabChange])

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className="bg-dust-900 border-l-2 border-cyan-500/30 flex flex-col"
      style={{ width: 36 }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            ref={(el) => setTabRef(tab.id, el)}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            title={tab.label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={`flex items-center justify-center text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-400'
                : 'text-dust-400 hover:bg-dust-600/30 hover:text-sand-200'
            }`}
            style={{
              width: 36,
              height: 36,
              ...(isActive ? { boxShadow: '0 0 12px rgba(0,212,255,0.3)' } : {}),
            }}
          >
            {tab.icon}
          </button>
        )
      })}
    </div>
  )
}
