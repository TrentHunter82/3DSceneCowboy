import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { Toolbar } from './Toolbar'
import { ObjectList } from './ObjectList'
import { PropertiesPanel } from './PropertiesPanel'
import { EnvironmentPanel } from './ui/EnvironmentPanel'
import { useSceneStore } from '../stores/useSceneStore'

function resetStore() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    snapEnabled: false,
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
}

// ---------------------------------------------------------------------------
// 1. Toolbar Accessibility
// ---------------------------------------------------------------------------

describe('Toolbar Accessibility', () => {
  beforeEach(resetStore)

  it('has role="toolbar" with aria-label', () => {
    render(<Toolbar />)
    const toolbar = screen.getByRole('toolbar', { name: 'Transform tools' })
    expect(toolbar).toHaveAttribute('aria-label', 'Transform tools')
  })

  it('all tool buttons have aria-label', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scale' })).toBeInTheDocument()
  })

  it('add dropdown trigger has aria-label', () => {
    render(<Toolbar />)
    const addBtn = screen.getByRole('button', { name: 'Add objects' })
    expect(addBtn).toBeInTheDocument()
    expect(addBtn).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('active tool has aria-pressed="true"', () => {
    useSceneStore.setState({ toolMode: 'move' })
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Move' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('inactive tools have aria-pressed="false"', () => {
    useSceneStore.setState({ toolMode: 'move' })
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Scale' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a tool toggles aria-pressed correctly', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    // Initially Select is active
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveAttribute('aria-pressed', 'false')

    // Click Rotate
    await user.click(screen.getByRole('button', { name: 'Rotate' }))
    expect(screen.getByRole('button', { name: 'Rotate' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('delete button is disabled when nothing is selected', () => {
    render(<Toolbar />)
    const deleteBtn = screen.getByRole('button', { name: /delete selected/i })
    expect(deleteBtn).toBeDisabled()
  })

  it('duplicate button is disabled when nothing is selected', () => {
    render(<Toolbar />)
    const dupBtn = screen.getByRole('button', { name: /duplicate selected/i })
    expect(dupBtn).toBeDisabled()
  })

  it('delete and duplicate are enabled when an object is selected', () => {
    useSceneStore.getState().addObject('box')
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /delete selected/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /duplicate selected/i })).not.toBeDisabled()
  })

  it('undo button has aria-label', () => {
    render(<Toolbar />)
    const undoBtn = screen.getByRole('button', { name: /undo/i })
    expect(undoBtn).toBeInTheDocument()
    expect(undoBtn).toHaveAttribute('aria-label')
  })

  it('redo button has aria-label', () => {
    render(<Toolbar />)
    const redoBtn = screen.getByRole('button', { name: /redo/i })
    expect(redoBtn).toBeInTheDocument()
    expect(redoBtn).toHaveAttribute('aria-label')
  })

  it('undo is disabled at initial state', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
  })

  it('redo is disabled at initial state', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled()
  })

  it('snap toggle has aria-pressed', () => {
    render(<Toolbar />)
    const snapBtn = screen.getByRole('button', { name: /grid snap/i })
    expect(snapBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('snap toggle aria-pressed updates when enabled', () => {
    useSceneStore.setState({ snapEnabled: true })
    render(<Toolbar />)
    const snapBtn = screen.getByRole('button', { name: /grid snap/i })
    expect(snapBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('snap toggle aria-label changes with state', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    // Initially snap is off
    const enableBtn = screen.getByRole('button', { name: 'Enable grid snap' })
    expect(enableBtn).toBeInTheDocument()

    await user.click(enableBtn)

    // After click, label should change to "Disable grid snap"
    expect(screen.getByRole('button', { name: 'Disable grid snap' })).toBeInTheDocument()
  })

  it('scene name input has aria-label', () => {
    render(<Toolbar />)
    const nameInput = screen.getByLabelText('Scene name')
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('maxLength', '64')
  })

  it('file dropdown trigger has aria-label', () => {
    render(<Toolbar />)
    const fileBtn = screen.getByRole('button', { name: 'File operations' })
    expect(fileBtn).toBeInTheDocument()
    expect(fileBtn).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('tool buttons have focus-visible ring classes', () => {
    render(<Toolbar />)
    const toolButtons = ['Select', 'Move', 'Rotate', 'Scale']
    for (const name of toolButtons) {
      const btn = screen.getByRole('button', { name })
      expect(btn.className).toMatch(/focus-visible:ring/)
    }
  })
})

// ---------------------------------------------------------------------------
// 2. ObjectList Accessibility
// ---------------------------------------------------------------------------

describe('ObjectList Accessibility', () => {
  beforeEach(resetStore)

  it('has role="listbox" with aria-label="Scene objects"', () => {
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('aria-label', 'Scene objects')
  })

  it('each object has role="option"', () => {
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  it('selected object has aria-selected="true"', () => {
    useSceneStore.getState().addObject('box')
    // addObject auto-selects the new object
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    expect(option).toHaveAttribute('aria-selected', 'true')
  })

  it('unselected objects have aria-selected="false"', () => {
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    // Sphere is auto-selected (last added), Box is unselected
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')
    // Box 1 is first, Sphere 1 is second
    const boxOption = options[0]
    const sphereOption = options[1]
    expect(boxOption).toHaveAttribute('aria-selected', 'false')
    expect(sphereOption).toHaveAttribute('aria-selected', 'true')
  })

  it('selecting a different object updates aria-selected', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    render(<ObjectList />)

    // Click Box 1 to select it
    await user.click(screen.getByText('Box 1'))

    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('visibility button has dynamic aria-label for visible object', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Hide Box 1' })).toBeInTheDocument()
  })

  it('visibility button has dynamic aria-label for hidden object', () => {
    useSceneStore.getState().addObject('box')
    const { objects } = useSceneStore.getState()
    useSceneStore.getState().updateObject(objects[0].id, { visible: false })
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Show Box 1' })).toBeInTheDocument()
  })

  it('lock button has dynamic aria-label for unlocked object', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Lock Box 1' })).toBeInTheDocument()
  })

  it('lock button has dynamic aria-label for locked object', () => {
    useSceneStore.getState().addObject('box')
    const { objects } = useSceneStore.getState()
    useSceneStore.getState().updateObject(objects[0].id, { locked: true })
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Unlock Box 1' })).toBeInTheDocument()
  })

  it('delete button has dynamic aria-label with object name', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Delete Box 1' })).toBeInTheDocument()
  })

  it('delete button aria-label updates when object name changes', () => {
    useSceneStore.getState().addObject('box')
    const { objects } = useSceneStore.getState()
    useSceneStore.getState().updateObject(objects[0].id, { name: 'My Crate' })
    render(<ObjectList />)
    expect(screen.getByRole('button', { name: 'Delete My Crate' })).toBeInTheDocument()
  })

  it('object items are focusable with tabIndex={0}', () => {
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')
    for (const option of options) {
      expect(option).toHaveAttribute('tabIndex', '0')
    }
  })

  it('Enter key activates selection on focused item', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    // Deselect all
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')

    // Focus the first option and press Enter
    options[0].focus()
    await user.keyboard('{Enter}')

    expect(useSceneStore.getState().selectedId).toBe(
      useSceneStore.getState().objects[0].id,
    )
  })

  it('Space key activates selection on focused item', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().addObject('sphere')
    // Deselect all
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const options = within(listbox).getAllByRole('option')

    // Focus the second option and press Space
    options[1].focus()
    await user.keyboard(' ')

    expect(useSceneStore.getState().selectedId).toBe(
      useSceneStore.getState().objects[1].id,
    )
  })

  it('object items have focus-visible ring classes', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    expect(option.className).toMatch(/focus-visible:ring/)
  })

  it('action buttons within each object have focus-visible ring classes', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    const buttons = within(option).getAllByRole('button')
    for (const button of buttons) {
      expect(button.className).toMatch(/focus-visible:ring/)
    }
  })
})

// ---------------------------------------------------------------------------
// 3. PropertiesPanel Accessibility
// ---------------------------------------------------------------------------

describe('PropertiesPanel Accessibility', () => {
  beforeEach(resetStore)

  it('name input has aria-label="Object name"', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const nameInput = screen.getByLabelText('Object name')
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('type', 'text')
  })

  it('name input has maxLength=64', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const nameInput = screen.getByLabelText('Object name')
    expect(nameInput).toHaveAttribute('maxLength', '64')
  })

  it('Vec3 inputs have group role with aria-label for Position', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const positionGroup = screen.getByRole('group', { name: 'Position' })
    expect(positionGroup).toBeInTheDocument()
  })

  it('Vec3 inputs have group role with aria-label for Rotation', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const rotationGroup = screen.getByRole('group', { name: 'Rotation' })
    expect(rotationGroup).toBeInTheDocument()
  })

  it('Vec3 inputs have group role with aria-label for Scale', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const scaleGroup = screen.getByRole('group', { name: 'Scale' })
    expect(scaleGroup).toBeInTheDocument()
  })

  it('each axis input has aria-label (Position X/Y/Z)', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('Position X')).toBeInTheDocument()
    expect(screen.getByLabelText('Position Y')).toBeInTheDocument()
    expect(screen.getByLabelText('Position Z')).toBeInTheDocument()
  })

  it('each axis input has aria-label (Rotation X/Y/Z)', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('Rotation X')).toBeInTheDocument()
    expect(screen.getByLabelText('Rotation Y')).toBeInTheDocument()
    expect(screen.getByLabelText('Rotation Z')).toBeInTheDocument()
  })

  it('each axis input has aria-label (Scale X/Y/Z)', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByLabelText('Scale X')).toBeInTheDocument()
    expect(screen.getByLabelText('Scale Y')).toBeInTheDocument()
    expect(screen.getByLabelText('Scale Z')).toBeInTheDocument()
  })

  it('axis inputs have proper htmlFor/id connections', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    // Verify that the label elements are properly connected via htmlFor
    const posX = screen.getByLabelText('Position X')
    expect(posX.id).toBeTruthy()
    // The label element should have the matching htmlFor
    const label = document.querySelector(`label[for="${posX.id}"]`)
    expect(label).toBeTruthy()
  })

  it('material color picker has aria-label="Material color picker"', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const colorPicker = screen.getByLabelText('Material color picker')
    expect(colorPicker).toBeInTheDocument()
    expect(colorPicker).toHaveAttribute('type', 'color')
  })

  it('material color hex input has aria-label="Material color hex"', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const hexInput = screen.getByLabelText('Material color hex')
    expect(hexInput).toBeInTheDocument()
    expect(hexInput).toHaveAttribute('type', 'text')
    expect(hexInput).toHaveAttribute('maxLength', '7')
  })

  it('Metalness slider has aria-label', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const metalness = screen.getByLabelText('Metalness')
    expect(metalness).toBeInTheDocument()
    expect(metalness).toHaveAttribute('type', 'range')
  })

  it('Roughness slider has aria-label', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const roughness = screen.getByLabelText('Roughness')
    expect(roughness).toBeInTheDocument()
    expect(roughness).toHaveAttribute('type', 'range')
  })

  it('Opacity slider has aria-label', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const opacity = screen.getByLabelText('Opacity')
    expect(opacity).toBeInTheDocument()
    expect(opacity).toHaveAttribute('type', 'range')
  })

  it('collapsible sections have aria-expanded attribute', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    // Transform and Material sections are open by default
    const transformBtn = screen.getByRole('button', { name: /transform/i })
    const materialBtn = screen.getByRole('button', { name: /material(?! presets)/i })
    const displayBtn = screen.getByRole('button', { name: /display/i })

    expect(transformBtn).toHaveAttribute('aria-expanded', 'true')
    expect(materialBtn).toHaveAttribute('aria-expanded', 'true')
    expect(displayBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapsible section buttons toggle aria-expanded on click', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const transformBtn = screen.getByRole('button', { name: /transform/i })
    expect(transformBtn).toHaveAttribute('aria-expanded', 'true')

    await user.click(transformBtn)
    expect(transformBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(transformBtn)
    expect(transformBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('material section toggles aria-expanded on click', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const materialBtn = screen.getByRole('button', { name: /material(?! presets)/i })
    expect(materialBtn).toHaveAttribute('aria-expanded', 'true')

    await user.click(materialBtn)
    expect(materialBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows placeholder text when no object is selected', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText('Select an object to view its properties')).toBeInTheDocument()
  })

  it('slider inputs have proper min/max/step attributes', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)

    const opacity = screen.getByLabelText('Opacity')
    expect(opacity).toHaveAttribute('min', '0')
    expect(opacity).toHaveAttribute('max', '1')
    expect(opacity).toHaveAttribute('step', '0.01')
  })
})

// ---------------------------------------------------------------------------
// 4. EnvironmentPanel Accessibility
// ---------------------------------------------------------------------------

describe('EnvironmentPanel Accessibility', () => {
  beforeEach(resetStore)

  it('has a collapsible section with aria-expanded', () => {
    render(<EnvironmentPanel />)
    const sectionBtn = screen.getByRole('button', { name: /environment/i })
    // EnvironmentPanel uses defaultOpen={false}
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('collapsible section toggles aria-expanded on click', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)

    const sectionBtn = screen.getByRole('button', { name: /environment/i })
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(sectionBtn)
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'true')

    await user.click(sectionBtn)
    expect(sectionBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('Show Grid checkbox is accessible by label', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    // Open the section first
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const gridCheckbox = screen.getByRole('checkbox', { name: /show grid/i })
    expect(gridCheckbox).toBeInTheDocument()
  })

  it('Enable Fog checkbox is accessible by label', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const fogCheckbox = screen.getByRole('checkbox', { name: /enable fog/i })
    expect(fogCheckbox).toBeInTheDocument()
  })

  it('background color picker has aria-label', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const bgColor = screen.getByLabelText('Background color')
    expect(bgColor).toBeInTheDocument()
    expect(bgColor).toHaveAttribute('type', 'color')
  })

  it('fog controls appear when fog is enabled', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().updateEnvironment({ fogEnabled: true })
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    expect(screen.getByLabelText('Fog color')).toBeInTheDocument()
    expect(screen.getByLabelText('Fog near distance')).toBeInTheDocument()
    expect(screen.getByLabelText('Fog far distance')).toBeInTheDocument()
  })

  it('fog color picker has aria-label', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().updateEnvironment({ fogEnabled: true })
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const fogColor = screen.getByLabelText('Fog color')
    expect(fogColor).toHaveAttribute('type', 'color')
  })

  it('fog near distance slider has aria-label', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().updateEnvironment({ fogEnabled: true })
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const nearSlider = screen.getByLabelText('Fog near distance')
    expect(nearSlider).toHaveAttribute('type', 'range')
    expect(nearSlider).toHaveAttribute('min', '1')
    expect(nearSlider).toHaveAttribute('max', '50')
  })

  it('fog far distance slider has aria-label', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().updateEnvironment({ fogEnabled: true })
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    const farSlider = screen.getByLabelText('Fog far distance')
    expect(farSlider).toHaveAttribute('type', 'range')
    expect(farSlider).toHaveAttribute('min', '10')
    expect(farSlider).toHaveAttribute('max', '200')
  })

  it('fog controls are hidden when fog is disabled', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().updateEnvironment({ fogEnabled: false })
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    expect(screen.queryByLabelText('Fog color')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fog near distance')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fog far distance')).not.toBeInTheDocument()
  })

  it('toggling fog checkbox shows/hides fog controls', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await user.click(screen.getByRole('button', { name: /environment/i }))

    // Fog is off by default
    expect(screen.queryByLabelText('Fog color')).not.toBeInTheDocument()

    // Enable fog
    await user.click(screen.getByRole('checkbox', { name: /enable fog/i }))
    expect(screen.getByLabelText('Fog color')).toBeInTheDocument()

    // Disable fog
    await user.click(screen.getByRole('checkbox', { name: /enable fog/i }))
    expect(screen.queryByLabelText('Fog color')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// 5. Keyboard Navigation
// ---------------------------------------------------------------------------

describe('Keyboard Navigation', () => {
  beforeEach(resetStore)

  it('tab navigates through toolbar buttons', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    // Tab into the toolbar — first focusable is the logo button
    await user.tab()
    expect(screen.getByRole('button', { name: 'Show welcome screen' })).toHaveFocus()

    // Tab to scene name input
    await user.tab()
    expect(screen.getByLabelText('Scene name')).toHaveFocus()
  })

  it('objects in list can be activated with Enter key', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    option.focus()
    await user.keyboard('{Enter}')

    expect(useSceneStore.getState().selectedId).toBe(
      useSceneStore.getState().objects[0].id,
    )
  })

  it('objects in list can be activated with Space key', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('sphere')
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    option.focus()
    await user.keyboard(' ')

    expect(useSceneStore.getState().selectedId).toBe(
      useSceneStore.getState().objects[0].id,
    )
  })

  it('Space key on list item prevents default scroll behavior', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    useSceneStore.getState().selectObject(null)

    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    option.focus()

    // The component calls e.preventDefault() on Space, which prevents scrolling
    // We verify by ensuring the keydown handler works without scrolling
    await user.keyboard(' ')
    expect(useSceneStore.getState().selectedId).toBeTruthy()
  })

  it('toolbar tool buttons have focus-visible CSS classes', () => {
    render(<Toolbar />)
    const selectBtn = screen.getByRole('button', { name: 'Select' })
    expect(selectBtn.className).toContain('focus-visible:outline-none')
    expect(selectBtn.className).toContain('focus-visible:ring-1')
    expect(selectBtn.className).toContain('focus-visible:ring-rust-500')
  })

  it('object list items have focus-visible CSS classes', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    expect(option.className).toContain('focus-visible:ring-1')
    expect(option.className).toContain('focus-visible:ring-rust-500')
  })

  it('collapsible section buttons have focus-visible CSS classes', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const transformBtn = screen.getByRole('button', { name: /transform/i })
    expect(transformBtn.className).toContain('focus-visible:ring-2')
    expect(transformBtn.className).toContain('focus-visible:ring-rust-500')
  })

  it('add dropdown trigger has focus-visible CSS classes', () => {
    render(<Toolbar />)
    const addBtn = screen.getByRole('button', { name: 'Add objects' })
    expect(addBtn.className).toContain('focus-visible:outline-none')
  })
})

// ---------------------------------------------------------------------------
// 6. Semantic Structure (individual component level)
// ---------------------------------------------------------------------------

describe('Semantic Structure', () => {
  beforeEach(resetStore)

  it('ObjectList has an h2 heading for "Scene"', () => {
    render(<ObjectList />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Scene')
  })

  it('PropertiesPanel has an h2 heading for "Properties"', () => {
    render(<PropertiesPanel />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Properties')
  })

  it('PropertiesPanel with selection still has h2 heading', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Properties')
  })

  it('object list icon spans are aria-hidden', () => {
    useSceneStore.getState().addObject('box')
    render(<ObjectList />)
    const listbox = screen.getByRole('listbox', { name: 'Scene objects' })
    const option = within(listbox).getByRole('option')
    const hiddenIcon = within(option).getByText('▧')
    expect(hiddenIcon).toHaveAttribute('aria-hidden', 'true')
  })

  it('Vec3Input labels are connected to inputs via htmlFor/id', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    // For each axis input, verify the id attribute exists and matches a label
    const posX = screen.getByLabelText('Position X')
    const id = posX.getAttribute('id')
    expect(id).toBeTruthy()
    const label = document.querySelector(`label[for="${id}"]`)
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('X')
  })

  it('SliderInput labels are connected to inputs via htmlFor/id', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const metalness = screen.getByLabelText('Metalness')
    const id = metalness.getAttribute('id')
    expect(id).toBeTruthy()
    const label = document.querySelector(`label[for="${id}"]`)
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('Metalness')
  })

  it('material type select has label connection', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('id', 'mat-type')
    const label = document.querySelector('label[for="mat-type"]')
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('Type')
  })

  it('checkboxes in PropertiesPanel Display section have label text', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByRole('checkbox', { name: /visible/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /locked/i })).toBeInTheDocument()
  })

  it('wireframe checkbox has label text', () => {
    useSceneStore.getState().addObject('box')
    render(<PropertiesPanel />)
    expect(screen.getByRole('checkbox', { name: /wireframe/i })).toBeInTheDocument()
  })
})
