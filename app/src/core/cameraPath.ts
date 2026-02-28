/** Pure functions for camera path spline interpolation and management */

import type { Vec3 } from '../types/scene'

// ── Types ───────────────────────────────────────────────────────────

export interface CameraPathPoint {
  id: string
  position: Vec3
  lookAt: Vec3
  fov: number           // field of view in degrees (1-179)
  time: number           // time in seconds along path
}

export interface CameraPath {
  id: string
  name: string
  points: CameraPathPoint[]
  duration: number       // total duration in seconds
  loop: boolean
  tension: number        // Catmull-Rom tension (0-1, 0.5 default)
}

export interface CameraPathState {
  position: Vec3
  lookAt: Vec3
  fov: number
}

// ── ID Generation ────────────────────────────────────────────────────

let pathIdCounter = 0
let pointIdCounter = 0

export function generatePathId(): string {
  return `cpath_${++pathIdCounter}`
}

export function generatePointId(): string {
  return `cpt_${++pointIdCounter}`
}

export function resetPathIdCounters(): void {
  pathIdCounter = 0
  pointIdCounter = 0
}

// ── Utility ─────────────────────────────────────────────────────────

/** Linear interpolation between two numbers */
export function lerpValue(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Linear interpolation between two Vec3 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/** Euclidean distance between two Vec3 */
export function distanceVec3(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// ── Catmull-Rom Spline ──────────────────────────────────────────────

/**
 * Evaluate a Catmull-Rom spline for a single value using Hermite basis.
 * p0, p1, p2, p3 are four control points; t is [0,1] between p1 and p2.
 * tension: 0 = standard Catmull-Rom, 1 = no curvature (linear between p1 and p2).
 */
export function catmullRom(
  p0: number, p1: number, p2: number, p3: number,
  t: number, tension: number = 0.5,
): number {
  const m0 = (1 - tension) * (p2 - p0) / 2
  const m1 = (1 - tension) * (p3 - p1) / 2
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  return h00 * p1 + h10 * m0 + h01 * p2 + h11 * m1
}

/** Catmull-Rom interpolation for Vec3 */
export function catmullRomVec3(
  p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3,
  t: number, tension: number = 0.5,
): Vec3 {
  return {
    x: catmullRom(p0.x, p1.x, p2.x, p3.x, t, tension),
    y: catmullRom(p0.y, p1.y, p2.y, p3.y, t, tension),
    z: catmullRom(p0.z, p1.z, p2.z, p3.z, t, tension),
  }
}

// ── Segment Lookup ──────────────────────────────────────────────────

/**
 * Find which segment a time falls in and the local t within that segment.
 * Points must have at least 2 entries and be sorted by time.
 */
export function getSegmentIndex(
  points: CameraPathPoint[],
  time: number,
): { segIndex: number; localT: number } {
  if (points.length < 2) {
    return { segIndex: 0, localT: 0 }
  }

  const firstTime = points[0].time
  const lastTime = points[points.length - 1].time

  // Before or at start
  if (time <= firstTime) {
    return { segIndex: 0, localT: 0 }
  }

  // At or after end
  if (time >= lastTime) {
    return { segIndex: points.length - 2, localT: 1 }
  }

  // Find the segment
  for (let i = 0; i < points.length - 1; i++) {
    if (time >= points[i].time && time <= points[i + 1].time) {
      const span = points[i + 1].time - points[i].time
      const localT = span > 0 ? (time - points[i].time) / span : 0
      return { segIndex: i, localT }
    }
  }

  // Fallback (should not reach here for valid input)
  return { segIndex: points.length - 2, localT: 1 }
}

// ── Path Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate camera state at a given time along the path.
 * Supports looping: if path.loop is true, time wraps around duration.
 */
export function evaluatePath(path: CameraPath, time: number): CameraPathState {
  const { points, tension, loop, duration } = path

  // No points: return default
  if (points.length === 0) {
    return {
      position: { x: 0, y: 0, z: 0 },
      lookAt: { x: 0, y: 0, z: 0 },
      fov: 60,
    }
  }

  // Single point: return it directly
  if (points.length === 1) {
    return {
      position: { ...points[0].position },
      lookAt: { ...points[0].lookAt },
      fov: points[0].fov,
    }
  }

  // Handle looping
  let effectiveTime = time
  if (loop && duration > 0) {
    effectiveTime = ((time % duration) + duration) % duration
  }

  // Clamp time
  const firstTime = points[0].time
  const lastTime = points[points.length - 1].time
  const clampedTime = Math.max(firstTime, Math.min(lastTime, effectiveTime))

  // Find segment
  const { segIndex, localT } = getSegmentIndex(points, clampedTime)

  const p1 = points[segIndex]
  const p2 = points[segIndex + 1]

  // Get surrounding control points (clamped at boundaries, or wrapped for loops)
  let p0: CameraPathPoint
  let p3: CameraPathPoint

  if (loop) {
    p0 = segIndex > 0 ? points[segIndex - 1] : points[points.length - 1]
    p3 = segIndex + 2 < points.length ? points[segIndex + 2] : points[0]
  } else {
    p0 = points[Math.max(0, segIndex - 1)]
    p3 = points[Math.min(points.length - 1, segIndex + 2)]
  }

  return {
    position: catmullRomVec3(p0.position, p1.position, p2.position, p3.position, localT, tension),
    lookAt: catmullRomVec3(p0.lookAt, p1.lookAt, p2.lookAt, p3.lookAt, localT, tension),
    fov: catmullRom(p0.fov, p1.fov, p2.fov, p3.fov, localT, tension),
  }
}

// ── Path Operations ─────────────────────────────────────────────────

/** Create a new empty camera path with defaults */
export function createCameraPath(name: string): CameraPath {
  return {
    id: generatePathId(),
    name,
    points: [],
    duration: 5,
    loop: false,
    tension: 0.5,
  }
}

/** Add a point to the path (assigns a unique id). Returns a new path. */
export function addPathPoint(
  path: CameraPath,
  point: Omit<CameraPathPoint, 'id'>,
): CameraPath {
  const newPoint: CameraPathPoint = {
    ...point,
    id: generatePointId(),
  }
  return {
    ...path,
    points: [...path.points, newPoint],
  }
}

/** Remove a point by id. Returns a new path. */
export function removePathPoint(path: CameraPath, pointId: string): CameraPath {
  return {
    ...path,
    points: path.points.filter(p => p.id !== pointId),
  }
}

/** Update specific fields on a point. Returns a new path. */
export function updatePathPoint(
  path: CameraPath,
  pointId: string,
  updates: Partial<CameraPathPoint>,
): CameraPath {
  return {
    ...path,
    points: path.points.map(p =>
      p.id === pointId ? { ...p, ...updates } : p,
    ),
  }
}

/** Sort points by time (ascending). Returns a new path. */
export function reorderPathPoints(path: CameraPath): CameraPath {
  return {
    ...path,
    points: [...path.points].sort((a, b) => a.time - b.time),
  }
}

// ── Path Analysis ───────────────────────────────────────────────────

/**
 * Approximate the total length of the camera position path by sampling.
 * Default 50 samples for a good balance of accuracy and speed.
 */
export function getPathLength(path: CameraPath, samples: number = 50): number {
  if (path.points.length < 2) return 0

  const firstTime = path.points[0].time
  const lastTime = path.points[path.points.length - 1].time
  if (firstTime >= lastTime) return 0

  let totalLength = 0
  let prev = evaluatePath(path, firstTime)

  for (let i = 1; i <= samples; i++) {
    const t = firstTime + (lastTime - firstTime) * (i / samples)
    const curr = evaluatePath(path, t)
    totalLength += distanceVec3(prev.position, curr.position)
    prev = curr
  }

  return totalLength
}

/** Get the total duration from the latest point time */
export function getPathDuration(path: CameraPath): number {
  if (path.points.length === 0) return 0
  return Math.max(...path.points.map(p => p.time))
}

/** Sample the path at evenly-spaced time intervals */
export function samplePath(path: CameraPath, numSamples: number): CameraPathState[] {
  if (numSamples < 1 || path.points.length === 0) return []

  if (numSamples === 1) {
    return [evaluatePath(path, path.points[0].time)]
  }

  const firstTime = path.points[0].time
  const lastTime = path.points[path.points.length - 1].time
  const results: CameraPathState[] = []

  for (let i = 0; i < numSamples; i++) {
    const t = firstTime + (lastTime - firstTime) * (i / (numSamples - 1))
    results.push(evaluatePath(path, t))
  }

  return results
}

// ── Validation ──────────────────────────────────────────────────────

/** Validate a single path point. Returns an array of error strings. */
export function validatePathPoint(point: CameraPathPoint): string[] {
  const errors: string[] = []

  if (point.fov < 1 || point.fov > 179) {
    errors.push('FOV must be between 1 and 179 degrees')
  }

  if (point.time < 0) {
    errors.push('Time must not be negative')
  }

  if (!point.id || point.id.trim() === '') {
    errors.push('Point must have a non-empty id')
  }

  return errors
}

/** Validate a camera path. Returns an array of error strings. */
export function validateCameraPath(path: CameraPath): string[] {
  const errors: string[] = []

  if (path.points.length < 2) {
    errors.push('Path must have at least 2 points')
  }

  if (path.duration <= 0) {
    errors.push('Duration must be positive')
  }

  if (path.tension < 0 || path.tension > 1) {
    errors.push('Tension must be between 0 and 1')
  }

  if (!path.name || path.name.trim() === '') {
    errors.push('Path must have a non-empty name')
  }

  // Validate individual points
  for (const point of path.points) {
    const pointErrors = validatePathPoint(point)
    for (const err of pointErrors) {
      errors.push(`Point ${point.id}: ${err}`)
    }
  }

  // Check time ordering
  for (let i = 1; i < path.points.length; i++) {
    if (path.points[i].time < path.points[i - 1].time) {
      errors.push('Points must be ordered by time')
      break
    }
  }

  return errors
}

// ── Vec3 Helpers (local) ───────────────────────────────────────────

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (len === 0) return { x: 0, y: 0, z: 1 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

// ── Cinematic Camera Animations ────────────────────────────────────

/**
 * Dolly: Move camera forward/backward along its look direction.
 * Positive amount = move toward target, negative = move away.
 * Returns new position; lookAt stays the same.
 */
export function dolly(
  position: Vec3,
  lookAt: Vec3,
  amount: number,
): Vec3 {
  const dir = normalizeVec3(subtractVec3(lookAt, position))
  return addVec3(position, scaleVec3(dir, amount))
}

/**
 * Truck: Move camera left/right perpendicular to look direction.
 * Positive amount = move right, negative = move left.
 * Both position and lookAt are shifted by the same offset.
 */
export function truck(
  position: Vec3,
  lookAt: Vec3,
  amount: number,
): { position: Vec3; lookAt: Vec3 } {
  const forward = normalizeVec3(subtractVec3(lookAt, position))
  const worldUp: Vec3 = { x: 0, y: 1, z: 0 }
  const right = normalizeVec3(crossVec3(forward, worldUp))
  const offset = scaleVec3(right, amount)
  return {
    position: addVec3(position, offset),
    lookAt: addVec3(lookAt, offset),
  }
}

/**
 * Pedestal: Move camera up/down.
 * Positive amount = move up, negative = move down.
 * Both position and lookAt are shifted by the same offset.
 */
export function pedestal(
  position: Vec3,
  lookAt: Vec3,
  amount: number,
): { position: Vec3; lookAt: Vec3 } {
  const offset: Vec3 = { x: 0, y: amount, z: 0 }
  return {
    position: addVec3(position, offset),
    lookAt: addVec3(lookAt, offset),
  }
}

/**
 * Orbit: Rotate camera around a target point on XZ plane.
 * angleDelta is in radians. Positive = counter-clockwise from above.
 * Camera maintains its current distance and Y offset from target.
 */
export function orbit(
  position: Vec3,
  target: Vec3,
  angleDelta: number,
): Vec3 {
  const offset = subtractVec3(position, target)
  const cosA = Math.cos(angleDelta)
  const sinA = Math.sin(angleDelta)
  return {
    x: target.x + offset.x * cosA - offset.z * sinA,
    y: position.y,
    z: target.z + offset.x * sinA + offset.z * cosA,
  }
}

/**
 * Orbit3D: Rotate camera around a target in arbitrary axis.
 * Returns new position while maintaining distance from target.
 */
export function orbit3D(
  position: Vec3,
  target: Vec3,
  yawDelta: number,
  pitchDelta: number,
): Vec3 {
  const offset = subtractVec3(position, target)
  const dist = Math.sqrt(offset.x * offset.x + offset.y * offset.y + offset.z * offset.z)
  if (dist === 0) return { ...position }

  // Current spherical coordinates
  let theta = Math.atan2(offset.x, offset.z) // yaw
  let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / dist))) // pitch from top

  // Apply deltas
  theta += yawDelta
  phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi + pitchDelta))

  // Convert back to cartesian
  return {
    x: target.x + dist * Math.sin(phi) * Math.sin(theta),
    y: target.y + dist * Math.cos(phi),
    z: target.z + dist * Math.sin(phi) * Math.cos(theta),
  }
}

/**
 * Generate a circular orbit camera path around a target.
 * Creates evenly-spaced points in a circle on the XZ plane.
 */
export function generateOrbitPath(
  target: Vec3,
  radius: number,
  height: number,
  numPoints: number,
  duration: number,
  fov: number = 60,
): CameraPath {
  const path = createCameraPath('Orbit')
  const points: CameraPathPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    points.push({
      id: generatePointId(),
      position: {
        x: target.x + radius * Math.sin(angle),
        y: target.y + height,
        z: target.z + radius * Math.cos(angle),
      },
      lookAt: { ...target },
      fov,
      time: (i / numPoints) * duration,
    })
  }

  return {
    ...path,
    points,
    duration,
    loop: true,
  }
}

/**
 * Generate a dolly zoom (Vertigo effect) path.
 * Camera moves backward while FOV increases to keep subject the same size.
 */
export function generateDollyZoomPath(
  startPosition: Vec3,
  target: Vec3,
  startFov: number,
  endFov: number,
  numPoints: number,
  duration: number,
): CameraPath {
  const path = createCameraPath('Dolly Zoom')
  const startDist = distanceVec3(startPosition, target)
  const dir = normalizeVec3(subtractVec3(startPosition, target))
  const points: CameraPathPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    const fov = startFov + (endFov - startFov) * t
    // Adjust distance to maintain apparent subject size:
    // distance proportional to 1/tan(fov/2)
    const startTan = Math.tan((startFov * Math.PI) / 360)
    const currentTan = Math.tan((fov * Math.PI) / 360)
    const dist = startTan > 0 ? startDist * (startTan / currentTan) : startDist

    points.push({
      id: generatePointId(),
      position: addVec3(target, scaleVec3(dir, dist)),
      lookAt: { ...target },
      fov,
      time: t * duration,
    })
  }

  return {
    ...path,
    points,
    duration,
    loop: false,
  }
}

/**
 * Generate a fly-through path from start to end position.
 * Intermediate points are linearly interpolated with optional height arc.
 */
export function generateFlyThroughPath(
  startPosition: Vec3,
  endPosition: Vec3,
  startLookAt: Vec3,
  endLookAt: Vec3,
  arcHeight: number,
  numPoints: number,
  duration: number,
  fov: number = 60,
): CameraPath {
  const path = createCameraPath('Fly Through')
  const points: CameraPathPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    const pos = lerpVec3(startPosition, endPosition, t)
    // Add parabolic arc for height
    const arc = 4 * arcHeight * t * (1 - t)
    pos.y += arc

    points.push({
      id: generatePointId(),
      position: pos,
      lookAt: lerpVec3(startLookAt, endLookAt, t),
      fov,
      time: t * duration,
    })
  }

  return {
    ...path,
    points,
    duration,
    loop: false,
  }
}
