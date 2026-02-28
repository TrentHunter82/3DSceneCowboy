import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'

function makeItems(overrides?: Partial<ContextMenuItem>[]): ContextMenuItem[] {
  return [
    { label: 'Cut', icon: '✂', onClick: vi.fn(), ...overrides?.[0] },
    { label: 'Copy', icon: '📋', onClick: vi.fn(), ...overrides?.[1] },
    { label: '', icon: '', onClick: vi.fn(), separator: true },
    { label: 'Paste', icon: '📎', onClick: vi.fn(), ...overrides?.[2] },
  ]
}

/** Dispatch a keydown event on document, wrapped in act() for React state updates */
function pressKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('ContextMenu', () => {
  let onClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onClose = vi.fn()
  })

  it('renders with role="menu" and aria-label', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(menu).toHaveAttribute('aria-label', 'Context menu')
  })

  it('renders all action items as menuitems', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems).toHaveLength(3)
    expect(menuitems[0]).toHaveTextContent('Cut')
    expect(menuitems[1]).toHaveTextContent('Copy')
    expect(menuitems[2]).toHaveTextContent('Paste')
  })

  it('renders separator with role="separator"', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const separator = screen.getByRole('separator')
    expect(separator).toBeInTheDocument()
  })

  it('positions at specified x,y coordinates', () => {
    const items = makeItems()
    render(<ContextMenu x={150} y={250} items={items} onClose={onClose} />)

    const menu = screen.getByRole('menu')
    expect(menu.style.left).toBe('150px')
    expect(menu.style.top).toBe('250px')
    expect(menu.style.position).toBe('fixed')
  })

  it('Escape key calls onClose', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    pressKey('Escape')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ArrowDown moves focus to next item', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const menuitems = screen.getAllByRole('menuitem')
    // Initially first item (index 0) is focused
    expect(menuitems[0]).toHaveAttribute('tabIndex', '0')
    expect(menuitems[1]).toHaveAttribute('tabIndex', '-1')

    pressKey('ArrowDown')

    const updatedItems = screen.getAllByRole('menuitem')
    expect(updatedItems[0]).toHaveAttribute('tabIndex', '-1')
    expect(updatedItems[1]).toHaveAttribute('tabIndex', '0')
  })

  it('ArrowUp moves focus to previous item', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    // Move down first so we're on item 1
    pressKey('ArrowDown')

    // Now arrow up goes back to item 0
    pressKey('ArrowUp')

    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems[0]).toHaveAttribute('tabIndex', '0')
    expect(menuitems[1]).toHaveAttribute('tabIndex', '-1')
  })

  it('ArrowDown wraps around from last to first', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    // 3 action items. Press ArrowDown 3 times to wrap around.
    pressKey('ArrowDown')
    pressKey('ArrowDown')
    pressKey('ArrowDown')

    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems[0]).toHaveAttribute('tabIndex', '0')
    expect(menuitems[1]).toHaveAttribute('tabIndex', '-1')
    expect(menuitems[2]).toHaveAttribute('tabIndex', '-1')
  })

  it('ArrowUp wraps around from first to last', () => {
    const items = makeItems()
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    // Start at index 0, ArrowUp should wrap to last item (index 2)
    pressKey('ArrowUp')

    const menuitems = screen.getAllByRole('menuitem')
    expect(menuitems[0]).toHaveAttribute('tabIndex', '-1')
    expect(menuitems[1]).toHaveAttribute('tabIndex', '-1')
    expect(menuitems[2]).toHaveAttribute('tabIndex', '0')
  })

  it('Enter activates focused item and calls onClose', () => {
    const clickHandler = vi.fn()
    const items: ContextMenuItem[] = [
      { label: 'Action', icon: '⚡', onClick: clickHandler },
    ]
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    pressKey('Enter')

    expect(clickHandler).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Space activates focused item and calls onClose', () => {
    const clickHandler = vi.fn()
    const items: ContextMenuItem[] = [
      { label: 'Action', icon: '⚡', onClick: clickHandler },
    ]
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    pressKey(' ')

    expect(clickHandler).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking outside calls onClose', () => {
    const items = makeItems()
    const { container } = render(
      <div>
        <div data-testid="outside">outside</div>
        <ContextMenu x={100} y={200} items={items} onClose={onClose} />
      </div>
    )

    // Dispatch mousedown on an element outside the menu
    fireEvent.mouseDown(screen.getByTestId('outside'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disabled items cannot be activated via Enter', () => {
    const clickHandler = vi.fn()
    const items: ContextMenuItem[] = [
      { label: 'Disabled Action', icon: '🚫', onClick: clickHandler, disabled: true },
    ]
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    pressKey('Enter')

    expect(clickHandler).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clicking a non-disabled item calls onClick and onClose', () => {
    const clickHandler = vi.fn()
    const items: ContextMenuItem[] = [
      { label: 'Normal', icon: '✅', onClick: clickHandler },
    ]
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const menuitem = screen.getByRole('menuitem', { name: /Normal/ })
    fireEvent.click(menuitem)

    expect(clickHandler).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking a disabled item does not call onClick', () => {
    const clickHandler = vi.fn()
    const items: ContextMenuItem[] = [
      { label: 'Disabled', icon: '🚫', onClick: clickHandler, disabled: true },
    ]
    render(<ContextMenu x={100} y={200} items={items} onClose={onClose} />)

    const menuitem = screen.getByRole('menuitem', { name: /Disabled/ })
    fireEvent.click(menuitem)

    expect(clickHandler).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
