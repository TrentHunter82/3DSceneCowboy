import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createSceneData,
  serializeScene,
  deserializeScene,
  downloadScene,
  uploadScene,
} from './serialization'
import { createDefaultEnvironment, createSceneObject, resetIdCounter } from './sceneOperations'
import type { SceneData } from '../types/scene'

describe('serialization', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  describe('createSceneData', () => {
    it('creates scene data with metadata', () => {
      const env = createDefaultEnvironment()
      const data = createSceneData([], env, 'Test Scene')
      expect(data.metadata.name).toBe('Test Scene')
      expect(data.metadata.version).toBe(3)
      expect(data.metadata.createdAt).toBeTruthy()
      expect(data.metadata.updatedAt).toBeTruthy()
    })

    it('deep clones objects', () => {
      const obj = createSceneObject('box', [])
      const env = createDefaultEnvironment()
      const data = createSceneData([obj], env)

      // Modify original - should not affect scene data
      obj.name = 'CHANGED'
      expect(data.objects[0].name).not.toBe('CHANGED')
    })

    it('uses default name when none provided', () => {
      const env = createDefaultEnvironment()
      const data = createSceneData([], env)
      expect(data.metadata.name).toBe('Untitled Scene')
    })

    it('preserves existing metadata timestamps', () => {
      const env = createDefaultEnvironment()
      const existing = { name: 'Old', version: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const data = createSceneData([], env, 'Updated', existing)
      expect(data.metadata.createdAt).toBe('2024-01-01')
      expect(data.metadata.updatedAt).not.toBe('2024-01-01') // should be updated
    })
  })

  describe('serializeScene / deserializeScene round-trip', () => {
    it('round-trips an empty scene', () => {
      const env = createDefaultEnvironment()
      const original = createSceneData([], env, 'Empty')
      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.metadata.name).toBe('Empty')
      expect(restored.objects).toHaveLength(0)
      expect(restored.environment).toBeDefined()
    })

    it('round-trips a scene with objects', () => {
      const obj1 = createSceneObject('box', [])
      const obj2 = createSceneObject('sphere', [obj1])
      const env = createDefaultEnvironment()
      const original = createSceneData([obj1, obj2], env, 'With Objects')

      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.objects).toHaveLength(2)
      expect(restored.objects[0].type).toBe('box')
      expect(restored.objects[1].type).toBe('sphere')
    })

    it('preserves material data through round-trip', () => {
      const obj = createSceneObject('box', [])
      const env = createDefaultEnvironment()
      const original = createSceneData([obj], env)

      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.objects[0].material.type).toBe('standard')
      expect(restored.objects[0].material.metalness).toBe(0.1)
    })
  })

  describe('deserializeScene validation', () => {
    it('throws on invalid JSON', () => {
      expect(() => deserializeScene('not json')).toThrow('Invalid JSON')
    })

    it('throws on non-object', () => {
      expect(() => deserializeScene('"just a string"')).toThrow('expected an object')
    })

    it('throws on missing metadata', () => {
      expect(() => deserializeScene('{"objects": []}')).toThrow('missing metadata')
    })

    it('throws on missing metadata.name', () => {
      expect(() => deserializeScene('{"metadata": {"version": 1}, "objects": []}')).toThrow('metadata.name')
    })

    it('throws on non-array objects', () => {
      const data = JSON.stringify({ metadata: { name: 'T', version: 1 }, objects: {} })
      expect(() => deserializeScene(data)).toThrow('objects must be an array')
    })

    it('throws on invalid object (missing id)', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{ name: 'X', type: 'box' }],
      })
      expect(() => deserializeScene(data)).toThrow('missing id')
    })

    it('fills in defaults for missing fields', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          // missing position, rotation, scale, etc.
        }],
      })
      const result = deserializeScene(data)
      expect(result.objects[0].position).toEqual({ x: 0, y: 0, z: 0 })
      expect(result.objects[0].scale).toEqual({ x: 1, y: 1, z: 1 })
      expect(result.objects[0].visible).toBe(true)
      expect(result.objects[0].material).toBeDefined()
    })

    it('creates default environment when missing', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [],
      })
      const result = deserializeScene(data)
      expect(result.environment).toBeDefined()
      expect(result.environment.gridVisible).toBe(true)
    })

    it('throws on object with missing name', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{ id: 'obj_1', type: 'box' }],
      })
      expect(() => deserializeScene(data)).toThrow('missing name')
    })

    it('throws on object with missing type', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{ id: 'obj_1', name: 'Box' }],
      })
      expect(() => deserializeScene(data)).toThrow('missing type')
    })

    it('throws on non-object item in objects array', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [null],
      })
      expect(() => deserializeScene(data)).toThrow('expected an object')
    })

    it('throws on string item in objects array', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: ['not an object'],
      })
      expect(() => deserializeScene(data)).toThrow('expected an object')
    })
  })

  describe('migrateMaterial - partial material', () => {
    it('fills defaults for missing material fields', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          material: { color: '#ff0000' },
        }],
      })
      const result = deserializeScene(data)
      const mat = result.objects[0].material
      expect(mat.color).toBe('#ff0000')
      expect(mat.type).toBe('standard')
      expect(mat.opacity).toBe(1)
      expect(mat.transparent).toBe(false)
      expect(mat.wireframe).toBe(false)
      expect(mat.metalness).toBe(0.1)
      expect(mat.roughness).toBe(0.7)
    })

    it('uses fallback color from object when material color is missing', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          color: '#00ff00',
          material: { type: 'phong' },
        }],
      })
      const result = deserializeScene(data)
      const mat = result.objects[0].material
      expect(mat.type).toBe('phong')
      expect(mat.color).toBe('#00ff00')
    })
  })

  describe('migrateEnvironment - partial environment', () => {
    it('fills defaults for missing environment fields', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [],
        environment: { backgroundColor: '#ffffff' },
      })
      const result = deserializeScene(data)
      expect(result.environment.backgroundColor).toBe('#ffffff')
      expect(result.environment.fogEnabled).toBe(false)
      expect(result.environment.fogColor).toBe('#8c7b6a')
      expect(result.environment.fogNear).toBe(10)
      expect(result.environment.fogFar).toBe(50)
      expect(result.environment.gridVisible).toBe(true)
      expect(result.environment.gridSize).toBe(10)
    })

    it('uses all defaults when environment is null', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [],
        environment: null,
      })
      const result = deserializeScene(data)
      expect(result.environment.backgroundColor).toBe('#1a1108')
      expect(result.environment.gridVisible).toBe(true)
    })
  })

  describe('migrateVec3 - non-finite numbers', () => {
    it('uses fallback for Infinity values in position', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          position: { x: null, y: 'bad', z: true },
        }],
      })
      const result = deserializeScene(data)
      expect(result.objects[0].position).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('preserves valid numbers and replaces invalid ones in scale', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          scale: { x: 2, y: null, z: 3 },
        }],
      })
      const result = deserializeScene(data)
      expect(result.objects[0].scale).toEqual({ x: 2, y: 1, z: 3 })
    })

    it('uses fallback for non-object vec3 values', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 1 },
        objects: [{
          id: 'obj_1',
          name: 'Box',
          type: 'box',
          position: 'not-a-vec3',
          rotation: 42,
          scale: false,
        }],
      })
      const result = deserializeScene(data)
      expect(result.objects[0].position).toEqual({ x: 0, y: 0, z: 0 })
      expect(result.objects[0].rotation).toEqual({ x: 0, y: 0, z: 0 })
      expect(result.objects[0].scale).toEqual({ x: 1, y: 1, z: 1 })
    })
  })

  describe('downloadScene', () => {
    let mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> }
    let createObjectURLSpy: ReturnType<typeof vi.fn>
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>
    let createElementSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      mockLink = { href: '', download: '', click: vi.fn() }
      createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url')
      revokeObjectURLSpy = vi.fn()

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockLink as unknown as HTMLElement
        return document.createElement(tag)
      })

      // Mock URL methods
      globalThis.URL.createObjectURL = createObjectURLSpy
      globalThis.URL.revokeObjectURL = revokeObjectURLSpy
    })

    afterEach(() => {
      createElementSpy.mockRestore()
    })

    it('creates a blob, sets href and download, clicks link, and revokes URL', () => {
      const env = createDefaultEnvironment()
      const sceneData = createSceneData([], env, 'My Scene')

      downloadScene(sceneData)

      expect(createObjectURLSpy).toHaveBeenCalledOnce()
      const blobArg = createObjectURLSpy.mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)

      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.download).toBe('My_Scene.scene.json')
      expect(mockLink.click).toHaveBeenCalledOnce()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('sanitizes special characters in filename', () => {
      const env = createDefaultEnvironment()
      const sceneData = createSceneData([], env, 'My Scene!@#$%')

      downloadScene(sceneData)

      expect(mockLink.download).toBe('My_Scene_____.scene.json')
    })
  })

  describe('uploadScene', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>

    afterEach(() => {
      createElementSpy?.mockRestore()
    })

    it('resolves with parsed scene data when a valid file is selected', async () => {
      const env = createDefaultEnvironment()
      const sceneData = createSceneData([], env, 'Uploaded')
      const json = serializeScene(sceneData)

      let mockInput: Record<string, unknown> = {}

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          mockInput = {
            type: '',
            accept: '',
            onchange: null as (() => void) | null,
            files: null as FileList | null,
            click: vi.fn().mockImplementation(() => {
              // Simulate file selection after click
              mockInput.files = [new File([json], 'test.scene.json', { type: 'application/json' })] as unknown as FileList

              // Simulate the onchange callback
              if (typeof mockInput.onchange === 'function') {
                mockInput.onchange()
              }
            }),
          }
          return mockInput as unknown as HTMLElement
        }
        return document.createElement(tag)
      })

      // Mock FileReader
      const mockFileReader = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        result: null as string | null,
        readAsText: vi.fn().mockImplementation(function (this: typeof mockFileReader) {
          this.result = json
          if (this.onload) this.onload()
        }),
      }

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: typeof mockFileReader) {
        Object.assign(this, mockFileReader)
        // Wire up readAsText to use this instance's callbacks
        this.readAsText = vi.fn().mockImplementation(() => {
          ;(this as typeof mockFileReader).result = json
          if ((this as typeof mockFileReader).onload) (this as typeof mockFileReader).onload!()
        })
        return this as unknown as FileReader
      } as unknown as { new (): FileReader; prototype: FileReader })

      const result = await uploadScene()
      expect(result.metadata.name).toBe('Uploaded')
      expect(result.objects).toHaveLength(0)
      expect(result.environment).toBeDefined()

      vi.restoreAllMocks()
    })

    it('rejects when no file is selected', async () => {
      let mockInput: Record<string, unknown> = {}

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          mockInput = {
            type: '',
            accept: '',
            onchange: null as (() => void) | null,
            files: null as FileList | null,
            click: vi.fn().mockImplementation(() => {
              // Simulate onchange with no files
              mockInput.files = [] as unknown as FileList
              if (typeof mockInput.onchange === 'function') {
                mockInput.onchange()
              }
            }),
          }
          return mockInput as unknown as HTMLElement
        }
        return document.createElement(tag)
      })

      await expect(uploadScene()).rejects.toThrow('No file selected')
    })

    it('rejects when FileReader encounters an error', async () => {
      const env = createDefaultEnvironment()
      const sceneData = createSceneData([], env, 'Error Test')
      const json = serializeScene(sceneData)

      let mockInput: Record<string, unknown> = {}

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          mockInput = {
            type: '',
            accept: '',
            onchange: null as (() => void) | null,
            files: null as FileList | null,
            click: vi.fn().mockImplementation(() => {
              mockInput.files = [new File([json], 'test.json', { type: 'application/json' })] as unknown as FileList
              if (typeof mockInput.onchange === 'function') {
                mockInput.onchange()
              }
            }),
          }
          return mockInput as unknown as HTMLElement
        }
        return document.createElement(tag)
      })

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: Record<string, unknown>) {
        this.onload = null
        this.onerror = null
        this.result = null
        this.readAsText = vi.fn().mockImplementation(() => {
          // Simulate a read error
          if (typeof this.onerror === 'function') this.onerror()
        })
        return this as unknown as FileReader
      } as unknown as { new (): FileReader; prototype: FileReader })

      await expect(uploadScene()).rejects.toThrow('Failed to read file')

      vi.restoreAllMocks()
    })

    it('rejects when file contains invalid JSON', async () => {
      let mockInput: Record<string, unknown> = {}

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          mockInput = {
            type: '',
            accept: '',
            onchange: null as (() => void) | null,
            files: null as FileList | null,
            click: vi.fn().mockImplementation(() => {
              mockInput.files = [new File(['not json'], 'bad.json', { type: 'application/json' })] as unknown as FileList
              if (typeof mockInput.onchange === 'function') {
                mockInput.onchange()
              }
            }),
          }
          return mockInput as unknown as HTMLElement
        }
        return document.createElement(tag)
      })

      vi.spyOn(globalThis, 'FileReader').mockImplementation(function (this: Record<string, unknown>) {
        this.onload = null
        this.onerror = null
        this.result = null
        this.readAsText = vi.fn().mockImplementation(() => {
          this.result = 'not json'
          if (typeof this.onload === 'function') this.onload()
        })
        return this as unknown as FileReader
      } as unknown as { new (): FileReader; prototype: FileReader })

      await expect(uploadScene()).rejects.toThrow('Invalid JSON')

      vi.restoreAllMocks()
    })
  })

  describe('camera shots serialization', () => {
    it('includes shots in scene data when provided', () => {
      const env = createDefaultEnvironment()
      const shots = [
        { id: 's1', name: 'Shot 1', position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 }, createdAt: '2024-01-01' },
      ]
      const data = createSceneData([], env, 'Test', undefined, undefined, undefined, undefined, shots)
      expect(data.shots).toHaveLength(1)
      expect(data.shots![0].name).toBe('Shot 1')
    })

    it('strips thumbnail blob URLs from saved shots', () => {
      const env = createDefaultEnvironment()
      const shots = [
        { id: 's1', name: 'Shot 1', position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 }, createdAt: '', thumbnail: 'blob:http://test/thumb' },
      ]
      const data = createSceneData([], env, 'Test', undefined, undefined, undefined, undefined, shots)
      expect(data.shots![0].thumbnail).toBeUndefined()
    })

    it('omits shots when array is empty', () => {
      const env = createDefaultEnvironment()
      const data = createSceneData([], env, 'Test', undefined, undefined, undefined, undefined, [])
      expect(data.shots).toBeUndefined()
    })

    it('round-trips shots through serialize/deserialize', () => {
      const env = createDefaultEnvironment()
      const shots = [
        { id: 's1', name: 'Hero', position: { x: 5, y: 3, z: 5 }, target: { x: 0, y: 1, z: 0 }, createdAt: '2024-06-01T00:00:00Z', notes: 'Establishing' },
        { id: 's2', name: 'Close-up', position: { x: 2, y: 1, z: 2 }, target: { x: 0, y: 0.5, z: 0 }, createdAt: '2024-06-01T00:01:00Z' },
      ]
      const original = createSceneData([], env, 'Shots Test', undefined, undefined, undefined, undefined, shots)
      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.shots).toHaveLength(2)
      expect(restored.shots![0].name).toBe('Hero')
      expect(restored.shots![0].position).toEqual({ x: 5, y: 3, z: 5 })
      expect(restored.shots![0].target).toEqual({ x: 0, y: 1, z: 0 })
      expect(restored.shots![0].notes).toBe('Establishing')
      expect(restored.shots![1].name).toBe('Close-up')
    })

    it('migrates shots with missing fields gracefully', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 3 },
        objects: [],
        shots: [
          { id: 's1', name: 'Partial' },
          { id: 's2' },  // missing name → should be filtered out
          null,           // invalid → should be filtered out
        ],
      })
      const result = deserializeScene(data)
      expect(result.shots).toHaveLength(1)
      expect(result.shots![0].name).toBe('Partial')
      expect(result.shots![0].position).toEqual({ x: 5, y: 5, z: 5 })
      expect(result.shots![0].target).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('handles scene with no shots field', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 3 },
        objects: [],
      })
      const result = deserializeScene(data)
      expect(result.shots).toBeUndefined()
    })
  })

  describe('camera keyframe migration', () => {
    it('preserves cameraPosition keyframes through save/load roundtrip', () => {
      const env = createDefaultEnvironment()
      const tracks = [
        {
          id: 'track_cam',
          objectId: '__camera__',
          keyframes: [
            { id: 'kf_1', time: 0, property: 'cameraPosition' as const, value: { x: 5, y: 5, z: 5 }, easing: 'linear' as const },
            { id: 'kf_2', time: 3, property: 'cameraPosition' as const, value: { x: 10, y: 3, z: 0 }, easing: 'easeInOut' as const },
          ],
        },
      ]

      const original = createSceneData([], env, 'Camera Test', undefined, undefined, tracks, 5)
      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.animationTracks).toHaveLength(1)
      expect(restored.animationTracks![0].objectId).toBe('__camera__')
      expect(restored.animationTracks![0].keyframes).toHaveLength(2)
      expect(restored.animationTracks![0].keyframes[0].property).toBe('cameraPosition')
      expect(restored.animationTracks![0].keyframes[0].value).toEqual({ x: 5, y: 5, z: 5 })
      expect(restored.animationTracks![0].keyframes[1].property).toBe('cameraPosition')
      expect(restored.animationTracks![0].keyframes[1].easing).toBe('easeInOut')
    })

    it('preserves cameraTarget keyframes through save/load roundtrip', () => {
      const env = createDefaultEnvironment()
      const tracks = [
        {
          id: 'track_cam',
          objectId: '__camera__',
          keyframes: [
            { id: 'kf_1', time: 0, property: 'cameraTarget' as const, value: { x: 0, y: 0, z: 0 }, easing: 'linear' as const },
            { id: 'kf_2', time: 2, property: 'cameraTarget' as const, value: { x: 3, y: 1, z: 2 }, easing: 'easeOut' as const },
          ],
        },
      ]

      const original = createSceneData([], env, 'Camera Target Test', undefined, undefined, tracks, 5)
      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.animationTracks![0].keyframes).toHaveLength(2)
      expect(restored.animationTracks![0].keyframes[0].property).toBe('cameraTarget')
      expect(restored.animationTracks![0].keyframes[1].value).toEqual({ x: 3, y: 1, z: 2 })
    })

    it('preserves mixed camera and object tracks through roundtrip', () => {
      const env = createDefaultEnvironment()
      const tracks = [
        {
          id: 'track_cam',
          objectId: '__camera__',
          keyframes: [
            { id: 'kf_1', time: 0, property: 'cameraPosition' as const, value: { x: 5, y: 5, z: 5 }, easing: 'linear' as const },
            { id: 'kf_2', time: 0, property: 'cameraTarget' as const, value: { x: 0, y: 0, z: 0 }, easing: 'linear' as const },
          ],
        },
        {
          id: 'track_obj',
          objectId: 'obj_1',
          keyframes: [
            { id: 'kf_3', time: 0, property: 'position' as const, value: { x: 0, y: 0, z: 0 }, easing: 'linear' as const },
            { id: 'kf_4', time: 2, property: 'position' as const, value: { x: 10, y: 0, z: 0 }, easing: 'linear' as const },
          ],
        },
      ]

      const original = createSceneData([], env, 'Mixed Test', undefined, undefined, tracks, 5)
      const json = serializeScene(original)
      const restored = deserializeScene(json)

      expect(restored.animationTracks).toHaveLength(2)
      expect(restored.animationTracks![0].objectId).toBe('__camera__')
      expect(restored.animationTracks![1].objectId).toBe('obj_1')
    })

    it('drops keyframes with unknown property types', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 3 },
        objects: [],
        animationTracks: [
          {
            id: 'track_1',
            objectId: '__camera__',
            keyframes: [
              { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
              { id: 'kf_2', time: 1, property: 'unknownProp', value: { x: 0, y: 0, z: 0 }, easing: 'linear' },
            ],
          },
        ],
      })

      const result = deserializeScene(data)
      expect(result.animationTracks![0].keyframes).toHaveLength(1)
      expect(result.animationTracks![0].keyframes[0].property).toBe('cameraPosition')
    })

    it('migrates camera keyframes with missing value fields gracefully', () => {
      const data = JSON.stringify({
        metadata: { name: 'T', version: 3 },
        objects: [],
        animationTracks: [
          {
            id: 'track_1',
            objectId: '__camera__',
            keyframes: [
              { id: 'kf_1', time: 0, property: 'cameraPosition', value: { x: 5 }, easing: 'linear' },
            ],
          },
        ],
      })

      const result = deserializeScene(data)
      const kf = result.animationTracks![0].keyframes[0]
      expect(kf.value).toEqual({ x: 5, y: 0, z: 0 }) // y,z default to 0
    })
  })
})
