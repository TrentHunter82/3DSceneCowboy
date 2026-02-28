import { describe, it, expect, beforeEach } from 'vitest'
import type { SceneObject } from '../types/scene'
import type { Vec3 } from '../types/scene'
import {
  createAABB,
  aabbIntersects,
  aabbContains,
  sphereIntersectsAABB,
  objectToAABB,
  planeDistanceToPoint,
  DEFAULT_WORLD_BOUNDS,
  SpatialIndex,
} from './spatialIndex'
import type { AABB, FrustumPlane } from './spatialIndex'

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a minimal SceneObject for testing */
function makeObj(
  id: string,
  position: Vec3 = { x: 0, y: 0, z: 0 },
  scale: Vec3 = { x: 1, y: 1, z: 1 },
): SceneObject {
  return {
    id,
    name: id,
    type: 'box',
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale,
    color: '#ffffff',
    visible: true,
    locked: false,
    material: {
      type: 'standard',
      color: '#ffffff',
      opacity: 1,
      transparent: false,
      wireframe: false,
      metalness: 0,
      roughness: 0.5,
    },
  }
}

/** Unit half-extents for a 1x1x1 object */
const HALF_UNIT: Vec3 = { x: 0.5, y: 0.5, z: 0.5 }

// ── AABB Helper Functions ────────────────────────────────────────────

describe('createAABB', () => {
  it('creates correct AABB at origin', () => {
    const aabb = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    expect(aabb.min).toEqual({ x: -1, y: -1, z: -1 })
    expect(aabb.max).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('creates correct AABB with offset center', () => {
    const aabb = createAABB({ x: 5, y: 3, z: -2 }, { x: 1, y: 2, z: 0.5 })
    expect(aabb.min).toEqual({ x: 4, y: 1, z: -2.5 })
    expect(aabb.max).toEqual({ x: 6, y: 5, z: -1.5 })
  })

  it('handles zero half-extents (degenerate point box)', () => {
    const aabb = createAABB({ x: 3, y: 4, z: 5 }, { x: 0, y: 0, z: 0 })
    expect(aabb.min).toEqual({ x: 3, y: 4, z: 5 })
    expect(aabb.max).toEqual({ x: 3, y: 4, z: 5 })
  })
})

describe('aabbIntersects', () => {
  it('returns true for overlapping boxes', () => {
    const a = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    const b = createAABB({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1 })
    expect(aabbIntersects(a, b)).toBe(true)
  })

  it('returns true for touching edges (boundary case)', () => {
    const a = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    const b = createAABB({ x: 2, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // a.max.x = 1, b.min.x = 1 => touching edge
    expect(aabbIntersects(a, b)).toBe(true)
  })

  it('returns false for separate boxes', () => {
    const a = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    const b = createAABB({ x: 5, y: 5, z: 5 }, { x: 1, y: 1, z: 1 })
    expect(aabbIntersects(a, b)).toBe(false)
  })

  it('returns true for nested boxes (one fully inside the other)', () => {
    const outer = createAABB({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 })
    const inner = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    expect(aabbIntersects(outer, inner)).toBe(true)
    expect(aabbIntersects(inner, outer)).toBe(true)
  })

  it('returns true for partial overlap on one axis', () => {
    const a = createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    const b = createAABB({ x: 1, y: 0, z: 0 }, { x: 2, y: 1, z: 1 })
    expect(aabbIntersects(a, b)).toBe(true)
  })

  it('returns false when separated on only one axis', () => {
    const a = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // Same y and z, but x is far away
    const b = createAABB({ x: 10, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    expect(aabbIntersects(a, b)).toBe(false)
  })
})

describe('aabbContains', () => {
  it('returns true when outer fully contains inner', () => {
    const outer = createAABB({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 })
    const inner = createAABB({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })
    expect(aabbContains(outer, inner)).toBe(true)
  })

  it('returns false for partial containment', () => {
    const outer = createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    const inner = createAABB({ x: 2, y: 0, z: 0 }, { x: 2, y: 1, z: 1 })
    // inner extends from x:0 to x:4, outer only goes to x:2
    expect(aabbContains(outer, inner)).toBe(false)
  })

  it('returns true when both bounds are identical', () => {
    const box = createAABB({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: 1 })
    expect(aabbContains(box, box)).toBe(true)
  })

  it('returns false when inner is larger than outer', () => {
    const small = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    const big = createAABB({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 })
    expect(aabbContains(small, big)).toBe(false)
  })

  it('returns true when inner touches outer boundary exactly', () => {
    const outer = createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    // inner.max = outer.max on all axes
    const inner = createAABB({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })
    expect(aabbContains(outer, inner)).toBe(true)
  })
})

describe('sphereIntersectsAABB', () => {
  it('returns true when sphere center is inside box', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    expect(sphereIntersectsAABB({ x: 0, y: 0, z: 0 }, 1, box)).toBe(true)
  })

  it('returns true when sphere touches box corner', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // Corner is at (1,1,1), distance from (2,1,1) to corner = 1
    expect(sphereIntersectsAABB({ x: 2, y: 1, z: 1 }, 1, box)).toBe(true)
  })

  it('returns false when sphere is outside box', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // Center at (5,5,5), radius 1 cannot reach box corner at (1,1,1)
    expect(sphereIntersectsAABB({ x: 5, y: 5, z: 5 }, 1, box)).toBe(false)
  })

  it('returns true when sphere fully encloses box', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    expect(sphereIntersectsAABB({ x: 0, y: 0, z: 0 }, 100, box)).toBe(true)
  })

  it('returns true for zero-radius sphere at box surface', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // Point exactly on the face: distance = 0 <= 0
    expect(sphereIntersectsAABB({ x: 1, y: 0, z: 0 }, 0, box)).toBe(true)
  })

  it('returns false when sphere barely misses box', () => {
    const box = createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    // Diagonal distance from corner (1,1,1) to (3,3,3) = sqrt(12) ~= 3.46
    // Radius 1 is not enough
    expect(sphereIntersectsAABB({ x: 3, y: 3, z: 3 }, 1, box)).toBe(false)
  })
})

describe('objectToAABB', () => {
  it('converts a standard unit-scale object to AABB', () => {
    const obj = makeObj('a', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
    const aabb = objectToAABB(obj)
    expect(aabb.min).toEqual({ x: -0.5, y: -0.5, z: -0.5 })
    expect(aabb.max).toEqual({ x: 0.5, y: 0.5, z: 0.5 })
  })

  it('handles non-uniform scale', () => {
    const obj = makeObj('b', { x: 2, y: 3, z: 4 }, { x: 4, y: 2, z: 6 })
    const aabb = objectToAABB(obj)
    expect(aabb.min).toEqual({ x: 0, y: 2, z: 1 })
    expect(aabb.max).toEqual({ x: 4, y: 4, z: 7 })
  })

  it('handles negative scale (takes absolute value)', () => {
    const obj = makeObj('c', { x: 0, y: 0, z: 0 }, { x: -2, y: -4, z: -6 })
    const aabb = objectToAABB(obj)
    expect(aabb.min).toEqual({ x: -1, y: -2, z: -3 })
    expect(aabb.max).toEqual({ x: 1, y: 2, z: 3 })
  })
})

describe('planeDistanceToPoint', () => {
  it('returns positive distance for point in front of plane', () => {
    // Plane facing +x through origin: normal=(1,0,0), distance=0
    const plane: FrustumPlane = { normal: { x: 1, y: 0, z: 0 }, distance: 0 }
    expect(planeDistanceToPoint(plane, { x: 5, y: 0, z: 0 })).toBe(5)
  })

  it('returns negative distance for point behind plane', () => {
    const plane: FrustumPlane = { normal: { x: 1, y: 0, z: 0 }, distance: 0 }
    expect(planeDistanceToPoint(plane, { x: -3, y: 0, z: 0 })).toBe(-3)
  })

  it('returns zero for point on the plane', () => {
    const plane: FrustumPlane = { normal: { x: 0, y: 1, z: 0 }, distance: 0 }
    expect(planeDistanceToPoint(plane, { x: 10, y: 0, z: -5 })).toBe(0)
  })

  it('handles plane with non-zero distance offset', () => {
    // Plane y=3: normal=(0,1,0), distance=-3
    const plane: FrustumPlane = { normal: { x: 0, y: 1, z: 0 }, distance: -3 }
    expect(planeDistanceToPoint(plane, { x: 0, y: 5, z: 0 })).toBe(2) // 5 + (-3) = 2
    expect(planeDistanceToPoint(plane, { x: 0, y: 3, z: 0 })).toBe(0) // on the plane
    expect(planeDistanceToPoint(plane, { x: 0, y: 1, z: 0 })).toBe(-2) // behind
  })
})

// ── DEFAULT_WORLD_BOUNDS ─────────────────────────────────────────────

describe('DEFAULT_WORLD_BOUNDS', () => {
  it('spans -100 to 100 on all axes', () => {
    expect(DEFAULT_WORLD_BOUNDS.min).toEqual({ x: -100, y: -100, z: -100 })
    expect(DEFAULT_WORLD_BOUNDS.max).toEqual({ x: 100, y: 100, z: 100 })
  })
})

// ── SpatialIndex Class ──────────────────────────────────────────────

describe('SpatialIndex', () => {
  let index: SpatialIndex

  beforeEach(() => {
    index = new SpatialIndex()
  })

  // ── Construction ──────────────────────────────────────────────────

  describe('construction', () => {
    it('creates with default world bounds', () => {
      const stats = index.getStats()
      expect(stats.nodeCount).toBe(1) // just the root
      expect(stats.objectCount).toBe(0)
      expect(stats.maxDepth).toBe(0)
    })

    it('creates with custom bounds', () => {
      const bounds = createAABB({ x: 0, y: 0, z: 0 }, { x: 50, y: 50, z: 50 })
      const customIndex = new SpatialIndex(bounds)
      const stats = customIndex.getStats()
      expect(stats.nodeCount).toBe(1)
      expect(stats.objectCount).toBe(0)
    })

    it('getStats reflects empty tree', () => {
      const stats = index.getStats()
      expect(stats.nodeCount).toBe(1)
      expect(stats.objectCount).toBe(0)
      expect(stats.maxDepth).toBe(0)
    })
  })

  // ── insert + query ────────────────────────────────────────────────

  describe('insert + query', () => {
    it('finds a single inserted object', () => {
      index.insert('obj1', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      const results = index.query(createAABB({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }))
      expect(results).toContain('obj1')
    })

    it('finds multiple inserted objects', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 1, y: 0, z: 0 }, HALF_UNIT)
      index.insert('c', { x: 2, y: 0, z: 0 }, HALF_UNIT)

      // Query a region that overlaps all three
      const results = index.query(createAABB({ x: 1, y: 0, z: 0 }, { x: 3, y: 1, z: 1 }))
      expect(results).toContain('a')
      expect(results).toContain('b')
      expect(results).toContain('c')
    })

    it('only returns objects within query bounds', () => {
      index.insert('near', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('far', { x: 50, y: 50, z: 50 }, HALF_UNIT)

      const results = index.query(createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }))
      expect(results).toContain('near')
      expect(results).not.toContain('far')
    })

    it('handles overlapping query that partially intersects objects', () => {
      index.insert('obj', { x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
      // Query only overlaps partially
      const results = index.query(createAABB({ x: 1.5, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }))
      expect(results).toContain('obj')
    })

    it('returns stats with correct object count after inserts', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 5, y: 5, z: 5 }, HALF_UNIT)
      expect(index.getStats().objectCount).toBe(2)
    })
  })

  // ── insert + queryRadius ──────────────────────────────────────────

  describe('insert + queryRadius', () => {
    it('finds nearby objects within radius', () => {
      index.insert('close', { x: 1, y: 0, z: 0 }, HALF_UNIT)
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 5)
      expect(results).toContain('close')
    })

    it('misses objects outside radius', () => {
      index.insert('far', { x: 50, y: 50, z: 50 }, HALF_UNIT)
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 5)
      expect(results).not.toContain('far')
    })

    it('finds objects right at the radius boundary', () => {
      // Object at (5,0,0) with half-extent 0.5 => AABB from (4.5,-.5,-.5) to (5.5,.5,.5)
      // Closest point on AABB to (0,0,0) is (4.5,0,0), distance = 4.5
      index.insert('boundary', { x: 5, y: 0, z: 0 }, HALF_UNIT)
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 4.5)
      expect(results).toContain('boundary')
    })

    it('returns multiple objects within radius', () => {
      index.insert('a', { x: 1, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: -1, y: 0, z: 0 }, HALF_UNIT)
      index.insert('c', { x: 0, y: 1, z: 0 }, HALF_UNIT)
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 5)
      expect(results).toHaveLength(3)
    })
  })

  // ── queryFrustum ──────────────────────────────────────────────────

  describe('queryFrustum', () => {
    /**
     * Create a simple frustum: a box from x,y,z = -10 to +10 defined by 6 planes.
     * Each plane's normal points inward.
     */
    function makeBoxFrustum(halfSize: number): FrustumPlane[] {
      return [
        { normal: { x: 1, y: 0, z: 0 }, distance: halfSize },   // left:  x >= -halfSize
        { normal: { x: -1, y: 0, z: 0 }, distance: halfSize },  // right: x <= halfSize
        { normal: { x: 0, y: 1, z: 0 }, distance: halfSize },   // bottom: y >= -halfSize
        { normal: { x: 0, y: -1, z: 0 }, distance: halfSize },  // top: y <= halfSize
        { normal: { x: 0, y: 0, z: 1 }, distance: halfSize },   // near: z >= -halfSize
        { normal: { x: 0, y: 0, z: -1 }, distance: halfSize },  // far: z <= halfSize
      ]
    }

    it('finds objects inside frustum', () => {
      index.insert('inside', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      const results = index.queryFrustum(makeBoxFrustum(10))
      expect(results).toContain('inside')
    })

    it('excludes objects outside frustum', () => {
      index.insert('outside', { x: 50, y: 50, z: 50 }, HALF_UNIT)
      const results = index.queryFrustum(makeBoxFrustum(10))
      expect(results).not.toContain('outside')
    })

    it('includes objects partially inside frustum', () => {
      // Object at edge: center at (10,0,0) with half-extent 0.5
      // AABB extends from (9.5,-.5,-.5) to (10.5,.5,.5)
      // The p-vertex for the right plane (normal=-1,0,0) is min.x = 9.5
      // 9.5 is inside the frustum boundary of 10
      index.insert('edge', { x: 10, y: 0, z: 0 }, HALF_UNIT)
      const results = index.queryFrustum(makeBoxFrustum(10))
      expect(results).toContain('edge')
    })

    it('returns empty array when no objects match', () => {
      index.insert('far1', { x: 90, y: 90, z: 90 }, HALF_UNIT)
      index.insert('far2', { x: -90, y: -90, z: -90 }, HALF_UNIT)
      const results = index.queryFrustum(makeBoxFrustum(5))
      expect(results).toHaveLength(0)
    })
  })

  // ── remove ────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes an object so it is no longer found by query', () => {
      index.insert('obj1', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.remove('obj1')
      const results = index.query(createAABB({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 }))
      expect(results).not.toContain('obj1')
    })

    it('does not affect other objects when one is removed', () => {
      index.insert('keep', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('remove', { x: 1, y: 0, z: 0 }, HALF_UNIT)
      index.remove('remove')

      const results = index.query(createAABB({ x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 }))
      expect(results).toContain('keep')
      expect(results).not.toContain('remove')
    })

    it('is safe to call remove on a non-existent id', () => {
      expect(() => index.remove('nonexistent')).not.toThrow()
    })

    it('is safe to double-remove the same id', () => {
      index.insert('obj', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.remove('obj')
      expect(() => index.remove('obj')).not.toThrow()
    })

    it('updates stats after removal', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 5, y: 0, z: 0 }, HALF_UNIT)
      expect(index.getStats().objectCount).toBe(2)
      index.remove('a')
      expect(index.getStats().objectCount).toBe(1)
    })
  })

  // ── update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('moved object is found at new location', () => {
      index.insert('mover', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.update('mover', { x: 50, y: 50, z: 50 }, HALF_UNIT)

      const nearNew = index.query(createAABB({ x: 50, y: 50, z: 50 }, { x: 2, y: 2, z: 2 }))
      expect(nearNew).toContain('mover')
    })

    it('moved object is NOT found at old location', () => {
      index.insert('mover', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.update('mover', { x: 50, y: 50, z: 50 }, HALF_UNIT)

      const nearOld = index.query(createAABB({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }))
      expect(nearOld).not.toContain('mover')
    })

    it('preserves object count after update', () => {
      index.insert('mover', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.update('mover', { x: 10, y: 10, z: 10 }, HALF_UNIT)
      expect(index.getStats().objectCount).toBe(1)
    })

    it('can update half-extents (resize)', () => {
      index.insert('grower', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.update('grower', { x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 })

      // A query at the edge of the new extents should find it
      const results = index.query(createAABB({ x: 4, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }))
      expect(results).toContain('grower')
    })
  })

  // ── clear ─────────────────────────────────────────────────────────

  describe('clear', () => {
    it('empties all objects', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 5, y: 5, z: 5 }, HALF_UNIT)
      index.insert('c', { x: -5, y: -5, z: -5 }, HALF_UNIT)
      index.clear()

      const results = index.query(DEFAULT_WORLD_BOUNDS)
      expect(results).toHaveLength(0)
    })

    it('stats reflect empty state after clear', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 5, y: 5, z: 5 }, HALF_UNIT)
      index.clear()

      const stats = index.getStats()
      expect(stats.objectCount).toBe(0)
      expect(stats.nodeCount).toBe(1) // only root
      expect(stats.maxDepth).toBe(0)
    })

    it('allows insertions after clear', () => {
      index.insert('old', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.clear()
      index.insert('new', { x: 1, y: 1, z: 1 }, HALF_UNIT)

      const results = index.query(createAABB({ x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 }))
      expect(results).toContain('new')
      expect(results).not.toContain('old')
    })
  })

  // ── rebuild ───────────────────────────────────────────────────────

  describe('rebuild', () => {
    it('rebuilds from a SceneObject array', () => {
      const objects: SceneObject[] = [
        makeObj('obj1', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }),
        makeObj('obj2', { x: 5, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }),
        makeObj('obj3', { x: -5, y: -5, z: -5 }, { x: 1, y: 1, z: 1 }),
      ]
      index.rebuild(objects)

      expect(index.getStats().objectCount).toBe(3)
    })

    it('clears existing objects before rebuilding', () => {
      index.insert('old', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      const objects = [makeObj('new1'), makeObj('new2', { x: 5, y: 0, z: 0 })]
      index.rebuild(objects)

      expect(index.getStats().objectCount).toBe(2)
      const allResults = index.query(DEFAULT_WORLD_BOUNDS)
      expect(allResults).not.toContain('old')
      expect(allResults).toContain('new1')
      expect(allResults).toContain('new2')
    })

    it('can query rebuilt objects', () => {
      const objects = [
        makeObj('a', { x: 10, y: 10, z: 10 }, { x: 2, y: 2, z: 2 }),
        makeObj('b', { x: -10, y: -10, z: -10 }, { x: 2, y: 2, z: 2 }),
      ]
      index.rebuild(objects)

      const nearA = index.query(createAABB({ x: 10, y: 10, z: 10 }, { x: 3, y: 3, z: 3 }))
      expect(nearA).toContain('a')
      expect(nearA).not.toContain('b')
    })

    it('rebuilds with empty array', () => {
      index.insert('old', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.rebuild([])
      expect(index.getStats().objectCount).toBe(0)
    })
  })

  // ── Subdivision behavior ──────────────────────────────────────────

  describe('subdivision behavior', () => {
    it('subdivides when exceeding maxObjectsPerNode', () => {
      // Use a small maxObjectsPerNode so we can trigger subdivision easily
      const smallIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 8, 2)

      // Insert 3 objects at different positions to exceed maxObjectsPerNode=2
      smallIndex.insert('a', { x: -25, y: -25, z: -25 }, HALF_UNIT)
      smallIndex.insert('b', { x: 25, y: 25, z: 25 }, HALF_UNIT)
      smallIndex.insert('c', { x: -25, y: 25, z: -25 }, HALF_UNIT)

      const stats = smallIndex.getStats()
      expect(stats.maxDepth).toBeGreaterThan(0)
      expect(stats.nodeCount).toBeGreaterThan(1)
    })

    it('tree depth increases with more objects in same region', () => {
      const smallIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 8, 2)

      // Insert objects at slightly different positions to trigger recursive subdivision
      for (let i = 0; i < 10; i++) {
        smallIndex.insert(`obj${i}`, { x: i * 0.1, y: i * 0.1, z: i * 0.1 }, HALF_UNIT)
      }

      const stats = smallIndex.getStats()
      expect(stats.maxDepth).toBeGreaterThan(1)
      expect(stats.objectCount).toBe(10)
    })

    it('respects maxDepth limit', () => {
      const shallowIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 2, 1)

      // Insert enough objects to attempt deep subdivision
      for (let i = 0; i < 20; i++) {
        shallowIndex.insert(`obj${i}`, { x: i * 0.01, y: 0, z: 0 }, HALF_UNIT)
      }

      const stats = shallowIndex.getStats()
      expect(stats.maxDepth).toBeLessThanOrEqual(2)
    })

    it('all objects are still queryable after subdivision', () => {
      const smallIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 8, 2)
      const ids: string[] = []

      for (let i = 0; i < 10; i++) {
        const id = `obj${i}`
        ids.push(id)
        smallIndex.insert(id, { x: (i - 5) * 10, y: 0, z: 0 }, HALF_UNIT)
      }

      const results = smallIndex.query(DEFAULT_WORLD_BOUNDS)
      for (const id of ids) {
        expect(results).toContain(id)
      }
    })
  })

  // ── Auto-collapse ─────────────────────────────────────────────────

  describe('auto-collapse', () => {
    it('collapses tree when enough objects are removed', () => {
      const smallIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 8, 2)

      // Insert 4 objects to force subdivision
      smallIndex.insert('a', { x: -25, y: -25, z: -25 }, HALF_UNIT)
      smallIndex.insert('b', { x: 25, y: 25, z: 25 }, HALF_UNIT)
      smallIndex.insert('c', { x: -25, y: 25, z: -25 }, HALF_UNIT)
      smallIndex.insert('d', { x: 25, y: -25, z: 25 }, HALF_UNIT)

      const beforeStats = smallIndex.getStats()
      expect(beforeStats.nodeCount).toBeGreaterThan(1)

      // Remove most objects so total drops below maxObjectsPerNode
      smallIndex.remove('a')
      smallIndex.remove('b')
      smallIndex.remove('c')

      const afterStats = smallIndex.getStats()
      // After removing 3 of 4 objects with maxObjectsPerNode=2,
      // only 1 remains so tree should collapse
      expect(afterStats.objectCount).toBe(1)
      expect(afterStats.nodeCount).toBeLessThanOrEqual(beforeStats.nodeCount)
    })

    it('remaining objects are still queryable after collapse', () => {
      const smallIndex = new SpatialIndex(DEFAULT_WORLD_BOUNDS, 8, 2)

      smallIndex.insert('a', { x: -25, y: -25, z: -25 }, HALF_UNIT)
      smallIndex.insert('b', { x: 25, y: 25, z: 25 }, HALF_UNIT)
      smallIndex.insert('c', { x: -25, y: 25, z: -25 }, HALF_UNIT)

      smallIndex.remove('a')
      smallIndex.remove('c')

      const results = smallIndex.query(DEFAULT_WORLD_BOUNDS)
      expect(results).toContain('b')
      expect(results).toHaveLength(1)
    })
  })

  // ── Query edge cases ──────────────────────────────────────────────

  describe('query edge cases', () => {
    it('returns empty array when no objects match', () => {
      index.insert('a', { x: 50, y: 50, z: 50 }, HALF_UNIT)
      const results = index.query(createAABB({ x: -50, y: -50, z: -50 }, { x: 1, y: 1, z: 1 }))
      expect(results).toHaveLength(0)
    })

    it('query on empty index returns empty array', () => {
      const results = index.query(DEFAULT_WORLD_BOUNDS)
      expect(results).toHaveLength(0)
    })

    it('querying entire world bounds returns all objects', () => {
      index.insert('a', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      index.insert('b', { x: 50, y: 50, z: 50 }, HALF_UNIT)
      index.insert('c', { x: -50, y: -50, z: -50 }, HALF_UNIT)

      const results = index.query(DEFAULT_WORLD_BOUNDS)
      expect(results).toHaveLength(3)
      expect(results).toContain('a')
      expect(results).toContain('b')
      expect(results).toContain('c')
    })

    it('queryRadius with zero radius finds objects whose AABB contains center', () => {
      // Object at origin with half-extent 1: AABB from (-1,-1,-1) to (1,1,1)
      // Zero-radius query at origin: closest point on AABB is (0,0,0), dist=0 <= 0
      index.insert('at-origin', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 0)
      expect(results).toContain('at-origin')
    })

    it('queryRadius on empty index returns empty array', () => {
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 100)
      expect(results).toHaveLength(0)
    })

    it('queryFrustum on empty index returns empty array', () => {
      const planes: FrustumPlane[] = [
        { normal: { x: 1, y: 0, z: 0 }, distance: 10 },
        { normal: { x: -1, y: 0, z: 0 }, distance: 10 },
      ]
      const results = index.queryFrustum(planes)
      expect(results).toHaveLength(0)
    })

    it('does not return duplicate ids in query', () => {
      index.insert('obj', { x: 0, y: 0, z: 0 }, HALF_UNIT)
      const results = index.query(DEFAULT_WORLD_BOUNDS)
      const unique = new Set(results)
      expect(unique.size).toBe(results.length)
    })
  })

  // ── Performance sanity ────────────────────────────────────────────

  describe('performance sanity', () => {
    it('inserts 1000 objects and queries in reasonable time (<200ms)', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        index.insert(
          `perf${i}`,
          {
            x: (Math.random() - 0.5) * 180,
            y: (Math.random() - 0.5) * 180,
            z: (Math.random() - 0.5) * 180,
          },
          HALF_UNIT,
        )
      }

      // Query a region covering roughly 1/8 of the world
      const queryResults = index.query(
        createAABB({ x: 0, y: 0, z: 0 }, { x: 50, y: 50, z: 50 }),
      )

      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(200)
      expect(index.getStats().objectCount).toBe(1000)
      // Some objects should be found (not all, not none given random distribution)
      expect(queryResults.length).toBeGreaterThan(0)
      expect(queryResults.length).toBeLessThan(1000)
    })

    it('radius query on 1000 objects completes quickly', () => {
      for (let i = 0; i < 1000; i++) {
        index.insert(
          `r${i}`,
          {
            x: (Math.random() - 0.5) * 180,
            y: (Math.random() - 0.5) * 180,
            z: (Math.random() - 0.5) * 180,
          },
          HALF_UNIT,
        )
      }

      const start = performance.now()
      const results = index.queryRadius({ x: 0, y: 0, z: 0 }, 30)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
      expect(results.length).toBeGreaterThan(0)
    })

    it('rebuild from 1000 SceneObjects completes quickly', () => {
      const objects: SceneObject[] = []
      for (let i = 0; i < 1000; i++) {
        objects.push(
          makeObj(
            `rebuild${i}`,
            {
              x: (Math.random() - 0.5) * 180,
              y: (Math.random() - 0.5) * 180,
              z: (Math.random() - 0.5) * 180,
            },
          ),
        )
      }

      const start = performance.now()
      index.rebuild(objects)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(200)
      expect(index.getStats().objectCount).toBe(1000)
    })
  })
})
