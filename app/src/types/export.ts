// Export Pipeline Types (Phase 8)
import type { Vec3 } from './scene'

/** Supported export formats */
export type ExportFormat = 'gltf' | 'glb' | 'screenshot' | 'video'

/** Screenshot image format */
export type ImageFormat = 'png' | 'jpeg' | 'webp'

/** Video recording format */
export type VideoFormat = 'webm' | 'mp4'

/** glTF export options */
export interface GltfExportOptions {
  binary: boolean          // true = .glb, false = .gltf
  embedTextures: boolean   // embed textures as base64 or separate files
  includeAnimation: boolean
  includeLights: boolean
  includeCamera: boolean
  precision: number        // coordinate decimal places (3-8, default 5)
}

/** Screenshot export options */
export interface ScreenshotOptions {
  width: number            // output width in pixels
  height: number           // output height in pixels
  format: ImageFormat
  quality: number          // 0-1 for jpeg/webp (ignored for png)
  transparentBackground: boolean
  cameraPosition?: Vec3
  cameraTarget?: Vec3
}

/** Video recording options */
export interface VideoRecordingOptions {
  width: number
  height: number
  fps: number              // 24, 30, 60
  format: VideoFormat
  bitrate: number          // bits per second
  duration: number         // seconds (0 = use camera path duration)
  cameraPathId?: string    // camera path to follow during recording
}

/** Export progress state */
export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'encoding' | 'complete' | 'error'

export interface ExportProgress {
  status: ExportStatus
  progress: number         // 0-1
  message: string
  error?: string
}

/** Export result */
export interface ExportResult {
  format: ExportFormat
  blob: Blob
  fileName: string
  fileSize: number         // bytes
  duration?: number        // for video, in ms
}
