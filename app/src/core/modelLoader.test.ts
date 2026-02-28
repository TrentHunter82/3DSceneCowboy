import { describe, it, expect } from 'vitest'
import {
  detectModelFormat,
  getSupportedExtensions,
  getAcceptString,
  isGltfFormat,
} from './modelLoader'

describe('modelLoader', () => {
  describe('detectModelFormat', () => {
    it('detects gltf format', () => {
      expect(detectModelFormat('scene.gltf')).toBe('gltf')
      expect(detectModelFormat('Scene.GLTF')).toBe('gltf')
    })

    it('detects glb format', () => {
      expect(detectModelFormat('model.glb')).toBe('glb')
      expect(detectModelFormat('Model.GLB')).toBe('glb')
    })

    it('detects fbx format', () => {
      expect(detectModelFormat('character.fbx')).toBe('fbx')
      expect(detectModelFormat('CHARACTER.FBX')).toBe('fbx')
    })

    it('detects obj format', () => {
      expect(detectModelFormat('mesh.obj')).toBe('obj')
      expect(detectModelFormat('MESH.OBJ')).toBe('obj')
    })

    it('detects dae format', () => {
      expect(detectModelFormat('scene.dae')).toBe('dae')
      expect(detectModelFormat('Scene.DAE')).toBe('dae')
    })

    it('returns null for unsupported formats', () => {
      expect(detectModelFormat('image.png')).toBeNull()
      expect(detectModelFormat('archive.zip')).toBeNull()
      expect(detectModelFormat('document.pdf')).toBeNull()
      expect(detectModelFormat('noextension')).toBeNull()
    })

    it('handles filenames with dots', () => {
      expect(detectModelFormat('my.scene.glb')).toBe('glb')
      expect(detectModelFormat('v2.0.fbx')).toBe('fbx')
    })
  })

  describe('getSupportedExtensions', () => {
    it('returns all 5 supported extensions', () => {
      const exts = getSupportedExtensions()
      expect(exts).toHaveLength(5)
      expect(exts).toContain('.gltf')
      expect(exts).toContain('.glb')
      expect(exts).toContain('.fbx')
      expect(exts).toContain('.obj')
      expect(exts).toContain('.dae')
    })
  })

  describe('getAcceptString', () => {
    it('returns comma-separated extension list', () => {
      const accept = getAcceptString()
      expect(accept).toContain('.gltf')
      expect(accept).toContain('.glb')
      expect(accept).toContain('.fbx')
      expect(accept).toContain('.obj')
      expect(accept).toContain('.dae')
      // Should be comma-separated
      expect(accept.split(',').length).toBe(5)
    })
  })

  describe('isGltfFormat', () => {
    it('returns true for gltf and glb', () => {
      expect(isGltfFormat('gltf')).toBe(true)
      expect(isGltfFormat('glb')).toBe(true)
    })

    it('returns false for other formats', () => {
      expect(isGltfFormat('fbx')).toBe(false)
      expect(isGltfFormat('obj')).toBe(false)
      expect(isGltfFormat('dae')).toBe(false)
    })
  })
})
