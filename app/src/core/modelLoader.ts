/** Multi-format 3D model loader utility */

export type SupportedModelFormat = 'gltf' | 'glb' | 'fbx' | 'obj' | 'dae'

const FORMAT_EXTENSIONS: Record<string, SupportedModelFormat> = {
  '.gltf': 'gltf',
  '.glb': 'glb',
  '.fbx': 'fbx',
  '.obj': 'obj',
  '.dae': 'dae',
}

/** Detect model format from filename extension */
export function detectModelFormat(filename: string): SupportedModelFormat | null {
  const lower = filename.toLowerCase()
  for (const [ext, format] of Object.entries(FORMAT_EXTENSIONS)) {
    if (lower.endsWith(ext)) return format
  }
  return null
}

/** Get all supported file extensions */
export function getSupportedExtensions(): string[] {
  return Object.keys(FORMAT_EXTENSIONS)
}

/** Get accept string for file input elements */
export function getAcceptString(): string {
  return Object.keys(FORMAT_EXTENSIONS).join(',')
}

/** Check if a format uses the GLTF loader path (drei useGLTF) */
export function isGltfFormat(format: SupportedModelFormat): boolean {
  return format === 'gltf' || format === 'glb'
}
