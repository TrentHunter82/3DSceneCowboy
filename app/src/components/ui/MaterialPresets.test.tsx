import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MaterialPresets } from './MaterialPresets'
import type { MaterialData } from '../../types/scene'

describe('MaterialPresets', () => {
  it('renders 12 preset buttons', () => {
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(12)
  })

  it('each button has aria-label "Apply X preset"', () => {
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)
    const presetNames = [
      'Default', 'Metal', 'Gold', 'Copper', 'Plastic', 'Rubber',
      'Glass', 'Wood', 'Stone', 'Ceramic', 'Neon', 'Unlit',
    ]
    for (const name of presetNames) {
      expect(screen.getByLabelText(`Apply ${name} preset`)).toBeInTheDocument()
    }
  })

  it('renders preset name labels', () => {
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('Metal')).toBeInTheDocument()
    expect(screen.getByText('Glass')).toBeInTheDocument()
    expect(screen.getByText('Neon')).toBeInTheDocument()
    expect(screen.getByText('Unlit')).toBeInTheDocument()
  })

  it('clicking a preset calls onApply with correct material data', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Default preset'))
    expect(onApply).toHaveBeenCalledTimes(1)
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.color).toBe('#808080')
    expect(arg.metalness).toBe(0)
    expect(arg.roughness).toBe(0.5)
    expect(arg.type).toBe('standard')
    // Should NOT include the name property
    expect(arg).not.toHaveProperty('name')
  })

  it('Metal preset has metalness=1', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Metal preset'))
    expect(onApply).toHaveBeenCalledTimes(1)
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.metalness).toBe(1)
    expect(arg.roughness).toBe(0.2)
    expect(arg.color).toBe('#C0C0C0')
  })

  it('Gold preset has metalness=1', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Gold preset'))
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.metalness).toBe(1)
    expect(arg.color).toBe('#FFD700')
  })

  it('Glass preset has transparent=true', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Glass preset'))
    expect(onApply).toHaveBeenCalledTimes(1)
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.transparent).toBe(true)
    expect(arg.opacity).toBe(0.3)
    expect(arg.roughness).toBe(0.05)
  })

  it('Neon preset has emissiveIntensity > 0', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Neon preset'))
    expect(onApply).toHaveBeenCalledTimes(1)
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.emissiveIntensity).toBeGreaterThan(0)
    expect(arg.emissiveIntensity).toBe(2)
    expect(arg.emissiveColor).toBe('#00FF88')
  })

  it('Unlit preset has type basic', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Unlit preset'))
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.type).toBe('basic')
    expect(arg.color).toBe('#FFFFFF')
  })

  it('Rubber preset has high roughness', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Rubber preset'))
    const arg = onApply.mock.calls[0][0] as Partial<MaterialData>
    expect(arg.roughness).toBe(0.9)
    expect(arg.metalness).toBe(0)
  })

  it('clicking different presets calls onApply with different data', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<MaterialPresets onApply={onApply} />)

    await user.click(screen.getByLabelText('Apply Metal preset'))
    await user.click(screen.getByLabelText('Apply Plastic preset'))

    expect(onApply).toHaveBeenCalledTimes(2)
    const metalArg = onApply.mock.calls[0][0] as Partial<MaterialData>
    const plasticArg = onApply.mock.calls[1][0] as Partial<MaterialData>
    expect(metalArg.metalness).toBe(1)
    expect(plasticArg.metalness).toBe(0)
  })
})
