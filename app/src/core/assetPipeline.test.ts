import { describe, it, expect, beforeEach } from 'vitest'
import {
  extractFileExtension,
  inferAssetType,
  inferMeshFormat,
  inferTextureFormat,
  validateFileSize,
  generateThumbnailUrl,
  sanitizeAssetName,
  extractAssetTags,
  importAssetFromFile,
  extractMeshMetadata,
} from './assetPipeline'
import { resetAssetIdCounter } from './assetLibrary'
import type { MeshAsset, TextureAsset, PrefabAsset } from '../types/asset'

beforeEach(() => {
  resetAssetIdCounter()
})

// ── extractFileExtension ──────────────────────────────────────────────

describe('extractFileExtension', () => {
  it('extracts simple extension', () => {
    expect(extractFileExtension('model.glb')).toBe('glb')
  })

  it('returns lowercased extension', () => {
    expect(extractFileExtension('Model.GLB')).toBe('glb')
  })

  it('handles multiple dots', () => {
    expect(extractFileExtension('my.cool.model.gltf')).toBe('gltf')
  })

  it('handles path with directories', () => {
    expect(extractFileExtension('assets/models/hat.obj')).toBe('obj')
  })

  it('returns empty string for no extension', () => {
    expect(extractFileExtension('README')).toBe('')
  })

  it('returns empty string for trailing dot', () => {
    expect(extractFileExtension('file.')).toBe('')
  })
})

// ── inferAssetType ────────────────────────────────────────────────────

describe('inferAssetType', () => {
  it('identifies gltf as mesh', () => {
    expect(inferAssetType('model.gltf')).toBe('mesh')
  })

  it('identifies glb as mesh', () => {
    expect(inferAssetType('model.glb')).toBe('mesh')
  })

  it('identifies obj as mesh', () => {
    expect(inferAssetType('scene.obj')).toBe('mesh')
  })

  it('identifies png as texture', () => {
    expect(inferAssetType('sky.png')).toBe('texture')
  })

  it('identifies jpg as texture', () => {
    expect(inferAssetType('photo.jpg')).toBe('texture')
  })

  it('identifies jpeg as texture', () => {
    expect(inferAssetType('photo.jpeg')).toBe('texture')
  })

  it('identifies webp as texture', () => {
    expect(inferAssetType('image.webp')).toBe('texture')
  })

  it('identifies hdr as texture', () => {
    expect(inferAssetType('env.hdr')).toBe('texture')
  })

  it('identifies json as prefab', () => {
    expect(inferAssetType('scene.json')).toBe('prefab')
  })

  it('returns null for unknown extension', () => {
    expect(inferAssetType('document.pdf')).toBeNull()
  })

  it('returns null for no extension', () => {
    expect(inferAssetType('Makefile')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(inferAssetType('Model.GLTF')).toBe('mesh')
  })
})

// ── inferMeshFormat / inferTextureFormat ───────────────────────────────

describe('inferMeshFormat', () => {
  it('returns gltf for .gltf files', () => {
    expect(inferMeshFormat('scene.gltf')).toBe('gltf')
  })

  it('returns glb for .glb files', () => {
    expect(inferMeshFormat('model.glb')).toBe('glb')
  })

  it('returns obj for .obj files', () => {
    expect(inferMeshFormat('mesh.obj')).toBe('obj')
  })

  it('returns null for non-mesh files', () => {
    expect(inferMeshFormat('texture.png')).toBeNull()
  })
})

describe('inferTextureFormat', () => {
  it('returns png for .png files', () => {
    expect(inferTextureFormat('image.png')).toBe('png')
  })

  it('returns jpg for .jpg files', () => {
    expect(inferTextureFormat('photo.jpg')).toBe('jpg')
  })

  it('returns hdr for .hdr files', () => {
    expect(inferTextureFormat('env.hdr')).toBe('hdr')
  })

  it('returns null for non-texture files', () => {
    expect(inferTextureFormat('model.glb')).toBeNull()
  })
})

// ── validateFileSize ──────────────────────────────────────────────────

describe('validateFileSize', () => {
  it('accepts file within limit', () => {
    expect(validateFileSize(1024, 2048)).toBe(true)
  })

  it('accepts file exactly at limit', () => {
    expect(validateFileSize(2048, 2048)).toBe(true)
  })

  it('rejects file exceeding limit', () => {
    expect(validateFileSize(4096, 2048)).toBe(false)
  })

  it('accepts zero-byte file', () => {
    expect(validateFileSize(0, 1024)).toBe(true)
  })
})

// ── generateThumbnailUrl ──────────────────────────────────────────────

describe('generateThumbnailUrl', () => {
  it('returns mesh thumbnail URL for mesh assets', () => {
    const asset: MeshAsset = {
      id: 'm1', name: 'M', type: 'mesh', source: 'local', tags: [],
      createdAt: '', updatedAt: '',
      data: { url: 'blob:x', filename: 'a.glb', format: 'glb' },
    }
    expect(generateThumbnailUrl(asset)).toBe('/thumbnails/mesh-default.png')
  })

  it('returns texture thumbnail URL for texture assets', () => {
    const asset: TextureAsset = {
      id: 't1', name: 'T', type: 'texture', source: 'local', tags: [],
      createdAt: '', updatedAt: '',
      data: { url: 'blob:y', filename: 'b.png', format: 'png' },
    }
    expect(generateThumbnailUrl(asset)).toBe('/thumbnails/texture-default.png')
  })

  it('returns prefab thumbnail URL for prefab assets', () => {
    const asset: PrefabAsset = {
      id: 'p1', name: 'P', type: 'prefab', source: 'local', tags: [],
      createdAt: '', updatedAt: '',
      data: { objects: [], objectCount: 0 },
    }
    expect(generateThumbnailUrl(asset)).toBe('/thumbnails/prefab-default.png')
  })
})

// ── sanitizeAssetName ─────────────────────────────────────────────────

describe('sanitizeAssetName', () => {
  it('removes file extension', () => {
    expect(sanitizeAssetName('model.glb')).toBe('model')
  })

  it('replaces special characters with spaces', () => {
    expect(sanitizeAssetName('my_cool@model!.glb')).toBe('my cool model')
  })

  it('trims whitespace', () => {
    expect(sanitizeAssetName('  spaced.glb  ')).toBe('spaced')
  })

  it('truncates to 64 characters', () => {
    const longName = 'a'.repeat(80) + '.glb'
    const result = sanitizeAssetName(longName)
    expect(result.length).toBeLessThanOrEqual(64)
  })

  it('collapses multiple spaces', () => {
    expect(sanitizeAssetName('hello___world.obj')).toBe('hello world')
  })

  it('handles filename without extension', () => {
    expect(sanitizeAssetName('README')).toBe('README')
  })

  it('preserves hyphens', () => {
    expect(sanitizeAssetName('my-model.glb')).toBe('my-model')
  })
})

// ── extractAssetTags ──────────────────────────────────────────────────

describe('extractAssetTags', () => {
  it('includes the asset type as first tag', () => {
    const tags = extractAssetTags('model.glb', 'mesh')
    expect(tags[0]).toBe('mesh')
  })

  it('splits filename into word tags', () => {
    const tags = extractAssetTags('cowboy-hat.glb', 'mesh')
    expect(tags).toContain('cowboy')
    expect(tags).toContain('hat')
  })

  it('handles camelCase filenames', () => {
    const tags = extractAssetTags('desertRock.glb', 'mesh')
    expect(tags).toContain('desert')
    expect(tags).toContain('rock')
  })

  it('handles underscored filenames', () => {
    const tags = extractAssetTags('old_west_building.json', 'prefab')
    expect(tags).toContain('old')
    expect(tags).toContain('west')
    expect(tags).toContain('building')
  })

  it('does not duplicate tags', () => {
    const tags = extractAssetTags('mesh_mesh.glb', 'mesh')
    const meshCount = tags.filter(t => t === 'mesh').length
    expect(meshCount).toBe(1)
  })
})

// ── importAssetFromFile ───────────────────────────────────────────────

describe('importAssetFromFile', () => {
  it('creates a mesh asset from a .glb file', () => {
    const file = { name: 'cowboy.glb', size: 1024, type: 'model/gltf-binary' }
    const asset = importAssetFromFile(file, 'blob:abc')
    expect(asset).not.toBeNull()
    expect(asset!.type).toBe('mesh')
    expect((asset as MeshAsset).data.format).toBe('glb')
    expect((asset as MeshAsset).data.url).toBe('blob:abc')
    expect(asset!.fileSize).toBe(1024)
  })

  it('creates a texture asset from a .png file', () => {
    const file = { name: 'sky.png', size: 2048, type: 'image/png' }
    const asset = importAssetFromFile(file, 'blob:def')
    expect(asset).not.toBeNull()
    expect(asset!.type).toBe('texture')
    expect((asset as TextureAsset).data.format).toBe('png')
    expect(asset!.fileSize).toBe(2048)
  })

  it('creates a prefab asset from a .json file', () => {
    const file = { name: 'scene.json', size: 512, type: 'application/json' }
    const asset = importAssetFromFile(file, 'blob:ghi')
    expect(asset).not.toBeNull()
    expect(asset!.type).toBe('prefab')
    expect(asset!.fileSize).toBe(512)
  })

  it('returns null for unknown file type', () => {
    const file = { name: 'document.pdf', size: 100, type: 'application/pdf' }
    const asset = importAssetFromFile(file, 'blob:xyz')
    expect(asset).toBeNull()
  })

  it('sanitizes the asset name from filename', () => {
    const file = { name: 'my_cool_model.glb', size: 100, type: '' }
    const asset = importAssetFromFile(file, 'blob:a')
    expect(asset).not.toBeNull()
    expect(asset!.name).toBe('my cool model')
  })

  it('generates tags from filename', () => {
    const file = { name: 'desert-rock.glb', size: 100, type: '' }
    const asset = importAssetFromFile(file, 'blob:b')
    expect(asset).not.toBeNull()
    expect(asset!.tags).toContain('mesh')
    expect(asset!.tags).toContain('desert')
    expect(asset!.tags).toContain('rock')
  })
})

// ── extractMeshMetadata ─────────────────────────────────────────────

function createMockFile(name: string, size: number): File {
  return new File([''], name, { type: '' })
}

describe('extractMeshMetadata', () => {
  it('extracts glb format', async () => {
    const file = createMockFile('cowboy.glb', 2048)
    const meta = await extractMeshMetadata(file)
    expect(meta.format).toBe('glb')
  })

  it('extracts obj format', async () => {
    const file = createMockFile('wagon.obj', 4096)
    const meta = await extractMeshMetadata(file)
    expect(meta.format).toBe('obj')
  })

  it('defaults to gltf for .gltf files', async () => {
    const file = createMockFile('scene.gltf', 1024)
    const meta = await extractMeshMetadata(file)
    expect(meta.format).toBe('gltf')
  })

  it('defaults to gltf for unknown extension', async () => {
    const file = createMockFile('model.fbx', 512)
    const meta = await extractMeshMetadata(file)
    expect(meta.format).toBe('gltf')
  })

  it('returns file size', async () => {
    const file = createMockFile('hat.glb', 3072)
    const meta = await extractMeshMetadata(file)
    expect(meta.fileSize).toBe(file.size)
  })

  it('extracts name without extension', async () => {
    const file = createMockFile('saloon-door.glb', 1024)
    const meta = await extractMeshMetadata(file)
    expect(meta.name).toBe('saloon-door')
  })
})
