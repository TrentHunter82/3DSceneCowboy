import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { KeyboardShortcutModal } from './KeyboardShortcutModal'

describe('KeyboardShortcutModal', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <KeyboardShortcutModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders modal content when isOpen=true', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('shows "Keyboard Shortcuts" heading', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)
    const heading = screen.getByRole('heading', { name: /keyboard shortcuts/i })
    expect(heading).toBeInTheDocument()
  })

  it('has close button with aria-label="Close shortcuts"', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)
    const closeButton = screen.getByRole('button', { name: 'Close shortcuts' })
    expect(closeButton).toBeInTheDocument()
  })

  it('clicking close button calls onClose', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<KeyboardShortcutModal isOpen={true} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: 'Close shortcuts' })
    await user.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutModal isOpen={true} onClose={onClose} />)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutModal isOpen={true} onClose={onClose} />)

    // The backdrop is the outermost fixed div. handleBackdropClick checks e.target === backdropRef.current.
    // We need to click directly on the backdrop element, not a child.
    // The backdrop has the class "fixed inset-0 ...". It's the parent of the modal card.
    const backdrop = screen.getByText('Keyboard Shortcuts').closest('.fixed')!
    // fireEvent.click sets target to the element we click on
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Tools section with Q, W, E, R shortcuts', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('Select tool')).toBeInTheDocument()
    expect(screen.getByText('Move tool')).toBeInTheDocument()
    expect(screen.getByText('Rotate tool')).toBeInTheDocument()
    expect(screen.getByText('Scale tool')).toBeInTheDocument()
  })

  it('shows Objects section with Delete, Ctrl+D', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Objects')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Backspace')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('Delete selected')).toBeInTheDocument()
    expect(screen.getByText('Duplicate selected')).toBeInTheDocument()
  })

  it('shows History section with Ctrl+Z', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('History')).toBeInTheDocument()
    // 'Z' appears in both Ctrl+Z (Undo) and Ctrl+Shift+Z (Redo)
    const zKeys = screen.getAllByText('Z')
    expect(zKeys.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('shows View section with ? shortcut', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Show shortcuts')).toBeInTheDocument()
  })

  it('shows Copy, Paste, and Select all shortcuts (now implemented)', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    // Copy/paste are fully implemented - no "coming soon" labels
    expect(screen.queryAllByText(/coming soon/i)).toHaveLength(0)

    expect(screen.getByText('Copy selected')).toBeInTheDocument()
    expect(screen.getByText('Paste')).toBeInTheDocument()
    expect(screen.getByText('Select all')).toBeInTheDocument()
  })

  it('shows footer with "?" key instruction', () => {
    render(<KeyboardShortcutModal isOpen={true} onClose={vi.fn()} />)

    // The footer contains "Press ? to toggle this dialog"
    // The "?" is inside a <kbd> element
    expect(screen.getByText(/to toggle this dialog/)).toBeInTheDocument()
  })
})
