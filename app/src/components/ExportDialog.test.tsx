import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportDialog } from './ExportDialog'
import { useExportStore } from '../stores/useExportStore'
import { useCameraPathStore } from '../stores/useCameraPathStore'

describe('ExportDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockReset()
    useExportStore.getState().resetAllOptions()
    useCameraPathStore.getState().clearAll()
  })

  // ── Test 1: Does not render when isOpen=false ─────────────────────

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ExportDialog isOpen={false} onClose={onClose} />)
    expect(container.innerHTML).toBe('')
  })

  // ── Test 2: Renders dialog when isOpen=true ───────────────────────

  it('renders dialog when isOpen is true with Export Scene heading', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'Export Scene' })).toBeInTheDocument()
    expect(screen.getByText('Export Scene')).toBeInTheDocument()
  })

  // ── Test 3: Shows 3 format tabs ───────────────────────────────────

  it('shows 3 format tabs: glTF, Screenshot, Video', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('tab', { name: 'glTF' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Screenshot' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Video' })).toBeInTheDocument()
  })

  // ── Test 4: Default tab is glTF with binary format toggle ─────────

  it('defaults to glTF tab with binary format toggle visible', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('switch', { name: 'Toggle binary format' })).toBeInTheDocument()
  })

  // ── Test 5: Clicking Screenshot tab switches panel ────────────────

  it('clicking Screenshot tab switches to screenshot panel', async () => {
    const user = userEvent.setup()
    render(<ExportDialog isOpen={true} onClose={onClose} />)

    await user.click(screen.getByRole('tab', { name: 'Screenshot' }))

    expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-screenshot')
    expect(screen.getByLabelText('Screenshot width')).toBeInTheDocument()
    expect(screen.getByLabelText('Screenshot height')).toBeInTheDocument()
  })

  // ── Test 6: Clicking Video tab switches panel ─────────────────────

  it('clicking Video tab switches to video panel', async () => {
    const user = userEvent.setup()
    render(<ExportDialog isOpen={true} onClose={onClose} />)

    await user.click(screen.getByRole('tab', { name: 'Video' }))

    expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-video')
    expect(screen.getByLabelText('Video width')).toBeInTheDocument()
    expect(screen.getByLabelText('Video height')).toBeInTheDocument()
    expect(screen.getByLabelText('Frames per second')).toBeInTheDocument()
  })

  // ── Test 7: Escape key calls onClose ──────────────────────────────

  it('Escape key calls onClose', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  // ── Test 8: Backdrop click calls onClose ──────────────────────────

  it('clicking backdrop calls onClose', async () => {
    const user = userEvent.setup()
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    const backdrop = document.querySelector('.fixed.inset-0')!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  // ── Test 9: Cancel button calls onClose ───────────────────────────

  it('Cancel button calls onClose', async () => {
    const user = userEvent.setup()
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Cancel export' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  // ── Test 10: Binary format toggle updates store ───────────────────

  it('toggling binary format updates the export store', async () => {
    const user = userEvent.setup()
    // Default binary is true
    expect(useExportStore.getState().gltfOptions.binary).toBe(true)

    render(<ExportDialog isOpen={true} onClose={onClose} />)
    const toggle = screen.getByRole('switch', { name: 'Toggle binary format' })

    expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Toggle off
    await user.click(toggle)
    expect(useExportStore.getState().gltfOptions.binary).toBe(false)
    expect(useExportStore.getState().activeFormat).toBe('gltf')

    // Toggle back on
    await user.click(toggle)
    expect(useExportStore.getState().gltfOptions.binary).toBe(true)
    expect(useExportStore.getState().activeFormat).toBe('glb')
  })

  // ── Test 11: Screenshot width/height inputs update store ──────────

  it('screenshot width and height inputs update the export store', () => {
    useExportStore.getState().setActiveFormat('screenshot')

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const widthInput = screen.getByLabelText('Screenshot width')
    const heightInput = screen.getByLabelText('Screenshot height')

    // Default values
    expect(widthInput).toHaveValue(1920)
    expect(heightInput).toHaveValue(1080)

    // Change width via fireEvent (avoids character-by-character clamping issues on number inputs)
    fireEvent.change(widthInput, { target: { value: '2560' } })
    expect(useExportStore.getState().screenshotOptions.width).toBe(2560)

    // Change height
    fireEvent.change(heightInput, { target: { value: '1440' } })
    expect(useExportStore.getState().screenshotOptions.height).toBe(1440)
  })

  // ── Test 12: Video FPS dropdown updates store ─────────────────────

  it('video FPS dropdown updates the export store', async () => {
    const user = userEvent.setup()
    useExportStore.getState().setActiveFormat('video')

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const fpsSelect = screen.getByLabelText('Frames per second')
    expect(fpsSelect).toHaveValue('30') // default

    await user.selectOptions(fpsSelect, '60')
    expect(useExportStore.getState().videoOptions.fps).toBe(60)

    await user.selectOptions(fpsSelect, '24')
    expect(useExportStore.getState().videoOptions.fps).toBe(24)
  })

  // ── Test 13: Progress bar appears when status is not idle ─────────

  it('progress bar appears when export status is not idle', () => {
    useExportStore.getState().setProgress({ status: 'exporting', progress: 0.5, message: 'Exporting scene...' })

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText('Exporting scene...')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('progress bar does not appear when status is idle', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('progress bar shows error state with error message', () => {
    useExportStore.getState().setProgress({
      status: 'error',
      progress: 0.3,
      message: '',
      error: 'Something went wrong',
    })

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  // ── Test 14: Export button is disabled during export ───────────────

  it('Export button is disabled when export is in progress', () => {
    useExportStore.getState().setProgress({ status: 'exporting', progress: 0.25 })

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const exportButton = screen.getByRole('button', { name: 'Start export' })
    expect(exportButton).toBeDisabled()
  })

  it('Export button is enabled when status is idle', () => {
    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const exportButton = screen.getByRole('button', { name: 'Start export' })
    expect(exportButton).toBeEnabled()
  })

  it('Export button is enabled when status is complete', () => {
    useExportStore.getState().setProgress({ status: 'complete', progress: 1 })

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const exportButton = screen.getByRole('button', { name: 'Start export' })
    expect(exportButton).toBeEnabled()
  })

  it('Export button is enabled when status is error', () => {
    useExportStore.getState().setProgress({ status: 'error', progress: 0.5 })

    render(<ExportDialog isOpen={true} onClose={onClose} />)

    const exportButton = screen.getByRole('button', { name: 'Start export' })
    expect(exportButton).toBeEnabled()
  })

  // ── Test 15: Accessibility ────────────────────────────────────────

  describe('accessibility', () => {
    it('dialog has aria-label "Export Scene"', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-label', 'Export Scene')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('close button has aria-label', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByRole('button', { name: 'Close export dialog' })).toBeInTheDocument()
    })

    it('tabs have correct aria-selected states', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      // Initially glTF is selected
      expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'false')

      // Switch to Screenshot
      await user.click(screen.getByRole('tab', { name: 'Screenshot' }))
      expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'false')

      // Switch to Video
      await user.click(screen.getByRole('tab', { name: 'Video' }))
      expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-selected', 'true')
    })

    it('tablist has aria-label "Export format"', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Export format')
    })

    it('tabs have aria-controls pointing to tabpanel ids', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByRole('tab', { name: 'glTF' })).toHaveAttribute('aria-controls', 'tabpanel-gltf')
      expect(screen.getByRole('tab', { name: 'Screenshot' })).toHaveAttribute('aria-controls', 'tabpanel-screenshot')
      expect(screen.getByRole('tab', { name: 'Video' })).toHaveAttribute('aria-controls', 'tabpanel-video')
    })

    it('progress bar has correct aria attributes', () => {
      useExportStore.getState().setProgress({ status: 'exporting', progress: 0.75 })

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '75')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
      expect(progressbar).toHaveAttribute('aria-label', 'Export progress')
    })
  })

  // ── Additional interaction tests ──────────────────────────────────

  describe('glTF tab controls', () => {
    it('shows embed textures checkbox', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Embed Textures')).toBeInTheDocument()
    })

    it('shows include animation checkbox', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Include Animation')).toBeInTheDocument()
    })

    it('shows include lights checkbox', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Include Lights')).toBeInTheDocument()
    })

    it('shows include camera checkbox', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Include Camera')).toBeInTheDocument()
    })

    it('shows precision slider', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Coordinate precision')).toBeInTheDocument()
    })

    it('toggling embed textures updates store', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const checkbox = screen.getByLabelText('Embed Textures')
      expect(checkbox).toBeChecked() // default true

      await user.click(checkbox)
      expect(useExportStore.getState().gltfOptions.embedTextures).toBe(false)
    })

    it('toggling include animation updates store', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const checkbox = screen.getByLabelText('Include Animation')
      expect(checkbox).not.toBeChecked() // default false

      await user.click(checkbox)
      expect(useExportStore.getState().gltfOptions.includeAnimation).toBe(true)
    })
  })

  describe('screenshot tab controls', () => {
    beforeEach(() => {
      useExportStore.getState().setActiveFormat('screenshot')
    })

    it('shows format dropdown with PNG/JPEG/WebP options', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const formatSelect = screen.getByLabelText('Image format')
      expect(formatSelect).toBeInTheDocument()
      expect(formatSelect).toHaveValue('png')

      const options = formatSelect.querySelectorAll('option')
      expect(options).toHaveLength(3)
      expect(options[0]).toHaveTextContent('PNG')
      expect(options[1]).toHaveTextContent('JPEG')
      expect(options[2]).toHaveTextContent('WebP')
    })

    it('quality slider is hidden for PNG format', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.queryByLabelText('Image quality')).not.toBeInTheDocument()
    })

    it('quality slider appears when format is JPEG', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      await user.selectOptions(screen.getByLabelText('Image format'), 'jpeg')
      expect(screen.getByLabelText('Image quality')).toBeInTheDocument()
    })

    it('quality slider appears when format is WebP', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      await user.selectOptions(screen.getByLabelText('Image format'), 'webp')
      expect(screen.getByLabelText('Image quality')).toBeInTheDocument()
    })

    it('shows transparent background checkbox', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Transparent Background')).toBeInTheDocument()
    })

    it('toggling transparent background updates store', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const checkbox = screen.getByLabelText('Transparent Background')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(useExportStore.getState().screenshotOptions.transparentBackground).toBe(true)
    })
  })

  describe('video tab controls', () => {
    beforeEach(() => {
      useExportStore.getState().setActiveFormat('video')
    })

    it('shows format dropdown with WebM/MP4 options', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const formatSelect = screen.getByLabelText('Video format')
      expect(formatSelect).toBeInTheDocument()
      expect(formatSelect).toHaveValue('webm')

      const options = formatSelect.querySelectorAll('option')
      expect(options).toHaveLength(2)
      expect(options[0]).toHaveTextContent('WebM')
      expect(options[1]).toHaveTextContent('MP4')
    })

    it('shows bitrate slider', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Video bitrate')).toBeInTheDocument()
    })

    it('shows duration input', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      expect(screen.getByLabelText('Video duration in seconds')).toBeInTheDocument()
    })

    it('shows camera path selector with None option by default', () => {
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const pathSelect = screen.getByLabelText('Camera path for recording')
      expect(pathSelect).toBeInTheDocument()
      expect(pathSelect).toHaveValue('')

      const options = pathSelect.querySelectorAll('option')
      expect(options).toHaveLength(1)
      expect(options[0]).toHaveTextContent('None (free camera)')
    })

    it('camera path selector lists available paths from camera path store', () => {
      useCameraPathStore.getState().addPath('Flythrough A')
      useCameraPathStore.getState().addPath('Orbit Shot')

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const pathSelect = screen.getByLabelText('Camera path for recording')
      const options = pathSelect.querySelectorAll('option')
      // None + 2 paths
      expect(options).toHaveLength(3)
      expect(options[1]).toHaveTextContent('Flythrough A')
      expect(options[2]).toHaveTextContent('Orbit Shot')
    })

    it('selecting a camera path updates video options', async () => {
      const user = userEvent.setup()
      const pathId = useCameraPathStore.getState().addPath('My Path')

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const pathSelect = screen.getByLabelText('Camera path for recording')
      await user.selectOptions(pathSelect, pathId)
      expect(useExportStore.getState().videoOptions.cameraPathId).toBe(pathId)
    })

    it('changing video format dropdown updates store', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const formatSelect = screen.getByLabelText('Video format')
      await user.selectOptions(formatSelect, 'mp4')
      expect(useExportStore.getState().videoOptions.format).toBe('mp4')
    })
  })

  // ── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('Escape does not call onClose when dialog is closed', () => {
      render(<ExportDialog isOpen={false} onClose={onClose} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('clicking inside dialog does not call onClose', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)

      const dialog = screen.getByRole('dialog')
      await user.click(dialog)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('Export button is disabled during preparing status', () => {
      useExportStore.getState().setProgress({ status: 'preparing', progress: 0.1 })

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      expect(screen.getByRole('button', { name: 'Start export' })).toBeDisabled()
    })

    it('Export button is disabled during encoding status', () => {
      useExportStore.getState().setProgress({ status: 'encoding', progress: 0.9 })

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      expect(screen.getByRole('button', { name: 'Start export' })).toBeDisabled()
    })

    it('progress bar shows status label when no custom message', () => {
      useExportStore.getState().setProgress({ status: 'preparing', progress: 0, message: '' })

      render(<ExportDialog isOpen={true} onClose={onClose} />)

      expect(screen.getByText('Preparing...')).toBeInTheDocument()
    })

    it('close button in header also calls onClose', async () => {
      const user = userEvent.setup()
      render(<ExportDialog isOpen={true} onClose={onClose} />)
      await user.click(screen.getByRole('button', { name: 'Close export dialog' }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })
})
