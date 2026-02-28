import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { ObjectList } from './ObjectList'
import { useSceneStore } from '../stores/useSceneStore'

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
}

describe('ObjectList', () => {
  beforeEach(resetStore)

  it('shows empty state message', () => {
    render(<ObjectList />)
    expect(screen.getByText('No objects')).toBeInTheDocument()
  })

  it('shows heading', () => {
    render(<ObjectList />)
    expect(screen.getByText('Scene')).toBeInTheDocument()
  })

  it('shows 0 objects count', () => {
    render(<ObjectList />)
    expect(screen.getByText('0 objects')).toBeInTheDocument()
  })

  it('renders objects when they exist', () => {
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    render(<ObjectList />)
    expect(screen.getByText('Box 1')).toBeInTheDocument()
    expect(screen.getByText('Sphere 1')).toBeInTheDocument()
  })

  it('shows correct object count', () => {
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    render(<ObjectList />)
    expect(screen.getByText('2 objects')).toBeInTheDocument()
  })

  it('uses singular "object" for count of 1', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    expect(screen.getByText('1 object')).toBeInTheDocument()
  })

  it('selects object on click', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    // Deselect
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    await user.click(screen.getByText('Box 1'))
    expect(useSceneStore.getState().selectedId).toBe(
      useSceneStore.getState().objects[0].id
    )
  })

  it('toggles object visibility', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)

    // Object starts visible, click Hide to toggle off
    const hideBtn = screen.getByTitle('Hide')
    await user.click(hideBtn)
    expect(useSceneStore.getState().objects[0].visible).toBe(false)

    // Now it should show 'Show' button, click to toggle back
    const showBtn = screen.getByTitle('Show')
    await user.click(showBtn)
    expect(useSceneStore.getState().objects[0].visible).toBe(true)
  })

  it('deletes object', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)

    const deleteBtn = screen.getByTitle('Delete')
    await user.click(deleteBtn)
    expect(useSceneStore.getState().objects).toHaveLength(0)
  })

  it('visibility toggle does not select object', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')

    // Select the first object
    const firstId = useSceneStore.getState().objects[0].id
    useSceneStore.getState().selectObject(firstId)

    render(<ObjectList />)

    // Click the visibility toggle on the second object (both have 'Hide' title)
    const hideBtns = screen.getAllByTitle('Hide')
    await user.click(hideBtns[1])

    // selectedId should still be the first object
    expect(useSceneStore.getState().selectedId).toBe(firstId)
  })

  it('delete does not select object', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')

    // Select the first object
    const firstId = useSceneStore.getState().objects[0].id
    useSceneStore.getState().selectObject(firstId)

    render(<ObjectList />)

    // Click the delete button on the second object
    const deleteBtns = screen.getAllByTitle('Delete')
    await user.click(deleteBtns[1])

    // selectedId should still be the first object
    expect(useSceneStore.getState().selectedId).toBe(firstId)
  })

  // ── Multi-select ────────────────────────────────────────────────────

  describe('multi-select', () => {
    it('ctrl+click on objects adds to selectedIds', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      // Deselect so we start clean
      useSceneStore.getState().selectObject(null)

      render(<ObjectList />)

      const box = screen.getByText('Box 1')
      const sphere = screen.getByText('Sphere 1')

      // Ctrl+click box to toggle-select it
      fireEvent.click(box, { ctrlKey: true })
      expect(useSceneStore.getState().selectedIds).toContain(
        useSceneStore.getState().objects[0].id
      )

      // Ctrl+click sphere to add it
      fireEvent.click(sphere, { ctrlKey: true })
      const ids = useSceneStore.getState().selectedIds
      expect(ids).toContain(useSceneStore.getState().objects[0].id)
      expect(ids).toContain(useSceneStore.getState().objects[1].id)
      expect(ids).toHaveLength(2)
    })

    it('ctrl+click already-selected removes from selectedIds', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().selectObject(null)

      render(<ObjectList />)

      const box = screen.getByText('Box 1')
      const sphere = screen.getByText('Sphere 1')

      // Select both via ctrl+click
      fireEvent.click(box, { ctrlKey: true })
      fireEvent.click(sphere, { ctrlKey: true })
      expect(useSceneStore.getState().selectedIds).toHaveLength(2)

      // Ctrl+click box again to deselect it
      fireEvent.click(box, { ctrlKey: true })
      const ids = useSceneStore.getState().selectedIds
      expect(ids).not.toContain(useSceneStore.getState().objects[0].id)
      expect(ids).toContain(useSceneStore.getState().objects[1].id)
      expect(ids).toHaveLength(1)
    })

    it('shift+click selects range', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().addObject('cylinder')

      render(<ObjectList />)

      // Normal click on Box 1 to set selectedId as anchor
      fireEvent.click(screen.getByText('Box 1'))
      expect(useSceneStore.getState().selectedId).toBe(
        useSceneStore.getState().objects[0].id
      )

      // Shift+click on Cylinder 1 to select range
      fireEvent.click(screen.getByText('Cylinder 1'), { shiftKey: true })

      const ids = useSceneStore.getState().selectedIds
      expect(ids).toHaveLength(3)
      expect(ids).toContain(useSceneStore.getState().objects[0].id)
      expect(ids).toContain(useSceneStore.getState().objects[1].id)
      expect(ids).toContain(useSceneStore.getState().objects[2].id)
    })
  })

  // ── Hierarchy display ───────────────────────────────────────────────

  describe('hierarchy display', () => {
    const parent = {
      id: 'p1',
      name: 'Parent Box',
      type: 'box' as const,
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#c49a5c',
      visible: true,
      locked: false,
      material: {
        type: 'standard' as const,
        color: '#c49a5c',
        opacity: 1,
        transparent: false,
        wireframe: false,
        metalness: 0.1,
        roughness: 0.7,
      },
    }
    const child = {
      ...parent,
      id: 'c1',
      name: 'Child Sphere',
      type: 'sphere' as const,
      parentId: 'p1',
    }

    function setHierarchy() {
      useSceneStore.setState({
        objects: [parent, child],
        selectedId: null,
        selectedIds: [],
        history: [{ objects: [parent, child], selectedId: null, selectedIds: [] }],
        historyIndex: 0,
      })
    }

    it('child objects are rendered', () => {
      setHierarchy()
      render(<ObjectList />)

      expect(screen.getByText('Parent Box')).toBeInTheDocument()
      expect(screen.getByText('Child Sphere')).toBeInTheDocument()
    })

    it('parent nodes show expand/collapse button', () => {
      setHierarchy()
      render(<ObjectList />)

      // Parent starts expanded, so aria-label should be "Collapse Parent Box"
      expect(
        screen.getByRole('button', { name: 'Collapse Parent Box' })
      ).toBeInTheDocument()
    })

    it('clicking collapse button hides children', async () => {
      setHierarchy()
      const user = userEvent.setup()
      render(<ObjectList />)

      // Child is visible initially
      expect(screen.getByText('Child Sphere')).toBeInTheDocument()

      // Collapse the parent
      const collapseBtn = screen.getByRole('button', {
        name: 'Collapse Parent Box',
      })
      await user.click(collapseBtn)

      // Child should be hidden
      expect(screen.queryByText('Child Sphere')).not.toBeInTheDocument()

      // Button label should now say "Expand"
      expect(
        screen.getByRole('button', { name: 'Expand Parent Box' })
      ).toBeInTheDocument()
    })

    it('clicking expand button shows children again', async () => {
      setHierarchy()
      const user = userEvent.setup()
      render(<ObjectList />)

      // Collapse first
      await user.click(
        screen.getByRole('button', { name: 'Collapse Parent Box' })
      )
      expect(screen.queryByText('Child Sphere')).not.toBeInTheDocument()

      // Expand again
      await user.click(
        screen.getByRole('button', { name: 'Expand Parent Box' })
      )
      expect(screen.getByText('Child Sphere')).toBeInTheDocument()
    })
  })

  // ── Object properties ───────────────────────────────────────────────

  describe('object properties', () => {
    it('all object items have draggable attribute', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      render(<ObjectList />)

      const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
      const options = listbox.querySelectorAll('[role="option"]')
      expect(options).toHaveLength(2)
      for (const option of options) {
        expect(option).toHaveAttribute('draggable', 'true')
      }
    })

    it('lock toggle button exists for each object', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      render(<ObjectList />)

      // Each unlocked object should have a "Lock <name>" button
      expect(
        screen.getByRole('button', { name: 'Lock Box 1' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Lock Sphere 1' })
      ).toBeInTheDocument()
    })

    it('object items show correct aria-selected for multi-select', () => {
      useSceneStore.getState().addObject('box')
      useSceneStore.getState().addObject('sphere')
      useSceneStore.getState().addObject('cylinder')

      // Clear selection first, then select only the first two
      const ids = useSceneStore.getState().objects.map(o => o.id)
      useSceneStore.getState().selectObject(null)
      useSceneStore.getState().toggleSelectObject(ids[0])
      useSceneStore.getState().toggleSelectObject(ids[1])

      render(<ObjectList />)

      const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
      const options = within(listbox).getAllByRole('option')
      // First two should be selected
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
      // Third should not
      expect(options[2]).toHaveAttribute('aria-selected', 'false')
    })
  })
})
