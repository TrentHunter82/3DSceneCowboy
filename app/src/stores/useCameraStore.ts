import { create } from 'zustand'
import { findPreset } from '../core/cameraPresets'
import type CameraControlsImpl from 'camera-controls'
import type { CameraShot } from '../types/cameraPath'

let shotIdCounter = 1

function generateShotId(): string {
  return `shot_${Date.now()}_${shotIdCounter++}`
}

export function resetShotIdCounter(): void {
  shotIdCounter = 1
}

interface CameraState {
  activePreset: string | null
  controlsRef: CameraControlsImpl | null

  // Shots
  shots: CameraShot[]
  activeShotId: string | null

  // Actions - camera
  setControlsRef: (ref: CameraControlsImpl | null) => void
  goToPreset: (presetName: string) => void
  resetCamera: () => void

  // Actions - shots
  captureShot: (name?: string) => string | null
  removeShot: (id: string) => void
  updateShot: (id: string, updates: Partial<Pick<CameraShot, 'name' | 'notes'>>) => void
  goToShot: (id: string) => void
  reorderShots: (fromIndex: number, toIndex: number) => void
  setShotThumbnail: (id: string, blobUrl: string) => void
  loadShots: (shots: CameraShot[]) => void
  clearShots: () => void
}

export const useCameraStore = create<CameraState>((set, get) => ({
  activePreset: null,
  controlsRef: null,
  shots: [],
  activeShotId: null,

  setControlsRef: (ref) => set({ controlsRef: ref }),

  goToPreset: (presetName: string) => {
    const { controlsRef } = get()
    if (!controlsRef) return

    const preset = findPreset(presetName)
    if (!preset) return

    const [px, py, pz] = preset.position
    const [tx, ty, tz] = preset.target

    controlsRef.normalizeRotations()
    controlsRef.setLookAt(px, py, pz, tx, ty, tz, true)

    set({ activePreset: presetName })
  },

  resetCamera: () => {
    const { controlsRef } = get()
    if (!controlsRef) return

    controlsRef.normalizeRotations()
    controlsRef.setLookAt(5, 5, 5, 0, 0, 0, true)

    set({ activePreset: null })
  },

  // ── Shot actions ─────────────────────────────────────────────────

  captureShot: (name?: string) => {
    const { controlsRef, shots } = get()
    if (!controlsRef) return null

    // Read current camera position and target
    const pos = { x: 0, y: 0, z: 0 }
    const tgt = { x: 0, y: 0, z: 0 }

    // camera-controls stores position/target internally
    const camera = controlsRef.camera
    if (camera) {
      pos.x = camera.position.x
      pos.y = camera.position.y
      pos.z = camera.position.z
    }

    // Get the target from camera-controls
    const target = controlsRef.getTarget({ x: 0, y: 0, z: 0 } as unknown as THREE.Vector3)
    if (target) {
      tgt.x = target.x
      tgt.y = target.y
      tgt.z = target.z
    }

    const shotName = name || `Shot ${shots.length + 1}`
    const id = generateShotId()

    const shot: CameraShot = {
      id,
      name: shotName,
      position: pos,
      target: tgt,
      createdAt: new Date().toISOString(),
    }

    set({
      shots: [...shots, shot],
      activeShotId: id,
    })

    return id
  },

  removeShot: (id: string) => {
    const { shots, activeShotId } = get()
    const oldUrl = shots.find(s => s.id === id)?.thumbnail
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl)
    }
    set({
      shots: shots.filter(s => s.id !== id),
      activeShotId: activeShotId === id ? null : activeShotId,
    })
  },

  updateShot: (id: string, updates: Partial<Pick<CameraShot, 'name' | 'notes'>>) => {
    set({
      shots: get().shots.map(s =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    })
  },

  goToShot: (id: string) => {
    const { controlsRef, shots } = get()
    if (!controlsRef) return

    const shot = shots.find(s => s.id === id)
    if (!shot) return

    controlsRef.normalizeRotations()
    controlsRef.setLookAt(
      shot.position.x, shot.position.y, shot.position.z,
      shot.target.x, shot.target.y, shot.target.z,
      true, // smooth transition
    )

    set({ activeShotId: id, activePreset: null })
  },

  reorderShots: (fromIndex: number, toIndex: number) => {
    const { shots } = get()
    if (fromIndex < 0 || fromIndex >= shots.length) return
    if (toIndex < 0 || toIndex >= shots.length) return

    const newShots = [...shots]
    const [moved] = newShots.splice(fromIndex, 1)
    newShots.splice(toIndex, 0, moved)
    set({ shots: newShots })
  },

  setShotThumbnail: (id: string, blobUrl: string) => {
    set({
      shots: get().shots.map(s => {
        if (s.id !== id) return s
        // Revoke old thumbnail blob URL
        if (s.thumbnail && s.thumbnail.startsWith('blob:')) {
          URL.revokeObjectURL(s.thumbnail)
        }
        return { ...s, thumbnail: blobUrl }
      }),
    })
  },

  loadShots: (shots: CameraShot[]) => {
    set({ shots, activeShotId: null })
  },

  clearShots: () => {
    // Revoke all thumbnail blob URLs
    for (const shot of get().shots) {
      if (shot.thumbnail && shot.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(shot.thumbnail)
      }
    }
    set({ shots: [], activeShotId: null })
  },
}))

// THREE import for type compatibility with camera-controls
import * as THREE from 'three'
