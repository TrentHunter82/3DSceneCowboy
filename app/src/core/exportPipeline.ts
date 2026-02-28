/** glTF 2.0 export pipeline — pure functions for scene-to-glTF conversion,
 *  geometry generation, binary assembly, and browser-dependent capture utilities. */

import type { SceneObject, Vec3, MaterialData, SceneData } from '../types/scene'
import type {
  GltfExportOptions, ScreenshotOptions, VideoRecordingOptions,
} from '../types/export'

// ── Constants ────────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180
const GLTF_VERSION = '2.0'
const GENERATOR = '3D Scene Cowboy Export Pipeline'

// glTF component type constants
const GL_UNSIGNED_SHORT = 5123
const GL_FLOAT = 5126

// glTF buffer view target constants
const GL_ARRAY_BUFFER = 34962
const GL_ELEMENT_ARRAY_BUFFER = 34963

// GLB magic and chunk type constants
const GLB_MAGIC = 0x46546C67      // 'glTF'
const GLB_VERSION = 2
const GLB_HEADER_SIZE = 12
const GLB_CHUNK_HEADER_SIZE = 8
const JSON_CHUNK_TYPE = 0x4E4F534A // 'JSON'
const BIN_CHUNK_TYPE = 0x004E4942  // 'BIN\0'

// ── glTF Document Types ──────────────────────────────────────────────

export interface GltfNode {
  name: string
  mesh?: number
  translation?: number[]
  rotation?: number[]
  scale?: number[]
  children?: number[]
}

export interface GltfMesh {
  name: string
  primitives: GltfPrimitive[]
}

export interface GltfPrimitive {
  attributes: Record<string, number>
  indices?: number
  material?: number
  mode?: number
}

export interface GltfMaterial {
  name: string
  pbrMetallicRoughness: {
    baseColorFactor: number[]
    metallicFactor: number
    roughnessFactor: number
  }
  emissiveFactor?: number[]
  alphaMode?: string
  doubleSided?: boolean
}

export interface GltfAccessor {
  bufferView: number
  componentType: number
  count: number
  type: string
  min?: number[]
  max?: number[]
}

export interface GltfBufferView {
  buffer: number
  byteOffset: number
  byteLength: number
  target?: number
}

export interface GltfBuffer {
  uri?: string
  byteLength: number
}

export interface GltfDocument {
  asset: { version: string; generator: string }
  scene: number
  scenes: Array<{ nodes: number[] }>
  nodes: GltfNode[]
  meshes: GltfMesh[]
  materials: GltfMaterial[]
  accessors: GltfAccessor[]
  bufferViews: GltfBufferView[]
  buffers: GltfBuffer[]
}

// ── Geometry Output ──────────────────────────────────────────────────

interface GeometryData {
  positions: Float32Array
  normals: Float32Array
  indices: Uint16Array
}

// ── 1. glTF Data Assembly ────────────────────────────────────────────

/** Create an empty glTF 2.0 document scaffold */
export function createGltfDocument(): GltfDocument {
  return {
    asset: { version: GLTF_VERSION, generator: GENERATOR },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  }
}

// ── 2. Geometry Generation ───────────────────────────────────────────

/** Generate box vertices, normals, and indices.
 *  Each face has 4 unique vertices (for correct normals) = 24 vertices, 36 indices. */
export function generateBoxGeometry(width: number, height: number, depth: number): GeometryData {
  const hw = width / 2
  const hh = height / 2
  const hd = depth / 2

  // 6 faces, 4 vertices per face = 24 vertices
  const positions = new Float32Array([
    // +Z face
    -hw, -hh,  hd,   hw, -hh,  hd,   hw,  hh,  hd,  -hw,  hh,  hd,
    // -Z face
     hw, -hh, -hd,  -hw, -hh, -hd,  -hw,  hh, -hd,   hw,  hh, -hd,
    // +Y face
    -hw,  hh,  hd,   hw,  hh,  hd,   hw,  hh, -hd,  -hw,  hh, -hd,
    // -Y face
    -hw, -hh, -hd,   hw, -hh, -hd,   hw, -hh,  hd,  -hw, -hh,  hd,
    // +X face
     hw, -hh,  hd,   hw, -hh, -hd,   hw,  hh, -hd,   hw,  hh,  hd,
    // -X face
    -hw, -hh, -hd,  -hw, -hh,  hd,  -hw,  hh,  hd,  -hw,  hh, -hd,
  ])

  const normals = new Float32Array([
    // +Z
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // -Z
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    // +Y
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // -Y
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // +X
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // -X
    -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
  ])

  const indices = new Uint16Array([
    0, 1, 2,  0, 2, 3,     // +Z
    4, 5, 6,  4, 6, 7,     // -Z
    8, 9, 10,  8, 10, 11,  // +Y
    12, 13, 14,  12, 14, 15, // -Y
    16, 17, 18,  16, 18, 19, // +X
    20, 21, 22,  20, 22, 23, // -X
  ])

  return { positions, normals, indices }
}

/** Generate sphere vertices, normals, and indices via UV sphere.
 *  segments controls both longitude and latitude rings. */
export function generateSphereGeometry(radius: number, segments: number): GeometryData {
  const widthSegments = Math.max(3, segments)
  const heightSegments = Math.max(2, segments)

  const vertexCount = (widthSegments + 1) * (heightSegments + 1)
  const indexCount = widthSegments * heightSegments * 6

  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const indices = new Uint16Array(indexCount)

  let vi = 0
  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments
    const phi = v * Math.PI
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments
      const theta = u * Math.PI * 2

      const nx = -Math.cos(theta) * Math.sin(phi)
      const ny = Math.cos(phi)
      const nz = Math.sin(theta) * Math.sin(phi)

      positions[vi * 3] = nx * radius
      positions[vi * 3 + 1] = ny * radius
      positions[vi * 3 + 2] = nz * radius

      normals[vi * 3] = nx
      normals[vi * 3 + 1] = ny
      normals[vi * 3 + 2] = nz

      vi++
    }
  }

  let ii = 0
  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x
      const b = a + widthSegments + 1

      indices[ii++] = a
      indices[ii++] = b
      indices[ii++] = a + 1

      indices[ii++] = b
      indices[ii++] = b + 1
      indices[ii++] = a + 1
    }
  }

  return { positions, normals, indices }
}

/** Generate cylinder vertices, normals, and indices.
 *  Includes top and bottom caps. */
export function generateCylinderGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
): GeometryData {
  const seg = Math.max(3, segments)
  const halfHeight = height / 2

  // Body: (seg + 1) * 2 vertices
  // Top cap: 1 center + seg vertices
  // Bottom cap: 1 center + seg vertices
  const bodyVertexCount = (seg + 1) * 2
  const capVertexCount = (1 + seg) * 2
  const totalVertices = bodyVertexCount + capVertexCount

  const bodyIndexCount = seg * 6
  const capIndexCount = seg * 3 * 2
  const totalIndices = bodyIndexCount + capIndexCount

  const positions = new Float32Array(totalVertices * 3)
  const normals = new Float32Array(totalVertices * 3)
  const indices = new Uint16Array(totalIndices)

  let vi = 0
  let ii = 0

  // Compute the slope for the side normals
  const slopeLen = Math.sqrt((radiusBottom - radiusTop) * (radiusBottom - radiusTop) + height * height)
  const slopeNy = (radiusBottom - radiusTop) / slopeLen
  const slopeNr = height / slopeLen

  // Body vertices (two rings)
  for (let i = 0; i <= seg; i++) {
    const theta = (i / seg) * Math.PI * 2
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)

    // Top ring
    positions[vi * 3] = radiusTop * cosT
    positions[vi * 3 + 1] = halfHeight
    positions[vi * 3 + 2] = radiusTop * sinT
    normals[vi * 3] = slopeNr * cosT
    normals[vi * 3 + 1] = slopeNy
    normals[vi * 3 + 2] = slopeNr * sinT
    vi++

    // Bottom ring
    positions[vi * 3] = radiusBottom * cosT
    positions[vi * 3 + 1] = -halfHeight
    positions[vi * 3 + 2] = radiusBottom * sinT
    normals[vi * 3] = slopeNr * cosT
    normals[vi * 3 + 1] = slopeNy
    normals[vi * 3 + 2] = slopeNr * sinT
    vi++
  }

  // Body indices
  for (let i = 0; i < seg; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3

    indices[ii++] = a
    indices[ii++] = b
    indices[ii++] = c

    indices[ii++] = b
    indices[ii++] = d
    indices[ii++] = c
  }

  // Top cap
  const topCenterIndex = vi
  positions[vi * 3] = 0
  positions[vi * 3 + 1] = halfHeight
  positions[vi * 3 + 2] = 0
  normals[vi * 3] = 0
  normals[vi * 3 + 1] = 1
  normals[vi * 3 + 2] = 0
  vi++

  const topRingStart = vi
  for (let i = 0; i < seg; i++) {
    const theta = (i / seg) * Math.PI * 2
    positions[vi * 3] = radiusTop * Math.cos(theta)
    positions[vi * 3 + 1] = halfHeight
    positions[vi * 3 + 2] = radiusTop * Math.sin(theta)
    normals[vi * 3] = 0
    normals[vi * 3 + 1] = 1
    normals[vi * 3 + 2] = 0
    vi++
  }

  for (let i = 0; i < seg; i++) {
    indices[ii++] = topCenterIndex
    indices[ii++] = topRingStart + i
    indices[ii++] = topRingStart + ((i + 1) % seg)
  }

  // Bottom cap
  const botCenterIndex = vi
  positions[vi * 3] = 0
  positions[vi * 3 + 1] = -halfHeight
  positions[vi * 3 + 2] = 0
  normals[vi * 3] = 0
  normals[vi * 3 + 1] = -1
  normals[vi * 3 + 2] = 0
  vi++

  const botRingStart = vi
  for (let i = 0; i < seg; i++) {
    const theta = (i / seg) * Math.PI * 2
    positions[vi * 3] = radiusBottom * Math.cos(theta)
    positions[vi * 3 + 1] = -halfHeight
    positions[vi * 3 + 2] = radiusBottom * Math.sin(theta)
    normals[vi * 3] = 0
    normals[vi * 3 + 1] = -1
    normals[vi * 3 + 2] = 0
    vi++
  }

  for (let i = 0; i < seg; i++) {
    indices[ii++] = botCenterIndex
    indices[ii++] = botRingStart + ((i + 1) % seg)
    indices[ii++] = botRingStart + i
  }

  return {
    positions: positions.subarray(0, vi * 3),
    normals: normals.subarray(0, vi * 3),
    indices: indices.subarray(0, ii),
  }
}

/** Generate cone geometry (cylinder with top radius 0) */
export function generateConeGeometry(radius: number, height: number, segments: number): GeometryData {
  return generateCylinderGeometry(0, radius, height, segments)
}

/** Generate a plane (quad) lying in the XY plane centered at origin */
export function generatePlaneGeometry(width: number, height: number): GeometryData {
  const hw = width / 2
  const hh = height / 2

  const positions = new Float32Array([
    -hw, -hh, 0,
     hw, -hh, 0,
     hw,  hh, 0,
    -hw,  hh, 0,
  ])

  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ])

  const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ])

  return { positions, normals, indices }
}

/** Generate torus geometry.
 *  @param radius - distance from center of torus to center of tube
 *  @param tube - radius of the tube
 *  @param radialSegments - segments around the tube cross-section
 *  @param tubularSegments - segments around the main ring */
export function generateTorusGeometry(
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
): GeometryData {
  const rs = Math.max(3, radialSegments)
  const ts = Math.max(3, tubularSegments)

  const vertexCount = (rs + 1) * (ts + 1)
  const indexCount = rs * ts * 6

  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const indices = new Uint16Array(indexCount)

  let vi = 0
  for (let j = 0; j <= rs; j++) {
    for (let i = 0; i <= ts; i++) {
      const u = (i / ts) * Math.PI * 2
      const v = (j / rs) * Math.PI * 2

      const x = (radius + tube * Math.cos(v)) * Math.cos(u)
      const y = tube * Math.sin(v)
      const z = (radius + tube * Math.cos(v)) * Math.sin(u)

      positions[vi * 3] = x
      positions[vi * 3 + 1] = y
      positions[vi * 3 + 2] = z

      // Normal = vertex position minus the center of the tube circle
      const cx = radius * Math.cos(u)
      const cz = radius * Math.sin(u)
      const nx = x - cx
      const ny = y
      const nz = z - cz
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1

      normals[vi * 3] = nx / len
      normals[vi * 3 + 1] = ny / len
      normals[vi * 3 + 2] = nz / len

      vi++
    }
  }

  let ii = 0
  for (let j = 0; j < rs; j++) {
    for (let i = 0; i < ts; i++) {
      const a = j * (ts + 1) + i
      const b = a + ts + 1

      indices[ii++] = a
      indices[ii++] = b
      indices[ii++] = a + 1

      indices[ii++] = b
      indices[ii++] = b + 1
      indices[ii++] = a + 1
    }
  }

  return { positions, normals, indices }
}

// ── 3. Material Conversion ───────────────────────────────────────────

/** Convert a hex color string (e.g. '#ff8000') to glTF RGBA [0-1] linear values.
 *  Assumes sRGB input; converts to linear color space for glTF compliance. */
export function hexToGltfColor(hex: string): [number, number, number, number] {
  const cleaned = hex.replace('#', '')

  let r: number, g: number, b: number

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16) / 255
    g = parseInt(cleaned[1] + cleaned[1], 16) / 255
    b = parseInt(cleaned[2] + cleaned[2], 16) / 255
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16) / 255
    g = parseInt(cleaned.substring(2, 4), 16) / 255
    b = parseInt(cleaned.substring(4, 6), 16) / 255
  } else {
    return [1, 1, 1, 1] // fallback white
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return [1, 1, 1, 1]
  }

  // sRGB to linear conversion
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  return [toLinear(r), toLinear(g), toLinear(b), 1]
}

/** Convert a MaterialData object to a glTF PBR material */
export function materialToGltf(mat: MaterialData): GltfMaterial {
  const color = hexToGltfColor(mat.color)
  color[3] = mat.opacity

  const gltfMat: GltfMaterial = {
    name: `material_${mat.type}`,
    pbrMetallicRoughness: {
      baseColorFactor: color,
      metallicFactor: mat.type === 'standard' ? mat.metalness : 0,
      roughnessFactor: mat.type === 'standard' ? mat.roughness : 1,
    },
  }

  if (mat.transparent || mat.opacity < 1) {
    gltfMat.alphaMode = 'BLEND'
  }

  gltfMat.doubleSided = true

  // Emissive support
  if (mat.emissiveColor && mat.emissiveIntensity && mat.emissiveIntensity > 0) {
    const emissive = hexToGltfColor(mat.emissiveColor)
    gltfMat.emissiveFactor = [
      emissive[0] * mat.emissiveIntensity,
      emissive[1] * mat.emissiveIntensity,
      emissive[2] * mat.emissiveIntensity,
    ]
  }

  return gltfMat
}

// ── 4. Scene to glTF Conversion ──────────────────────────────────────

/** Geometry data registry used during scene-to-glTF conversion.
 *  Maps mesh index to the generated geometry for later binary packing. */
const GEOMETRY_REGISTRY = Symbol('geometryRegistry')

interface GltfDocumentWithGeometry extends GltfDocument {
  [GEOMETRY_REGISTRY]?: Map<number, GeometryData>
}

/** Get default geometry dimensions for a given object type */
function getDefaultGeometry(obj: SceneObject): GeometryData | null {
  switch (obj.type) {
    case 'box':
      return generateBoxGeometry(1, 1, 1)
    case 'sphere':
      return generateSphereGeometry(0.5, 16)
    case 'cylinder':
      return generateCylinderGeometry(0.5, 0.5, 1, 16)
    case 'cone':
      return generateConeGeometry(0.5, 1, 16)
    case 'plane':
      return generatePlaneGeometry(1, 1)
    case 'torus':
      return generateTorusGeometry(0.5, 0.2, 12, 24)
    case 'model':
      // Model objects reference external GLTF files; skip geometry generation
      return null
    default:
      return null
  }
}

/** Add geometry data as buffer views and accessors to the document.
 *  Returns accessor indices for the primitive. */
function addGeometryToDocument(
  doc: GltfDocumentWithGeometry,
  geometry: GeometryData,
  meshIndex: number,
): { positionAccessor: number; normalAccessor: number; indexAccessor: number } {
  // Track geometry for binary packing
  if (!doc[GEOMETRY_REGISTRY]) {
    doc[GEOMETRY_REGISTRY] = new Map()
  }
  doc[GEOMETRY_REGISTRY].set(meshIndex, geometry)

  const posBytes = geometry.positions.byteLength
  const normalBytes = geometry.normals.byteLength
  const indexBytes = geometry.indices.byteLength

  // Compute cumulative byte offset from existing buffer views
  let currentOffset = 0
  for (const bv of doc.bufferViews) {
    currentOffset = Math.max(currentOffset, bv.byteOffset + bv.byteLength)
  }
  // Align to 4 bytes
  currentOffset = alignTo4(currentOffset)

  // Position buffer view
  const posBvIndex = doc.bufferViews.length
  doc.bufferViews.push({
    buffer: 0,
    byteOffset: currentOffset,
    byteLength: posBytes,
    target: GL_ARRAY_BUFFER,
  })
  currentOffset = alignTo4(currentOffset + posBytes)

  // Normal buffer view
  const normalBvIndex = doc.bufferViews.length
  doc.bufferViews.push({
    buffer: 0,
    byteOffset: currentOffset,
    byteLength: normalBytes,
    target: GL_ARRAY_BUFFER,
  })
  currentOffset = alignTo4(currentOffset + normalBytes)

  // Index buffer view
  const indexBvIndex = doc.bufferViews.length
  doc.bufferViews.push({
    buffer: 0,
    byteOffset: currentOffset,
    byteLength: indexBytes,
    target: GL_ELEMENT_ARRAY_BUFFER,
  })

  // Compute position bounds
  const posMin = [Infinity, Infinity, Infinity]
  const posMax = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < geometry.positions.length; i += 3) {
    posMin[0] = Math.min(posMin[0], geometry.positions[i])
    posMin[1] = Math.min(posMin[1], geometry.positions[i + 1])
    posMin[2] = Math.min(posMin[2], geometry.positions[i + 2])
    posMax[0] = Math.max(posMax[0], geometry.positions[i])
    posMax[1] = Math.max(posMax[1], geometry.positions[i + 1])
    posMax[2] = Math.max(posMax[2], geometry.positions[i + 2])
  }

  const vertexCount = geometry.positions.length / 3

  // Position accessor
  const posAccessorIndex = doc.accessors.length
  doc.accessors.push({
    bufferView: posBvIndex,
    componentType: GL_FLOAT,
    count: vertexCount,
    type: 'VEC3',
    min: posMin,
    max: posMax,
  })

  // Normal accessor
  const normalAccessorIndex = doc.accessors.length
  doc.accessors.push({
    bufferView: normalBvIndex,
    componentType: GL_FLOAT,
    count: vertexCount,
    type: 'VEC3',
  })

  // Index accessor
  const indexAccessorIndex = doc.accessors.length
  doc.accessors.push({
    bufferView: indexBvIndex,
    componentType: GL_UNSIGNED_SHORT,
    count: geometry.indices.length,
    type: 'SCALAR',
  })

  return {
    positionAccessor: posAccessorIndex,
    normalAccessor: normalAccessorIndex,
    indexAccessor: indexAccessorIndex,
  }
}

/** Align a byte offset to the next 4-byte boundary */
function alignTo4(n: number): number {
  return (n + 3) & ~3
}

/** Convert a SceneObject to glTF nodes, meshes, and materials.
 *  Mutates the document in place for efficient accumulation.
 *  Skips 'model' type objects since their geometry is external. */
export function sceneObjectToGltf(
  obj: SceneObject,
  doc: GltfDocument,
): GltfDocument {
  if (!obj.visible) return doc

  const geometry = getDefaultGeometry(obj)
  if (!geometry) return doc  // model type or unsupported

  // Add material
  const materialIndex = doc.materials.length
  doc.materials.push(materialToGltf(obj.material))

  // Add mesh
  const meshIndex = doc.meshes.length
  const accessors = addGeometryToDocument(doc as GltfDocumentWithGeometry, geometry, meshIndex)

  doc.meshes.push({
    name: `${obj.name}_mesh`,
    primitives: [{
      attributes: {
        POSITION: accessors.positionAccessor,
        NORMAL: accessors.normalAccessor,
      },
      indices: accessors.indexAccessor,
      material: materialIndex,
    }],
  })

  // Add node
  const nodeIndex = doc.nodes.length
  const quat = eulerToQuaternion(obj.rotation)

  const node: GltfNode = {
    name: obj.name,
    mesh: meshIndex,
  }

  // Only include non-identity transforms
  if (obj.position.x !== 0 || obj.position.y !== 0 || obj.position.z !== 0) {
    node.translation = [obj.position.x, obj.position.y, obj.position.z]
  }

  if (quat[0] !== 0 || quat[1] !== 0 || quat[2] !== 0 || quat[3] !== 1) {
    node.rotation = [quat[0], quat[1], quat[2], quat[3]]
  }

  if (obj.scale.x !== 1 || obj.scale.y !== 1 || obj.scale.z !== 1) {
    node.scale = [obj.scale.x, obj.scale.y, obj.scale.z]
  }

  doc.nodes.push(node)
  doc.scenes[0].nodes.push(nodeIndex)

  return doc
}

/** Convert an entire scene to a glTF document.
 *  Respects parent/child hierarchy and builds proper node tree. */
export function sceneToGltf(
  sceneData: SceneData,
  _options: GltfExportOptions,
): GltfDocument {
  const doc = createGltfDocument() as GltfDocumentWithGeometry

  // Build object lookup for hierarchy
  const objectMap = new Map<string, SceneObject>()
  for (const obj of sceneData.objects) {
    objectMap.set(obj.id, obj)
  }

  // Find root objects (no parent or parent not in scene)
  const rootObjects: SceneObject[] = []
  const childrenMap = new Map<string, SceneObject[]>()

  for (const obj of sceneData.objects) {
    if (!obj.visible) continue

    if (!obj.parentId || !objectMap.has(obj.parentId)) {
      rootObjects.push(obj)
    } else {
      const siblings = childrenMap.get(obj.parentId)
      if (siblings) {
        siblings.push(obj)
      } else {
        childrenMap.set(obj.parentId, [obj])
      }
    }
  }

  // Recursively convert objects with hierarchy
  function convertObject(obj: SceneObject): number | null {
    if (!obj.visible) return null  // skip invisible objects
    const geometry = getDefaultGeometry(obj)
    if (!geometry) return null  // skip model types

    // Add material
    const materialIndex = doc.materials.length
    doc.materials.push(materialToGltf(obj.material))

    // Add mesh
    const meshIndex = doc.meshes.length
    const accessors = addGeometryToDocument(doc, geometry, meshIndex)

    doc.meshes.push({
      name: `${obj.name}_mesh`,
      primitives: [{
        attributes: {
          POSITION: accessors.positionAccessor,
          NORMAL: accessors.normalAccessor,
        },
        indices: accessors.indexAccessor,
        material: materialIndex,
      }],
    })

    // Create node
    const nodeIndex = doc.nodes.length
    const quat = eulerToQuaternion(obj.rotation)

    const node: GltfNode = {
      name: obj.name,
      mesh: meshIndex,
    }

    if (obj.position.x !== 0 || obj.position.y !== 0 || obj.position.z !== 0) {
      node.translation = [obj.position.x, obj.position.y, obj.position.z]
    }

    if (quat[0] !== 0 || quat[1] !== 0 || quat[2] !== 0 || quat[3] !== 1) {
      node.rotation = [quat[0], quat[1], quat[2], quat[3]]
    }

    if (obj.scale.x !== 1 || obj.scale.y !== 1 || obj.scale.z !== 1) {
      node.scale = [obj.scale.x, obj.scale.y, obj.scale.z]
    }

    doc.nodes.push(node)

    // Process children
    const children = childrenMap.get(obj.id)
    if (children && children.length > 0) {
      const childIndices: number[] = []
      for (const child of children) {
        const childNodeIndex = convertObject(child)
        if (childNodeIndex !== null) {
          childIndices.push(childNodeIndex)
        }
      }
      if (childIndices.length > 0) {
        doc.nodes[nodeIndex].children = childIndices
      }
    }

    return nodeIndex
  }

  // Convert root objects
  for (const root of rootObjects) {
    const nodeIndex = convertObject(root)
    if (nodeIndex !== null) {
      doc.scenes[0].nodes.push(nodeIndex)
    }
  }

  return doc
}

// ── 5. Binary Buffer Assembly ────────────────────────────────────────

/** Extract the geometry registry from a GltfDocument that was built via sceneToGltf/sceneObjectToGltf.
 *  Returns an empty Map if the document has no attached registry. */
function extractGeometryRegistry(doc: GltfDocument): Map<number, GeometryData> {
  return (doc as GltfDocumentWithGeometry)[GEOMETRY_REGISTRY] ?? new Map()
}

/** Pack all geometry data into a single binary buffer.
 *  The geometries map keys correspond to mesh indices. */
export function packBufferData(
  doc: GltfDocument,
  geometries: Map<number, GeometryData>,
): ArrayBuffer {
  // If geometries is empty, try to extract from the document's internal registry
  const registry = geometries.size > 0 ? geometries : extractGeometryRegistry(doc)

  if (registry.size === 0) {
    return new ArrayBuffer(0)
  }

  // Calculate total buffer size from buffer views
  let totalSize = 0
  for (const bv of doc.bufferViews) {
    totalSize = Math.max(totalSize, bv.byteOffset + bv.byteLength)
  }
  totalSize = alignTo4(totalSize)

  const buffer = new ArrayBuffer(totalSize)
  const view = new Uint8Array(buffer)

  // Write geometry data at the offsets specified by their buffer views
  // Each mesh has 3 buffer views: positions, normals, indices
  // We iterate buffer views in groups of 3 per mesh
  let bvIndex = 0
  for (const [_meshIndex, geom] of sortedEntries(registry)) {
    if (bvIndex + 2 >= doc.bufferViews.length) break

    const posBv = doc.bufferViews[bvIndex]
    const normalBv = doc.bufferViews[bvIndex + 1]
    const indexBv = doc.bufferViews[bvIndex + 2]

    view.set(new Uint8Array(geom.positions.buffer, geom.positions.byteOffset, geom.positions.byteLength), posBv.byteOffset)
    view.set(new Uint8Array(geom.normals.buffer, geom.normals.byteOffset, geom.normals.byteLength), normalBv.byteOffset)
    view.set(new Uint8Array(geom.indices.buffer, geom.indices.byteOffset, geom.indices.byteLength), indexBv.byteOffset)

    bvIndex += 3
  }

  // Update the buffer entry in the document
  if (doc.buffers.length === 0) {
    doc.buffers.push({ byteLength: totalSize })
  } else {
    doc.buffers[0].byteLength = totalSize
  }

  return buffer
}

/** Helper to iterate a Map in sorted key order */
function sortedEntries<V>(map: Map<number, V>): [number, V][] {
  return [...map.entries()].sort(([a], [b]) => a - b)
}

/** Serialize a glTF document to a JSON string.
 *  Strips internal symbol properties before serialization. */
export function serializeGltfJson(doc: GltfDocument): string {
  // Create a clean copy without the symbol registry
  const clean: GltfDocument = {
    asset: doc.asset,
    scene: doc.scene,
    scenes: doc.scenes,
    nodes: doc.nodes,
    meshes: doc.meshes,
    materials: doc.materials,
    accessors: doc.accessors,
    bufferViews: doc.bufferViews,
    buffers: doc.buffers,
  }

  // Remove empty arrays for a cleaner output
  const out = clean as unknown as Record<string, unknown>
  if (clean.nodes.length === 0) delete out.nodes
  if (clean.meshes.length === 0) delete out.meshes
  if (clean.materials.length === 0) delete out.materials
  if (clean.accessors.length === 0) delete out.accessors
  if (clean.bufferViews.length === 0) delete out.bufferViews
  if (clean.buffers.length === 0) delete out.buffers

  return JSON.stringify(clean)
}

// ── 6. GLB Assembly ──────────────────────────────────────────────────

/** Create a GLB binary container.
 *  Format: 12-byte header + JSON chunk + BIN chunk.
 *  JSON chunk padded to 4-byte boundary with spaces (0x20).
 *  BIN chunk padded to 4-byte boundary with zeros. */
export function assembleGlb(jsonString: string, binaryBuffer: ArrayBuffer): ArrayBuffer {
  // Encode JSON to UTF-8
  const encoder = new TextEncoder()
  const jsonBytes = encoder.encode(jsonString)

  // Pad JSON to 4-byte boundary with spaces
  const jsonPaddedLength = alignTo4(jsonBytes.length)
  const jsonPadding = jsonPaddedLength - jsonBytes.length

  // Pad binary to 4-byte boundary with zeros
  const binPaddedLength = alignTo4(binaryBuffer.byteLength)
  const binPadding = binPaddedLength - binaryBuffer.byteLength

  // Total GLB size
  const totalLength = GLB_HEADER_SIZE
    + GLB_CHUNK_HEADER_SIZE + jsonPaddedLength
    + (binaryBuffer.byteLength > 0 ? GLB_CHUNK_HEADER_SIZE + binPaddedLength : 0)

  const glb = new ArrayBuffer(totalLength)
  const dataView = new DataView(glb)
  const byteArray = new Uint8Array(glb)
  let offset = 0

  // ── GLB Header (12 bytes) ──
  dataView.setUint32(offset, GLB_MAGIC, true)
  offset += 4
  dataView.setUint32(offset, GLB_VERSION, true)
  offset += 4
  dataView.setUint32(offset, totalLength, true)
  offset += 4

  // ── JSON Chunk ──
  dataView.setUint32(offset, jsonPaddedLength, true)
  offset += 4
  dataView.setUint32(offset, JSON_CHUNK_TYPE, true)
  offset += 4
  byteArray.set(jsonBytes, offset)
  offset += jsonBytes.length
  // Pad with spaces (0x20)
  for (let i = 0; i < jsonPadding; i++) {
    byteArray[offset++] = 0x20
  }

  // ── BIN Chunk (only if there's binary data) ──
  if (binaryBuffer.byteLength > 0) {
    dataView.setUint32(offset, binPaddedLength, true)
    offset += 4
    dataView.setUint32(offset, BIN_CHUNK_TYPE, true)
    offset += 4
    byteArray.set(new Uint8Array(binaryBuffer), offset)
    offset += binaryBuffer.byteLength
    // Pad with zeros (already zero-initialized, but explicit)
    for (let i = 0; i < binPadding; i++) {
      byteArray[offset++] = 0x00
    }
  }

  return glb
}

// ── 7. Screenshot Generation ─────────────────────────────────────────

/* v8 ignore start */

/** Capture a screenshot from a canvas element */
export function captureScreenshot(
  canvas: HTMLCanvasElement,
  options: ScreenshotOptions,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If dimensions differ from canvas, use an offscreen canvas
    let sourceCanvas: HTMLCanvasElement = canvas

    if (options.width !== canvas.width || options.height !== canvas.height) {
      const offscreen = document.createElement('canvas')
      offscreen.width = options.width
      offscreen.height = options.height
      const ctx = offscreen.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to create 2d context for screenshot'))
        return
      }
      ctx.drawImage(canvas, 0, 0, options.width, options.height)
      sourceCanvas = offscreen
    }

    const mimeType = `image/${options.format}`
    const quality = options.format === 'png' ? undefined : options.quality

    sourceCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob returned null'))
        }
      },
      mimeType,
      quality,
    )
  })
}

/* v8 ignore stop */

// ── 8. Video Recording ──────────────────────────────────────────────

/* v8 ignore start */

/** Start recording video from a canvas element.
 *  Returns a handle with a stop() method that resolves to the recorded Blob. */
export function startVideoRecording(
  canvas: HTMLCanvasElement,
  options: VideoRecordingOptions,
): { stop: () => Promise<Blob>; recorder: MediaRecorder } {
  const stream = canvas.captureStream(options.fps)

  const mimeType = options.format === 'webm' ? 'video/webm' : 'video/mp4'
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.bitrate,
  })

  const chunks: Blob[] = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  recorder.start()

  // Auto-stop after duration if specified
  let durationTimer: ReturnType<typeof setTimeout> | undefined
  if (options.duration > 0) {
    durationTimer = setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, options.duration * 1000)
  }

  const stop = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (durationTimer !== undefined) {
        clearTimeout(durationTimer)
      }

      if (recorder.state === 'inactive') {
        if (chunks.length > 0) {
          resolve(new Blob(chunks, { type: mimeType }))
        } else {
          reject(new Error('No video data recorded'))
        }
        return
      }

      recorder.onstop = () => {
        if (chunks.length > 0) {
          resolve(new Blob(chunks, { type: mimeType }))
        } else {
          reject(new Error('No video data recorded'))
        }
      }

      recorder.onerror = () => {
        reject(new Error('Video recording error'))
      }

      recorder.stop()
    })
  }

  return { stop, recorder }
}

/* v8 ignore stop */

// ── 9. Validation ────────────────────────────────────────────────────

/** Validate glTF export options, returning an array of error messages (empty = valid) */
export function validateGltfOptions(options: GltfExportOptions): string[] {
  const errors: string[] = []

  if (typeof options.binary !== 'boolean') {
    errors.push('binary must be a boolean')
  }

  if (typeof options.precision !== 'number' || options.precision < 3 || options.precision > 8) {
    errors.push('precision must be a number between 3 and 8')
  }

  if (!Number.isInteger(options.precision)) {
    errors.push('precision must be an integer')
  }

  return errors
}

/** Validate screenshot options, returning an array of error messages (empty = valid) */
export function validateScreenshotOptions(options: ScreenshotOptions): string[] {
  const errors: string[] = []

  if (typeof options.width !== 'number' || options.width < 1 || !Number.isInteger(options.width)) {
    errors.push('width must be a positive integer')
  }

  if (typeof options.height !== 'number' || options.height < 1 || !Number.isInteger(options.height)) {
    errors.push('height must be a positive integer')
  }

  if (options.width > 8192) {
    errors.push('width must not exceed 8192')
  }

  if (options.height > 8192) {
    errors.push('height must not exceed 8192')
  }

  const validFormats: string[] = ['png', 'jpeg', 'webp']
  if (!validFormats.includes(options.format)) {
    errors.push('format must be one of: png, jpeg, webp')
  }

  if (typeof options.quality !== 'number' || options.quality < 0 || options.quality > 1) {
    errors.push('quality must be a number between 0 and 1')
  }

  return errors
}

/** Validate video recording options, returning an array of error messages (empty = valid) */
export function validateVideoOptions(options: VideoRecordingOptions): string[] {
  const errors: string[] = []

  if (typeof options.width !== 'number' || options.width < 1 || options.width > 8192 || !Number.isInteger(options.width)) {
    errors.push('width must be a positive integer (max 8192)')
  }

  if (typeof options.height !== 'number' || options.height < 1 || options.height > 8192 || !Number.isInteger(options.height)) {
    errors.push('height must be a positive integer (max 8192)')
  }

  const validFps = [24, 30, 60]
  if (!validFps.includes(options.fps)) {
    errors.push('fps must be one of: 24, 30, 60')
  }

  const validFormats: string[] = ['webm', 'mp4']
  if (!validFormats.includes(options.format)) {
    errors.push('format must be one of: webm, mp4')
  }

  if (typeof options.bitrate !== 'number' || options.bitrate < 100000 || options.bitrate > 50000000) {
    errors.push('bitrate must be between 100000 and 50000000 bits per second')
  }

  if (typeof options.duration !== 'number' || options.duration < 0) {
    errors.push('duration must be a non-negative number')
  }

  return errors
}

// ── 10. Defaults ─────────────────────────────────────────────────────

export const DEFAULT_GLTF_OPTIONS: GltfExportOptions = {
  binary: true,
  embedTextures: true,
  includeAnimation: false,
  includeLights: false,
  includeCamera: false,
  precision: 5,
}

export const DEFAULT_SCREENSHOT_OPTIONS: ScreenshotOptions = {
  width: 1920,
  height: 1080,
  format: 'png',
  quality: 0.92,
  transparentBackground: false,
}

export const DEFAULT_VIDEO_OPTIONS: VideoRecordingOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  format: 'webm',
  bitrate: 5000000,
  duration: 0,
}

// ── 11. Utility ──────────────────────────────────────────────────────

/** Convert Euler angles (XYZ order, degrees) to a quaternion [x, y, z, w].
 *  Uses the same rotation order as Three.js default (intrinsic XYZ). */
export function eulerToQuaternion(rotation: Vec3): [number, number, number, number] {
  const halfX = (rotation.x * DEG2RAD) / 2
  const halfY = (rotation.y * DEG2RAD) / 2
  const halfZ = (rotation.z * DEG2RAD) / 2

  const cx = Math.cos(halfX)
  const sx = Math.sin(halfX)
  const cy = Math.cos(halfY)
  const sy = Math.sin(halfY)
  const cz = Math.cos(halfZ)
  const sz = Math.sin(halfZ)

  // Quaternion from intrinsic XYZ Euler
  const x = sx * cy * cz + cx * sy * sz
  const y = cx * sy * cz - sx * cy * sz
  const z = cx * cy * sz + sx * sy * cz
  const w = cx * cy * cz - sx * sy * sz

  return [x, y, z, w]
}

/** Format a byte count for human-readable display */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  let unitIndex = 0

  let value = bytes
  while (value >= k && unitIndex < units.length - 1) {
    value /= k
    unitIndex++
  }

  if (unitIndex === 0) {
    return `${Math.round(value)} B`
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/** Generate an export filename from a scene name and format extension.
 *  Sanitizes the scene name to be filesystem-safe. */
export function generateExportFileName(sceneName: string, format: string): string {
  const sanitized = sceneName
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')

  const name = sanitized || 'scene'

  // Sanitize format to only allow known safe extensions
  const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '') || 'glb'
  return `${name}.${safeFormat}`
}
