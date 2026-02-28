import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { Toolbar } from './Toolbar'
import { useSceneStore } from '../stores/useSceneStore'
import { useUIStore } from '../stores/useUIStore'

function resetStore() {
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
}

describe('Toolbar', () => {
  beforeEach(resetStore)

  it('renders tool mode buttons', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scale' })).toBeInTheDocument()
  })

  it('renders add dropdown trigger', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Add objects' })).toBeInTheDocument()
  })

  it('shows add items when dropdown is opened', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Add objects' }))
    expect(screen.getByRole('menuitem', { name: 'Box' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sphere' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Cylinder' })).toBeInTheDocument()
  })

  it('changes tool mode on click', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Move' }))
    expect(useSceneStore.getState().toolMode).toBe('move')

    await user.click(screen.getByRole('button', { name: 'Rotate' }))
    expect(useSceneStore.getState().toolMode).toBe('rotate')
  })

  it('adds object via dropdown', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Add objects' }))
    await user.click(screen.getByRole('menuitem', { name: 'Box' }))
    expect(useSceneStore.getState().objects).toHaveLength(1)
    expect(useSceneStore.getState().objects[0].type).toBe('box')
  })

  it('disables delete when nothing selected', () => {
    render(<Toolbar />)
    const deleteBtn = screen.getByRole('button', { name: /delete selected/i })
    expect(deleteBtn).toBeDisabled()
  })

  it('disables duplicate when nothing selected', () => {
    render(<Toolbar />)
    const dupBtn = screen.getByRole('button', { name: /duplicate selected/i })
    expect(dupBtn).toBeDisabled()
  })

  it('enables delete when object is selected', () => {
    useSceneStore.getState().addObject('box')
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /delete selected/i })).not.toBeDisabled()
  })

  it('shows current tool mode name', () => {
    render(<Toolbar />)
    expect(screen.getByText('select')).toBeInTheDocument()
  })

  it('renders undo/redo buttons', () => {
    render(<Toolbar />)
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument()
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument()
  })

  it('undo is disabled at initial state', () => {
    render(<Toolbar />)
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDisabled()
  })

  it('displays scene name input', () => {
    render(<Toolbar />)
    expect(screen.getByDisplayValue('Untitled Scene')).toBeInTheDocument()
  })

  describe('File dropdown', () => {
    it('renders file dropdown trigger', () => {
      render(<Toolbar />)
      expect(screen.getByRole('button', { name: 'File operations' })).toBeInTheDocument()
    })

    it('shows file items when opened', async () => {
      const user = userEvent.setup()
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'File operations' }))
      expect(screen.getByRole('menuitem', { name: /Save Scene/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /Load Scene/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /New Scene/ })).toBeInTheDocument()
    })
  })

  describe('Reset confirmation dialog', () => {
    it('clicking "New Scene" with objects shows confirmation dialog', async () => {
      const user = userEvent.setup()
      useSceneStore.getState().addObject('box')
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'File operations' }))
      await user.click(screen.getByRole('menuitem', { name: /New Scene/ }))

      expect(screen.getByText('Clear Scene?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('clicking "Cancel" closes the dialog', async () => {
      const user = userEvent.setup()
      useSceneStore.getState().addObject('box')
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'File operations' }))
      await user.click(screen.getByRole('menuitem', { name: /New Scene/ }))
      expect(screen.getByText('Clear Scene?')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByText('Clear Scene?')).not.toBeInTheDocument()
      expect(useSceneStore.getState().objects).toHaveLength(1)
    })

    it('clicking "Clear All" clears the scene and closes the dialog', async () => {
      const user = userEvent.setup()
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'File operations' }))
      await user.click(screen.getByRole('menuitem', { name: /New Scene/ }))
      expect(screen.getByText('Clear Scene?')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Clear All' }))
      expect(screen.queryByText('Clear Scene?')).not.toBeInTheDocument()
      expect(useSceneStore.getState().objects).toHaveLength(0)
    })

    it('clicking "New Scene" with empty scene clears immediately (no dialog)', async () => {
      const user = userEvent.setup()
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'File operations' }))
      await user.click(screen.getByRole('menuitem', { name: /New Scene/ }))
      expect(screen.queryByText('Clear Scene?')).not.toBeInTheDocument()
    })
  })

  describe('Import 3D model', () => {
    it('renders import model item in Add dropdown', async () => {
      const user = userEvent.setup()
      render(<Toolbar />)
      await user.click(screen.getByRole('button', { name: 'Add objects' }))
      expect(screen.getByRole('menuitem', { name: 'Import Model' })).toBeInTheDocument()
    })
  })

  describe('Theme toggle', () => {
    it('renders theme toggle button', () => {
      render(<Toolbar />)
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
    })

    it('theme toggle has correct aria-label for dark mode', () => {
      useUIStore.setState({ theme: 'dark' })
      render(<Toolbar />)
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
    })

    it('clicking theme toggle changes aria-label', async () => {
      const user = userEvent.setup()
      render(<Toolbar />)

      const toggleBtn = screen.getByRole('button', { name: 'Switch to light theme' })
      await user.click(toggleBtn)

      expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Switch to light theme' })).not.toBeInTheDocument()
    })
  })

  describe('Pivot mode selector', () => {
    it('pivot mode buttons NOT visible when no selection', () => {
      render(<Toolbar />)
      expect(screen.queryByRole('button', { name: 'Individual' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Median' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Active' })).not.toBeInTheDocument()
    })

    it('pivot mode buttons NOT visible when single selection', () => {
      useSceneStore.getState().addObject('box')
      render(<Toolbar />)
      expect(screen.queryByRole('button', { name: 'Individual' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Median' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Active' })).not.toBeInTheDocument()
    })

    it('pivot mode buttons visible when multiple objects selected', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      const ids = useSceneStore.getState().objects.map(o => o.id)
      useSceneStore.setState({ selectedIds: ids })
      render(<Toolbar />)

      expect(screen.getByRole('button', { name: 'Individual' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Median' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument()
    })

    it('clicking pivot mode button updates store', async () => {
      const user = userEvent.setup()
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      const ids = useSceneStore.getState().objects.map(o => o.id)
      useSceneStore.setState({ selectedIds: ids })
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'Median' }))
      expect(useUIStore.getState().pivotMode).toBe('median')

      await user.click(screen.getByRole('button', { name: 'Active' }))
      expect(useUIStore.getState().pivotMode).toBe('active')

      await user.click(screen.getByRole('button', { name: 'Individual' }))
      expect(useUIStore.getState().pivotMode).toBe('individual')
    })
  })

  describe('Welcome screen', () => {
    it('clicking logo opens welcome screen', async () => {
      const user = userEvent.setup()
      render(<Toolbar />)

      await user.click(screen.getByRole('button', { name: 'Show welcome screen' }))
      expect(useUIStore.getState().showWelcome).toBe(true)
    })
  })
})
