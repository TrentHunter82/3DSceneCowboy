import { describe, it, expect, beforeEach } from 'vitest'
import { createExportStore } from './useExportStore'
import type { ExportStoreState } from './useExportStore'
import type { StoreApi, UseBoundStore } from 'zustand'

// ── Helpers ──────────────────────────────────────────────────────────

let store: UseBoundStore<StoreApi<ExportStoreState>>

beforeEach(() => {
  store = createExportStore()
})

// ── Initial State ────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with gltf as active format', () => {
    expect(store.getState().activeFormat).toBe('gltf')
  })

  it('starts with default GLTF options', () => {
    const opts = store.getState().gltfOptions
    expect(opts.binary).toBe(true)
    expect(opts.embedTextures).toBe(true)
    expect(opts.includeAnimation).toBe(false)
    expect(opts.includeLights).toBe(false)
    expect(opts.includeCamera).toBe(false)
    expect(opts.precision).toBe(5)
  })

  it('starts with default screenshot options', () => {
    const opts = store.getState().screenshotOptions
    expect(opts.width).toBe(1920)
    expect(opts.height).toBe(1080)
    expect(opts.format).toBe('png')
    expect(opts.quality).toBe(0.92)
    expect(opts.transparentBackground).toBe(false)
  })

  it('starts with default video options', () => {
    const opts = store.getState().videoOptions
    expect(opts.width).toBe(1920)
    expect(opts.height).toBe(1080)
    expect(opts.fps).toBe(30)
    expect(opts.format).toBe('webm')
    expect(opts.bitrate).toBe(5000000)
    expect(opts.duration).toBe(0)
  })

  it('starts with idle progress', () => {
    const progress = store.getState().progress
    expect(progress.status).toBe('idle')
    expect(progress.progress).toBe(0)
    expect(progress.message).toBe('')
  })

  it('starts with null lastExportFileName', () => {
    expect(store.getState().lastExportFileName).toBeNull()
  })
})

// ── setActiveFormat ──────────────────────────────────────────────────

describe('setActiveFormat', () => {
  it('sets format to glb', () => {
    store.getState().setActiveFormat('glb')
    expect(store.getState().activeFormat).toBe('glb')
  })

  it('sets format to screenshot', () => {
    store.getState().setActiveFormat('screenshot')
    expect(store.getState().activeFormat).toBe('screenshot')
  })

  it('sets format to video', () => {
    store.getState().setActiveFormat('video')
    expect(store.getState().activeFormat).toBe('video')
  })

  it('sets format to gltf', () => {
    store.getState().setActiveFormat('video')
    store.getState().setActiveFormat('gltf')
    expect(store.getState().activeFormat).toBe('gltf')
  })
})

// ── updateGltfOptions ────────────────────────────────────────────────

describe('updateGltfOptions', () => {
  it('updates binary flag', () => {
    store.getState().updateGltfOptions({ binary: false })
    expect(store.getState().gltfOptions.binary).toBe(false)
  })

  it('updates embedTextures flag', () => {
    store.getState().updateGltfOptions({ embedTextures: false })
    expect(store.getState().gltfOptions.embedTextures).toBe(false)
  })

  it('updates includeAnimation flag', () => {
    store.getState().updateGltfOptions({ includeAnimation: true })
    expect(store.getState().gltfOptions.includeAnimation).toBe(true)
  })

  it('clamps precision to minimum of 3', () => {
    store.getState().updateGltfOptions({ precision: 1 })
    expect(store.getState().gltfOptions.precision).toBe(3)
  })

  it('clamps precision to maximum of 8', () => {
    store.getState().updateGltfOptions({ precision: 15 })
    expect(store.getState().gltfOptions.precision).toBe(8)
  })

  it('rounds precision to integer', () => {
    store.getState().updateGltfOptions({ precision: 4.7 })
    expect(store.getState().gltfOptions.precision).toBe(5)
  })

  it('preserves other fields when partially updating', () => {
    store.getState().updateGltfOptions({ binary: false })
    const opts = store.getState().gltfOptions
    expect(opts.binary).toBe(false)
    expect(opts.precision).toBe(5) // unchanged
    expect(opts.embedTextures).toBe(true) // unchanged
  })
})

// ── updateScreenshotOptions ──────────────────────────────────────────

describe('updateScreenshotOptions', () => {
  it('updates width', () => {
    store.getState().updateScreenshotOptions({ width: 3840 })
    expect(store.getState().screenshotOptions.width).toBe(3840)
  })

  it('clamps width to minimum of 1', () => {
    store.getState().updateScreenshotOptions({ width: -100 })
    expect(store.getState().screenshotOptions.width).toBe(1)
  })

  it('clamps width to maximum of 8192', () => {
    store.getState().updateScreenshotOptions({ width: 20000 })
    expect(store.getState().screenshotOptions.width).toBe(8192)
  })

  it('rounds width to integer', () => {
    store.getState().updateScreenshotOptions({ width: 1280.7 })
    expect(store.getState().screenshotOptions.width).toBe(1281)
  })

  it('clamps height to minimum of 1', () => {
    store.getState().updateScreenshotOptions({ height: 0 })
    expect(store.getState().screenshotOptions.height).toBe(1)
  })

  it('clamps height to maximum of 8192', () => {
    store.getState().updateScreenshotOptions({ height: 10000 })
    expect(store.getState().screenshotOptions.height).toBe(8192)
  })

  it('clamps quality to minimum of 0', () => {
    store.getState().updateScreenshotOptions({ quality: -0.5 })
    expect(store.getState().screenshotOptions.quality).toBe(0)
  })

  it('clamps quality to maximum of 1', () => {
    store.getState().updateScreenshotOptions({ quality: 1.5 })
    expect(store.getState().screenshotOptions.quality).toBe(1)
  })

  it('updates format', () => {
    store.getState().updateScreenshotOptions({ format: 'jpeg' })
    expect(store.getState().screenshotOptions.format).toBe('jpeg')
  })

  it('updates transparentBackground', () => {
    store.getState().updateScreenshotOptions({ transparentBackground: true })
    expect(store.getState().screenshotOptions.transparentBackground).toBe(true)
  })

  it('preserves other fields when partially updating', () => {
    store.getState().updateScreenshotOptions({ width: 800 })
    const opts = store.getState().screenshotOptions
    expect(opts.width).toBe(800)
    expect(opts.height).toBe(1080) // unchanged
    expect(opts.quality).toBe(0.92) // unchanged
  })
})

// ── updateVideoOptions ───────────────────────────────────────────────

describe('updateVideoOptions', () => {
  it('updates width and clamps to range', () => {
    store.getState().updateVideoOptions({ width: 3840 })
    expect(store.getState().videoOptions.width).toBe(3840)
  })

  it('clamps video width to minimum of 1', () => {
    store.getState().updateVideoOptions({ width: -5 })
    expect(store.getState().videoOptions.width).toBe(1)
  })

  it('clamps video width to maximum of 8192', () => {
    store.getState().updateVideoOptions({ width: 99999 })
    expect(store.getState().videoOptions.width).toBe(8192)
  })

  it('clamps video height to range [1, 8192]', () => {
    store.getState().updateVideoOptions({ height: 0 })
    expect(store.getState().videoOptions.height).toBe(1)

    store.getState().updateVideoOptions({ height: 50000 })
    expect(store.getState().videoOptions.height).toBe(8192)
  })

  it('snaps FPS to nearest allowed value (24)', () => {
    store.getState().updateVideoOptions({ fps: 25 })
    expect(store.getState().videoOptions.fps).toBe(24)
  })

  it('snaps FPS to nearest allowed value (30)', () => {
    store.getState().updateVideoOptions({ fps: 28 })
    expect(store.getState().videoOptions.fps).toBe(30)
  })

  it('snaps FPS to nearest allowed value (60)', () => {
    store.getState().updateVideoOptions({ fps: 50 })
    expect(store.getState().videoOptions.fps).toBe(60)
  })

  it('snaps very low FPS to 24', () => {
    store.getState().updateVideoOptions({ fps: 1 })
    expect(store.getState().videoOptions.fps).toBe(24)
  })

  it('snaps very high FPS to 60', () => {
    store.getState().updateVideoOptions({ fps: 120 })
    expect(store.getState().videoOptions.fps).toBe(60)
  })

  it('clamps bitrate to minimum of 100000', () => {
    store.getState().updateVideoOptions({ bitrate: 50 })
    expect(store.getState().videoOptions.bitrate).toBe(100000)
  })

  it('clamps bitrate to maximum of 50000000', () => {
    store.getState().updateVideoOptions({ bitrate: 999999999 })
    expect(store.getState().videoOptions.bitrate).toBe(50000000)
  })

  it('rounds bitrate to integer', () => {
    store.getState().updateVideoOptions({ bitrate: 5000000.7 })
    expect(store.getState().videoOptions.bitrate).toBe(5000001)
  })

  it('clamps duration to minimum of 0', () => {
    store.getState().updateVideoOptions({ duration: -5 })
    expect(store.getState().videoOptions.duration).toBe(0)
  })

  it('allows duration of 0', () => {
    store.getState().updateVideoOptions({ duration: 0 })
    expect(store.getState().videoOptions.duration).toBe(0)
  })

  it('updates format', () => {
    store.getState().updateVideoOptions({ format: 'mp4' })
    expect(store.getState().videoOptions.format).toBe('mp4')
  })

  it('preserves other fields when partially updating', () => {
    store.getState().updateVideoOptions({ fps: 60 })
    const opts = store.getState().videoOptions
    expect(opts.fps).toBe(60)
    expect(opts.width).toBe(1920) // unchanged
    expect(opts.bitrate).toBe(5000000) // unchanged
  })
})

// ── setProgress ──────────────────────────────────────────────────────

describe('setProgress', () => {
  it('updates progress status', () => {
    store.getState().setProgress({ status: 'exporting' })
    expect(store.getState().progress.status).toBe('exporting')
  })

  it('updates progress percentage', () => {
    store.getState().setProgress({ progress: 0.5 })
    expect(store.getState().progress.progress).toBe(0.5)
  })

  it('updates progress message', () => {
    store.getState().setProgress({ message: 'Encoding...' })
    expect(store.getState().progress.message).toBe('Encoding...')
  })

  it('updates multiple fields at once', () => {
    store.getState().setProgress({ status: 'encoding', progress: 0.75, message: 'Finalizing' })
    const p = store.getState().progress
    expect(p.status).toBe('encoding')
    expect(p.progress).toBe(0.75)
    expect(p.message).toBe('Finalizing')
  })

  it('preserves other progress fields on partial update', () => {
    store.getState().setProgress({ status: 'preparing', progress: 0.1, message: 'Starting' })
    store.getState().setProgress({ progress: 0.5 })
    const p = store.getState().progress
    expect(p.status).toBe('preparing')
    expect(p.progress).toBe(0.5)
    expect(p.message).toBe('Starting')
  })

  it('sets error field', () => {
    store.getState().setProgress({ status: 'error', error: 'Export failed' })
    expect(store.getState().progress.error).toBe('Export failed')
  })
})

// ── resetProgress ────────────────────────────────────────────────────

describe('resetProgress', () => {
  it('resets progress to idle defaults', () => {
    store.getState().setProgress({ status: 'exporting', progress: 0.8, message: 'Working...' })
    store.getState().resetProgress()
    const p = store.getState().progress
    expect(p.status).toBe('idle')
    expect(p.progress).toBe(0)
    expect(p.message).toBe('')
  })

  it('clears error field after reset', () => {
    store.getState().setProgress({ status: 'error', error: 'Failed' })
    store.getState().resetProgress()
    expect(store.getState().progress.error).toBeUndefined()
  })
})

// ── setLastExportFileName ────────────────────────────────────────────

describe('setLastExportFileName', () => {
  it('sets filename', () => {
    store.getState().setLastExportFileName('scene.glb')
    expect(store.getState().lastExportFileName).toBe('scene.glb')
  })

  it('can set filename back to null', () => {
    store.getState().setLastExportFileName('scene.glb')
    store.getState().setLastExportFileName(null)
    expect(store.getState().lastExportFileName).toBeNull()
  })
})

// ── resetAllOptions ──────────────────────────────────────────────────

describe('resetAllOptions', () => {
  it('resets active format to gltf', () => {
    store.getState().setActiveFormat('video')
    store.getState().resetAllOptions()
    expect(store.getState().activeFormat).toBe('gltf')
  })

  it('resets GLTF options to defaults', () => {
    store.getState().updateGltfOptions({ binary: false, precision: 8 })
    store.getState().resetAllOptions()
    expect(store.getState().gltfOptions.binary).toBe(true)
    expect(store.getState().gltfOptions.precision).toBe(5)
  })

  it('resets screenshot options to defaults', () => {
    store.getState().updateScreenshotOptions({ width: 800, quality: 0.5 })
    store.getState().resetAllOptions()
    expect(store.getState().screenshotOptions.width).toBe(1920)
    expect(store.getState().screenshotOptions.quality).toBe(0.92)
  })

  it('resets video options to defaults', () => {
    store.getState().updateVideoOptions({ fps: 60, bitrate: 10000000 })
    store.getState().resetAllOptions()
    expect(store.getState().videoOptions.fps).toBe(30)
    expect(store.getState().videoOptions.bitrate).toBe(5000000)
  })

  it('resets progress to idle', () => {
    store.getState().setProgress({ status: 'exporting', progress: 0.5 })
    store.getState().resetAllOptions()
    expect(store.getState().progress.status).toBe('idle')
    expect(store.getState().progress.progress).toBe(0)
  })

  it('resets lastExportFileName to null', () => {
    store.getState().setLastExportFileName('test.glb')
    store.getState().resetAllOptions()
    expect(store.getState().lastExportFileName).toBeNull()
  })
})

// ── Store isolation ──────────────────────────────────────────────────

describe('store isolation', () => {
  it('factory creates independent stores', () => {
    const store2 = createExportStore()
    store.getState().setActiveFormat('video')
    expect(store2.getState().activeFormat).toBe('gltf')
  })
})
