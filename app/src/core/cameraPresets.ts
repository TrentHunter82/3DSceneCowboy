/** Camera preset definitions and utilities */

import type { CameraPreset } from '../types/scene'

export const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front',       position: [0, 2, 10],   target: [0, 0, 0] },
  { name: 'Back',        position: [0, 2, -10],  target: [0, 0, 0] },
  { name: 'Top',         position: [0, 10, 0.01], target: [0, 0, 0] },
  { name: 'Right',       position: [10, 2, 0],   target: [0, 0, 0] },
  { name: 'Left',        position: [-10, 2, 0],  target: [0, 0, 0] },
  { name: 'Perspective', position: [5, 5, 5],    target: [0, 0, 0] },
]

export function findPreset(name: string): CameraPreset | undefined {
  return CAMERA_PRESETS.find(p => p.name === name)
}
