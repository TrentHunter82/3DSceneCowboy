import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './useUIStore'

function resetStore() {
  useUIStore.setState({
    contextMenu: null,
    sidebarCollapsed: false,
    pivotMode: 'individual',
    theme: 'dark',
  })
}

describe('useUIStore', () => {
  beforeEach(resetStore)

  it('initial state: contextMenu is null', () => {
    expect(useUIStore.getState().contextMenu).toBeNull()
  })

  it('initial state: sidebarCollapsed is false', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it('initial state: pivotMode is individual', () => {
    expect(useUIStore.getState().pivotMode).toBe('individual')
  })

  it('initial state: theme is dark', () => {
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('showContextMenu sets x, y, objectId', () => {
    useUIStore.getState().showContextMenu(100, 200, 'obj-1')

    const menu = useUIStore.getState().contextMenu
    expect(menu).toEqual({ x: 100, y: 200, objectId: 'obj-1' })
  })

  it('hideContextMenu sets contextMenu to null', () => {
    useUIStore.getState().showContextMenu(50, 75, 'obj-2')
    expect(useUIStore.getState().contextMenu).not.toBeNull()

    useUIStore.getState().hideContextMenu()
    expect(useUIStore.getState().contextMenu).toBeNull()
  })

  it('toggleSidebar toggles sidebarCollapsed from false to true', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)

    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
  })

  it('toggleSidebar toggles back from true to false', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)

    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it('multiple context menu calls replace previous', () => {
    useUIStore.getState().showContextMenu(10, 20, 'first')
    expect(useUIStore.getState().contextMenu).toEqual({ x: 10, y: 20, objectId: 'first' })

    useUIStore.getState().showContextMenu(300, 400, 'second')
    expect(useUIStore.getState().contextMenu).toEqual({ x: 300, y: 400, objectId: 'second' })
  })

  it('setPivotMode changes pivot mode', () => {
    useUIStore.getState().setPivotMode('median')
    expect(useUIStore.getState().pivotMode).toBe('median')

    useUIStore.getState().setPivotMode('active')
    expect(useUIStore.getState().pivotMode).toBe('active')

    useUIStore.getState().setPivotMode('individual')
    expect(useUIStore.getState().pivotMode).toBe('individual')
  })

  it('toggleTheme switches from dark to light', () => {
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('light')
  })

  it('toggleTheme switches from light back to dark', () => {
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('light')

    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('toggleTheme sets data-theme attribute on document', () => {
    useUIStore.getState().toggleTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    useUIStore.getState().toggleTheme()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
