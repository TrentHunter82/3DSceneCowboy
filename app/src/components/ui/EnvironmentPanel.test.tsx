import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { EnvironmentPanel } from './EnvironmentPanel'
import { useSceneStore } from '../../stores/useSceneStore'
import { createDefaultEnvironment } from '../../core/sceneOperations'

function resetStore() {
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    environment: createDefaultEnvironment(),
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
}

/** Click the Environment section toggle to expand it */
async function expandSection(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole('button', { name: /environment/i })
  await user.click(toggle)
}

describe('EnvironmentPanel', () => {
  beforeEach(resetStore)

  it('renders the Environment section header', () => {
    render(<EnvironmentPanel />)
    expect(screen.getByText('Environment')).toBeInTheDocument()
  })

  it('section is collapsed by default', () => {
    render(<EnvironmentPanel />)
    const toggle = screen.getByRole('button', { name: /environment/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking header expands the section', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)

    const toggle = screen.getByRole('button', { name: /environment/i })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Show Grid checkbox when expanded', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    expect(screen.getByText('Show Grid')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /show grid/i })).toBeInTheDocument()
  })

  it('Show Grid checkbox reflects store state (default checked)', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    const checkbox = screen.getByRole('checkbox', { name: /show grid/i })
    // Default environment has gridVisible = true
    expect(checkbox).toBeChecked()
  })

  it('toggling Show Grid updates store', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    const checkbox = screen.getByRole('checkbox', { name: /show grid/i })
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(useSceneStore.getState().environment.gridVisible).toBe(false)
    expect(checkbox).not.toBeChecked()
  })

  it('shows Enable Fog checkbox when expanded', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    expect(screen.getByText('Enable Fog')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /enable fog/i })).toBeInTheDocument()
  })

  it('Enable Fog checkbox reflects store state (default unchecked)', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    const checkbox = screen.getByRole('checkbox', { name: /enable fog/i })
    // Default environment has fogEnabled = false
    expect(checkbox).not.toBeChecked()
  })

  it('toggling Enable Fog updates store', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    const checkbox = screen.getByRole('checkbox', { name: /enable fog/i })
    await user.click(checkbox)

    expect(useSceneStore.getState().environment.fogEnabled).toBe(true)
    expect(checkbox).toBeChecked()
  })

  it('fog controls are hidden when fog is disabled', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    // Fog is disabled by default, so fog-specific controls should not exist
    expect(screen.queryByLabelText('Fog color')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fog near distance')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fog far distance')).not.toBeInTheDocument()
  })

  it('fog controls appear when fog is enabled', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    // Enable fog
    const fogCheckbox = screen.getByRole('checkbox', { name: /enable fog/i })
    await user.click(fogCheckbox)

    expect(screen.getByLabelText('Fog color')).toBeInTheDocument()
    expect(screen.getByLabelText('Fog near distance')).toBeInTheDocument()
    expect(screen.getByLabelText('Fog far distance')).toBeInTheDocument()
  })

  it('shows Background color section when expanded', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByLabelText('Background color')).toBeInTheDocument()
  })

  it('changing background color updates store', async () => {
    const user = userEvent.setup()
    render(<EnvironmentPanel />)
    await expandSection(user)

    const colorInput = screen.getByLabelText('Background color')
    fireEvent.change(colorInput, { target: { value: '#ff0000' } })

    expect(useSceneStore.getState().environment.backgroundColor).toBe('#ff0000')
  })
})
