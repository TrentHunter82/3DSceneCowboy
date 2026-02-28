import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SidebarTabBar } from './SidebarTabBar'

const tabs = [
  { id: 'scene', icon: '🎬', label: 'Scene' },
  { id: 'assets', icon: '📦', label: 'Assets' },
  { id: 'plugins', icon: '🔌', label: 'Plugins' },
]

describe('SidebarTabBar', () => {
  it('renders all tabs', () => {
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Scene' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Assets' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Plugins' })).toBeInTheDocument()
  })

  it('each tab has role="tab"', () => {
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={vi.fn()} />)

    const allTabs = screen.getAllByRole('tab')
    expect(allTabs).toHaveLength(3)
  })

  it('active tab has aria-selected="true"', () => {
    render(<SidebarTabBar tabs={tabs} activeTab="assets" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Scene' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Plugins' })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a tab calls onTabChange with the tab id', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={onTabChange} />)

    await user.click(screen.getByRole('tab', { name: 'Assets' }))

    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(onTabChange).toHaveBeenCalledWith('assets')
  })

  it('container has role="tablist" with aria-orientation="vertical"', () => {
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={vi.fn()} />)

    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    expect(tablist).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('ArrowDown moves to next tab (wraps from last to first)', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    // Start on the last tab
    render(<SidebarTabBar tabs={tabs} activeTab="plugins" onTabChange={onTabChange} />)

    const lastTab = screen.getByRole('tab', { name: 'Plugins' })
    lastTab.focus()

    await user.keyboard('{ArrowDown}')

    // Should wrap to the first tab
    expect(onTabChange).toHaveBeenCalledWith('scene')
  })

  it('ArrowUp moves to previous tab (wraps from first to last)', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    // Start on the first tab
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={onTabChange} />)

    const firstTab = screen.getByRole('tab', { name: 'Scene' })
    firstTab.focus()

    await user.keyboard('{ArrowUp}')

    // Should wrap to the last tab
    expect(onTabChange).toHaveBeenCalledWith('plugins')
  })

  it('ArrowDown navigates sequentially without wrapping', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<SidebarTabBar tabs={tabs} activeTab="scene" onTabChange={onTabChange} />)

    const firstTab = screen.getByRole('tab', { name: 'Scene' })
    firstTab.focus()

    await user.keyboard('{ArrowDown}')

    expect(onTabChange).toHaveBeenCalledWith('assets')
  })

  it('ArrowUp navigates sequentially without wrapping', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<SidebarTabBar tabs={tabs} activeTab="plugins" onTabChange={onTabChange} />)

    const lastTab = screen.getByRole('tab', { name: 'Plugins' })
    lastTab.focus()

    await user.keyboard('{ArrowUp}')

    expect(onTabChange).toHaveBeenCalledWith('assets')
  })

  it('only the active tab has tabIndex=0', () => {
    render(<SidebarTabBar tabs={tabs} activeTab="assets" onTabChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Scene' })).toHaveAttribute('tabIndex', '-1')
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('tab', { name: 'Plugins' })).toHaveAttribute('tabIndex', '-1')
  })
})
