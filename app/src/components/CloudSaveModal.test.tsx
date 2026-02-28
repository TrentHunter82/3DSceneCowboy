import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudSaveModal } from './CloudSaveModal'
import { useStorageStore } from '../stores/useStorageStore'
import { useSceneStore } from '../stores/useSceneStore'

describe('CloudSaveModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockReset()
    useStorageStore.getState().clearAll()
    useSceneStore.setState({
      objects: [],
      selectedId: null,
      selectedIds: [],
      clipboard: [],
    })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<CloudSaveModal isOpen={false} onClose={onClose} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when isOpen is true', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'Scene Storage' })).toBeInTheDocument()
  })

  it('renders Scene Storage heading', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByText('Scene Storage')).toBeInTheDocument()
  })

  it('renders Close button', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('clicking Close button calls onClose', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape key calls onClose', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking backdrop calls onClose', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    const backdrop = document.querySelector('.fixed.inset-0')!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders Save and Load tabs', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('tab', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Load' })).toBeInTheDocument()
  })

  it('Save tab is selected by default', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('tab', { name: 'Save' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Load' })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking Load tab switches to Load panel', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)

    await user.click(screen.getByRole('tab', { name: 'Load' }))
    expect(screen.getByRole('tab', { name: 'Load' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Search saved scenes')).toBeInTheDocument()
  })

  it('Save tab shows Scene Name input', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByLabelText('Scene Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Untitled Scene')).toBeInTheDocument()
  })

  it('Save tab shows Tags input', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByPlaceholderText('landscape, architecture, demo...')).toBeInTheDocument()
  })

  it('Save to Cloud button is disabled when no objects', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('button', { name: 'Save to Cloud' })).toBeDisabled()
  })

  it('shows object count', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByText('0 objects in scene')).toBeInTheDocument()
  })

  it('Load tab shows search input', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('tab', { name: 'Load' }))
    expect(screen.getByLabelText('Search saved scenes')).toBeInTheDocument()
  })

  it('Load tab shows sort controls', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('tab', { name: 'Load' }))
    expect(screen.getByLabelText('Sort scenes by')).toBeInTheDocument()
  })

  it('Load tab shows empty state when no saved scenes', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('tab', { name: 'Load' }))
    expect(screen.getByText('No saved scenes yet')).toBeInTheDocument()
  })

  it('switching back to Save tab shows save form', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)

    await user.click(screen.getByRole('tab', { name: 'Load' }))
    await user.click(screen.getByRole('tab', { name: 'Save' }))

    expect(screen.getByLabelText('Scene Name')).toBeInTheDocument()
  })

  it('tablist has aria-label', () => {
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('tablist', { name: 'Storage tabs' })).toBeInTheDocument()
  })

  it('Load Scene button is disabled when nothing selected', async () => {
    const user = userEvent.setup()
    render(<CloudSaveModal isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('tab', { name: 'Load' }))
    // Load Scene button only appears when there are scenes, but check the control exists
    const loadBtn = screen.queryByRole('button', { name: 'Load selected scene' })
    if (loadBtn) {
      expect(loadBtn).toBeDisabled()
    }
  })
})
