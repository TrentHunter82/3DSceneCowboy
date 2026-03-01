import { useEffect, useRef, useCallback } from 'react'
import { useExportStore } from '../stores/useExportStore'
import { useCameraPathStore } from '../stores/useCameraPathStore'
import type { ExportFormat, ImageFormat, VideoFormat } from '../types/export'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const FORMAT_TABS: { id: ExportFormat; label: string }[] = [
  { id: 'gltf', label: 'glTF' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'video', label: 'Video' },
]

const IMAGE_FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

const VIDEO_FORMATS: { value: VideoFormat; label: string }[] = [
  { value: 'webm', label: 'WebM' },
  { value: 'mp4', label: 'MP4' },
]

const FPS_OPTIONS = [24, 30, 60] as const

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const activeFormat = useExportStore(s => s.activeFormat)
  const setActiveFormat = useExportStore(s => s.setActiveFormat)
  const gltfOptions = useExportStore(s => s.gltfOptions)
  const updateGltfOptions = useExportStore(s => s.updateGltfOptions)
  const screenshotOptions = useExportStore(s => s.screenshotOptions)
  const updateScreenshotOptions = useExportStore(s => s.updateScreenshotOptions)
  const videoOptions = useExportStore(s => s.videoOptions)
  const updateVideoOptions = useExportStore(s => s.updateVideoOptions)
  const progress = useExportStore(s => s.progress)

  const cameraPaths = useCameraPathStore(s => s.paths)

  // Determine tab key: gltf and glb both map to 'gltf' tab
  const activeTab: 'gltf' | 'screenshot' | 'video' =
    activeFormat === 'glb' ? 'gltf' : activeFormat

  // Auto-focus close button on mount
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  const handleTabChange = useCallback(
    (tab: 'gltf' | 'screenshot' | 'video') => {
      if (tab === 'gltf') {
        // Preserve binary toggle: if currently glb keep glb, otherwise default to gltf
        setActiveFormat(gltfOptions.binary ? 'glb' : 'gltf')
      } else {
        setActiveFormat(tab)
      }
    },
    [setActiveFormat, gltfOptions.binary],
  )

  const handleBinaryToggle = useCallback(
    (binary: boolean) => {
      updateGltfOptions({ binary })
      setActiveFormat(binary ? 'glb' : 'gltf')
    },
    [updateGltfOptions, setActiveFormat],
  )

  const isExporting = progress.status !== 'idle' && progress.status !== 'complete' && progress.status !== 'error'

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export Scene"
        className="relative w-full max-w-lg mx-4 bg-dust-800 border border-dust-600 rounded-lg flex flex-col max-h-[90vh]"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.7), 0 24px 80px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dust-600/30 shrink-0">
          <h2 className="text-[15px] font-semibold text-sand-200 tracking-wide label-debossed-deep">
            Export Scene
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-dust-400 hover:text-sand-200 hover:bg-dust-600 transition-colors focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:outline-none"
            aria-label="Close export dialog"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex border-b border-dust-600/30 shrink-0" role="tablist" aria-label="Export format">
          {FORMAT_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => handleTabChange(tab.id as 'gltf' | 'screenshot' | 'video')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-inset ${
                activeTab === tab.id
                  ? 'text-sand-200 border-b-2 border-rust-500 bg-dust-750'
                  : 'text-dust-400 hover:text-sand-300 hover:bg-dust-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="overflow-y-auto flex-1">
          {/* glTF Tab */}
          {activeTab === 'gltf' && (
            <div role="tabpanel" id="tabpanel-gltf" className="px-6 py-4 space-y-4">
              {/* Binary format toggle */}
              <div className="flex items-center justify-between">
                <label htmlFor="export-binary" className="text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em]">
                  Binary Format (.glb)
                </label>
                <button
                  id="export-binary"
                  role="switch"
                  aria-checked={gltfOptions.binary}
                  aria-label="Toggle binary format"
                  onClick={() => handleBinaryToggle(!gltfOptions.binary)}
                  className={`relative w-9 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
                    gltfOptions.binary ? 'bg-rust-500' : 'bg-dust-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-sand-200 transition-transform ${
                      gltfOptions.binary ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Embed textures */}
              <Checkbox
                id="export-embed-textures"
                label="Embed Textures"
                checked={gltfOptions.embedTextures}
                onChange={v => updateGltfOptions({ embedTextures: v })}
              />

              {/* Include Animation */}
              <Checkbox
                id="export-include-animation"
                label="Include Animation"
                checked={gltfOptions.includeAnimation}
                onChange={v => updateGltfOptions({ includeAnimation: v })}
              />

              {/* Include Lights */}
              <Checkbox
                id="export-include-lights"
                label="Include Lights"
                checked={gltfOptions.includeLights}
                onChange={v => updateGltfOptions({ includeLights: v })}
              />

              {/* Include Camera */}
              <Checkbox
                id="export-include-camera"
                label="Include Camera"
                checked={gltfOptions.includeCamera}
                onChange={v => updateGltfOptions({ includeCamera: v })}
              />

              {/* Precision slider */}
              <div>
                <label htmlFor="export-precision" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Precision ({gltfOptions.precision} decimals)
                </label>
                <input
                  id="export-precision"
                  type="range"
                  min={3}
                  max={8}
                  step={1}
                  value={gltfOptions.precision}
                  onChange={e => updateGltfOptions({ precision: Number(e.target.value) })}
                  className="w-full accent-rust-500"
                  aria-label="Coordinate precision"
                  aria-valuemin={3}
                  aria-valuemax={8}
                  aria-valuenow={gltfOptions.precision}
                />
                <div className="flex justify-between text-[10px] text-dust-500 mt-0.5">
                  <span>3</span>
                  <span>8</span>
                </div>
              </div>
            </div>
          )}

          {/* Screenshot Tab */}
          {activeTab === 'screenshot' && (
            <div role="tabpanel" id="tabpanel-screenshot" className="px-6 py-4 space-y-4">
              {/* Width / Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="screenshot-width" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                    Width (px)
                  </label>
                  <input
                    id="screenshot-width"
                    type="number"
                    min={1}
                    max={8192}
                    value={screenshotOptions.width}
                    onChange={e => updateScreenshotOptions({ width: Number(e.target.value) })}
                    className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                    aria-label="Screenshot width"
                  />
                </div>
                <div>
                  <label htmlFor="screenshot-height" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                    Height (px)
                  </label>
                  <input
                    id="screenshot-height"
                    type="number"
                    min={1}
                    max={8192}
                    value={screenshotOptions.height}
                    onChange={e => updateScreenshotOptions({ height: Number(e.target.value) })}
                    className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                    aria-label="Screenshot height"
                  />
                </div>
              </div>

              {/* Format dropdown */}
              <div>
                <label htmlFor="screenshot-format" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Format
                </label>
                <select
                  id="screenshot-format"
                  value={screenshotOptions.format}
                  onChange={e => updateScreenshotOptions({ format: e.target.value as ImageFormat })}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                  aria-label="Image format"
                >
                  {IMAGE_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Quality slider (hidden for PNG) */}
              {screenshotOptions.format !== 'png' && (
                <div>
                  <label htmlFor="screenshot-quality" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                    Quality ({Math.round(screenshotOptions.quality * 100)}%)
                  </label>
                  <input
                    id="screenshot-quality"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={screenshotOptions.quality}
                    onChange={e => updateScreenshotOptions({ quality: Number(e.target.value) })}
                    className="w-full accent-rust-500"
                    aria-label="Image quality"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(screenshotOptions.quality * 100)}
                  />
                  <div className="flex justify-between text-[10px] text-dust-500 mt-0.5">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Transparent background */}
              <Checkbox
                id="screenshot-transparent"
                label="Transparent Background"
                checked={screenshotOptions.transparentBackground}
                onChange={v => updateScreenshotOptions({ transparentBackground: v })}
              />
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div role="tabpanel" id="tabpanel-video" className="px-6 py-4 space-y-4">
              {/* Width / Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="video-width" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                    Width (px)
                  </label>
                  <input
                    id="video-width"
                    type="number"
                    min={1}
                    max={8192}
                    value={videoOptions.width}
                    onChange={e => updateVideoOptions({ width: Number(e.target.value) })}
                    className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                    aria-label="Video width"
                  />
                </div>
                <div>
                  <label htmlFor="video-height" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                    Height (px)
                  </label>
                  <input
                    id="video-height"
                    type="number"
                    min={1}
                    max={8192}
                    value={videoOptions.height}
                    onChange={e => updateVideoOptions({ height: Number(e.target.value) })}
                    className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                    aria-label="Video height"
                  />
                </div>
              </div>

              {/* FPS dropdown */}
              <div>
                <label htmlFor="video-fps" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Frame Rate
                </label>
                <select
                  id="video-fps"
                  value={videoOptions.fps}
                  onChange={e => updateVideoOptions({ fps: Number(e.target.value) })}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                  aria-label="Frames per second"
                >
                  {FPS_OPTIONS.map(fps => (
                    <option key={fps} value={fps}>{fps} FPS</option>
                  ))}
                </select>
              </div>

              {/* Format dropdown */}
              <div>
                <label htmlFor="video-format" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Format
                </label>
                <select
                  id="video-format"
                  value={videoOptions.format}
                  onChange={e => updateVideoOptions({ format: e.target.value as VideoFormat })}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                  aria-label="Video format"
                >
                  {VIDEO_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Bitrate */}
              <div>
                <label htmlFor="video-bitrate" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Bitrate ({formatBitrate(videoOptions.bitrate)})
                </label>
                <input
                  id="video-bitrate"
                  type="range"
                  min={100000}
                  max={50000000}
                  step={100000}
                  value={videoOptions.bitrate}
                  onChange={e => updateVideoOptions({ bitrate: Number(e.target.value) })}
                  className="w-full accent-rust-500"
                  aria-label="Video bitrate"
                  aria-valuemin={100000}
                  aria-valuemax={50000000}
                  aria-valuenow={videoOptions.bitrate}
                />
                <div className="flex justify-between text-[10px] text-dust-500 mt-0.5">
                  <span>0.1 Mbps</span>
                  <span>50 Mbps</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="video-duration" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Duration (seconds)
                </label>
                <input
                  id="video-duration"
                  type="number"
                  min={0}
                  step={0.5}
                  value={videoOptions.duration}
                  onChange={e => updateVideoOptions({ duration: Number(e.target.value) })}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                  aria-label="Video duration in seconds"
                />
                <p className="text-[10px] text-dust-500 mt-0.5">
                  0 = use camera path duration
                </p>
              </div>

              {/* Camera path selector */}
              <div>
                <label htmlFor="video-camera-path" className="block text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em] mb-1.5">
                  Camera Path
                </label>
                <select
                  id="video-camera-path"
                  value={videoOptions.cameraPathId ?? ''}
                  onChange={e => updateVideoOptions({ cameraPathId: e.target.value || undefined })}
                  className="w-full bg-dust-900 border border-dust-600/50 rounded px-2.5 py-1.5 text-[11px] text-sand-200 focus:border-rust-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 transition-colors"
                  aria-label="Camera path for recording"
                >
                  <option value="">None (free camera)</option>
                  {cameraPaths.map(path => (
                    <option key={path.id} value={path.id}>{path.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {progress.status !== 'idle' && (
          <div className="px-6 py-3 border-t border-dust-600/30 shrink-0">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-sand-200">
                {progress.message || statusLabel(progress.status)}
              </span>
              <span className="text-[11px] text-dust-400">
                {Math.round(progress.progress * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-dust-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  progress.status === 'error' ? 'bg-red-500' :
                  progress.status === 'complete' ? 'bg-green-500' :
                  'bg-rust-500'
                }`}
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Export progress"
              />
            </div>
            {progress.status === 'error' && progress.error && (
              <p className="mt-1.5 text-[11px] text-red-400">
                {progress.error}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-dust-600/30 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-sand-200 bg-dust-700 border border-dust-600 rounded hover:bg-dust-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
            aria-label="Cancel export"
          >
            Cancel
          </button>
          <button
            disabled={isExporting}
            className={`px-4 py-2 text-sm font-semibold text-white rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 ${
              isExporting
                ? 'bg-rust-500/50 cursor-not-allowed'
                : 'bg-rust-500 hover:bg-rust-600'
            }`}
            style={{ boxShadow: '0 0 8px rgba(255,255,255,0.04)' }}
            aria-label="Start export"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────────────────────────────

interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Checkbox({ id, label, checked, onChange }: CheckboxProps) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-[10px] font-medium text-dust-400 uppercase tracking-[0.06em]">
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-dust-600 bg-dust-900 text-rust-500 accent-rust-500 focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:outline-none"
        aria-label={label}
      />
    </div>
  )
}

// ── Helper Functions ──────────────────────────────────────────────────

function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`
  }
  return `${(bps / 1000).toFixed(0)} kbps`
}

function statusLabel(status: string): string {
  switch (status) {
    case 'preparing': return 'Preparing...'
    case 'exporting': return 'Exporting...'
    case 'encoding': return 'Encoding...'
    case 'complete': return 'Export complete'
    case 'error': return 'Export failed'
    default: return ''
  }
}
