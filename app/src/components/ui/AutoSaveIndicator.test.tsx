import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import { useStorageStore } from '../../stores/useStorageStore'

function resetStore() {
  useStorageStore.setState({
    scenes: [],
    activeSceneId: null,
    filter: {},
    autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    saveStatus: 'saved',
    lastSavedAt: null,
  })
}

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    resetStore()
  })

  it('shows "Saved" status with green dot when saveStatus is saved', () => {
    useStorageStore.setState({ saveStatus: 'saved' })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    // Green dot class check
    const container = screen.getByRole('button')
    const dot = container.querySelector('span')!
    expect(dot.className).toContain('bg-green-400')
  })

  it('shows "Saving..." with pulse animation when saveStatus is saving', () => {
    useStorageStore.setState({ saveStatus: 'saving' })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    const container = screen.getByRole('button')
    const dot = container.querySelector('span')!
    expect(dot.className).toContain('bg-amber-400')
    expect(dot.className).toContain('animate-pulse')
  })

  it('shows "Unsaved" when saveStatus is unsaved', () => {
    useStorageStore.setState({ saveStatus: 'unsaved' })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
  })

  it('shows "Save failed" when saveStatus is error', () => {
    useStorageStore.setState({ saveStatus: 'error' })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })

  it('shows relative time when saved and lastSavedAt is set', () => {
    // Set lastSavedAt to 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    useStorageStore.setState({ saveStatus: 'saved', lastSavedAt: fiveMinAgo })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('5m ago')).toBeInTheDocument()
  })

  it('shows "just now" for very recent saves', () => {
    const justNow = new Date(Date.now() - 10 * 1000).toISOString()
    useStorageStore.setState({ saveStatus: 'saved', lastSavedAt: justNow })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('shows "Auto-save off" when autoSave.enabled is false', () => {
    useStorageStore.setState({
      autoSave: { enabled: false, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)
    expect(screen.getByText('Auto-save off')).toBeInTheDocument()
  })

  it('does not show "Auto-save off" when autoSave.enabled is true', () => {
    useStorageStore.setState({
      autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)
    expect(screen.queryByText('Auto-save off')).not.toBeInTheDocument()
  })

  it('clicking toggles autoSave.enabled from true to false', async () => {
    const user = userEvent.setup()
    useStorageStore.setState({
      autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)

    await user.click(screen.getByRole('button'))
    expect(useStorageStore.getState().autoSave.enabled).toBe(false)
  })

  it('clicking toggles autoSave.enabled from false to true', async () => {
    const user = userEvent.setup()
    useStorageStore.setState({
      autoSave: { enabled: false, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)

    await user.click(screen.getByRole('button'))
    expect(useStorageStore.getState().autoSave.enabled).toBe(true)
  })

  it('keyboard Enter triggers toggle', async () => {
    const user = userEvent.setup()
    useStorageStore.setState({
      autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)

    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(useStorageStore.getState().autoSave.enabled).toBe(false)
  })

  it('keyboard Space triggers toggle', async () => {
    const user = userEvent.setup()
    useStorageStore.setState({
      autoSave: { enabled: true, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)

    screen.getByRole('button').focus()
    await user.keyboard(' ')
    expect(useStorageStore.getState().autoSave.enabled).toBe(false)
  })

  it('has correct aria-label with status info when saved', () => {
    useStorageStore.setState({ saveStatus: 'saved' })
    render(<AutoSaveIndicator />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Save status: Saved'),
    )
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('disable auto-save'),
    )
  })

  it('has correct aria-label including relative time when lastSavedAt is set', () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    useStorageStore.setState({ saveStatus: 'saved', lastSavedAt: twoMinAgo })
    render(<AutoSaveIndicator />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2m ago'),
    )
  })

  it('has aria-label with "enable" when autoSave is disabled', () => {
    useStorageStore.setState({
      autoSave: { enabled: false, intervalMs: 30000, maxVersions: 10 },
    })
    render(<AutoSaveIndicator />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('enable auto-save'),
    )
  })

  it('has title with "Never saved" when lastSavedAt is null', () => {
    useStorageStore.setState({ lastSavedAt: null })
    render(<AutoSaveIndicator />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Never saved')
  })

  it('has title with date when lastSavedAt is set', () => {
    const timestamp = '2026-01-15T10:30:00.000Z'
    useStorageStore.setState({ lastSavedAt: timestamp })
    render(<AutoSaveIndicator />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', expect.stringContaining('Last saved:'))
  })
})
