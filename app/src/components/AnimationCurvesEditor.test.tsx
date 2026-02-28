import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnimationCurvesEditor } from './AnimationCurvesEditor'
import { useAnimationStore } from '../stores/useAnimationStore'
import { resetKeyframeIdCounter } from '../core/animation'

function resetStore() {
  useAnimationStore.setState({
    tracks: [],
    duration: 5,
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    loop: true,
  })
  resetKeyframeIdCounter()
}

describe('AnimationCurvesEditor', () => {
  let trackId: string
  let keyframeId: string
  const onClose = vi.fn()

  beforeEach(() => {
    resetStore()
    onClose.mockReset()

    trackId = useAnimationStore.getState().addTrack('obj_1')
    keyframeId = useAnimationStore.getState().addKeyframe(
      trackId, 0, 'position', { x: 0, y: 0, z: 0 }, 'linear',
    )
  })

  it('renders Easing Curve heading', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    expect(screen.getByText('Easing Curve')).toBeInTheDocument()
  })

  it('renders close button', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    expect(screen.getByRole('button', { name: 'Close easing editor' })).toBeInTheDocument()
  })

  it('clicking close button calls onClose', async () => {
    const user = userEvent.setup()
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close easing editor' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders all four easing type buttons', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    expect(screen.getByText('Linear')).toBeInTheDocument()
    expect(screen.getByText('Ease In')).toBeInTheDocument()
    expect(screen.getByText('Ease Out')).toBeInTheDocument()
    expect(screen.getByText('Ease In-Out')).toBeInTheDocument()
  })

  it('current easing button shows as pressed', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    expect(screen.getByText('Linear')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Ease In')).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking a different easing type updates the keyframe', async () => {
    const user = userEvent.setup()
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)

    await user.click(screen.getByText('Ease Out'))

    const track = useAnimationStore.getState().tracks[0]
    const kf = track.keyframes.find(k => k.id === keyframeId)
    expect(kf!.easing).toBe('easeOut')
  })

  it('renders SVG curve preview with proper aria-label', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)
    expect(screen.getByRole('img', { name: /Linear easing curve/ })).toBeInTheDocument()
  })

  it('SVG label updates when easing changes', async () => {
    const user = userEvent.setup()
    render(<AnimationCurvesEditor trackId={trackId} keyframeId={keyframeId} onClose={onClose} />)

    await user.click(screen.getByText('Ease In'))
    expect(screen.getByRole('img', { name: /starts slow and accelerates/ })).toBeInTheDocument()
  })

  it('defaults to linear when keyframe not found', () => {
    render(<AnimationCurvesEditor trackId={trackId} keyframeId="nonexistent" onClose={onClose} />)
    expect(screen.getByText('Linear')).toHaveAttribute('aria-pressed', 'true')
  })
})
