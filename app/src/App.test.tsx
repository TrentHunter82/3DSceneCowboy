import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import App from './App'
import { useSceneStore } from './stores/useSceneStore'
import { useUIStore } from './stores/useUIStore'

// Reset store between tests
beforeEach(() => {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
  useUIStore.setState({
    sidebarCollapsed: false,
    pivotMode: 'individual',
    theme: 'dark',
    contextMenu: null,
    rightSidebarTab: 'object',
    showWelcome: false,
    bottomPanelTab: 'timeline',
    bottomPanelHeight: 240,
    bottomPanelCollapsed: true,
    assetPanelMode: 'tab',
  })
})

describe('App', () => {
  it('renders scene name input', () => {
    render(<App />)
    expect(screen.getByDisplayValue('Untitled Scene')).toBeInTheDocument()
  })

  it('renders toolbar with tool buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scale' })).toBeInTheDocument()
  })

  it('renders add dropdown trigger', async () => {
    const user = userEvent.setup()
    render(<App />)
    const addBtn = screen.getByRole('button', { name: 'Add objects' })
    expect(addBtn).toBeInTheDocument()
    await user.click(addBtn)
    expect(screen.getByRole('menuitem', { name: 'Box' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sphere' })).toBeInTheDocument()
  })

  it('renders empty scene message', () => {
    render(<App />)
    expect(screen.getByText('No objects')).toBeInTheDocument()
  })

  it('renders properties panel placeholder', () => {
    render(<App />)
    expect(
      screen.getByText('Select an object to view its properties')
    ).toBeInTheDocument()
  })

  it('shows object count footer', () => {
    render(<App />)
    expect(screen.getByText('0 objects')).toBeInTheDocument()
  })
})
