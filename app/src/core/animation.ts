/** Pure functions for animation interpolation and keyframe operations */

import type { Vec3, AnimationKeyframe, AnimationTrack, EasingType, AnimatableProperty } from '../types/scene'

// ── Camera Track Constants ────────────────────────────────────────────

/** Virtual object ID used for the camera animation track */
export const CAMERA_TRACK_OBJECT_ID = '__camera__'

/** Check whether a track is a camera track */
export function isCameraTrack(track: AnimationTrack): boolean {
  return track.objectId === CAMERA_TRACK_OBJECT_ID
}

/** Properties iterated for camera tracks */
const CAMERA_PROPERTIES: readonly AnimatableProperty[] = ['cameraPosition', 'cameraTarget']

/** Properties iterated for object tracks */
const OBJECT_PROPERTIES: readonly AnimatableProperty[] = ['position', 'rotation', 'scale']

// ── Easing Functions ─────────────────────────────────────────────────

export function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'easeIn':
      return t * t
    case 'easeOut':
      return t * (2 - t)
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'linear':
      return t
  }
}

// ── Vec3 Interpolation ──────────────────────────────────────────────

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

// ── Keyframe Interpolation ──────────────────────────────────────────

/**
 * Interpolate a value at the given time from a sorted array of keyframes
 * for a single property. Returns null if no keyframes exist.
 */
export function interpolateKeyframes(
  keyframes: AnimationKeyframe[],
  time: number,
): Vec3 | null {
  if (keyframes.length === 0) return null
  if (keyframes.length === 1) return { ...keyframes[0].value }

  // Before first keyframe
  if (time <= keyframes[0].time) return { ...keyframes[0].value }

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return { ...keyframes[keyframes.length - 1].value }
  }

  // Find surrounding keyframes
  let i = 0
  while (i < keyframes.length - 1 && keyframes[i + 1].time < time) i++

  const kfA = keyframes[i]
  const kfB = keyframes[i + 1]

  // Guard against division by zero when keyframes share the same time
  const span = kfB.time - kfA.time
  if (span === 0) return { ...kfB.value }

  const rawT = (time - kfA.time) / span
  const easedT = applyEasing(rawT, kfB.easing)

  return lerpVec3(kfA.value, kfB.value, easedT)
}

// ── Track Helpers ───────────────────────────────────────────────────

/**
 * Get keyframes for a specific property from a track, sorted by time.
 */
export function getPropertyKeyframes(
  track: AnimationTrack,
  property: AnimationKeyframe['property'],
): AnimationKeyframe[] {
  return track.keyframes
    .filter(kf => kf.property === property)
    .sort((a, b) => a.time - b.time)
}

/**
 * Evaluate all animated properties for a track at a given time.
 * Returns an object with position/rotation/scale (object tracks) or
 * cameraPosition/cameraTarget (camera tracks) if they have keyframes.
 */
export function evaluateTrack(
  track: AnimationTrack,
  time: number,
): Partial<Record<AnimatableProperty, Vec3>> {
  const result: Partial<Record<AnimatableProperty, Vec3>> = {}

  const properties = isCameraTrack(track) ? CAMERA_PROPERTIES : OBJECT_PROPERTIES

  for (const property of properties) {
    const keyframes = getPropertyKeyframes(track, property)
    const value = interpolateKeyframes(keyframes, time)
    if (value) {
      result[property] = value
    }
  }

  return result
}

// ── Keyframe ID Generation ──────────────────────────────────────────

let nextKfId = 1

export function generateKeyframeId(): string {
  return `kf_${Date.now()}_${nextKfId++}`
}

export function generateTrackId(): string {
  return `track_${Date.now()}_${nextKfId++}`
}

export function resetKeyframeIdCounter(): void {
  nextKfId = 1
}
