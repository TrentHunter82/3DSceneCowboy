import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ToolbarDropdown } from './ToolbarDropdown'

function makeItems(overrides?: { disabled?: boolean }[]) {
  return [
    { id: 'cut', icon: '✂', label: 'Cut', onClick: vi.fn(), ...overrides?.[0] },
    { id: 'copy', icon: '📋', label: 'Copy', onClick: vi.fn(), ...overrides?.[1] },
    { id: 'paste', icon: '📎', label: 'Paste', onClick: vi.fn(), ...overrides?.[2] },
  ]
}

/** Dispatch a keydown event on document, wrapped in act() for React state updates */
function pressKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('ToolbarDropdown', () => {
  it('renders trigger button with text', () => {
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    expect(screen.getByRole('button', { name: 'File menu' })).toBeInTheDocument()
    expect(screen.getByText('File')).toBeInTheDocument()
  })

  it('trigger has aria-haspopup and aria-expanded="false" when closed', () => {
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    const trigger = screen.getByRole('button', { name: 'File menu' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking trigger opens dropdown menu and sets aria-expanded="true"', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    const trigger = screen.getByRole('button', { name: 'File menu' })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('menu items have role="menuitem"', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="Edit" items={items} ariaLabel="Edit menu" />)

    await user.click(screen.getByRole('button', { name: 'Edit menu' }))

    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems).toHaveLength(3)
    expect(menuitems[0]).toHaveTextContent('Cut')
    expect(menuitems[1]).toHaveTextContent('Copy')
    expect(menuitems[2]).toHaveTextContent('Paste')
  })

  it('clicking an item calls onClick and closes dropdown', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="Edit" items={items} ariaLabel="Edit menu" />)

    // Open
    await user.click(screen.getByRole('button', { name: 'Edit menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Click item
    await user.click(screen.getByRole('menuitem', { name: /Cut/ }))

    expect(items[0].onClick).toHaveBeenCalledTimes(1)
    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Escape key closes dropdown', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    // Open
    await user.click(screen.getByRole('button', { name: 'File menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Press Escape on document
    pressKey('Escape')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('grid mode renders items in grid layout', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="Add" items={items} ariaLabel="Add menu" columns={3} />)

    await user.click(screen.getByRole('button', { name: 'Add menu' }))

    // All items should still be rendered as menuitems
    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems).toHaveLength(3)

    // Each grid menuitem should have flex-col class for vertical icon+label layout
    for (const item of menuitems) {
      expect(item.className).toContain('flex-col')
    }
  })

  it('clicking trigger again toggles dropdown closed', async () => {
    const user = userEvent.setup()
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    const trigger = screen.getByRole('button', { name: 'File menu' })

    // Open
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Close by clicking trigger again
    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disabled items are not clickable', async () => {
    const user = userEvent.setup()
    const items = [
      { id: 'action', icon: '⚡', label: 'Action', onClick: vi.fn(), disabled: true },
    ]
    render(<ToolbarDropdown trigger="Tools" items={items} ariaLabel="Tools menu" />)

    await user.click(screen.getByRole('button', { name: 'Tools menu' }))

    const menuitem = screen.getByRole('menuitem', { name: /Action/ })
    await user.click(menuitem)

    expect(items[0].onClick).not.toHaveBeenCalled()
  })

  it('renders trigger icon when triggerIcon prop is provided', () => {
    const items = makeItems()
    render(<ToolbarDropdown trigger="File" triggerIcon="📁" items={items} ariaLabel="File menu" />)

    expect(screen.getByText('📁')).toBeInTheDocument()
  })

  it('renders shortcut text for items that have one', async () => {
    const user = userEvent.setup()
    const items = [
      { id: 'save', icon: '💾', label: 'Save', shortcut: 'Ctrl+S', onClick: vi.fn() },
    ]
    render(<ToolbarDropdown trigger="File" items={items} ariaLabel="File menu" />)

    await user.click(screen.getByRole('button', { name: 'File menu' }))

    expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
  })
})
