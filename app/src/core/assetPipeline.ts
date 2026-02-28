/** Asset import pipeline - handles loading assets from files/URLs */

import type {
  Asset,
  AssetType,
  MeshAsset,
  MeshAssetData,
  TextureAsset,
  TextureAssetData,
} from '../types/asset'
import { createMeshAsset, createTextureAsset, createMaterialAsset, createPrefabAsset, generateAssetId } from './assetLibrary'

// ── File Extension Utilities ──────────────────────────────────────────

const MESH_EXTENSIONS: Record<string, MeshAssetData['format']> = {
  gltf: 'gltf',
  glb: 'glb',
  obj: 'obj',
}

const TEXTURE_EXTENSIONS: Record<string, TextureAssetData['format']> = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpeg',
  webp: 'webp',
  hdr: 'hdr',
}

/**
 * Extract lowercased file extension without the dot.
 * Handles paths with directories, multiple dots, and edge cases.
 */
export function extractFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1 || dotIndex === filename.length - 1) return ''
  return filename.slice(dotIndex + 1).toLowerCase()
}

/**
 * Infer asset type from filename extension.
 * Returns null if the extension is not recognized.
 */
export function inferAssetType(filename: string): AssetType | null {
  const ext = extractFileExtension(filename)
  if (ext in MESH_EXTENSIONS) return 'mesh'
  if (ext in TEXTURE_EXTENSIONS) return 'texture'
  if (ext === 'json') return 'prefab'
  return null
}

/**
 * Infer mesh format from filename.
 * Returns null if the file is not a recognized mesh format.
 */
export function inferMeshFormat(filename: string): MeshAssetData['format'] | null {
  const ext = extractFileExtension(filename)
  return MESH_EXTENSIONS[ext] ?? null
}

/**
 * Infer texture format from filename.
 * Returns null if the file is not a recognized texture format.
 */
export function inferTextureFormat(filename: string): TextureAssetData['format'] | null {
  const ext = extractFileExtension(filename)
  return TEXTURE_EXTENSIONS[ext] ?? null
}

// ── File Validation ───────────────────────────────────────────────────

/**
 * Check whether a file size (in bytes) is within the allowed limit.
 */
export function validateFileSize(bytes: number, maxBytes: number): boolean {
  return bytes >= 0 && bytes <= maxBytes
}

// ── File Type Detection (legacy) ──────────────────────────────────────

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return filename.slice(dotIndex).toLowerCase()
}

export function validateFileType(file: File, allowedTypes: AssetType[]): AssetType | null {
  const ext = getFileExtension(file.name)

  const meshExts = ['.gltf', '.glb', '.obj'] as const
  const texExts = ['.png', '.jpg', '.jpeg', '.webp', '.hdr'] as const

  if (allowedTypes.includes('mesh') && (meshExts as readonly string[]).includes(ext)) {
    return 'mesh'
  }
  if (allowedTypes.includes('texture') && (texExts as readonly string[]).includes(ext)) {
    return 'texture'
  }

  return null
}

// ── Thumbnail Generation ──────────────────────────────────────────────

/**
 * Return a placeholder thumbnail URL based on asset type.
 */
export function generateThumbnailUrl(asset: Asset): string {
  return `/thumbnails/${asset.type}-default.png`
}

// ── Name Sanitization ─────────────────────────────────────────────────

/**
 * Sanitize an asset name: remove file extension, replace special characters
 * with spaces, trim whitespace, and limit to 64 characters.
 */
export function sanitizeAssetName(name: string): string {
  // Remove file extension
  const dotIndex = name.lastIndexOf('.')
  let cleaned = dotIndex > 0 ? name.slice(0, dotIndex) : name

  // Replace special characters (anything not alphanumeric, space, or hyphen) with spaces
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s-]/g, ' ')

  // Collapse multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Limit to 64 characters
  if (cleaned.length > 64) {
    cleaned = cleaned.slice(0, 64).trim()
  }

  return cleaned
}

// ── Tag Extraction ────────────────────────────────────────────────────

/**
 * Auto-generate tags from a filename and asset type.
 * Splits the filename (without extension) into words and adds the type as a tag.
 */
export function extractAssetTags(filename: string, type: AssetType): string[] {
  const tags: string[] = [type]

  // Remove extension
  const dotIndex = filename.lastIndexOf('.')
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename

  // Split on non-alphanumeric characters (hyphens, underscores, spaces, dots, camelCase)
  const words = base
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .split(/[^a-zA-Z0-9]+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 0)

  for (const word of words) {
    if (!tags.includes(word)) {
      tags.push(word)
    }
  }

  return tags
}

// ── Import from File Object ───────────────────────────────────────────

/**
 * Create an appropriate Asset from file metadata and a blob URL.
 * Returns null if the file type cannot be inferred.
 */
export function importAssetFromFile(
  file: { name: string; size: number; type: string },
  url: string,
): Asset | null {
  const assetType = inferAssetType(file.name)
  if (!assetType) return null

  const name = sanitizeAssetName(file.name)

  switch (assetType) {
    case 'mesh': {
      const format = inferMeshFormat(file.name)
      if (!format) return null
      const asset = createMeshAsset(name, url, file.name, format, 'local')
      asset.fileSize = file.size
      asset.tags = extractAssetTags(file.name, 'mesh')
      return asset
    }
    case 'texture': {
      const format = inferTextureFormat(file.name)
      if (!format) return null
      const asset = createTextureAsset(name, url, file.name, format, 'local')
      asset.fileSize = file.size
      asset.tags = extractAssetTags(file.name, 'texture')
      return asset
    }
    case 'prefab': {
      const asset = createPrefabAsset(name, [], 'local')
      asset.fileSize = file.size
      asset.tags = extractAssetTags(file.name, 'prefab')
      return asset
    }
    default:
      return null
  }
}

// ── Metadata Extraction ───────────────────────────────────────────────

export function extractMeshMetadata(file: File): Promise<{
  name: string
  format: MeshAssetData['format']
  fileSize: number
}> {
  const ext = getFileExtension(file.name)
  const name = file.name.replace(/\.[^.]+$/, '')

  let format: MeshAssetData['format']
  switch (ext) {
    case '.glb':
      format = 'glb'
      break
    case '.obj':
      format = 'obj'
      break
    case '.gltf':
    default:
      format = 'gltf'
      break
  }

  return Promise.resolve({
    name,
    format,
    fileSize: file.size,
  })
}

/* v8 ignore start */
export async function extractTextureMetadata(file: File): Promise<{
  name: string
  format: TextureAssetData['format']
  fileSize: number
  width: number
  height: number
}> {
  const ext = getFileExtension(file.name)
  const name = file.name.replace(/\.[^.]+$/, '')

  let format: TextureAssetData['format']
  switch (ext) {
    case '.jpg':
      format = 'jpg'
      break
    case '.jpeg':
      format = 'jpeg'
      break
    case '.webp':
      format = 'webp'
      break
    case '.hdr':
      format = 'hdr'
      break
    case '.png':
    default:
      format = 'png'
      break
  }

  // Use createImageBitmap to extract dimensions without loading into a canvas
  const bitmap = await createImageBitmap(file)
  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()

  return {
    name,
    format,
    fileSize: file.size,
    width,
    height,
  }
}
/* v8 ignore stop */

// ── Import from File (legacy async) ──────────────────────────────────

/* v8 ignore start */
export async function importMeshFromFile(file: File): Promise<MeshAsset> {
  const url = URL.createObjectURL(file)
  const metadata = await extractMeshMetadata(file)
  const asset = createMeshAsset(metadata.name, url, file.name, metadata.format)
  asset.fileSize = metadata.fileSize
  return asset
}

export async function importTextureFromFile(file: File): Promise<TextureAsset> {
  const url = URL.createObjectURL(file)
  const metadata = await extractTextureMetadata(file)
  const asset = createTextureAsset(metadata.name, url, file.name, metadata.format)
  asset.fileSize = metadata.fileSize
  asset.data.width = metadata.width
  asset.data.height = metadata.height
  return asset
}
/* v8 ignore stop */

// ── Import from URL ───────────────────────────────────────────────────

export function importAssetFromUrl(
  url: string,
  type: AssetType,
  name?: string,
): Promise<Asset> {
  const assetName = name ?? url.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Unnamed Asset'

  switch (type) {
    case 'mesh': {
      const ext = getFileExtension(url)
      let format: MeshAssetData['format'] = 'gltf'
      if (ext === '.glb') format = 'glb'
      else if (ext === '.obj') format = 'obj'
      const filename = url.split('/').pop() ?? 'model.gltf'
      const asset = createMeshAsset(assetName, url, filename, format)
      asset.source = 'url'
      return Promise.resolve(asset)
    }
    case 'texture': {
      const ext = getFileExtension(url)
      let format: TextureAssetData['format'] = 'png'
      if (ext === '.jpg') format = 'jpg'
      else if (ext === '.jpeg') format = 'jpeg'
      else if (ext === '.webp') format = 'webp'
      else if (ext === '.hdr') format = 'hdr'
      const filename = url.split('/').pop() ?? 'texture.png'
      const asset = createTextureAsset(assetName, url, filename, format)
      asset.source = 'url'
      return Promise.resolve(asset)
    }
    case 'material': {
      const asset = createMaterialAsset(assetName, {
        materialType: 'standard',
        color: '#c49a5c',
      })
      asset.source = 'url'
      return Promise.resolve(asset)
    }
    case 'prefab': {
      const now = new Date().toISOString()
      const asset: Asset = {
        id: generateAssetId(),
        name: assetName,
        type: 'prefab',
        source: 'url',
        tags: [],
        createdAt: now,
        updatedAt: now,
        data: {
          objects: [],
          objectCount: 0,
        },
      }
      return Promise.resolve(asset)
    }
  }
}

// ── URL Cleanup ───────────────────────────────────────────────────────

/* v8 ignore start */
export function revokeAssetUrls(asset: Asset): void {
  switch (asset.type) {
    case 'mesh':
      if (asset.data.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.data.url)
      }
      break
    case 'texture':
      if (asset.data.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.data.url)
      }
      break
    case 'material':
    case 'prefab':
      // No blob URLs to revoke
      break
  }
  if (asset.thumbnailUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(asset.thumbnailUrl)
  }
}
/* v8 ignore stop */
