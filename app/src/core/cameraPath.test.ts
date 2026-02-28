import { describe, it, expect, beforeEach } from 'vitest'
import type { Vec3 } from '../types/scene'
import {
  catmullRom,
  catmullRomVec3,
  evaluatePath,
  getSegmentIndex,
  createCameraPath,
  addPathPoint,
  removePathPoint,
  updatePathPoint,
  reorderPathPoints,
  getPathLength,
  getPathDuration,
  samplePath,
  validateCameraPath,
  validatePathPoint,
  lerpValue,
  lerpVec3,
  distanceVec3,
  resetPathIdCounters,
} from './cameraPath'
import type { CameraPath, CameraPathPoint, CameraPathState } from './cameraPath'

// ── Helpers ─────────────────────────────────────────────────────────

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

function makePoint(
  id: string,
  position: Vec3,
  lookAt: Vec3,
  fov: number,
  time: number,
): CameraPathPoint {
  return { id, position, lookAt, fov, time }
}

function makePath(
  points: CameraPathPoint[],
  overrides: Partial<CameraPath> = {},
): CameraPath {
  return {
    id: 'path_test',
    name: 'Test Path',
    points,
    duration: points.length > 0 ? Math.max(...points.map(p => p.time)) : 5,
    loop: false,
    tension: 0.5,
    ...overrides,
  }
}

/** Create a simple linear 4-point path along the X axis */
function makeLinearPath(): CameraPath {
  return makePath([
    makePoint('p0', vec3(0, 0, 0), vec3(0, 0, -1), 60, 0),
    makePoint('p1', vec3(10, 0, 0), vec3(0, 0, -1), 60, 1),
    makePoint('p2', vec3(20, 0, 0), vec3(0, 0, -1), 60, 2),
    makePoint('p3', vec3(30, 0, 0), vec3(0, 0, -1), 60, 3),
  ])
}

beforeEach(() => {
  resetPathIdCounters()
})

// ── catmullRom (scalar) ─────────────────────────────────────────────

describe('catmullRom', () => {
  it('returns p1 when t=0', () => {
    expect(catmullRom(0, 10, 20, 30, 0, 0.5)).toBeCloseTo(10, 5)
  })

  it('returns p2 when t=1', () => {
    expect(catmullRom(0, 10, 20, 30, 1, 0.5)).toBeCloseTo(20, 5)
  })

  it('interpolates linearly for evenly spaced points at t=0.5', () => {
    // With evenly spaced collinear points, CR should give linear result
    const result = catmullRom(0, 10, 20, 30, 0.5, 0.5)
    expect(result).toBeCloseTo(15, 1)
  })

  it('produces a curve for non-uniform points', () => {
    // p0=0, p1=0, p2=10, p3=10: midpoint should be around 5 but curved
    const result = catmullRom(0, 0, 10, 10, 0.5, 0.5)
    expect(result).toBeCloseTo(5, 0)
  })

  it('with tension=1, result collapses toward linear between p1 and p2', () => {
    // tension=1 => s=0, all derivative terms vanish => pure 2*p1 at t=0, blended to p2 at t=1
    // At tension=1, s = (1-1)/2 = 0, so only (2*p1) * hermite basis remains
    // catmullRom = 2*p1 + 0 + 0 + 0 = 2*p1 only at t=0
    const at0 = catmullRom(0, 5, 15, 20, 0, 1)
    expect(at0).toBeCloseTo(5, 5) // returns p1
  })
})

// ── catmullRomVec3 ──────────────────────────────────────────────────

describe('catmullRomVec3', () => {
  it('returns p1 when t=0', () => {
    const result = catmullRomVec3(
      vec3(0, 0, 0), vec3(1, 2, 3), vec3(4, 5, 6), vec3(7, 8, 9),
      0, 0.5,
    )
    expect(result.x).toBeCloseTo(1, 5)
    expect(result.y).toBeCloseTo(2, 5)
    expect(result.z).toBeCloseTo(3, 5)
  })

  it('returns p2 when t=1', () => {
    const result = catmullRomVec3(
      vec3(0, 0, 0), vec3(1, 2, 3), vec3(4, 5, 6), vec3(7, 8, 9),
      1, 0.5,
    )
    expect(result.x).toBeCloseTo(4, 5)
    expect(result.y).toBeCloseTo(5, 5)
    expect(result.z).toBeCloseTo(6, 5)
  })

  it('interpolates all three axes', () => {
    const result = catmullRomVec3(
      vec3(0, 0, 0), vec3(10, 20, 30), vec3(20, 40, 60), vec3(30, 60, 90),
      0.5, 0.5,
    )
    expect(result.x).toBeCloseTo(15, 0)
    expect(result.y).toBeCloseTo(30, 0)
    expect(result.z).toBeCloseTo(45, 0)
  })
})

// ── getSegmentIndex ─────────────────────────────────────────────────

describe('getSegmentIndex', () => {
  const points = [
    makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
    makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 1),
    makePoint('c', vec3(2, 0, 0), vec3(0, 0, 0), 60, 2),
    makePoint('d', vec3(3, 0, 0), vec3(0, 0, 0), 60, 3),
  ]

  it('returns segment 0, localT=0 for time at start', () => {
    const { segIndex, localT } = getSegmentIndex(points, 0)
    expect(segIndex).toBe(0)
    expect(localT).toBeCloseTo(0)
  })

  it('returns last segment, localT=1 for time at end', () => {
    const { segIndex, localT } = getSegmentIndex(points, 3)
    expect(segIndex).toBe(2)
    expect(localT).toBeCloseTo(1)
  })

  it('returns segment 0, localT=0.5 for time=0.5', () => {
    const { segIndex, localT } = getSegmentIndex(points, 0.5)
    expect(segIndex).toBe(0)
    expect(localT).toBeCloseTo(0.5)
  })

  it('returns segment 1 for time=1.5', () => {
    const { segIndex, localT } = getSegmentIndex(points, 1.5)
    expect(segIndex).toBe(1)
    expect(localT).toBeCloseTo(0.5)
  })

  it('clamps time before start to segment 0', () => {
    const { segIndex, localT } = getSegmentIndex(points, -1)
    expect(segIndex).toBe(0)
    expect(localT).toBe(0)
  })

  it('clamps time after end to last segment', () => {
    const { segIndex, localT } = getSegmentIndex(points, 10)
    expect(segIndex).toBe(2)
    expect(localT).toBe(1)
  })

  it('returns segIndex 0 and localT 0 for single point', () => {
    const single = [makePoint('x', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0)]
    const { segIndex, localT } = getSegmentIndex(single, 0)
    expect(segIndex).toBe(0)
    expect(localT).toBe(0)
  })
})

// ── evaluatePath ────────────────────────────────────────────────────

describe('evaluatePath', () => {
  it('returns default state for empty path', () => {
    const path = makePath([])
    const state = evaluatePath(path, 0)
    expect(state.position).toEqual(vec3(0, 0, 0))
    expect(state.lookAt).toEqual(vec3(0, 0, 0))
    expect(state.fov).toBe(60)
  })

  it('returns the single point for a one-point path', () => {
    const path = makePath([
      makePoint('p1', vec3(5, 10, 15), vec3(1, 2, 3), 90, 0),
    ])
    const state = evaluatePath(path, 0)
    expect(state.position).toEqual(vec3(5, 10, 15))
    expect(state.lookAt).toEqual(vec3(1, 2, 3))
    expect(state.fov).toBe(90)
  })

  it('returns start point state at path start time', () => {
    const path = makeLinearPath()
    const state = evaluatePath(path, 0)
    expect(state.position.x).toBeCloseTo(0, 1)
    expect(state.fov).toBeCloseTo(60, 1)
  })

  it('returns end point state at path end time', () => {
    const path = makeLinearPath()
    const state = evaluatePath(path, 3)
    expect(state.position.x).toBeCloseTo(30, 1)
  })

  it('interpolates smoothly between points', () => {
    const path = makeLinearPath()
    const state = evaluatePath(path, 1.5)
    // For evenly spaced collinear points, mid-segment should be around 15
    expect(state.position.x).toBeCloseTo(15, 0)
    expect(state.position.y).toBeCloseTo(0, 1)
    expect(state.position.z).toBeCloseTo(0, 1)
  })

  it('interpolates FOV between points with different FOVs', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, -1), 30, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, -1), 90, 1),
      makePoint('c', vec3(20, 0, 0), vec3(0, 0, -1), 150, 2),
      makePoint('d', vec3(30, 0, 0), vec3(0, 0, -1), 90, 3),
    ])
    const state = evaluatePath(path, 1)
    expect(state.fov).toBeCloseTo(90, 0)
  })

  it('clamps time before first point', () => {
    const path = makeLinearPath()
    const state = evaluatePath(path, -5)
    expect(state.position.x).toBeCloseTo(0, 1)
  })

  it('clamps time after last point', () => {
    const path = makeLinearPath()
    const state = evaluatePath(path, 100)
    expect(state.position.x).toBeCloseTo(30, 1)
  })

  it('handles two-point path (linear interpolation)', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, -1), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, -1), 60, 1),
    ])
    const state = evaluatePath(path, 0.5)
    expect(state.position.x).toBeCloseTo(5, 0)
  })
})

// ── evaluatePath with loop ──────────────────────────────────────────

describe('evaluatePath with loop', () => {
  it('wraps time around duration', () => {
    const path = makePath(
      [
        makePoint('a', vec3(0, 0, 0), vec3(0, 0, -1), 60, 0),
        makePoint('b', vec3(10, 0, 0), vec3(0, 0, -1), 60, 1),
        makePoint('c', vec3(20, 0, 0), vec3(0, 0, -1), 60, 2),
        makePoint('d', vec3(30, 0, 0), vec3(0, 0, -1), 60, 3),
      ],
      { loop: true, duration: 3 },
    )
    // time=3 should wrap to 0
    const stateAt0 = evaluatePath(path, 0)
    const stateAt3 = evaluatePath(path, 3)
    // Both should be at the start due to wrapping (3 % 3 = 0)
    expect(stateAt3.position.x).toBeCloseTo(stateAt0.position.x, 1)
  })

  it('handles negative time with loop', () => {
    const path = makePath(
      [
        makePoint('a', vec3(0, 0, 0), vec3(0, 0, -1), 60, 0),
        makePoint('b', vec3(10, 0, 0), vec3(0, 0, -1), 60, 1),
        makePoint('c', vec3(20, 0, 0), vec3(0, 0, -1), 60, 2),
      ],
      { loop: true, duration: 2 },
    )
    // time=-1 should wrap to 1 ((-1 % 2) + 2) % 2 = 1
    const state = evaluatePath(path, -1)
    const stateAt1 = evaluatePath(path, 1)
    expect(state.position.x).toBeCloseTo(stateAt1.position.x, 1)
  })

  it('uses wrapped boundary points for Catmull-Rom in loop mode', () => {
    // In loop mode, the control points at boundaries should wrap around
    const path = makePath(
      [
        makePoint('a', vec3(0, 5, 0), vec3(0, 0, -1), 60, 0),
        makePoint('b', vec3(10, 0, 0), vec3(0, 0, -1), 60, 1),
        makePoint('c', vec3(0, -5, 0), vec3(0, 0, -1), 60, 2),
      ],
      { loop: true, duration: 2 },
    )
    // Evaluating should not throw and should produce valid output
    const state = evaluatePath(path, 0.5)
    expect(typeof state.position.x).toBe('number')
    expect(typeof state.position.y).toBe('number')
    expect(Number.isFinite(state.position.x)).toBe(true)
  })
})

// ── createCameraPath ────────────────────────────────────────────────

describe('createCameraPath', () => {
  it('returns a path with the given name', () => {
    const path = createCameraPath('My Path')
    expect(path.name).toBe('My Path')
  })

  it('has an empty points array', () => {
    const path = createCameraPath('Empty')
    expect(path.points).toEqual([])
  })

  it('has default duration of 5', () => {
    const path = createCameraPath('Test')
    expect(path.duration).toBe(5)
  })

  it('has loop disabled by default', () => {
    const path = createCameraPath('Test')
    expect(path.loop).toBe(false)
  })

  it('has default tension of 0.5', () => {
    const path = createCameraPath('Test')
    expect(path.tension).toBe(0.5)
  })

  it('generates a unique id', () => {
    const path1 = createCameraPath('A')
    const path2 = createCameraPath('B')
    expect(path1.id).not.toBe(path2.id)
  })
})

// ── addPathPoint ────────────────────────────────────────────────────

describe('addPathPoint', () => {
  it('adds a point to an empty path', () => {
    const path = createCameraPath('Test')
    const updated = addPathPoint(path, {
      position: vec3(1, 2, 3),
      lookAt: vec3(0, 0, 0),
      fov: 60,
      time: 0,
    })
    expect(updated.points).toHaveLength(1)
  })

  it('assigns a unique id to the new point', () => {
    const path = createCameraPath('Test')
    const updated = addPathPoint(path, {
      position: vec3(1, 2, 3),
      lookAt: vec3(0, 0, 0),
      fov: 60,
      time: 0,
    })
    expect(updated.points[0].id).toBeTruthy()
    expect(updated.points[0].id.length).toBeGreaterThan(0)
  })

  it('does not mutate the original path', () => {
    const path = createCameraPath('Test')
    const updated = addPathPoint(path, {
      position: vec3(1, 2, 3),
      lookAt: vec3(0, 0, 0),
      fov: 60,
      time: 0,
    })
    expect(path.points).toHaveLength(0)
    expect(updated.points).toHaveLength(1)
  })

  it('preserves the point data', () => {
    const path = createCameraPath('Test')
    const updated = addPathPoint(path, {
      position: vec3(5, 10, 15),
      lookAt: vec3(1, 2, 3),
      fov: 90,
      time: 2.5,
    })
    const point = updated.points[0]
    expect(point.position).toEqual(vec3(5, 10, 15))
    expect(point.lookAt).toEqual(vec3(1, 2, 3))
    expect(point.fov).toBe(90)
    expect(point.time).toBe(2.5)
  })
})

// ── removePathPoint ─────────────────────────────────────────────────

describe('removePathPoint', () => {
  it('removes the correct point', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(0, 0, 0), lookAt: vec3(0, 0, 0), fov: 60, time: 0 })
    path = addPathPoint(path, { position: vec3(1, 0, 0), lookAt: vec3(0, 0, 0), fov: 60, time: 1 })
    const idToRemove = path.points[0].id
    const updated = removePathPoint(path, idToRemove)
    expect(updated.points).toHaveLength(1)
    expect(updated.points[0].id).not.toBe(idToRemove)
  })

  it('does not mutate the original path', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(0, 0, 0), lookAt: vec3(0, 0, 0), fov: 60, time: 0 })
    const updated = removePathPoint(path, path.points[0].id)
    expect(path.points).toHaveLength(1)
    expect(updated.points).toHaveLength(0)
  })

  it('returns the path unchanged if pointId not found', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(0, 0, 0), lookAt: vec3(0, 0, 0), fov: 60, time: 0 })
    const updated = removePathPoint(path, 'nonexistent')
    expect(updated.points).toHaveLength(1)
  })
})

// ── updatePathPoint ─────────────────────────────────────────────────

describe('updatePathPoint', () => {
  it('updates position without affecting other fields', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(0, 0, 0), lookAt: vec3(0, 0, -1), fov: 60, time: 0 })
    const pointId = path.points[0].id
    const updated = updatePathPoint(path, pointId, { position: vec3(99, 99, 99) })
    expect(updated.points[0].position).toEqual(vec3(99, 99, 99))
    expect(updated.points[0].lookAt).toEqual(vec3(0, 0, -1))
    expect(updated.points[0].fov).toBe(60)
    expect(updated.points[0].time).toBe(0)
  })

  it('updates fov only', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(1, 2, 3), lookAt: vec3(0, 0, 0), fov: 60, time: 0 })
    const pointId = path.points[0].id
    const updated = updatePathPoint(path, pointId, { fov: 120 })
    expect(updated.points[0].fov).toBe(120)
    expect(updated.points[0].position).toEqual(vec3(1, 2, 3))
  })

  it('does not mutate the original path', () => {
    let path = createCameraPath('Test')
    path = addPathPoint(path, { position: vec3(0, 0, 0), lookAt: vec3(0, 0, 0), fov: 60, time: 0 })
    const pointId = path.points[0].id
    const updated = updatePathPoint(path, pointId, { fov: 120 })
    expect(path.points[0].fov).toBe(60)
    expect(updated.points[0].fov).toBe(120)
  })
})

// ── reorderPathPoints ───────────────────────────────────────────────

describe('reorderPathPoints', () => {
  it('sorts points by time ascending', () => {
    const path = makePath([
      makePoint('c', vec3(2, 0, 0), vec3(0, 0, 0), 60, 3),
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 1),
      makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 2),
    ])
    const sorted = reorderPathPoints(path)
    expect(sorted.points.map(p => p.time)).toEqual([1, 2, 3])
    expect(sorted.points.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original path', () => {
    const path = makePath([
      makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 2),
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 1),
    ])
    const sorted = reorderPathPoints(path)
    expect(path.points[0].id).toBe('b')
    expect(sorted.points[0].id).toBe('a')
  })

  it('handles already-sorted points', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 1),
    ])
    const sorted = reorderPathPoints(path)
    expect(sorted.points.map(p => p.id)).toEqual(['a', 'b'])
  })
})

// ── getPathLength ───────────────────────────────────────────────────

describe('getPathLength', () => {
  it('returns 0 for path with fewer than 2 points', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
    ])
    expect(getPathLength(path)).toBe(0)
  })

  it('returns approximately correct length for a straight line', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
      makePoint('c', vec3(20, 0, 0), vec3(0, 0, 0), 60, 2),
      makePoint('d', vec3(30, 0, 0), vec3(0, 0, 0), 60, 3),
    ])
    const length = getPathLength(path, 100)
    // Collinear evenly-spaced points should give close to 30
    expect(length).toBeCloseTo(30, 0)
  })

  it('curved path is longer than straight line distance', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(5, 10, 0), vec3(0, 0, 0), 60, 1),
      makePoint('c', vec3(10, 0, 0), vec3(0, 0, 0), 60, 2),
      makePoint('d', vec3(15, 10, 0), vec3(0, 0, 0), 60, 3),
    ])
    const pathLen = getPathLength(path, 100)
    const straightDist = distanceVec3(vec3(0, 0, 0), vec3(15, 10, 0))
    expect(pathLen).toBeGreaterThan(straightDist)
  })
})

// ── getPathDuration ─────────────────────────────────────────────────

describe('getPathDuration', () => {
  it('returns 0 for empty path', () => {
    const path = makePath([])
    expect(getPathDuration(path)).toBe(0)
  })

  it('returns the max time from points', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 5),
      makePoint('c', vec3(2, 0, 0), vec3(0, 0, 0), 60, 10),
    ])
    expect(getPathDuration(path)).toBe(10)
  })

  it('works with unordered points', () => {
    const path = makePath([
      makePoint('b', vec3(1, 0, 0), vec3(0, 0, 0), 60, 7),
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 3),
      makePoint('c', vec3(2, 0, 0), vec3(0, 0, 0), 60, 12),
    ])
    expect(getPathDuration(path)).toBe(12)
  })
})

// ── samplePath ──────────────────────────────────────────────────────

describe('samplePath', () => {
  it('returns empty array for empty path', () => {
    const path = makePath([])
    expect(samplePath(path, 10)).toEqual([])
  })

  it('returns correct number of samples', () => {
    const path = makeLinearPath()
    const samples = samplePath(path, 5)
    expect(samples).toHaveLength(5)
  })

  it('first sample matches path start', () => {
    const path = makeLinearPath()
    const samples = samplePath(path, 10)
    expect(samples[0].position.x).toBeCloseTo(0, 1)
  })

  it('last sample matches path end', () => {
    const path = makeLinearPath()
    const samples = samplePath(path, 10)
    expect(samples[samples.length - 1].position.x).toBeCloseTo(30, 1)
  })

  it('returns single sample for numSamples=1', () => {
    const path = makeLinearPath()
    const samples = samplePath(path, 1)
    expect(samples).toHaveLength(1)
  })

  it('returns empty for numSamples=0', () => {
    const path = makeLinearPath()
    const samples = samplePath(path, 0)
    expect(samples).toHaveLength(0)
  })
})

// ── validateCameraPath ──────────────────────────────────────────────

describe('validateCameraPath', () => {
  it('returns error for fewer than 2 points', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
    ])
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('at least 2 points'))).toBe(true)
  })

  it('returns no errors for valid path', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { duration: 1 })
    const errors = validateCameraPath(path)
    expect(errors).toHaveLength(0)
  })

  it('catches negative duration', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { duration: -1 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('Duration must be positive'))).toBe(true)
  })

  it('catches zero duration', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { duration: 0 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('Duration must be positive'))).toBe(true)
  })

  it('catches tension out of range (negative)', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { tension: -0.5, duration: 1 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('Tension'))).toBe(true)
  })

  it('catches tension out of range (> 1)', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { tension: 1.5, duration: 1 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('Tension'))).toBe(true)
  })

  it('catches empty name', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { name: '', duration: 1 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('non-empty name'))).toBe(true)
  })

  it('catches out-of-order times', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 2),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { duration: 2 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('ordered by time'))).toBe(true)
  })

  it('reports point-level validation errors', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 200, 0),  // bad fov
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 1),
    ], { duration: 1 })
    const errors = validateCameraPath(path)
    expect(errors.some(e => e.includes('FOV'))).toBe(true)
  })
})

// ── validatePathPoint ───────────────────────────────────────────────

describe('validatePathPoint', () => {
  it('returns no errors for valid point', () => {
    const point = makePoint('p1', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0)
    expect(validatePathPoint(point)).toHaveLength(0)
  })

  it('catches FOV below minimum', () => {
    const point = makePoint('p1', vec3(0, 0, 0), vec3(0, 0, 0), 0, 0)
    const errors = validatePathPoint(point)
    expect(errors.some(e => e.includes('FOV'))).toBe(true)
  })

  it('catches FOV above maximum', () => {
    const point = makePoint('p1', vec3(0, 0, 0), vec3(0, 0, 0), 180, 0)
    const errors = validatePathPoint(point)
    expect(errors.some(e => e.includes('FOV'))).toBe(true)
  })

  it('accepts FOV at boundaries (1 and 179)', () => {
    expect(validatePathPoint(makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 1, 0))).toHaveLength(0)
    expect(validatePathPoint(makePoint('b', vec3(0, 0, 0), vec3(0, 0, 0), 179, 0))).toHaveLength(0)
  })

  it('catches negative time', () => {
    const point = makePoint('p1', vec3(0, 0, 0), vec3(0, 0, 0), 60, -1)
    const errors = validatePathPoint(point)
    expect(errors.some(e => e.includes('Time'))).toBe(true)
  })

  it('catches empty id', () => {
    const point = makePoint('', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0)
    const errors = validatePathPoint(point)
    expect(errors.some(e => e.includes('id'))).toBe(true)
  })
})

// ── lerpValue / lerpVec3 ────────────────────────────────────────────

describe('lerpValue', () => {
  it('returns a when t=0', () => {
    expect(lerpValue(10, 20, 0)).toBe(10)
  })

  it('returns b when t=1', () => {
    expect(lerpValue(10, 20, 1)).toBe(20)
  })

  it('returns midpoint when t=0.5', () => {
    expect(lerpValue(10, 20, 0.5)).toBe(15)
  })

  it('extrapolates beyond t=1', () => {
    expect(lerpValue(0, 10, 2)).toBe(20)
  })
})

describe('lerpVec3', () => {
  it('returns a when t=0', () => {
    const result = lerpVec3(vec3(1, 2, 3), vec3(4, 5, 6), 0)
    expect(result).toEqual(vec3(1, 2, 3))
  })

  it('returns b when t=1', () => {
    const result = lerpVec3(vec3(1, 2, 3), vec3(4, 5, 6), 1)
    expect(result).toEqual(vec3(4, 5, 6))
  })

  it('returns midpoint when t=0.5', () => {
    const result = lerpVec3(vec3(0, 0, 0), vec3(10, 20, 30), 0.5)
    expect(result).toEqual(vec3(5, 10, 15))
  })
})

describe('distanceVec3', () => {
  it('returns 0 for same point', () => {
    expect(distanceVec3(vec3(5, 5, 5), vec3(5, 5, 5))).toBe(0)
  })

  it('returns correct distance along one axis', () => {
    expect(distanceVec3(vec3(0, 0, 0), vec3(3, 0, 0))).toBe(3)
  })

  it('returns correct 3D distance', () => {
    // distance from (0,0,0) to (1,2,2) = sqrt(1+4+4) = 3
    expect(distanceVec3(vec3(0, 0, 0), vec3(1, 2, 2))).toBeCloseTo(3, 5)
  })
})

// ── Edge cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
  it('many-point path evaluates without error', () => {
    const points: CameraPathPoint[] = []
    for (let i = 0; i < 20; i++) {
      points.push(makePoint(`p${i}`, vec3(i * 2, Math.sin(i), 0), vec3(0, 0, 0), 60, i))
    }
    const path = makePath(points)
    // Sample throughout the path
    for (let t = 0; t <= 19; t += 0.5) {
      const state = evaluatePath(path, t)
      expect(Number.isFinite(state.position.x)).toBe(true)
      expect(Number.isFinite(state.position.y)).toBe(true)
      expect(Number.isFinite(state.position.z)).toBe(true)
      expect(Number.isFinite(state.fov)).toBe(true)
    }
  })

  it('path with all points at the same time evaluates without NaN', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 0),
    ])
    const state = evaluatePath(path, 0)
    expect(Number.isFinite(state.position.x)).toBe(true)
    expect(Number.isFinite(state.fov)).toBe(true)
  })

  it('getPathLength returns 0 when first and last times are equal', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 5),
      makePoint('b', vec3(10, 0, 0), vec3(0, 0, 0), 60, 5),
    ])
    expect(getPathLength(path)).toBe(0)
  })

  it('samplePath returns empty for negative numSamples', () => {
    const path = makeLinearPath()
    expect(samplePath(path, -1)).toEqual([])
  })

  it('evaluatePath with two points and lookAt interpolation', () => {
    const path = makePath([
      makePoint('a', vec3(0, 0, 0), vec3(0, 0, 0), 60, 0),
      makePoint('b', vec3(10, 0, 0), vec3(10, 10, 10), 90, 2),
    ])
    const state = evaluatePath(path, 1)
    // Mid-point lookAt should be between (0,0,0) and (10,10,10)
    expect(state.lookAt.x).toBeCloseTo(5, 0)
    expect(state.lookAt.y).toBeCloseTo(5, 0)
    expect(state.lookAt.z).toBeCloseTo(5, 0)
    // FOV should be between 60 and 90
    expect(state.fov).toBeCloseTo(75, 0)
  })
})

// ── Cinematic Camera Animations ──────────────────────────────────────

import {
  dolly,
  truck,
  pedestal,
  orbit,
  orbit3D,
  generateOrbitPath,
  generateDollyZoomPath,
  generateFlyThroughPath,
} from './cameraPath'

describe('dolly', () => {
  it('positive amount moves toward target', () => {
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = dolly(pos, lookAt, 5)
    // Should move closer to origin along -Z
    expect(result.z).toBeLessThan(pos.z)
    expect(result.z).toBeCloseTo(5)
  })

  it('negative amount moves away from target', () => {
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = dolly(pos, lookAt, -5)
    // Should move farther from origin along +Z
    expect(result.z).toBeGreaterThan(pos.z)
    expect(result.z).toBeCloseTo(15)
  })

  it('maintains direction toward lookAt', () => {
    const pos = vec3(3, 4, 0)
    const lookAt = vec3(0, 0, 0)
    const result = dolly(pos, lookAt, 2)
    // The result should be closer to lookAt than the original position
    const origDist = distanceVec3(pos, lookAt)
    const newDist = distanceVec3(result, lookAt)
    expect(newDist).toBeCloseTo(origDist - 2)
  })

  it('zero amount returns same position', () => {
    const pos = vec3(5, 5, 5)
    const lookAt = vec3(0, 0, 0)
    const result = dolly(pos, lookAt, 0)
    expect(result.x).toBeCloseTo(pos.x)
    expect(result.y).toBeCloseTo(pos.y)
    expect(result.z).toBeCloseTo(pos.z)
  })

  it('works along a single axis', () => {
    const pos = vec3(10, 0, 0)
    const lookAt = vec3(0, 0, 0)
    const result = dolly(pos, lookAt, 3)
    expect(result.x).toBeCloseTo(7)
    expect(result.y).toBeCloseTo(0)
    expect(result.z).toBeCloseTo(0)
  })
})

describe('truck', () => {
  it('positive amount moves right', () => {
    // Camera at z=10 looking toward origin (forward = -Z)
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = truck(pos, lookAt, 5)
    // Right direction when looking along -Z is +X
    expect(result.position.x).toBeGreaterThan(pos.x)
  })

  it('negative amount moves left', () => {
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = truck(pos, lookAt, -5)
    expect(result.position.x).toBeLessThan(pos.x)
  })

  it('shifts both position and lookAt by the same offset', () => {
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = truck(pos, lookAt, 3)
    // The relative difference between position and lookAt should be preserved
    const origDiff = { x: pos.x - lookAt.x, y: pos.y - lookAt.y, z: pos.z - lookAt.z }
    const newDiff = {
      x: result.position.x - result.lookAt.x,
      y: result.position.y - result.lookAt.y,
      z: result.position.z - result.lookAt.z,
    }
    expect(newDiff.x).toBeCloseTo(origDiff.x)
    expect(newDiff.y).toBeCloseTo(origDiff.y)
    expect(newDiff.z).toBeCloseTo(origDiff.z)
  })

  it('zero amount returns same positions', () => {
    const pos = vec3(5, 5, 5)
    const lookAt = vec3(0, 0, 0)
    const result = truck(pos, lookAt, 0)
    expect(result.position.x).toBeCloseTo(pos.x)
    expect(result.position.y).toBeCloseTo(pos.y)
    expect(result.position.z).toBeCloseTo(pos.z)
    expect(result.lookAt.x).toBeCloseTo(lookAt.x)
    expect(result.lookAt.y).toBeCloseTo(lookAt.y)
    expect(result.lookAt.z).toBeCloseTo(lookAt.z)
  })
})

describe('pedestal', () => {
  it('positive amount moves up', () => {
    const pos = vec3(0, 0, 10)
    const lookAt = vec3(0, 0, 0)
    const result = pedestal(pos, lookAt, 5)
    expect(result.position.y).toBeCloseTo(5)
    expect(result.lookAt.y).toBeCloseTo(5)
  })

  it('negative amount moves down', () => {
    const pos = vec3(0, 5, 10)
    const lookAt = vec3(0, 5, 0)
    const result = pedestal(pos, lookAt, -3)
    expect(result.position.y).toBeCloseTo(2)
    expect(result.lookAt.y).toBeCloseTo(2)
  })

  it('shifts both position and lookAt by the same Y offset', () => {
    const pos = vec3(1, 2, 3)
    const lookAt = vec3(4, 5, 6)
    const result = pedestal(pos, lookAt, 10)
    expect(result.position.x).toBeCloseTo(1)
    expect(result.position.y).toBeCloseTo(12)
    expect(result.position.z).toBeCloseTo(3)
    expect(result.lookAt.x).toBeCloseTo(4)
    expect(result.lookAt.y).toBeCloseTo(15)
    expect(result.lookAt.z).toBeCloseTo(6)
  })

  it('does not change X or Z coordinates', () => {
    const pos = vec3(7, 0, 9)
    const lookAt = vec3(3, 0, 1)
    const result = pedestal(pos, lookAt, 100)
    expect(result.position.x).toBeCloseTo(7)
    expect(result.position.z).toBeCloseTo(9)
    expect(result.lookAt.x).toBeCloseTo(3)
    expect(result.lookAt.z).toBeCloseTo(1)
  })
})

describe('orbit', () => {
  it('90 degrees rotates correctly on XZ plane', () => {
    const pos = vec3(5, 0, 0) // right of target
    const target = vec3(0, 0, 0)
    const result = orbit(pos, target, Math.PI / 2)
    // 90 degrees CCW from (5,0,0) should be (0,0,5)
    expect(result.x).toBeCloseTo(0)
    expect(result.z).toBeCloseTo(5)
  })

  it('maintains distance from target', () => {
    const pos = vec3(5, 3, 0)
    const target = vec3(0, 0, 0)
    const result = orbit(pos, target, Math.PI / 4)
    const origDist = Math.sqrt(5 * 5 + 0 * 0) // XZ distance only
    const newDist = Math.sqrt(result.x * result.x + result.z * result.z)
    expect(newDist).toBeCloseTo(origDist)
  })

  it('preserves Y coordinate', () => {
    const pos = vec3(5, 7, 0)
    const target = vec3(0, 0, 0)
    const result = orbit(pos, target, Math.PI / 3)
    expect(result.y).toBeCloseTo(7)
  })

  it('360 degree orbit returns to start', () => {
    const pos = vec3(5, 2, 3)
    const target = vec3(1, 0, 1)
    const result = orbit(pos, target, Math.PI * 2)
    expect(result.x).toBeCloseTo(pos.x)
    expect(result.y).toBeCloseTo(pos.y)
    expect(result.z).toBeCloseTo(pos.z)
  })

  it('180 degrees flips position on XZ plane', () => {
    const pos = vec3(5, 0, 0)
    const target = vec3(0, 0, 0)
    const result = orbit(pos, target, Math.PI)
    expect(result.x).toBeCloseTo(-5)
    expect(result.z).toBeCloseTo(0, 5)
  })
})

describe('orbit3D', () => {
  it('yaw rotates correctly', () => {
    const pos = vec3(5, 0, 0)
    const target = vec3(0, 0, 0)
    const result = orbit3D(pos, target, Math.PI / 2, 0)
    // After yaw by 90 degrees, should be at (0, 0, -5) or similar
    const dist = Math.sqrt(result.x * result.x + result.y * result.y + result.z * result.z)
    expect(dist).toBeCloseTo(5)
  })

  it('pitch tilts correctly', () => {
    const pos = vec3(5, 0, 0)
    const target = vec3(0, 0, 0)
    const result = orbit3D(pos, target, 0, -Math.PI / 4)
    // Pitching up should increase Y
    expect(result.y).toBeGreaterThan(0)
    const dist = Math.sqrt(result.x * result.x + result.y * result.y + result.z * result.z)
    expect(dist).toBeCloseTo(5)
  })

  it('maintains distance from target', () => {
    const pos = vec3(3, 4, 5)
    const target = vec3(1, 1, 1)
    const origDist = distanceVec3(pos, target)
    const result = orbit3D(pos, target, 0.7, 0.3)
    const newDist = distanceVec3(result, target)
    expect(newDist).toBeCloseTo(origDist)
  })

  it('handles zero distance (same position as target)', () => {
    const pos = vec3(5, 5, 5)
    const target = vec3(5, 5, 5)
    const result = orbit3D(pos, target, Math.PI / 2, Math.PI / 4)
    // Should return same position
    expect(result.x).toBeCloseTo(5)
    expect(result.y).toBeCloseTo(5)
    expect(result.z).toBeCloseTo(5)
  })

  it('clamps pitch to prevent flipping through poles', () => {
    // Start directly above target, then pitch a lot downward
    const pos = vec3(0, 10, 0)
    const target = vec3(0, 0, 0)
    const result = orbit3D(pos, target, 0, Math.PI * 10)
    // Y should be clamped and not produce NaN
    expect(Number.isFinite(result.x)).toBe(true)
    expect(Number.isFinite(result.y)).toBe(true)
    expect(Number.isFinite(result.z)).toBe(true)
  })

  it('zero deltas return approximately same position', () => {
    const pos = vec3(3, 4, 5)
    const target = vec3(0, 0, 0)
    const result = orbit3D(pos, target, 0, 0)
    expect(result.x).toBeCloseTo(pos.x, 3)
    expect(result.y).toBeCloseTo(pos.y, 3)
    expect(result.z).toBeCloseTo(pos.z, 3)
  })
})

describe('generateOrbitPath', () => {
  it('creates correct number of points', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 8, 4)
    expect(path.points).toHaveLength(8)
  })

  it('all points look at the target', () => {
    const target = vec3(3, 2, 1)
    const path = generateOrbitPath(target, 10, 5, 6, 3)
    for (const point of path.points) {
      expect(point.lookAt.x).toBeCloseTo(target.x)
      expect(point.lookAt.y).toBeCloseTo(target.y)
      expect(point.lookAt.z).toBeCloseTo(target.z)
    }
  })

  it('first point is at radius distance from target on XZ plane', () => {
    const target = vec3(0, 0, 0)
    const radius = 10
    const height = 5
    const path = generateOrbitPath(target, radius, height, 8, 4)
    const first = path.points[0]
    const xzDist = Math.sqrt(
      (first.position.x - target.x) ** 2 + (first.position.z - target.z) ** 2,
    )
    expect(xzDist).toBeCloseTo(radius)
  })

  it('points are at correct height above target', () => {
    const target = vec3(0, 0, 0)
    const height = 7
    const path = generateOrbitPath(target, 10, height, 8, 4)
    for (const point of path.points) {
      expect(point.position.y).toBeCloseTo(target.y + height)
    }
  })

  it('loop is set to true', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 8, 4)
    expect(path.loop).toBe(true)
  })

  it('has correct duration', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 8, 6)
    expect(path.duration).toBe(6)
  })

  it('uses provided FOV value', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 4, 3, 90)
    for (const point of path.points) {
      expect(point.fov).toBe(90)
    }
  })

  it('uses default FOV of 60', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 4, 3)
    for (const point of path.points) {
      expect(point.fov).toBe(60)
    }
  })

  it('first point time is 0', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 8, 4)
    expect(path.points[0].time).toBeCloseTo(0)
  })

  it('path name is Orbit', () => {
    const path = generateOrbitPath(vec3(0, 0, 0), 10, 5, 8, 4)
    expect(path.name).toBe('Orbit')
  })
})

describe('generateDollyZoomPath', () => {
  it('FOV transitions from startFov to endFov', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 4,
    )
    expect(path.points[0].fov).toBeCloseTo(30)
    expect(path.points[path.points.length - 1].fov).toBeCloseTo(90)
  })

  it('intermediate points have interpolated FOV', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 4,
    )
    // Middle point (index 2 of 5) at t=0.5, FOV should be 60
    expect(path.points[2].fov).toBeCloseTo(60)
  })

  it('distance adjusts with FOV to maintain apparent subject size', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 4,
    )
    // As FOV increases, camera should move closer to maintain subject size
    const firstDist = distanceVec3(path.points[0].position, vec3(0, 0, 0))
    const lastDist = distanceVec3(path.points[path.points.length - 1].position, vec3(0, 0, 0))
    // With wider FOV (90) the camera should be closer than with narrow FOV (30)
    expect(lastDist).toBeLessThan(firstDist)
  })

  it('creates correct number of points', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 10, 5,
    )
    expect(path.points).toHaveLength(10)
  })

  it('all points look at target', () => {
    const target = vec3(3, 2, 1)
    const path = generateDollyZoomPath(
      vec3(3, 2, 11), target, 30, 90, 5, 4,
    )
    for (const point of path.points) {
      expect(point.lookAt.x).toBeCloseTo(target.x)
      expect(point.lookAt.y).toBeCloseTo(target.y)
      expect(point.lookAt.z).toBeCloseTo(target.z)
    }
  })

  it('loop is set to false', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 4,
    )
    expect(path.loop).toBe(false)
  })

  it('has correct duration', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 8,
    )
    expect(path.duration).toBe(8)
  })

  it('path name is Dolly Zoom', () => {
    const path = generateDollyZoomPath(
      vec3(0, 0, 10), vec3(0, 0, 0), 30, 90, 5, 4,
    )
    expect(path.name).toBe('Dolly Zoom')
  })
})

describe('generateFlyThroughPath', () => {
  it('first point is at start position', () => {
    const start = vec3(0, 0, 0)
    const end = vec3(10, 0, 10)
    const path = generateFlyThroughPath(start, end, vec3(0, 0, -1), vec3(10, 0, 9), 0, 5, 3)
    expect(path.points[0].position.x).toBeCloseTo(start.x)
    expect(path.points[0].position.y).toBeCloseTo(start.y)
    expect(path.points[0].position.z).toBeCloseTo(start.z)
  })

  it('last point is at end position', () => {
    const start = vec3(0, 0, 0)
    const end = vec3(10, 0, 10)
    const path = generateFlyThroughPath(start, end, vec3(0, 0, -1), vec3(10, 0, 9), 0, 5, 3)
    const last = path.points[path.points.length - 1]
    expect(last.position.x).toBeCloseTo(end.x)
    expect(last.position.y).toBeCloseTo(end.y)
    expect(last.position.z).toBeCloseTo(end.z)
  })

  it('arc adds height at midpoint', () => {
    const arcHeight = 10
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(20, 0, 0),
      vec3(0, 0, -1), vec3(20, 0, -1),
      arcHeight, 5, 4,
    )
    // Middle point (index 2 of 5) at t=0.5
    // Arc = 4 * arcHeight * 0.5 * 0.5 = arcHeight
    const midPoint = path.points[2]
    expect(midPoint.position.y).toBeCloseTo(arcHeight)
  })

  it('arc is zero at start and end', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(20, 0, 0),
      vec3(0, 0, -1), vec3(20, 0, -1),
      10, 5, 4,
    )
    expect(path.points[0].position.y).toBeCloseTo(0)
    expect(path.points[path.points.length - 1].position.y).toBeCloseTo(0)
  })

  it('lookAt interpolates between startLookAt and endLookAt', () => {
    const startLookAt = vec3(0, 0, 0)
    const endLookAt = vec3(10, 10, 10)
    const path = generateFlyThroughPath(
      vec3(0, 5, 0), vec3(10, 5, 0),
      startLookAt, endLookAt,
      0, 5, 4,
    )
    // Middle point at t=0.5
    const mid = path.points[2]
    expect(mid.lookAt.x).toBeCloseTo(5)
    expect(mid.lookAt.y).toBeCloseTo(5)
    expect(mid.lookAt.z).toBeCloseTo(5)
  })

  it('creates correct number of points', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 8, 3,
    )
    expect(path.points).toHaveLength(8)
  })

  it('loop is set to false', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 5, 3,
    )
    expect(path.loop).toBe(false)
  })

  it('has correct duration', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 5, 7,
    )
    expect(path.duration).toBe(7)
  })

  it('uses provided FOV value', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 5, 3, 90,
    )
    for (const point of path.points) {
      expect(point.fov).toBe(90)
    }
  })

  it('uses default FOV of 60', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 5, 3,
    )
    for (const point of path.points) {
      expect(point.fov).toBe(60)
    }
  })

  it('path name is Fly Through', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 0, 10),
      vec3(0, 0, -1), vec3(10, 0, 9),
      5, 5, 3,
    )
    expect(path.name).toBe('Fly Through')
  })

  it('with zero arcHeight, position Y linearly interpolates', () => {
    const path = generateFlyThroughPath(
      vec3(0, 0, 0), vec3(10, 10, 0),
      vec3(0, 0, -1), vec3(10, 0, -1),
      0, 5, 4,
    )
    // Middle point at t=0.5 should have Y = 5 (linear interp, no arc)
    const mid = path.points[2]
    expect(mid.position.y).toBeCloseTo(5)
  })
})
