import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { PropertiesPanel } from './PropertiesPanel'
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

describe('PropertiesPanel', () => {
  beforeEach(resetStore)

  it('shows placeholder when nothing selected', () => {
    render(<PropertiesPanel />)
    expect(
      screen.getByText('Select an object to view its properties')
    ).toBeInTheDocument()
  })

  it('shows Properties heading', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('shows object name when selected', () => {
    useSceneStore.getState().addObject('box')
    // addObject auto-selects
    render(<PropertiesPanel />)
    const nameInput = screen.getByDisplayValue('Box 1')
    expect(nameInput).toBeInTheDocument()
  })

  it('shows object type', () => {
    useSceneStore.getState().addObject('sphere')
    render(<PropertiesPanel />)
    expect(screen.getByText('sphere')).toBeInTheDocument()
  })

  it('shows position/rotation/scale labels', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByText('Position')).toBeInTheDocument()
    expect(screen.getByText('Rotation')).toBeInTheDocument()
    expect(screen.getByText('Scale')).toBeInTheDocument()
  })

  it('shows color input', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByText('Color')).toBeInTheDocument()
  })

  it('shows visible checkbox', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('updates name when typing', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const nameInput = screen.getByDisplayValue('Box 1')
    await user.clear(nameInput)
    await user.type(nameInput, 'My Custom Box')

    const obj = useSceneStore.getState().objects[0]
    expect(obj.name).toBe('My Custom Box')
  })

  it('updates position via Vec3Input', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const spinbuttons = screen.getAllByRole('spinbutton')
    // Position X is index 0
    const posXInput = spinbuttons[0]
    await user.clear(posXInput)
    await user.type(posXInput, '5')

    expect(useSceneStore.getState().objects[0].position.x).toBe(5)
  })

  it('updates rotation via Vec3Input', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const spinbuttons = screen.getAllByRole('spinbutton')
    // Rotation X is index 3
    const rotXInput = spinbuttons[3]
    await user.clear(rotXInput)
    await user.type(rotXInput, '45')

    expect(useSceneStore.getState().objects[0].rotation.x).toBe(45)
  })

  it('updates scale via Vec3Input', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const spinbuttons = screen.getAllByRole('spinbutton')
    // Scale X is index 6
    const scaleXInput = spinbuttons[6]
    await user.clear(scaleXInput)
    await user.type(scaleXInput, '3')

    expect(useSceneStore.getState().objects[0].scale.x).toBe(3)
  })

  it('updates color via hex text input', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    // The hex text input has an aria-label distinguishing it from the color picker
    const hexInput = screen.getByLabelText('Material color hex')
    await user.clear(hexInput)
    await user.type(hexInput, '#ff0000')

    expect(useSceneStore.getState().objects[0].color).toBe('#ff0000')
  })

  it('updates color via color picker', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    // The color picker is an input[type="color"]
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.change(colorInput, { target: { value: '#00ff00' } })

    expect(useSceneStore.getState().objects[0].color).toBe('#00ff00')
  })

  it('toggles visibility checkbox', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    // Multiple checkboxes now (wireframe, visible) - find Visible by its label
    const visibleCheckbox = screen.getByRole('checkbox', { name: /visible/i })
    // Box starts visible
    expect(useSceneStore.getState().objects[0].visible).toBe(true)

    await user.click(visibleCheckbox)
    expect(useSceneStore.getState().objects[0].visible).toBe(false)
  })

  it('Vec3Input handles empty/NaN input by falling back to 0', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const spinbuttons = screen.getAllByRole('spinbutton')
    // Position X is index 0
    const posXInput = spinbuttons[0]
    await user.clear(posXInput)

    expect(useSceneStore.getState().objects[0].position.x).toBe(0)
  })
})
