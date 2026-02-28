/** Camera path types for cinematic camera animation */

import type { Vec3 } from './scene'

/** A control point on a camera spline path */
export interface CameraPathPoint {
  id: string
  /** Position of the camera at this point */
  position: Vec3
  /** Where the camera looks at this point */
  target: Vec3
  /** Time in seconds when camera reaches this point */
  time: number
  /** Tension parameter for Catmull-Rom spline (0-1, default 0.5) */
  tension: number
}

/** Easing for camera path playback */
export type CameraPathEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

/** A complete camera path (sequence of control points) */
export interface CameraPath {
  id: string
  name: string
  points: CameraPathPoint[]
  duration: number         // total duration in seconds
  loop: boolean
  easing: CameraPathEasing
}

/** Playback state for camera path */
export type CameraPathPlaybackState = 'stopped' | 'playing' | 'paused'

/** A saved camera shot for previz/storyboarding */
export interface CameraShot {
  id: string
  name: string
  position: Vec3
  target: Vec3
  thumbnail?: string    // blob URL of screenshot
  createdAt: string     // ISO timestamp
  notes?: string        // optional storyboard notes
}
