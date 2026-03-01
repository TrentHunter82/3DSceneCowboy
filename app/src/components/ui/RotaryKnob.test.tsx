import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RotaryKnob } from './RotaryKnob'

describe('RotaryKnob', () => {
  it('renders with correct aria attributes', () => {
    render(
      <RotaryKnob value={0.5} onChange={vi.fn()} min={0} max={1} aria-label="Volume" />
    )

    const slider = screen.getByRole('slider', { name: 'Volume' })
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '1')
    expect(slider).toHaveAttribute('aria-valuenow', '0.5')
  })

  it('renders label text', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} label="Gain" />)

    expect(screen.getByText('Gain')).toBeInTheDocument()
  })

  it('uses label as aria-label when no explicit aria-label', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} label="Gain" />)

    expect(screen.getByRole('slider', { name: 'Gain' })).toBeInTheDocument()
  })

  it('renders value readout by default', () => {
    render(<RotaryKnob value={0.75} onChange={vi.fn()} />)

    expect(screen.getByText('0.75')).toBeInTheDocument()
  })

  it('renders value readout with unit', () => {
    render(<RotaryKnob value={5} onChange={vi.fn()} min={0} max={60} step={0.5} unit="s" />)

    expect(screen.getByText('5.0s')).toBeInTheDocument()
  })

  it('hides value readout when showValue is false', () => {
    render(<RotaryKnob value={0.75} onChange={vi.fn()} showValue={false} />)

    expect(screen.queryByText('0.75')).not.toBeInTheDocument()
  })

  it('respects precision prop for display', () => {
    render(<RotaryKnob value={0.5} onChange={vi.fn()} precision={3} />)

    expect(screen.getByText('0.500')).toBeInTheDocument()
  })

  it('auto-derives precision from step', () => {
    render(<RotaryKnob value={0.5} onChange={vi.fn()} step={0.001} />)

    expect(screen.getByText('0.500')).toBeInTheDocument()
  })

  // Keyboard navigation
  it('ArrowUp increases value by step', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowUp}')

    expect(onChange).toHaveBeenCalledWith(0.6)
  })

  it('ArrowDown decreases value by step', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenCalledWith(0.4)
  })

  it('Home sets value to min', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} min={0} max={1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{Home}')

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('End sets value to max', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} min={0} max={1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{End}')

    expect(onChange).toHaveBeenCalledWith(1)
  })

  // Clamping
  it('clamps value at max boundary', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.95} onChange={onChange} min={0} max={1} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowUp}')

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('clamps value at min boundary', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.05} onChange={onChange} min={0} max={1} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('does not call onChange when already at min and pressing ArrowDown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0} onChange={onChange} min={0} max={1} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowDown}')

    expect(onChange).not.toHaveBeenCalled()
  })

  // Step snapping
  it('snaps value to step increments', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.33} onChange={onChange} step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowUp}')

    // 0.33 + 0.1 = 0.43, snapped to 0.4
    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.4, 5))
  })

  // Disabled state
  it('disabled state sets aria-disabled', () => {
    render(<RotaryKnob value={0.5} onChange={vi.fn()} disabled />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-disabled', 'true')
  })

  it('disabled knob does not respond to keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} disabled step={0.1} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{ArrowUp}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('disabled knob has tabIndex -1', () => {
    render(<RotaryKnob value={0.5} onChange={vi.fn()} disabled />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('tabindex', '-1')
  })

  // Sizes
  it('renders sm size', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} size="sm" aria-label="knob" />)

    const slider = screen.getByRole('slider')
    // sm = 28px knob + 12px padding = 40px SVG
    expect(slider.querySelector('svg')).toHaveAttribute('width', '40')
  })

  it('renders md size', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} size="md" aria-label="knob" />)

    const slider = screen.getByRole('slider')
    // md = 40px knob + 12px padding = 52px SVG
    expect(slider.querySelector('svg')).toHaveAttribute('width', '52')
  })

  it('renders lg size', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} size="lg" aria-label="knob" />)

    const slider = screen.getByRole('slider')
    // lg = 56px knob + 12px padding = 68px SVG
    expect(slider.querySelector('svg')).toHaveAttribute('width', '68')
  })

  // aria-valuetext
  it('has correct aria-valuetext', () => {
    render(<RotaryKnob value={3.5} onChange={vi.fn()} min={0} max={10} step={0.5} unit="s" />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuetext', '3.5s')
  })

  // PageUp/PageDown
  it('PageUp increases by 10x step', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} step={0.01} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{PageUp}')

    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.6, 5))
  })

  it('PageDown decreases by 10x step', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RotaryKnob value={0.5} onChange={onChange} step={0.01} />)

    const slider = screen.getByRole('slider')
    slider.focus()
    await user.keyboard('{PageDown}')

    expect(onChange).toHaveBeenCalledWith(expect.closeTo(0.4, 5))
  })

  // Label class
  it('label has label-engraved class', () => {
    render(<RotaryKnob value={0} onChange={vi.fn()} label="Test" />)

    const label = screen.getByText('Test')
    expect(label).toHaveClass('label-engraved')
  })
})
