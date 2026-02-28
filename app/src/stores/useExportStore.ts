/** Zustand store for export pipeline state */

import { create } from 'zustand'
import type {
  GltfExportOptions, ScreenshotOptions, VideoRecordingOptions,
  ExportFormat, ExportProgress,
} from '../types/export'
import { DEFAULT_GLTF_OPTIONS, DEFAULT_SCREENSHOT_OPTIONS, DEFAULT_VIDEO_OPTIONS } from '../core/exportPipeline'

// ── Store Interface ─────────────────────────────────────────────────

export interface ExportStoreState {
  // State
  gltfOptions: GltfExportOptions
  screenshotOptions: ScreenshotOptions
  videoOptions: VideoRecordingOptions
  activeFormat: ExportFormat
  progress: ExportProgress
  lastExportFileName: string | null

  // Actions
  setActiveFormat: (format: ExportFormat) => void
  updateGltfOptions: (updates: Partial<GltfExportOptions>) => void
  updateScreenshotOptions: (updates: Partial<ScreenshotOptions>) => void
  updateVideoOptions: (updates: Partial<VideoRecordingOptions>) => void
  setProgress: (progress: Partial<ExportProgress>) => void
  resetProgress: () => void
  setLastExportFileName: (name: string | null) => void
  resetAllOptions: () => void
}

// ── Constants ───────────────────────────────────────────────────────

const ALLOWED_FPS = [24, 30, 60] as const

const DEFAULT_PROGRESS: ExportProgress = {
  status: 'idle',
  progress: 0,
  message: '',
}

// ── Validation Helpers ──────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampScreenshotOptions(updates: Partial<ScreenshotOptions>): Partial<ScreenshotOptions> {
  const clamped: Partial<ScreenshotOptions> = { ...updates }

  if (clamped.width !== undefined) {
    clamped.width = Math.round(clamp(clamped.width, 1, 8192))
  }
  if (clamped.height !== undefined) {
    clamped.height = Math.round(clamp(clamped.height, 1, 8192))
  }
  if (clamped.quality !== undefined) {
    clamped.quality = clamp(clamped.quality, 0, 1)
  }

  return clamped
}

function clampVideoOptions(updates: Partial<VideoRecordingOptions>): Partial<VideoRecordingOptions> {
  const clamped: Partial<VideoRecordingOptions> = { ...updates }

  if (clamped.width !== undefined) {
    clamped.width = Math.round(clamp(clamped.width, 1, 8192))
  }
  if (clamped.height !== undefined) {
    clamped.height = Math.round(clamp(clamped.height, 1, 8192))
  }
  if (clamped.fps !== undefined) {
    // Snap to nearest allowed FPS value
    let bestFps: number = ALLOWED_FPS[0]
    let bestDiff = Math.abs(clamped.fps - bestFps)
    for (const fps of ALLOWED_FPS) {
      const diff = Math.abs(clamped.fps - fps)
      if (diff < bestDiff) {
        bestDiff = diff
        bestFps = fps
      }
    }
    clamped.fps = bestFps
  }
  if (clamped.bitrate !== undefined) {
    clamped.bitrate = Math.round(clamp(clamped.bitrate, 100000, 50000000))
  }
  if (clamped.duration !== undefined) {
    clamped.duration = Math.max(0, clamped.duration)
  }

  return clamped
}

function clampGltfOptions(updates: Partial<GltfExportOptions>): Partial<GltfExportOptions> {
  const clamped: Partial<GltfExportOptions> = { ...updates }

  if (clamped.precision !== undefined) {
    clamped.precision = Math.round(clamp(clamped.precision, 3, 8))
  }

  return clamped
}

// ── Factory (for testing) ───────────────────────────────────────────

export function createExportStore() {
  return create<ExportStoreState>((set) => ({
    // Initial state
    gltfOptions: { ...DEFAULT_GLTF_OPTIONS },
    screenshotOptions: { ...DEFAULT_SCREENSHOT_OPTIONS },
    videoOptions: { ...DEFAULT_VIDEO_OPTIONS },
    activeFormat: 'gltf',
    progress: { ...DEFAULT_PROGRESS },
    lastExportFileName: null,

    // Actions
    setActiveFormat: (format) => set({ activeFormat: format }),

    updateGltfOptions: (updates) => set(state => ({
      gltfOptions: { ...state.gltfOptions, ...clampGltfOptions(updates) },
    })),

    updateScreenshotOptions: (updates) => set(state => ({
      screenshotOptions: { ...state.screenshotOptions, ...clampScreenshotOptions(updates) },
    })),

    updateVideoOptions: (updates) => set(state => ({
      videoOptions: { ...state.videoOptions, ...clampVideoOptions(updates) },
    })),

    setProgress: (update) => set(state => {
      const merged = { ...state.progress, ...update }
      return {
        progress: {
          ...merged,
          progress: Math.max(0, Math.min(1, merged.progress)),
        },
      }
    }),

    resetProgress: () => set({
      progress: { ...DEFAULT_PROGRESS },
    }),

    setLastExportFileName: (name) => set({ lastExportFileName: name }),

    resetAllOptions: () => set({
      gltfOptions: { ...DEFAULT_GLTF_OPTIONS },
      screenshotOptions: { ...DEFAULT_SCREENSHOT_OPTIONS },
      videoOptions: { ...DEFAULT_VIDEO_OPTIONS },
      activeFormat: 'gltf',
      progress: { ...DEFAULT_PROGRESS },
      lastExportFileName: null,
    }),
  }))
}

// ── Singleton ───────────────────────────────────────────────────────

export const useExportStore = createExportStore()
