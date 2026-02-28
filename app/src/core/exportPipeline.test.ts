import { describe, it, expect } from 'vitest'
import type { SceneObject, MaterialData, SceneData, Vec3 } from '../types/scene'
import type { GltfExportOptions, ScreenshotOptions, VideoRecordingOptions } from '../types/export'
import {
  createGltfDocument,
  generateBoxGeometry,
  generateSphereGeometry,
  generateCylinderGeometry,
  generateConeGeometry,
  generatePlaneGeometry,
  generateTorusGeometry,
  hexToGltfColor,
  materialToGltf,
  sceneObjectToGltf,
  sceneToGltf,
  serializeGltfJson,
  assembleGlb,
  packBufferData,
  validateGltfOptions,
  validateScreenshotOptions,
  validateVideoOptions,
  eulerToQuaternion,
  formatFileSize,
  generateExportFileName,
  DEFAULT_GLTF_OPTIONS,
  DEFAULT_SCREENSHOT_OPTIONS,
  DEFAULT_VIDEO_OPTIONS,
} from './exportPipeline'

// ── Test Helpers ──────────────────────────────────────────────────────

function makeDefaultMaterial(overrides: Partial<MaterialData> = {}): MaterialData {
  return {
    type: 'standard',
    color: '#ffffff',
    opacity: 1,
    transparent: false,
    wireframe: false,
    metalness: 0,
    roughness: 1,
    ...overrides,
  }
}

function makeSceneObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: 'obj-1',
    name: 'Test Object',
    type: 'box',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#ffffff',
    visible: true,
    locked: false,
    material: makeDefaultMaterial(),
    ...overrides,
  }
}

function makeSceneData(objects: SceneObject[] = []): SceneData {
  return {
    metadata: {
      name: 'Test Scene',
      version: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    objects,
    environment: {
      backgroundColor: '#1a1a1a',
      fogEnabled: false,
      fogColor: '#cccccc',
      fogNear: 1,
      fogFar: 100,
      gridVisible: true,
      gridSize: 10,
    },
  }
}

/** Check that every normal in the array is unit length (within tolerance) */
function assertNormalsUnitLength(normals: Float32Array, tolerance = 0.001) {
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i]
    const ny = normals[i + 1]
    const nz = normals[i + 2]
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
    expect(len).toBeCloseTo(1, 2)
  }
}

/** Check all positions are within [-bound, bound] for each axis */
function assertPositionsWithinBounds(positions: Float32Array, bound: number) {
  for (let i = 0; i < positions.length; i++) {
    expect(Math.abs(positions[i])).toBeLessThanOrEqual(bound + 0.001)
  }
}

// ── 1. createGltfDocument ─────────────────────────────────────────────

describe('createGltfDocument', () => {
  it('returns a valid glTF 2.0 document scaffold', () => {
    const doc = createGltfDocument()
    expect(doc.asset.version).toBe('2.0')
    expect(doc.asset.generator).toBe('3D Scene Cowboy Export Pipeline')
  })

  it('initializes with scene 0 and one empty scene', () => {
    const doc = createGltfDocument()
    expect(doc.scene).toBe(0)
    expect(doc.scenes).toHaveLength(1)
    expect(doc.scenes[0].nodes).toEqual([])
  })

  it('starts with empty arrays for all collections', () => {
    const doc = createGltfDocument()
    expect(doc.nodes).toEqual([])
    expect(doc.meshes).toEqual([])
    expect(doc.materials).toEqual([])
    expect(doc.accessors).toEqual([])
    expect(doc.bufferViews).toEqual([])
    expect(doc.buffers).toEqual([])
  })
})

// ── 2. Geometry Generators ────────────────────────────────────────────

describe('generateBoxGeometry', () => {
  it('produces 24 vertices and 36 indices for a unit cube', () => {
    const geom = generateBoxGeometry(1, 1, 1)
    expect(geom.positions.length / 3).toBe(24) // 4 verts per face * 6 faces
    expect(geom.indices.length).toBe(36)        // 6 indices per face * 6 faces
  })

  it('has matching positions and normals array lengths', () => {
    const geom = generateBoxGeometry(2, 3, 4)
    expect(geom.positions.length).toBe(geom.normals.length)
  })

  it('produces unit-length normals', () => {
    const geom = generateBoxGeometry(1, 1, 1)
    assertNormalsUnitLength(geom.normals)
  })

  it('positions lie within half-extents', () => {
    const geom = generateBoxGeometry(2, 4, 6)
    // max half-extent is 6/2 = 3
    assertPositionsWithinBounds(geom.positions, 3)
  })

  it('respects width/height/depth dimensions', () => {
    const geom = generateBoxGeometry(10, 20, 30)
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    for (let i = 0; i < geom.positions.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(geom.positions[i]))
      maxY = Math.max(maxY, Math.abs(geom.positions[i + 1]))
      maxZ = Math.max(maxZ, Math.abs(geom.positions[i + 2]))
    }
    expect(maxX).toBeCloseTo(5, 5)   // width/2
    expect(maxY).toBeCloseTo(10, 5)  // height/2
    expect(maxZ).toBeCloseTo(15, 5)  // depth/2
  })

  it('returns typed arrays of correct types', () => {
    const geom = generateBoxGeometry(1, 1, 1)
    expect(geom.positions).toBeInstanceOf(Float32Array)
    expect(geom.normals).toBeInstanceOf(Float32Array)
    expect(geom.indices).toBeInstanceOf(Uint16Array)
  })

  it('all indices reference valid vertex indices', () => {
    const geom = generateBoxGeometry(1, 1, 1)
    const vertexCount = geom.positions.length / 3
    for (let i = 0; i < geom.indices.length; i++) {
      expect(geom.indices[i]).toBeLessThan(vertexCount)
      expect(geom.indices[i]).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('generateSphereGeometry', () => {
  it('produces expected vertex count for segments=8', () => {
    const seg = 8
    const geom = generateSphereGeometry(1, seg)
    const expectedVertices = (seg + 1) * (seg + 1)
    expect(geom.positions.length / 3).toBe(expectedVertices)
  })

  it('produces expected index count', () => {
    const seg = 8
    const geom = generateSphereGeometry(1, seg)
    const expectedIndices = seg * seg * 6
    expect(geom.indices.length).toBe(expectedIndices)
  })

  it('clamps minimum segments to 3 (width) and 2 (height)', () => {
    const geom = generateSphereGeometry(1, 1) // segments=1 clamped
    // widthSegments=3, heightSegments=2 => (3+1)*(2+1)=12 vertices
    expect(geom.positions.length / 3).toBe(12)
  })

  it('positions lie within the radius', () => {
    const radius = 2.5
    const geom = generateSphereGeometry(radius, 16)
    for (let i = 0; i < geom.positions.length; i += 3) {
      const x = geom.positions[i]
      const y = geom.positions[i + 1]
      const z = geom.positions[i + 2]
      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(dist).toBeLessThanOrEqual(radius + 0.001)
    }
  })

  it('normals are unit length', () => {
    const geom = generateSphereGeometry(1, 16)
    assertNormalsUnitLength(geom.normals)
  })

  it('all indices reference valid vertices', () => {
    const geom = generateSphereGeometry(1, 8)
    const vertexCount = geom.positions.length / 3
    for (let i = 0; i < geom.indices.length; i++) {
      expect(geom.indices[i]).toBeLessThan(vertexCount)
    }
  })
})

describe('generateCylinderGeometry', () => {
  it('produces geometry with caps', () => {
    const geom = generateCylinderGeometry(0.5, 0.5, 1, 8)
    // Body: (seg+1)*2 = 18, Top cap: 1+seg=9, Bottom cap: 1+seg=9 => total=36
    const vertexCount = geom.positions.length / 3
    expect(vertexCount).toBe(36)
  })

  it('produces correct index count', () => {
    const seg = 8
    const geom = generateCylinderGeometry(0.5, 0.5, 1, seg)
    // Body: seg*6 = 48, Top cap: seg*3 = 24, Bottom cap: seg*3 = 24 => total=96
    expect(geom.indices.length).toBe(96)
  })

  it('clamps segments to minimum 3', () => {
    const geom = generateCylinderGeometry(0.5, 0.5, 1, 1)
    // seg=3 after clamp; body=(4)*2=8, cap=(1+3)*2=8, total=16
    expect(geom.positions.length / 3).toBe(16)
  })

  it('top cap vertices are at +halfHeight', () => {
    const height = 4
    const geom = generateCylinderGeometry(1, 1, height, 8)
    // The top cap center vertex: check that at least some vertex is at y=+2
    const halfH = height / 2
    let foundTopCenter = false
    for (let i = 0; i < geom.positions.length; i += 3) {
      if (Math.abs(geom.positions[i + 1] - halfH) < 0.001 &&
          Math.abs(geom.positions[i]) < 0.001 &&
          Math.abs(geom.positions[i + 2]) < 0.001) {
        foundTopCenter = true
        break
      }
    }
    expect(foundTopCenter).toBe(true)
  })

  it('bottom cap vertices are at -halfHeight', () => {
    const height = 4
    const geom = generateCylinderGeometry(1, 1, height, 8)
    const halfH = height / 2
    let foundBotCenter = false
    for (let i = 0; i < geom.positions.length; i += 3) {
      if (Math.abs(geom.positions[i + 1] + halfH) < 0.001 &&
          Math.abs(geom.positions[i]) < 0.001 &&
          Math.abs(geom.positions[i + 2]) < 0.001) {
        foundBotCenter = true
        break
      }
    }
    expect(foundBotCenter).toBe(true)
  })

  it('supports different top and bottom radii', () => {
    const geom = generateCylinderGeometry(0.5, 1.0, 2, 8)
    // Top ring should have radius 0.5, bottom ring should have radius 1.0
    // Check that top ring vertex distances are ~ 0.5
    // First top ring vertex is at index 0
    const topDist = Math.sqrt(geom.positions[0] ** 2 + geom.positions[2] ** 2)
    expect(topDist).toBeCloseTo(0.5, 2)
  })
})

describe('generateConeGeometry', () => {
  it('generates geometry equivalent to cylinder with 0 top radius', () => {
    const coneGeom = generateConeGeometry(1, 2, 8)
    const cylGeom = generateCylinderGeometry(0, 1, 2, 8)
    expect(coneGeom.positions.length).toBe(cylGeom.positions.length)
    expect(coneGeom.indices.length).toBe(cylGeom.indices.length)
  })

  it('tip vertices converge at the top', () => {
    const geom = generateConeGeometry(1, 2, 8)
    // With radiusTop=0, all top ring vertices should be at (0, halfHeight, 0)
    const halfH = 1 // height=2, half=1
    // First vertex of body is top ring vertex
    expect(geom.positions[0]).toBeCloseTo(0, 5) // x
    expect(geom.positions[1]).toBeCloseTo(halfH, 5) // y
    expect(geom.positions[2]).toBeCloseTo(0, 5) // z
  })
})

describe('generatePlaneGeometry', () => {
  it('produces 4 vertices and 6 indices', () => {
    const geom = generatePlaneGeometry(1, 1)
    expect(geom.positions.length / 3).toBe(4)
    expect(geom.indices.length).toBe(6)
  })

  it('all normals point in +Z direction', () => {
    const geom = generatePlaneGeometry(2, 3)
    for (let i = 0; i < geom.normals.length; i += 3) {
      expect(geom.normals[i]).toBe(0)
      expect(geom.normals[i + 1]).toBe(0)
      expect(geom.normals[i + 2]).toBe(1)
    }
  })

  it('vertices lie in the XY plane (z=0)', () => {
    const geom = generatePlaneGeometry(5, 5)
    for (let i = 2; i < geom.positions.length; i += 3) {
      expect(geom.positions[i]).toBe(0)
    }
  })

  it('extents match half width/height', () => {
    const geom = generatePlaneGeometry(6, 4)
    let maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < geom.positions.length; i += 3) {
      maxX = Math.max(maxX, Math.abs(geom.positions[i]))
      maxY = Math.max(maxY, Math.abs(geom.positions[i + 1]))
    }
    expect(maxX).toBeCloseTo(3, 5)
    expect(maxY).toBeCloseTo(2, 5)
  })
})

describe('generateTorusGeometry', () => {
  it('produces expected vertex count', () => {
    const rs = 6
    const ts = 8
    const geom = generateTorusGeometry(1, 0.3, rs, ts)
    const expected = (rs + 1) * (ts + 1)
    expect(geom.positions.length / 3).toBe(expected)
  })

  it('produces expected index count', () => {
    const rs = 6
    const ts = 8
    const geom = generateTorusGeometry(1, 0.3, rs, ts)
    const expected = rs * ts * 6
    expect(geom.indices.length).toBe(expected)
  })

  it('clamps segments to minimum 3', () => {
    const geom = generateTorusGeometry(1, 0.3, 1, 1) // both clamped to 3
    const expected = (3 + 1) * (3 + 1)
    expect(geom.positions.length / 3).toBe(expected)
  })

  it('normals are unit length', () => {
    const geom = generateTorusGeometry(1, 0.3, 8, 12)
    assertNormalsUnitLength(geom.normals)
  })

  it('positions lie within expected bounds', () => {
    const radius = 2
    const tube = 0.5
    const geom = generateTorusGeometry(radius, tube, 8, 12)
    const maxExpected = radius + tube
    for (let i = 0; i < geom.positions.length; i += 3) {
      const x = geom.positions[i]
      const y = geom.positions[i + 1]
      const z = geom.positions[i + 2]
      expect(Math.abs(x)).toBeLessThanOrEqual(maxExpected + 0.01)
      expect(Math.abs(y)).toBeLessThanOrEqual(tube + 0.01)
      expect(Math.abs(z)).toBeLessThanOrEqual(maxExpected + 0.01)
    }
  })

  it('all indices reference valid vertex indices', () => {
    const geom = generateTorusGeometry(1, 0.3, 6, 8)
    const vertexCount = geom.positions.length / 3
    for (let i = 0; i < geom.indices.length; i++) {
      expect(geom.indices[i]).toBeLessThan(vertexCount)
    }
  })
})

// ── 3. hexToGltfColor ─────────────────────────────────────────────────

describe('hexToGltfColor', () => {
  it('converts white #ffffff to [1,1,1,1]', () => {
    const result = hexToGltfColor('#ffffff')
    expect(result[0]).toBeCloseTo(1, 3)
    expect(result[1]).toBeCloseTo(1, 3)
    expect(result[2]).toBeCloseTo(1, 3)
    expect(result[3]).toBe(1)
  })

  it('converts black #000000 to [0,0,0,1]', () => {
    const result = hexToGltfColor('#000000')
    expect(result).toEqual([0, 0, 0, 1])
  })

  it('handles hex without hash prefix', () => {
    const result = hexToGltfColor('ff0000')
    // Pure red in sRGB
    expect(result[0]).toBeCloseTo(1, 3) // red channel -> linear 1
    expect(result[1]).toBeCloseTo(0, 3)
    expect(result[2]).toBeCloseTo(0, 3)
    expect(result[3]).toBe(1)
  })

  it('handles 3-character hex shorthand', () => {
    const result = hexToGltfColor('#fff')
    expect(result[0]).toBeCloseTo(1, 3)
    expect(result[1]).toBeCloseTo(1, 3)
    expect(result[2]).toBeCloseTo(1, 3)
    expect(result[3]).toBe(1)
  })

  it('handles 3-character hex shorthand #000', () => {
    const result = hexToGltfColor('#000')
    expect(result).toEqual([0, 0, 0, 1])
  })

  it('applies sRGB to linear conversion', () => {
    // Mid-gray 0.5 in sRGB -> ~0.214 in linear (approx)
    const result = hexToGltfColor('#808080')
    // 0x80 = 128/255 ≈ 0.502 sRGB -> linear ≈ 0.2158
    expect(result[0]).toBeCloseTo(0.2158, 2)
    expect(result[1]).toBeCloseTo(0.2158, 2)
    expect(result[2]).toBeCloseTo(0.2158, 2)
  })

  it('returns white fallback for invalid hex length', () => {
    expect(hexToGltfColor('#abcde')).toEqual([1, 1, 1, 1])
    expect(hexToGltfColor('#1')).toEqual([1, 1, 1, 1])
  })

  it('returns white fallback for invalid hex characters', () => {
    expect(hexToGltfColor('#gggggg')).toEqual([1, 1, 1, 1])
  })

  it('alpha is always 1', () => {
    const result = hexToGltfColor('#ff8000')
    expect(result[3]).toBe(1)
  })
})

// ── 4. materialToGltf ─────────────────────────────────────────────────

describe('materialToGltf', () => {
  it('converts a standard material with metalness and roughness', () => {
    const mat = makeDefaultMaterial({ type: 'standard', metalness: 0.8, roughness: 0.3 })
    const result = materialToGltf(mat)
    expect(result.pbrMetallicRoughness.metallicFactor).toBe(0.8)
    expect(result.pbrMetallicRoughness.roughnessFactor).toBe(0.3)
  })

  it('sets metallicFactor=0 and roughnessFactor=1 for non-standard materials', () => {
    const mat = makeDefaultMaterial({ type: 'basic', metalness: 0.5, roughness: 0.5 })
    const result = materialToGltf(mat)
    expect(result.pbrMetallicRoughness.metallicFactor).toBe(0)
    expect(result.pbrMetallicRoughness.roughnessFactor).toBe(1)
  })

  it('sets alphaMode BLEND for transparent materials', () => {
    const mat = makeDefaultMaterial({ transparent: true, opacity: 0.5 })
    const result = materialToGltf(mat)
    expect(result.alphaMode).toBe('BLEND')
  })

  it('sets alphaMode BLEND when opacity < 1 even if transparent is false', () => {
    const mat = makeDefaultMaterial({ transparent: false, opacity: 0.7 })
    const result = materialToGltf(mat)
    expect(result.alphaMode).toBe('BLEND')
  })

  it('does not set alphaMode for fully opaque non-transparent material', () => {
    const mat = makeDefaultMaterial({ transparent: false, opacity: 1 })
    const result = materialToGltf(mat)
    expect(result.alphaMode).toBeUndefined()
  })

  it('is always doubleSided', () => {
    const mat = makeDefaultMaterial()
    const result = materialToGltf(mat)
    expect(result.doubleSided).toBe(true)
  })

  it('applies opacity to the color alpha channel', () => {
    const mat = makeDefaultMaterial({ opacity: 0.5, color: '#ffffff' })
    const result = materialToGltf(mat)
    expect(result.pbrMetallicRoughness.baseColorFactor[3]).toBe(0.5)
  })

  it('includes emissiveFactor when emissive is set', () => {
    const mat = makeDefaultMaterial({
      emissiveColor: '#ff0000',
      emissiveIntensity: 2,
    })
    const result = materialToGltf(mat)
    expect(result.emissiveFactor).toBeDefined()
    expect(result.emissiveFactor!.length).toBe(3)
    // Red channel linear = 1.0, times intensity 2 = 2.0
    expect(result.emissiveFactor![0]).toBeCloseTo(2, 1)
    expect(result.emissiveFactor![1]).toBeCloseTo(0, 3)
    expect(result.emissiveFactor![2]).toBeCloseTo(0, 3)
  })

  it('omits emissiveFactor when emissiveIntensity is 0', () => {
    const mat = makeDefaultMaterial({
      emissiveColor: '#ff0000',
      emissiveIntensity: 0,
    })
    const result = materialToGltf(mat)
    expect(result.emissiveFactor).toBeUndefined()
  })

  it('omits emissiveFactor when emissiveColor is not set', () => {
    const mat = makeDefaultMaterial({
      emissiveIntensity: 1,
    })
    const result = materialToGltf(mat)
    expect(result.emissiveFactor).toBeUndefined()
  })

  it('names material by type', () => {
    const mat = makeDefaultMaterial({ type: 'phong' })
    const result = materialToGltf(mat)
    expect(result.name).toBe('material_phong')
  })
})

// ── 5. eulerToQuaternion ──────────────────────────────────────────────

describe('eulerToQuaternion', () => {
  it('returns identity quaternion for zero rotation', () => {
    const q = eulerToQuaternion({ x: 0, y: 0, z: 0 })
    expect(q[0]).toBeCloseTo(0, 5)
    expect(q[1]).toBeCloseTo(0, 5)
    expect(q[2]).toBeCloseTo(0, 5)
    expect(q[3]).toBeCloseTo(1, 5)
  })

  it('produces correct quaternion for 90-degree X rotation', () => {
    const q = eulerToQuaternion({ x: 90, y: 0, z: 0 })
    // 90 deg about X: qx ≈ sin(45deg) ≈ 0.7071, qw ≈ cos(45deg) ≈ 0.7071
    expect(q[0]).toBeCloseTo(Math.SQRT1_2, 4)
    expect(q[1]).toBeCloseTo(0, 5)
    expect(q[2]).toBeCloseTo(0, 5)
    expect(q[3]).toBeCloseTo(Math.SQRT1_2, 4)
  })

  it('produces correct quaternion for 90-degree Y rotation', () => {
    const q = eulerToQuaternion({ x: 0, y: 90, z: 0 })
    expect(q[0]).toBeCloseTo(0, 5)
    expect(q[1]).toBeCloseTo(Math.SQRT1_2, 4)
    expect(q[2]).toBeCloseTo(0, 5)
    expect(q[3]).toBeCloseTo(Math.SQRT1_2, 4)
  })

  it('produces correct quaternion for 90-degree Z rotation', () => {
    const q = eulerToQuaternion({ x: 0, y: 0, z: 90 })
    expect(q[0]).toBeCloseTo(0, 5)
    expect(q[1]).toBeCloseTo(0, 5)
    expect(q[2]).toBeCloseTo(Math.SQRT1_2, 4)
    expect(q[3]).toBeCloseTo(Math.SQRT1_2, 4)
  })

  it('produces a unit quaternion for arbitrary rotations', () => {
    const q = eulerToQuaternion({ x: 30, y: 45, z: 60 })
    const len = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
    expect(len).toBeCloseTo(1, 5)
  })

  it('handles 180-degree rotation', () => {
    const q = eulerToQuaternion({ x: 180, y: 0, z: 0 })
    // 180 deg about X: qx=1, qw=0
    expect(q[0]).toBeCloseTo(1, 4)
    expect(q[3]).toBeCloseTo(0, 4)
  })

  it('handles 360-degree rotation (back to identity)', () => {
    const q = eulerToQuaternion({ x: 360, y: 0, z: 0 })
    // 360 deg about X: qx ≈ 0, qw ≈ -1 (or +1, quaternion double cover)
    const len = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2)
    expect(len).toBeCloseTo(1, 5)
  })
})

// ── 6. sceneObjectToGltf ──────────────────────────────────────────────

describe('sceneObjectToGltf', () => {
  it('adds a node, mesh, and material to the document', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject()
    sceneObjectToGltf(obj, doc)

    expect(doc.nodes).toHaveLength(1)
    expect(doc.meshes).toHaveLength(1)
    expect(doc.materials).toHaveLength(1)
  })

  it('adds the node index to the scene', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject()
    sceneObjectToGltf(obj, doc)
    expect(doc.scenes[0].nodes).toContain(0)
  })

  it('skips invisible objects', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ visible: false })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes).toHaveLength(0)
  })

  it('skips model objects (no geometry)', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ type: 'model' })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes).toHaveLength(0)
  })

  it('sets translation only for non-zero position', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ position: { x: 0, y: 0, z: 0 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].translation).toBeUndefined()
  })

  it('includes translation for non-zero position', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ position: { x: 1, y: 2, z: 3 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].translation).toEqual([1, 2, 3])
  })

  it('omits scale when identity (1,1,1)', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ scale: { x: 1, y: 1, z: 1 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].scale).toBeUndefined()
  })

  it('includes scale for non-identity values', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ scale: { x: 2, y: 3, z: 4 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].scale).toEqual([2, 3, 4])
  })

  it('omits rotation when identity (0,0,0)', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ rotation: { x: 0, y: 0, z: 0 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].rotation).toBeUndefined()
  })

  it('includes rotation for non-zero angles', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ rotation: { x: 45, y: 0, z: 0 } })
    sceneObjectToGltf(obj, doc)
    expect(doc.nodes[0].rotation).toBeDefined()
    expect(doc.nodes[0].rotation!.length).toBe(4)
  })

  it('creates correct mesh name from object name', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ name: 'MyCube' })
    sceneObjectToGltf(obj, doc)
    expect(doc.meshes[0].name).toBe('MyCube_mesh')
  })

  it('handles all primitive object types', () => {
    const types = ['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus'] as const
    for (const type of types) {
      const doc = createGltfDocument()
      const obj = makeSceneObject({ type })
      sceneObjectToGltf(obj, doc)
      expect(doc.meshes).toHaveLength(1)
    }
  })

  it('creates accessors for position, normal, and index', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject()
    sceneObjectToGltf(obj, doc)
    expect(doc.accessors.length).toBeGreaterThanOrEqual(3)
    expect(doc.accessors[0].type).toBe('VEC3')  // position
    expect(doc.accessors[1].type).toBe('VEC3')  // normal
    expect(doc.accessors[2].type).toBe('SCALAR') // indices
  })
})

// ── 7. sceneToGltf ───────────────────────────────────────────────────

describe('sceneToGltf', () => {
  it('converts an empty scene', () => {
    const scene = makeSceneData([])
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    expect(doc.asset.version).toBe('2.0')
    expect(doc.scenes[0].nodes).toEqual([])
  })

  it('converts a scene with multiple objects', () => {
    const objects = [
      makeSceneObject({ id: 'a', name: 'Box A' }),
      makeSceneObject({ id: 'b', name: 'Sphere B', type: 'sphere' }),
    ]
    const scene = makeSceneData(objects)
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    expect(doc.nodes).toHaveLength(2)
    expect(doc.meshes).toHaveLength(2)
    expect(doc.scenes[0].nodes).toHaveLength(2)
  })

  it('skips invisible objects', () => {
    const objects = [
      makeSceneObject({ id: 'a', visible: true }),
      makeSceneObject({ id: 'b', visible: false }),
    ]
    const scene = makeSceneData(objects)
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    expect(doc.nodes).toHaveLength(1)
  })

  it('builds parent-child hierarchy', () => {
    const parent = makeSceneObject({ id: 'parent', name: 'Parent' })
    const child = makeSceneObject({ id: 'child', name: 'Child', parentId: 'parent' })
    const scene = makeSceneData([parent, child])
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)

    // Parent should be in root scene nodes
    expect(doc.scenes[0].nodes).toHaveLength(1)
    // Parent node should have children
    expect(doc.nodes[0].children).toBeDefined()
    expect(doc.nodes[0].children!).toContain(1)
  })

  it('child nodes are not in root scene nodes list', () => {
    const parent = makeSceneObject({ id: 'parent', name: 'Parent' })
    const child = makeSceneObject({ id: 'child', name: 'Child', parentId: 'parent' })
    const scene = makeSceneData([parent, child])
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)

    // Only parent should be root
    expect(doc.scenes[0].nodes).toEqual([0])
  })

  it('skips model type objects', () => {
    const objects = [
      makeSceneObject({ id: 'a', type: 'model', gltfUrl: 'test.glb' }),
    ]
    const scene = makeSceneData(objects)
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    expect(doc.nodes).toHaveLength(0)
  })

  it('treats child with missing parent as root', () => {
    const orphan = makeSceneObject({ id: 'orphan', parentId: 'nonexistent' })
    const scene = makeSceneData([orphan])
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    expect(doc.scenes[0].nodes).toHaveLength(1)
  })
})

// ── 8. serializeGltfJson ──────────────────────────────────────────────

describe('serializeGltfJson', () => {
  it('produces valid JSON', () => {
    const doc = createGltfDocument()
    const json = serializeGltfJson(doc)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('includes asset version in output', () => {
    const doc = createGltfDocument()
    const json = serializeGltfJson(doc)
    const parsed = JSON.parse(json)
    expect(parsed.asset.version).toBe('2.0')
  })

  it('strips empty arrays from output', () => {
    const doc = createGltfDocument()
    const json = serializeGltfJson(doc)
    const parsed = JSON.parse(json)
    expect(parsed.nodes).toBeUndefined()
    expect(parsed.meshes).toBeUndefined()
    expect(parsed.materials).toBeUndefined()
    expect(parsed.accessors).toBeUndefined()
    expect(parsed.bufferViews).toBeUndefined()
    expect(parsed.buffers).toBeUndefined()
  })

  it('preserves non-empty arrays', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject()
    sceneObjectToGltf(obj, doc)
    const json = serializeGltfJson(doc)
    const parsed = JSON.parse(json)
    expect(parsed.nodes).toBeDefined()
    expect(parsed.meshes).toBeDefined()
    expect(parsed.materials).toBeDefined()
  })

  it('preserves scene and scenes fields', () => {
    const doc = createGltfDocument()
    const json = serializeGltfJson(doc)
    const parsed = JSON.parse(json)
    expect(parsed.scene).toBe(0)
    expect(parsed.scenes).toHaveLength(1)
  })
})

// ── 9. assembleGlb ───────────────────────────────────────────────────

describe('assembleGlb', () => {
  it('starts with the GLB magic number 0x46546C67', () => {
    const glb = assembleGlb('{}', new ArrayBuffer(0))
    const view = new DataView(glb)
    expect(view.getUint32(0, true)).toBe(0x46546C67)
  })

  it('has version 2 in the header', () => {
    const glb = assembleGlb('{}', new ArrayBuffer(0))
    const view = new DataView(glb)
    expect(view.getUint32(4, true)).toBe(2)
  })

  it('reports correct total length in the header', () => {
    const glb = assembleGlb('{}', new ArrayBuffer(0))
    const view = new DataView(glb)
    const reportedLength = view.getUint32(8, true)
    expect(reportedLength).toBe(glb.byteLength)
  })

  it('has JSON chunk type 0x4E4F534A after header', () => {
    const glb = assembleGlb('{}', new ArrayBuffer(0))
    const view = new DataView(glb)
    // Chunk header starts at offset 12: [chunk length][chunk type]
    const chunkType = view.getUint32(16, true) // offset 12+4=16
    expect(chunkType).toBe(0x4E4F534A)
  })

  it('omits BIN chunk when binary buffer is empty', () => {
    const glb = assembleGlb('{}', new ArrayBuffer(0))
    // Should be 12 (header) + 8 (JSON chunk header) + padded JSON length
    // No BIN chunk
    const view = new DataView(glb)
    const totalLength = view.getUint32(8, true)
    const jsonChunkLength = view.getUint32(12, true)
    // 12 header + 8 json chunk header + json padded length = total
    expect(totalLength).toBe(12 + 8 + jsonChunkLength)
  })

  it('includes BIN chunk when binary buffer is non-empty', () => {
    const binData = new ArrayBuffer(16)
    const glb = assembleGlb('{}', binData)
    const view = new DataView(glb)
    const jsonChunkLength = view.getUint32(12, true)
    const binChunkOffset = 12 + 8 + jsonChunkLength
    const binChunkType = view.getUint32(binChunkOffset + 4, true)
    expect(binChunkType).toBe(0x004E4942)
  })

  it('pads JSON to 4-byte boundary with spaces (0x20)', () => {
    // "ab" is 2 bytes, needs padding to 4
    const glb = assembleGlb('ab', new ArrayBuffer(0))
    const bytes = new Uint8Array(glb)
    // JSON data starts at offset 20 (12 header + 8 chunk header)
    // "ab" at offset 20-21, padding at 22-23
    expect(bytes[22]).toBe(0x20) // space padding
    expect(bytes[23]).toBe(0x20) // space padding
  })

  it('pads BIN to 4-byte boundary with zeros', () => {
    const binData = new ArrayBuffer(5) // needs 3 bytes padding
    const glb = assembleGlb('{}', binData)
    const view = new DataView(glb)
    const jsonChunkLength = view.getUint32(12, true)
    const binChunkOffset = 12 + 8 + jsonChunkLength
    const binChunkLength = view.getUint32(binChunkOffset, true) // padded length
    expect(binChunkLength % 4).toBe(0)
  })

  it('encodes JSON content correctly', () => {
    const json = '{"asset":{"version":"2.0"}}'
    const glb = assembleGlb(json, new ArrayBuffer(0))
    const bytes = new Uint8Array(glb)
    const decoder = new TextDecoder()
    // JSON starts at offset 20
    const jsonChunkLength = new DataView(glb).getUint32(12, true)
    const jsonBytes = bytes.slice(20, 20 + json.length)
    expect(decoder.decode(jsonBytes)).toBe(json)
  })
})

// ── 10. packBufferData ───────────────────────────────────────────────

describe('packBufferData', () => {
  it('returns empty buffer when no geometries provided', () => {
    const doc = createGltfDocument()
    const buf = packBufferData(doc, new Map())
    expect(buf.byteLength).toBe(0)
  })

  it('packs geometry data for a single object', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ type: 'box' })
    sceneObjectToGltf(obj, doc)

    const buf = packBufferData(doc, new Map())
    expect(buf.byteLength).toBeGreaterThan(0)
  })

  it('updates buffer byteLength in the document', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ type: 'box' })
    sceneObjectToGltf(obj, doc)

    const buf = packBufferData(doc, new Map())
    expect(doc.buffers[0].byteLength).toBe(buf.byteLength)
  })

  it('buffer size is 4-byte aligned', () => {
    const doc = createGltfDocument()
    const obj = makeSceneObject({ type: 'plane' })
    sceneObjectToGltf(obj, doc)

    const buf = packBufferData(doc, new Map())
    expect(buf.byteLength % 4).toBe(0)
  })
})

// ── 11. validateGltfOptions ──────────────────────────────────────────

describe('validateGltfOptions', () => {
  it('returns no errors for valid default options', () => {
    const errors = validateGltfOptions(DEFAULT_GLTF_OPTIONS)
    expect(errors).toEqual([])
  })

  it('catches non-boolean binary', () => {
    const opts = { ...DEFAULT_GLTF_OPTIONS, binary: 'yes' as unknown as boolean }
    const errors = validateGltfOptions(opts)
    expect(errors).toContain('binary must be a boolean')
  })

  it('catches precision below 3', () => {
    const opts = { ...DEFAULT_GLTF_OPTIONS, precision: 2 }
    const errors = validateGltfOptions(opts)
    expect(errors.some(e => e.includes('precision'))).toBe(true)
  })

  it('catches precision above 8', () => {
    const opts = { ...DEFAULT_GLTF_OPTIONS, precision: 9 }
    const errors = validateGltfOptions(opts)
    expect(errors.some(e => e.includes('precision'))).toBe(true)
  })

  it('catches non-integer precision', () => {
    const opts = { ...DEFAULT_GLTF_OPTIONS, precision: 5.5 }
    const errors = validateGltfOptions(opts)
    expect(errors.some(e => e.includes('integer'))).toBe(true)
  })

  it('accepts valid boundary values for precision (3 and 8)', () => {
    expect(validateGltfOptions({ ...DEFAULT_GLTF_OPTIONS, precision: 3 })).toEqual([])
    expect(validateGltfOptions({ ...DEFAULT_GLTF_OPTIONS, precision: 8 })).toEqual([])
  })
})

// ── 12. validateScreenshotOptions ────────────────────────────────────

describe('validateScreenshotOptions', () => {
  it('returns no errors for valid default options', () => {
    const errors = validateScreenshotOptions(DEFAULT_SCREENSHOT_OPTIONS)
    expect(errors).toEqual([])
  })

  it('catches zero width', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, width: 0 }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('width'))).toBe(true)
  })

  it('catches negative height', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, height: -10 }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('height'))).toBe(true)
  })

  it('catches non-integer width', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, width: 100.5 }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('width'))).toBe(true)
  })

  it('catches width exceeding 8192', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, width: 8193 }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('8192'))).toBe(true)
  })

  it('catches height exceeding 8192', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, height: 10000 }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('8192'))).toBe(true)
  })

  it('catches invalid format', () => {
    const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, format: 'bmp' as never }
    const errors = validateScreenshotOptions(opts)
    expect(errors.some(e => e.includes('format'))).toBe(true)
  })

  it('accepts all valid formats', () => {
    for (const format of ['png', 'jpeg', 'webp'] as const) {
      const opts = { ...DEFAULT_SCREENSHOT_OPTIONS, format }
      expect(validateScreenshotOptions(opts)).toEqual([])
    }
  })

  it('catches quality outside 0-1 range', () => {
    const opts1 = { ...DEFAULT_SCREENSHOT_OPTIONS, quality: -0.1 }
    expect(validateScreenshotOptions(opts1).some(e => e.includes('quality'))).toBe(true)

    const opts2 = { ...DEFAULT_SCREENSHOT_OPTIONS, quality: 1.1 }
    expect(validateScreenshotOptions(opts2).some(e => e.includes('quality'))).toBe(true)
  })

  it('accepts boundary quality values 0 and 1', () => {
    expect(validateScreenshotOptions({ ...DEFAULT_SCREENSHOT_OPTIONS, quality: 0 })).toEqual([])
    expect(validateScreenshotOptions({ ...DEFAULT_SCREENSHOT_OPTIONS, quality: 1 })).toEqual([])
  })
})

// ── 13. validateVideoOptions ─────────────────────────────────────────

describe('validateVideoOptions', () => {
  it('returns no errors for valid default options', () => {
    const errors = validateVideoOptions(DEFAULT_VIDEO_OPTIONS)
    expect(errors).toEqual([])
  })

  it('catches invalid FPS values', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, fps: 15 }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('fps'))).toBe(true)
  })

  it('accepts valid FPS values (24, 30, 60)', () => {
    for (const fps of [24, 30, 60]) {
      const opts = { ...DEFAULT_VIDEO_OPTIONS, fps }
      expect(validateVideoOptions(opts)).toEqual([])
    }
  })

  it('catches invalid video format', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, format: 'avi' as never }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('format'))).toBe(true)
  })

  it('accepts webm and mp4 formats', () => {
    for (const format of ['webm', 'mp4'] as const) {
      const opts = { ...DEFAULT_VIDEO_OPTIONS, format }
      expect(validateVideoOptions(opts)).toEqual([])
    }
  })

  it('catches bitrate below 100000', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, bitrate: 50000 }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('bitrate'))).toBe(true)
  })

  it('catches negative duration', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, duration: -1 }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('duration'))).toBe(true)
  })

  it('accepts zero duration (unlimited)', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, duration: 0 }
    expect(validateVideoOptions(opts)).toEqual([])
  })

  it('catches zero width', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, width: 0 }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('width'))).toBe(true)
  })

  it('catches non-integer height', () => {
    const opts = { ...DEFAULT_VIDEO_OPTIONS, height: 720.5 }
    const errors = validateVideoOptions(opts)
    expect(errors.some(e => e.includes('height'))).toBe(true)
  })
})

// ── 14. formatFileSize ───────────────────────────────────────────────

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('formats bytes (< 1024)', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('formats fractional kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats negative bytes as 0 B', () => {
    expect(formatFileSize(-100)).toBe('0 B')
  })

  it('rounds bytes to nearest integer', () => {
    expect(formatFileSize(1)).toBe('1 B')
    expect(formatFileSize(999)).toBe('999 B')
  })

  it('formats large MB values with one decimal', () => {
    // 5.7 MB
    const bytes = Math.round(5.7 * 1024 * 1024)
    const result = formatFileSize(bytes)
    expect(result).toMatch(/^5\.7 MB$/)
  })
})

// ── 15. generateExportFileName ───────────────────────────────────────

describe('generateExportFileName', () => {
  it('generates filename from scene name and format', () => {
    expect(generateExportFileName('My Scene', 'glb')).toBe('My_Scene.glb')
  })

  it('sanitizes special characters', () => {
    expect(generateExportFileName('Scene<>:"/\\|?*', 'glb')).toBe('Scene.glb')
  })

  it('replaces spaces with underscores', () => {
    expect(generateExportFileName('Hello World', 'gltf')).toBe('Hello_World.gltf')
  })

  it('strips leading and trailing underscores', () => {
    expect(generateExportFileName('  test  ', 'glb')).toBe('test.glb')
  })

  it('falls back to "scene" for empty name after sanitization', () => {
    expect(generateExportFileName('!!!', 'glb')).toBe('scene.glb')
  })

  it('does not double-dot the extension', () => {
    expect(generateExportFileName('Test', '.glb')).toBe('Test.glb')
  })

  it('preserves alphanumeric and allowed characters', () => {
    expect(generateExportFileName('test-scene_01', 'glb')).toBe('test-scene_01.glb')
  })

  it('handles empty name', () => {
    expect(generateExportFileName('', 'png')).toBe('scene.png')
  })
})

// ── 16. Default Options ──────────────────────────────────────────────

describe('DEFAULT_GLTF_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_GLTF_OPTIONS.binary).toBe(true)
    expect(DEFAULT_GLTF_OPTIONS.embedTextures).toBe(true)
    expect(DEFAULT_GLTF_OPTIONS.includeAnimation).toBe(false)
    expect(DEFAULT_GLTF_OPTIONS.includeLights).toBe(false)
    expect(DEFAULT_GLTF_OPTIONS.includeCamera).toBe(false)
    expect(DEFAULT_GLTF_OPTIONS.precision).toBe(5)
  })

  it('passes its own validation', () => {
    expect(validateGltfOptions(DEFAULT_GLTF_OPTIONS)).toEqual([])
  })
})

describe('DEFAULT_SCREENSHOT_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_SCREENSHOT_OPTIONS.width).toBe(1920)
    expect(DEFAULT_SCREENSHOT_OPTIONS.height).toBe(1080)
    expect(DEFAULT_SCREENSHOT_OPTIONS.format).toBe('png')
    expect(DEFAULT_SCREENSHOT_OPTIONS.quality).toBe(0.92)
    expect(DEFAULT_SCREENSHOT_OPTIONS.transparentBackground).toBe(false)
  })

  it('passes its own validation', () => {
    expect(validateScreenshotOptions(DEFAULT_SCREENSHOT_OPTIONS)).toEqual([])
  })
})

describe('DEFAULT_VIDEO_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_VIDEO_OPTIONS.width).toBe(1920)
    expect(DEFAULT_VIDEO_OPTIONS.height).toBe(1080)
    expect(DEFAULT_VIDEO_OPTIONS.fps).toBe(30)
    expect(DEFAULT_VIDEO_OPTIONS.format).toBe('webm')
    expect(DEFAULT_VIDEO_OPTIONS.bitrate).toBe(5000000)
    expect(DEFAULT_VIDEO_OPTIONS.duration).toBe(0)
  })

  it('passes its own validation', () => {
    expect(validateVideoOptions(DEFAULT_VIDEO_OPTIONS)).toEqual([])
  })
})

// ── 17. End-to-end: full pipeline ────────────────────────────────────

describe('end-to-end pipeline', () => {
  it('produces a valid GLB from a scene with one box', () => {
    const objects = [makeSceneObject({ type: 'box' })]
    const scene = makeSceneData(objects)
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)

    // Pack binary data
    const binBuffer = packBufferData(doc, new Map())

    // Serialize and assemble
    const jsonStr = serializeGltfJson(doc)
    const glb = assembleGlb(jsonStr, binBuffer)

    // Validate GLB header
    const view = new DataView(glb)
    expect(view.getUint32(0, true)).toBe(0x46546C67)  // magic
    expect(view.getUint32(4, true)).toBe(2)            // version
    expect(view.getUint32(8, true)).toBe(glb.byteLength) // total length
    expect(glb.byteLength).toBeGreaterThan(0)
  })

  it('produces a valid GLB from a multi-object scene', () => {
    const objects = [
      makeSceneObject({ id: 'a', name: 'Box', type: 'box' }),
      makeSceneObject({ id: 'b', name: 'Sphere', type: 'sphere', position: { x: 2, y: 0, z: 0 } }),
      makeSceneObject({ id: 'c', name: 'Torus', type: 'torus', position: { x: -2, y: 0, z: 0 } }),
    ]
    const scene = makeSceneData(objects)
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    const binBuffer = packBufferData(doc, new Map())
    const jsonStr = serializeGltfJson(doc)
    const glb = assembleGlb(jsonStr, binBuffer)

    const view = new DataView(glb)
    expect(view.getUint32(0, true)).toBe(0x46546C67)
    expect(view.getUint32(8, true)).toBe(glb.byteLength)

    // Verify the JSON contains all three objects
    const parsed = JSON.parse(jsonStr)
    expect(parsed.nodes).toHaveLength(3)
    expect(parsed.meshes).toHaveLength(3)
  })

  it('produces a valid GLB from a hierarchical scene', () => {
    const parent = makeSceneObject({ id: 'parent', name: 'Parent', type: 'box' })
    const child = makeSceneObject({
      id: 'child',
      name: 'Child',
      type: 'sphere',
      parentId: 'parent',
      position: { x: 1, y: 1, z: 0 },
    })
    const scene = makeSceneData([parent, child])
    const doc = sceneToGltf(scene, DEFAULT_GLTF_OPTIONS)
    const binBuffer = packBufferData(doc, new Map())
    const jsonStr = serializeGltfJson(doc)
    const glb = assembleGlb(jsonStr, binBuffer)

    const view = new DataView(glb)
    expect(view.getUint32(0, true)).toBe(0x46546C67)

    const parsed = JSON.parse(jsonStr)
    expect(parsed.nodes[0].children).toContain(1)
  })
})
