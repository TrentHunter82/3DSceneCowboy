import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { AnimationTimeline } from './AnimationTimeline'
import { useAnimationStore } from '../stores/useAnimationStore'
import { useSceneStore } from '../stores/useSceneStore'
import { resetKeyframeIdCounter, CAMERA_TRACK_OBJECT_ID } from '../core/animation'

function resetStores() {
  useAnimationStore.setState({
    tracks: [],
    duration: 5,
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    loop: true,
  })
  useSceneStore.setState({
    objects: [],
    selectedId: null,
    selectedIds: [],
    clipboard: [],
    toolMode: 'select',
    history: [{ objects: [], selectedId: null, selectedIds: [] }],
    historyIndex: 0,
  })
  resetKeyframeIdCounter()
}

describe('AnimationTimeline', () => {
  beforeEach(resetStores)

  it('shows play button when not playing', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument()
  })

  it('clicking play toggles to pause', async () => {
    const user = userEvent.setup()
    render(<AnimationTimeline />)
    await user.click(screen.getByRole('button', { name: 'Play animation' }))

    expect(useAnimationStore.getState().isPlaying).toBe(true)
    expect(screen.getByRole('button', { name: 'Pause animation' })).toBeInTheDocument()
  })

  it('shows stop button', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: 'Stop animation' })).toBeInTheDocument()
  })

  it('clicking stop resets time to 0', async () => {
    const user = userEvent.setup()
    useAnimationStore.getState().setCurrentTime(2.5)
    render(<AnimationTimeline />)
    await user.click(screen.getByRole('button', { name: 'Stop animation' }))

    expect(useAnimationStore.getState().currentTime).toBe(0)
  })

  it('shows time display', () => {
    render(<AnimationTimeline />)
    expect(screen.getByText(/0\.00s \/ 5\.00s/)).toBeInTheDocument()
  })

  it('shows speed button', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: /Playback speed 1x/ })).toBeInTheDocument()
  })

  it('clicking speed cycles through speed options', async () => {
    const user = userEvent.setup()
    render(<AnimationTimeline />)

    const speedBtn = screen.getByRole('button', { name: /Playback speed 1x/ })
    await user.click(speedBtn)
    expect(useAnimationStore.getState().playbackSpeed).toBe(2)
  })

  it('shows loop toggle', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: 'Disable loop' })).toBeInTheDocument()
  })

  it('clicking loop toggles loop state', async () => {
    const user = userEvent.setup()
    render(<AnimationTimeline />)
    await user.click(screen.getByRole('button', { name: 'Disable loop' }))

    expect(useAnimationStore.getState().loop).toBe(false)
    expect(screen.getByRole('button', { name: 'Enable loop' })).toBeInTheDocument()
  })

  it('shows empty tracks message', () => {
    render(<AnimationTimeline />)
    expect(screen.getByText(/No tracks/)).toBeInTheDocument()
  })

  it('shows duration input', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('textbox', { name: 'Timeline duration in seconds' })).toBeInTheDocument()
  })

  it('shows add track button (disabled when no object selected)', () => {
    render(<AnimationTimeline />)
    const addBtn = screen.getByRole('button', { name: 'Add animation track for selected object' })
    expect(addBtn).toBeDisabled()
  })

  it('add track button is enabled when object is selected', () => {
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    useSceneStore.getState().selectObject(boxId)

    render(<AnimationTimeline />)
    const addBtn = screen.getByRole('button', { name: 'Add animation track for selected object' })
    expect(addBtn).not.toBeDisabled()
  })

  it('clicking add track creates a track', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    useSceneStore.getState().selectObject(boxId)

    render(<AnimationTimeline />)
    await user.click(screen.getByRole('button', { name: 'Add animation track for selected object' }))

    expect(useAnimationStore.getState().tracks).toHaveLength(1)
    expect(useAnimationStore.getState().tracks[0].objectId).toBe(boxId)
  })

  it('shows object name for existing tracks', () => {
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    useAnimationStore.getState().addTrack(boxId)

    render(<AnimationTimeline />)
    expect(screen.getByText('Box 1')).toBeInTheDocument()
  })

  it('shows (deleted) for tracks with missing objects', () => {
    useAnimationStore.getState().addTrack('nonexistent_obj')

    render(<AnimationTimeline />)
    expect(screen.getByText('(deleted)')).toBeInTheDocument()
  })

  it('remove track button removes the track', async () => {
    const user = userEvent.setup()
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    useAnimationStore.getState().addTrack(boxId)

    render(<AnimationTimeline />)
    const removeBtn = screen.getByRole('button', { name: 'Remove track for Box 1' })
    await user.click(removeBtn)

    expect(useAnimationStore.getState().tracks).toHaveLength(0)
  })

  it('timeline slider has proper aria attributes', () => {
    render(<AnimationTimeline />)
    const slider = screen.getByRole('slider', { name: 'Animation timeline' })
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '5')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('arrow keys navigate timeline', () => {
    render(<AnimationTimeline />)
    const slider = screen.getByRole('slider', { name: 'Animation timeline' })
    slider.focus()

    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(useAnimationStore.getState().currentTime).toBeCloseTo(0.1)

    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(useAnimationStore.getState().currentTime).toBeCloseTo(0)
  })

  it('duration input commits on blur', async () => {
    const user = userEvent.setup()
    render(<AnimationTimeline />)

    const durInput = screen.getByRole('textbox', { name: 'Timeline duration in seconds' })
    await user.clear(durInput)
    await user.type(durInput, '10')
    fireEvent.blur(durInput)

    expect(useAnimationStore.getState().duration).toBe(10)
  })

  it('duration input commits on Enter', async () => {
    const user = userEvent.setup()
    render(<AnimationTimeline />)

    const durInput = screen.getByRole('textbox', { name: 'Timeline duration in seconds' })
    await user.clear(durInput)
    await user.type(durInput, '8{Enter}')

    expect(useAnimationStore.getState().duration).toBe(8)
  })

  // ── Camera Track UI ────────────────────────────────────────────────

  it('shows capture keyframe button', () => {
    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: 'Capture scene keyframe' })).toBeInTheDocument()
  })

  it('shows updated empty state message mentioning Capture Keyframe', () => {
    render(<AnimationTimeline />)
    expect(screen.getByText(/Click "Capture Keyframe"/)).toBeInTheDocument()
  })

  it('shows "Camera" label for camera tracks', () => {
    useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)

    render(<AnimationTimeline />)
    expect(screen.getByText('Camera')).toBeInTheDocument()
  })

  it('does not show remove button for camera track', () => {
    useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)

    render(<AnimationTimeline />)
    expect(screen.queryByRole('button', { name: 'Remove track for Camera' })).not.toBeInTheDocument()
  })

  it('shows remove button for regular object tracks', () => {
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    useAnimationStore.getState().addTrack(boxId)

    render(<AnimationTimeline />)
    expect(screen.getByRole('button', { name: 'Remove track for Box 1' })).toBeInTheDocument()
  })

  it('sorts camera track before object tracks', () => {
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id

    // Add object track first, then camera track
    useAnimationStore.getState().addTrack(boxId)
    useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)

    render(<AnimationTimeline />)

    const trackLabels = screen.getAllByText(/Camera|Box 1/)
    expect(trackLabels[0].textContent).toBe('Camera')
    expect(trackLabels[1].textContent).toBe('Box 1')
  })

  it('deduplicates camera keyframe diamonds by time', () => {
    const trackId = useAnimationStore.getState().addTrack(CAMERA_TRACK_OBJECT_ID)
    // Add paired keyframes at the same time (cameraPosition + cameraTarget)
    useAnimationStore.getState().addKeyframe(trackId, 0, 'cameraPosition', { x: 5, y: 5, z: 5 })
    useAnimationStore.getState().addKeyframe(trackId, 0, 'cameraTarget', { x: 0, y: 0, z: 0 })
    useAnimationStore.getState().addKeyframe(trackId, 2, 'cameraPosition', { x: 10, y: 5, z: 0 })
    useAnimationStore.getState().addKeyframe(trackId, 2, 'cameraTarget', { x: 1, y: 0, z: 0 })

    render(<AnimationTimeline />)

    // Should show 2 diamonds (one per time), not 4 (one per keyframe)
    const diamonds = screen.getAllByText('◆')
    expect(diamonds).toHaveLength(2)
  })

  it('does not deduplicate object track keyframe diamonds', () => {
    useSceneStore.getState().addObject('box')
    const boxId = useSceneStore.getState().objects[0].id
    const trackId = useAnimationStore.getState().addTrack(boxId)

    // Add position and rotation keyframes at the same time
    useAnimationStore.getState().addKeyframe(trackId, 0, 'position', { x: 0, y: 0, z: 0 })
    useAnimationStore.getState().addKeyframe(trackId, 0, 'rotation', { x: 0, y: 0, z: 0 })

    render(<AnimationTimeline />)

    // Object tracks show all keyframes — 2 diamonds
    const diamonds = screen.getAllByText('◆')
    expect(diamonds).toHaveLength(2)
  })
})
