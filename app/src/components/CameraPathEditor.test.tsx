import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { CameraPathEditor } from './CameraPathEditor'
import { useCameraPathStore } from '../stores/useCameraPathStore'
import { resetPathIdCounters } from '../core/cameraPath'

function resetStore() {
  useCameraPathStore.setState({
    paths: [],
    activePathId: null,
    selectedPointId: null,
    playbackState: 'stopped',
    playbackTime: 0,
    previewEnabled: false,
  })
  resetPathIdCounters()
}

/** Helper: add a path and return its id */
function addPath(name?: string): string {
  return useCameraPathStore.getState().addPath(name)
}

/** Helper: add a point to a path and return its id */
function addPoint(pathId: string): string {
  return useCameraPathStore.getState().addPoint(pathId)
}

describe('CameraPathEditor', () => {
  beforeEach(resetStore)

  // ── Empty State ──────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders the Camera Paths heading', () => {
      render(<CameraPathEditor />)
      expect(screen.getByText('Camera Paths')).toBeInTheDocument()
    })

    it('renders add camera path button', () => {
      render(<CameraPathEditor />)
      expect(screen.getByRole('button', { name: 'Add camera path' })).toBeInTheDocument()
    })

    it('shows 0 paths in footer', () => {
      render(<CameraPathEditor />)
      expect(screen.getByText('0 paths')).toBeInTheDocument()
    })

    it('does not show path settings when no path is active', () => {
      render(<CameraPathEditor />)
      expect(screen.queryByText('Path Settings')).not.toBeInTheDocument()
    })

    it('does not show playback controls when no path is active', () => {
      render(<CameraPathEditor />)
      expect(screen.queryByText('Playback')).not.toBeInTheDocument()
    })

    it('does not show control points section when no path is active', () => {
      render(<CameraPathEditor />)
      expect(screen.queryByText('Control Points')).not.toBeInTheDocument()
    })

    it('renders the preview toggle checkbox', () => {
      render(<CameraPathEditor />)
      expect(screen.getByRole('checkbox', { name: 'Enable camera path preview' })).toBeInTheDocument()
    })

    it('has preview toggle unchecked by default', () => {
      render(<CameraPathEditor />)
      expect(screen.getByRole('checkbox', { name: 'Enable camera path preview' })).not.toBeChecked()
    })

    it('has region role with correct aria-label', () => {
      render(<CameraPathEditor />)
      expect(screen.getByRole('region', { name: 'Camera path editor' })).toBeInTheDocument()
    })
  })

  // ── Path Creation ────────────────────────────────────────────────────

  describe('path creation', () => {
    it('adds a path when clicking Add Camera Path', async () => {
      const user = userEvent.setup()
      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add camera path' }))

      expect(screen.getByText('Camera Path 1')).toBeInTheDocument()
      expect(screen.getByText('1 path')).toBeInTheDocument()
    })

    it('automatically selects the newly created path', async () => {
      const user = userEvent.setup()
      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add camera path' }))

      // Path Settings section should appear since the new path is now active
      expect(screen.getByText('Path Settings')).toBeInTheDocument()
    })

    it('adds multiple paths with incrementing names', async () => {
      const user = userEvent.setup()
      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add camera path' }))
      await user.click(screen.getByRole('button', { name: 'Add camera path' }))

      expect(screen.getByText('Camera Path 1')).toBeInTheDocument()
      expect(screen.getByText('Camera Path 2')).toBeInTheDocument()
      expect(screen.getByText('2 paths')).toBeInTheDocument()
    })

    it('shows 0pts for a new empty path', async () => {
      const user = userEvent.setup()
      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add camera path' }))

      expect(screen.getByText('0pts')).toBeInTheDocument()
    })
  })

  // ── Path Selection ───────────────────────────────────────────────────

  describe('path selection', () => {
    it('selects a path when clicking its row', async () => {
      const user = userEvent.setup()
      addPath('Path A')
      const idB = addPath('Path B')
      // Path B is active after creation. Set to A so we can select B.
      useCameraPathStore.getState().setActivePath(null)

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Select Path B' }))

      expect(useCameraPathStore.getState().activePathId).toBe(idB)
    })

    it('shows path editor sections when a path is selected', () => {
      addPath('My Path')
      render(<CameraPathEditor />)

      expect(screen.getByText('Path Settings')).toBeInTheDocument()
      expect(screen.getByText('Playback')).toBeInTheDocument()
      expect(screen.getByText('Control Points')).toBeInTheDocument()
    })

    it('shows point count in footer when path is active', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByText('2 points')).toBeInTheDocument()
    })

    it('shows singular point for 1 point', () => {
      const pathId = addPath()
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByText('1 point')).toBeInTheDocument()
    })
  })

  // ── Path Deletion ────────────────────────────────────────────────────

  describe('path deletion', () => {
    it('removes a path when clicking its remove button', async () => {
      const user = userEvent.setup()
      addPath('Path To Delete')

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Remove Path To Delete' }))

      expect(screen.queryByText('Path To Delete')).not.toBeInTheDocument()
      expect(screen.getByText('0 paths')).toBeInTheDocument()
    })

    it('clears active path when deleting the active path', async () => {
      const user = userEvent.setup()
      addPath('Active Path')

      render(<CameraPathEditor />)

      // Verify path settings are visible (path is active)
      expect(screen.getByText('Path Settings')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove Active Path' }))

      expect(screen.queryByText('Path Settings')).not.toBeInTheDocument()
      expect(useCameraPathStore.getState().activePathId).toBeNull()
    })

    it('preserves other paths when deleting one', async () => {
      const user = userEvent.setup()
      addPath('Keep Me')
      addPath('Delete Me')

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Remove Delete Me' }))

      expect(screen.getByText('Keep Me')).toBeInTheDocument()
      expect(screen.queryByText('Delete Me')).not.toBeInTheDocument()
    })
  })

  // ── Path Settings ────────────────────────────────────────────────────

  describe('path settings', () => {
    it('allows editing path name', async () => {
      const user = userEvent.setup()
      addPath('Original')

      render(<CameraPathEditor />)

      const nameInput = screen.getByRole('textbox', { name: 'Path name' })
      expect(nameInput).toHaveValue('Original')

      await user.clear(nameInput)
      await user.type(nameInput, 'Renamed')

      expect(useCameraPathStore.getState().paths[0].name).toBe('Renamed')
    })

    it('shows duration slider with default value of 5', () => {
      addPath()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Duration (s)' })
      expect(slider).toHaveValue('5')
    })

    it('allows changing duration', () => {
      addPath()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Duration (s)' })
      fireEvent.change(slider, { target: { value: '10' } })

      expect(useCameraPathStore.getState().paths[0].duration).toBe(10)
    })

    it('has duration slider with min 0.5 and max 60', () => {
      addPath()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Duration (s)' })
      expect(slider).toHaveAttribute('min', '0.5')
      expect(slider).toHaveAttribute('max', '60')
    })

    it('shows easing select with default ease-in-out', () => {
      addPath()

      render(<CameraPathEditor />)

      const select = screen.getByRole('combobox', { name: 'Path easing' })
      expect(select).toHaveValue('ease-in-out')
    })

    it('allows changing easing mode', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      const select = screen.getByRole('combobox', { name: 'Path easing' })
      await user.selectOptions(select, 'linear')

      expect(useCameraPathStore.getState().paths[0].easing).toBe('linear')
    })

    it('lists all four easing options', () => {
      addPath()

      render(<CameraPathEditor />)

      const select = screen.getByRole('combobox', { name: 'Path easing' })
      const options = within(select).getAllByRole('option')
      expect(options).toHaveLength(4)
      expect(options.map(o => o.textContent)).toEqual(['Linear', 'Ease In', 'Ease Out', 'Ease In-Out'])
    })

    it('shows loop checkbox unchecked by default', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByRole('checkbox', { name: 'Loop camera path' })).not.toBeChecked()
    })

    it('allows toggling loop', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      const loop = screen.getByRole('checkbox', { name: 'Loop camera path' })
      await user.click(loop)

      expect(useCameraPathStore.getState().paths[0].loop).toBe(true)
    })

    it('name input has maxLength 64', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByRole('textbox', { name: 'Path name' })).toHaveAttribute('maxlength', '64')
    })
  })

  // ── Playback Controls ────────────────────────────────────────────────

  describe('playback controls', () => {
    it('shows play button when stopped', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Play camera path' })).toBeInTheDocument()
    })

    it('play button is disabled with fewer than 2 points', () => {
      const pathId = addPath()
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Play camera path' })).toBeDisabled()
    })

    it('play button is enabled with 2 or more points', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Play camera path' })).not.toBeDisabled()
    })

    it('clicking play starts playback and shows pause button', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Play camera path' }))

      expect(useCameraPathStore.getState().playbackState).toBe('playing')
      expect(screen.getByRole('button', { name: 'Pause camera path' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play camera path' })).not.toBeInTheDocument()
    })

    it('clicking pause pauses playback and shows play button', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)
      useCameraPathStore.getState().play()

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Pause camera path' }))

      expect(useCameraPathStore.getState().playbackState).toBe('paused')
      expect(screen.getByRole('button', { name: 'Play camera path' })).toBeInTheDocument()
    })

    it('stop button is disabled when already stopped', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Stop camera path' })).toBeDisabled()
    })

    it('stop button is enabled during playback', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)
      useCameraPathStore.getState().play()

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Stop camera path' })).not.toBeDisabled()
    })

    it('clicking stop resets to stopped and resets playback time', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)
      useCameraPathStore.getState().play()
      useCameraPathStore.setState({ playbackTime: 2.5 })

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Stop camera path' }))

      expect(useCameraPathStore.getState().playbackState).toBe('stopped')
      expect(useCameraPathStore.getState().playbackTime).toBe(0)
    })
  })

  // ── Preview Toggle ───────────────────────────────────────────────────

  describe('preview toggle', () => {
    it('toggles preview on when clicking checkbox', async () => {
      const user = userEvent.setup()
      render(<CameraPathEditor />)

      const checkbox = screen.getByRole('checkbox', { name: 'Enable camera path preview' })
      await user.click(checkbox)

      expect(useCameraPathStore.getState().previewEnabled).toBe(true)
      expect(checkbox).toBeChecked()
    })

    it('toggles preview off when clicking again', async () => {
      const user = userEvent.setup()
      useCameraPathStore.setState({ previewEnabled: true })

      render(<CameraPathEditor />)

      const checkbox = screen.getByRole('checkbox', { name: 'Enable camera path preview' })
      expect(checkbox).toBeChecked()

      await user.click(checkbox)

      expect(useCameraPathStore.getState().previewEnabled).toBe(false)
      expect(checkbox).not.toBeChecked()
    })
  })

  // ── Control Point CRUD ───────────────────────────────────────────────

  describe('control points', () => {
    it('shows add point button when a path is active', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Add control point' })).toBeInTheDocument()
    })

    it('adds a control point when clicking Add Point', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add control point' }))

      expect(screen.getByText('Point 1')).toBeInTheDocument()
      expect(screen.getByText('1pts')).toBeInTheDocument()
    })

    it('adds multiple points', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add control point' }))
      await user.click(screen.getByRole('button', { name: 'Add control point' }))

      expect(screen.getByText('Point 1')).toBeInTheDocument()
      expect(screen.getByText('Point 2')).toBeInTheDocument()
      expect(screen.getByText('2pts')).toBeInTheDocument()
    })

    it('selects point when clicking it', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Select point 1' }))

      // Point Settings section should appear
      expect(screen.getByText('Point Settings')).toBeInTheDocument()
    })

    it('removes a point when clicking its remove button', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByText('Point 1')).toBeInTheDocument()
      expect(screen.getByText('Point 2')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove point 2' }))

      expect(screen.getByText('Point 1')).toBeInTheDocument()
      expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
    })

    it('clears point selection when deleting the selected point', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      // Point settings visible
      expect(screen.getByText('Point Settings')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Remove point 1' }))

      expect(screen.queryByText('Point Settings')).not.toBeInTheDocument()
      expect(useCameraPathStore.getState().selectedPointId).toBeNull()
    })

    it('shows time for each point in the list', () => {
      const pathId = addPath()
      addPoint(pathId) // time 0.0s
      addPoint(pathId) // time 1.0s

      render(<CameraPathEditor />)

      expect(screen.getByText('0.0s')).toBeInTheDocument()
      expect(screen.getByText('1.0s')).toBeInTheDocument()
    })

    it('auto-selects the newly added point', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      await user.click(screen.getByRole('button', { name: 'Add control point' }))

      // The newly added point should be selected, so Point Settings should appear
      expect(screen.getByText('Point Settings')).toBeInTheDocument()
    })
  })

  // ── Point Settings ───────────────────────────────────────────────────

  describe('point settings', () => {
    function setupSelectedPoint() {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)
      return { pathId, ptId }
    }

    it('shows Point Settings section when a point is selected', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByText('Point Settings')).toBeInTheDocument()
    })

    it('shows Position vec3 inputs', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('spinbutton', { name: 'Position x' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Position y' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Position z' })).toBeInTheDocument()
    })

    it('shows Look At vec3 inputs', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('spinbutton', { name: 'Look At x' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Look At y' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Look At z' })).toBeInTheDocument()
    })

    it('shows Time slider', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('slider', { name: 'Time (s)' })).toBeInTheDocument()
    })

    it('shows Tension slider', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('slider', { name: 'Tension' })).toBeInTheDocument()
    })

    it('tension slider has min 0 and max 1', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Tension' })
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '1')
    })

    it('time slider max matches path duration', () => {
      const pathId = addPath()
      useCameraPathStore.getState().updatePath(pathId, { duration: 20 })
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Time (s)' })
      expect(slider).toHaveAttribute('max', '20')
    })

    it('updates position x when changed', async () => {
      const user = userEvent.setup()
      const { pathId, ptId } = setupSelectedPoint()

      render(<CameraPathEditor />)

      const posX = screen.getByRole('spinbutton', { name: 'Position x' })
      await user.clear(posX)
      await user.type(posX, '10')

      const point = useCameraPathStore.getState().getPoint(pathId, ptId)
      expect(point?.position.x).toBe(10)
    })

    it('updates look-at target when changed', async () => {
      const user = userEvent.setup()
      const { pathId, ptId } = setupSelectedPoint()

      render(<CameraPathEditor />)

      const targetY = screen.getByRole('spinbutton', { name: 'Look At y' })
      await user.clear(targetY)
      await user.type(targetY, '5')

      const point = useCameraPathStore.getState().getPoint(pathId, ptId)
      expect(point?.target.y).toBe(5)
    })

    it('updates tension when slider changes', () => {
      const { pathId, ptId } = setupSelectedPoint()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Tension' })
      fireEvent.change(slider, { target: { value: '0.8' } })

      const point = useCameraPathStore.getState().getPoint(pathId, ptId)
      expect(point?.tension).toBe(0.8)
    })

    it('updates time when slider changes', () => {
      const { pathId, ptId } = setupSelectedPoint()

      render(<CameraPathEditor />)

      const slider = screen.getByRole('slider', { name: 'Time (s)' })
      fireEvent.change(slider, { target: { value: '2.5' } })

      const point = useCameraPathStore.getState().getPoint(pathId, ptId)
      expect(point?.time).toBe(2.5)
    })

    it('does not show Point Settings when no point is selected', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.queryByText('Point Settings')).not.toBeInTheDocument()
    })

    it('Position defaults to {5, 3, 5} for first point', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('spinbutton', { name: 'Position x' })).toHaveValue(5)
      expect(screen.getByRole('spinbutton', { name: 'Position y' })).toHaveValue(3)
      expect(screen.getByRole('spinbutton', { name: 'Position z' })).toHaveValue(5)
    })

    it('Look At defaults to {0, 0, 0}', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('spinbutton', { name: 'Look At x' })).toHaveValue(0)
      expect(screen.getByRole('spinbutton', { name: 'Look At y' })).toHaveValue(0)
      expect(screen.getByRole('spinbutton', { name: 'Look At z' })).toHaveValue(0)
    })

    it('Tension defaults to 0.5', () => {
      setupSelectedPoint()

      render(<CameraPathEditor />)

      expect(screen.getByRole('slider', { name: 'Tension' })).toHaveValue('0.5')
    })
  })

  // ── SVG Path Preview ─────────────────────────────────────────────────

  describe('path preview SVG', () => {
    it('renders SVG path preview when path has points', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByLabelText('Camera path preview')).toBeInTheDocument()
    })

    it('does not render SVG path preview when path has no points', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.queryByLabelText('Camera path preview')).not.toBeInTheDocument()
    })

    it('SVG contains circle elements for each point', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path preview')
      const circles = svg.querySelectorAll('circle')
      expect(circles).toHaveLength(3)
    })

    it('first point circle is green, last is red', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path preview')
      const circles = svg.querySelectorAll('circle')
      expect(circles[0]).toHaveAttribute('fill', '#4ade80')
      expect(circles[1]).toHaveAttribute('fill', '#ef4444')
    })

    it('middle point circle uses intermediate color', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path preview')
      const circles = svg.querySelectorAll('circle')
      expect(circles[1]).toHaveAttribute('fill', '#e8a87c')
    })

    it('SVG contains a path element for the route line', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path preview')
      const pathEl = svg.querySelector('path')
      expect(pathEl).not.toBeNull()
      expect(pathEl?.getAttribute('d')).toContain('M')
      expect(pathEl?.getAttribute('d')).toContain('L')
    })
  })

  // ── Timeline Visualization ───────────────────────────────────────────

  describe('timeline', () => {
    it('renders timeline SVG when path is active', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByLabelText('Camera path timeline')).toBeInTheDocument()
    })

    it('shows current time and duration', () => {
      addPath()

      render(<CameraPathEditor />)

      // default duration 5, playback time 0
      expect(screen.getByText('0.0s / 5.0s')).toBeInTheDocument()
    })

    it('shows Timeline label', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByText('Timeline')).toBeInTheDocument()
    })

    it('renders keyframe marker rectangles for each point', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path timeline')
      // Each point gets a <g> with a <rect> inside, plus the track bg rect
      // Track bg rect + 2 point rects = 3 total
      const rects = svg.querySelectorAll('rect')
      expect(rects.length).toBeGreaterThanOrEqual(3) // 1 bg + 2 keyframes
    })

    it('renders playhead line', () => {
      addPath()

      render(<CameraPathEditor />)

      const svg = screen.getByLabelText('Camera path timeline')
      const lines = svg.querySelectorAll('line')
      expect(lines.length).toBeGreaterThanOrEqual(1)
      // Playhead line has red stroke
      const playhead = Array.from(lines).find(l => l.getAttribute('stroke') === '#ef4444')
      expect(playhead).toBeTruthy()
    })
  })

  // ── Vec3Input Helper ─────────────────────────────────────────────────

  describe('Vec3Input rendering', () => {
    it('renders axis labels X, Y, Z', () => {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      // Vec3Input renders uppercase axis labels for both Position and Look At
      const labels = screen.getAllByText('x')
      expect(labels.length).toBeGreaterThanOrEqual(2) // Position x + Look At x
    })

    it('renders number inputs with step 0.5', () => {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      const posX = screen.getByRole('spinbutton', { name: 'Position x' })
      expect(posX).toHaveAttribute('step', '0.5')
      expect(posX).toHaveAttribute('type', 'number')
    })

    it('handles NaN input by defaulting to 0', async () => {
      const user = userEvent.setup()
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      const posX = screen.getByRole('spinbutton', { name: 'Position x' })
      await user.clear(posX)

      // After clearing, the value becomes empty which parses as NaN, defaulting to 0
      const point = useCameraPathStore.getState().getPoint(pathId, ptId)
      expect(point?.position.x).toBe(0)
    })
  })

  // ── Accessibility ────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('collapsible sections have aria-expanded attribute', () => {
      addPath()

      render(<CameraPathEditor />)

      const pathSettingsToggle = screen.getByRole('button', { name: /Path Settings/ })
      expect(pathSettingsToggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapsible sections can be collapsed', async () => {
      const user = userEvent.setup()
      addPath()

      render(<CameraPathEditor />)

      const toggle = screen.getByRole('button', { name: /Path Settings/ })
      expect(toggle).toHaveAttribute('aria-expanded', 'true')

      await user.click(toggle)

      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('all slider inputs have aria-labels', () => {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('slider', { name: 'Duration (s)' })).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: 'Time (s)' })).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: 'Tension' })).toBeInTheDocument()
    })

    it('all spinbutton inputs have aria-labels', () => {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('spinbutton', { name: 'Position x' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Position y' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Position z' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Look At x' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Look At y' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Look At z' })).toBeInTheDocument()
    })

    it('path list items have correct aria-labels', () => {
      addPath('My Cinematic Path')

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Select My Cinematic Path' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove My Cinematic Path' })).toBeInTheDocument()
    })

    it('point list items have correct aria-labels', () => {
      const pathId = addPath()
      addPoint(pathId)
      addPoint(pathId)

      render(<CameraPathEditor />)

      expect(screen.getByRole('button', { name: 'Select point 1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Select point 2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove point 1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove point 2' })).toBeInTheDocument()
    })

    it('editor region has accessible aria-label', () => {
      render(<CameraPathEditor />)

      expect(screen.getByRole('region', { name: 'Camera path editor' })).toBeInTheDocument()
    })
  })

  // ── Footer ───────────────────────────────────────────────────────────

  describe('footer', () => {
    it('shows singular path for 1', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByText('1 path')).toBeInTheDocument()
    })

    it('shows plural paths for 0', () => {
      render(<CameraPathEditor />)

      expect(screen.getByText('0 paths')).toBeInTheDocument()
    })

    it('shows plural paths for 2+', () => {
      addPath()
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByText('2 paths')).toBeInTheDocument()
    })

    it('shows point count only when a path is active', () => {
      render(<CameraPathEditor />)

      // No point count shown when no active path
      expect(screen.queryByText(/\d+ points?$/)).not.toBeInTheDocument()
    })

    it('shows singular "0 points" for empty active path', () => {
      addPath()

      render(<CameraPathEditor />)

      expect(screen.getByText('0 points')).toBeInTheDocument()
    })
  })

  // ── PathSlider display ───────────────────────────────────────────────

  describe('PathSlider display formatting', () => {
    it('shows duration value with 1 decimal place', () => {
      addPath()

      render(<CameraPathEditor />)

      // Duration step=0.5, so shows 1 decimal: "5.0"
      expect(screen.getByText('5.0')).toBeInTheDocument()
    })

    it('shows tension value with 2 decimal places', () => {
      const pathId = addPath()
      const ptId = addPoint(pathId)
      useCameraPathStore.getState().setSelectedPoint(ptId)

      render(<CameraPathEditor />)

      // Tension step=0.05 (< 0.1), so 2 decimals: "0.50"
      expect(screen.getByText('0.50')).toBeInTheDocument()
    })
  })
})
