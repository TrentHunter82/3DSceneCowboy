import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { EffectsPanel } from './EffectsPanel'
import { usePostProcessingStore, createDefaultPostProcessing } from '../stores/usePostProcessingStore'

function resetStore() {
  usePostProcessingStore.setState(createDefaultPostProcessing())
}

describe('EffectsPanel', () => {
  beforeEach(resetStore)

  it('renders the Effects heading', () => {
    render(<EffectsPanel />)
    expect(screen.getByText('Effects')).toBeInTheDocument()
  })

  it('renders master post-processing toggle', () => {
    render(<EffectsPanel />)
    expect(screen.getByRole('checkbox', { name: 'Enable post-processing' })).toBeInTheDocument()
  })

  it('shows hint text when post-processing is disabled', () => {
    render(<EffectsPanel />)
    expect(screen.getByText('Enable to apply effects to the scene')).toBeInTheDocument()
  })

  it('toggles master post-processing on/off', async () => {
    const user = userEvent.setup()
    render(<EffectsPanel />)

    const toggle = screen.getByRole('checkbox', { name: 'Enable post-processing' })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    expect(usePostProcessingStore.getState().enabled).toBe(true)
  })

  it('hides hint text when post-processing is enabled', async () => {
    usePostProcessingStore.getState().setEnabled(true)
    render(<EffectsPanel />)
    expect(screen.queryByText('Enable to apply effects to the scene')).not.toBeInTheDocument()
  })

  it('renders Reset to Defaults button', () => {
    render(<EffectsPanel />)
    expect(screen.getByRole('button', { name: 'Reset effects to defaults' })).toBeInTheDocument()
  })

  it('clicking Reset to Defaults resets store', async () => {
    const user = userEvent.setup()
    usePostProcessingStore.getState().setEnabled(true)
    usePostProcessingStore.getState().updateBloom({ enabled: true, intensity: 5 })

    render(<EffectsPanel />)
    await user.click(screen.getByRole('button', { name: 'Reset effects to defaults' }))

    expect(usePostProcessingStore.getState().enabled).toBe(false)
    expect(usePostProcessingStore.getState().bloom.intensity).toBe(1)
  })

  it('renders collapsible sections for Bloom, SSAO, Vignette', () => {
    render(<EffectsPanel />)
    // CollapsibleSection headers are visible even when collapsed
    expect(screen.getByText('Bloom')).toBeInTheDocument()
    expect(screen.getByText('SSAO')).toBeInTheDocument()
    expect(screen.getByText('Vignette')).toBeInTheDocument()
  })

  it('expanding Bloom section reveals rotary knobs', async () => {
    const user = userEvent.setup()
    render(<EffectsPanel />)

    // Click on Bloom section to expand
    await user.click(screen.getByText('Bloom'))
    expect(screen.getByRole('slider', { name: 'Threshold' })).toBeInTheDocument()
  })

  it('bloom threshold knob has correct aria-valuenow', async () => {
    const user = userEvent.setup()
    usePostProcessingStore.getState().setEnabled(true)
    render(<EffectsPanel />)

    await user.click(screen.getByText('Bloom'))
    const thresholdKnob = screen.getByRole('slider', { name: 'Threshold' })
    // Default bloom threshold is 0.9
    expect(thresholdKnob).toHaveAttribute('aria-valuenow', '0.9')
  })

  it('expanding Vignette section reveals rotary knobs', async () => {
    const user = userEvent.setup()
    usePostProcessingStore.getState().setEnabled(true)
    usePostProcessingStore.getState().updateVignette({ enabled: true })
    render(<EffectsPanel />)

    await user.click(screen.getByText('Vignette'))
    const darknessKnob = screen.getByRole('slider', { name: 'Darkness' })
    expect(darknessKnob).toBeInTheDocument()
  })

  it('individual effect toggles update store', async () => {
    const user = userEvent.setup()
    usePostProcessingStore.getState().setEnabled(true)
    render(<EffectsPanel />)

    // Find the bloom "Enabled" checkbox - it's the first effect toggle
    const enabledCheckboxes = screen.getAllByRole('checkbox', { name: 'Enabled' })
    expect(enabledCheckboxes.length).toBeGreaterThanOrEqual(3) // bloom, ssao, vignette

    await user.click(enabledCheckboxes[0]) // bloom enabled
    expect(usePostProcessingStore.getState().bloom.enabled).toBe(true)
  })
})
