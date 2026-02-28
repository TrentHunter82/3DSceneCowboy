/** Pure function module implementing an Octree for spatial indexing of 3D scene objects */

import type { Vec3, SceneObject } from '../types/scene'

// ── Types ────────────────────────────────────────────────────────────

/** Axis-aligned bounding box */
export interface AABB {
  min: Vec3
  max: Vec3
}

/** A single node in the octree */
export interface OctreeNode {
  bounds: AABB
  objects: string[]
  children: OctreeNode[] | null
  depth: number
}

/** Frustum clipping plane */
export interface FrustumPlane {
  normal: Vec3
  distance: number
}

// ── Helper Pure Functions ────────────────────────────────────────────

/** Create an AABB from a center point and half-extents */
export function createAABB(center: Vec3, halfExtents: Vec3): AABB {
  return {
    min: {
      x: center.x - halfExtents.x,
      y: center.y - halfExtents.y,
      z: center.z - halfExtents.z,
    },
    max: {
      x: center.x + halfExtents.x,
      y: center.y + halfExtents.y,
      z: center.z + halfExtents.z,
    },
  }
}

/** Test whether two AABBs intersect (overlap or touch) */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  )
}

/** Test whether outer AABB fully contains inner AABB */
export function aabbContains(outer: AABB, inner: AABB): boolean {
  return (
    outer.min.x <= inner.min.x &&
    outer.max.x >= inner.max.x &&
    outer.min.y <= inner.min.y &&
    outer.max.y >= inner.max.y &&
    outer.min.z <= inner.min.z &&
    outer.max.z >= inner.max.z
  )
}

/** Test whether a sphere intersects an AABB */
export function sphereIntersectsAABB(
  center: Vec3,
  radius: number,
  box: AABB,
): boolean {
  // Find the closest point on the AABB to the sphere center
  const closestX = Math.max(box.min.x, Math.min(center.x, box.max.x))
  const closestY = Math.max(box.min.y, Math.min(center.y, box.max.y))
  const closestZ = Math.max(box.min.z, Math.min(center.z, box.max.z))

  const dx = center.x - closestX
  const dy = center.y - closestY
  const dz = center.z - closestZ

  return dx * dx + dy * dy + dz * dz <= radius * radius
}

/** Convert a SceneObject to its AABB (position +/- scale/2) */
export function objectToAABB(obj: SceneObject): AABB {
  const halfX = Math.abs(obj.scale.x) / 2
  const halfY = Math.abs(obj.scale.y) / 2
  const halfZ = Math.abs(obj.scale.z) / 2
  return {
    min: {
      x: obj.position.x - halfX,
      y: obj.position.y - halfY,
      z: obj.position.z - halfZ,
    },
    max: {
      x: obj.position.x + halfX,
      y: obj.position.y + halfY,
      z: obj.position.z + halfZ,
    },
  }
}

/** Signed distance from a plane to a point (positive = in front of plane) */
export function planeDistanceToPoint(
  plane: FrustumPlane,
  point: Vec3,
): number {
  return (
    plane.normal.x * point.x +
    plane.normal.y * point.y +
    plane.normal.z * point.z +
    plane.distance
  )
}

// ── Internal Helpers ─────────────────────────────────────────────────

/** Test whether an AABB is at least partially inside all frustum planes */
function aabbInsideFrustum(box: AABB, planes: FrustumPlane[]): boolean {
  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i]

    // Find the AABB vertex most in the direction of the plane normal (p-vertex)
    const px = plane.normal.x >= 0 ? box.max.x : box.min.x
    const py = plane.normal.y >= 0 ? box.max.y : box.min.y
    const pz = plane.normal.z >= 0 ? box.max.z : box.min.z

    // If the p-vertex is behind the plane, the entire AABB is outside
    if (
      plane.normal.x * px +
        plane.normal.y * py +
        plane.normal.z * pz +
        plane.distance <
      0
    ) {
      return false
    }
  }
  return true
}

/** Create a fresh octree node */
function createNode(bounds: AABB, depth: number): OctreeNode {
  return {
    bounds,
    objects: [],
    children: null,
    depth,
  }
}

/** Subdivide a node into 8 children octants */
function subdivide(node: OctreeNode): void {
  const { min, max } = node.bounds
  const midX = (min.x + max.x) / 2
  const midY = (min.y + max.y) / 2
  const midZ = (min.z + max.z) / 2

  const childDepth = node.depth + 1

  // 8 octants: iterate over all combinations of min/max halves
  node.children = [
    createNode({ min: { x: min.x, y: min.y, z: min.z }, max: { x: midX, y: midY, z: midZ } }, childDepth),
    createNode({ min: { x: midX, y: min.y, z: min.z }, max: { x: max.x, y: midY, z: midZ } }, childDepth),
    createNode({ min: { x: min.x, y: midY, z: min.z }, max: { x: midX, y: max.y, z: midZ } }, childDepth),
    createNode({ min: { x: midX, y: midY, z: min.z }, max: { x: max.x, y: max.y, z: midZ } }, childDepth),
    createNode({ min: { x: min.x, y: min.y, z: midZ }, max: { x: midX, y: midY, z: max.z } }, childDepth),
    createNode({ min: { x: midX, y: min.y, z: midZ }, max: { x: max.x, y: midY, z: max.z } }, childDepth),
    createNode({ min: { x: min.x, y: midY, z: midZ }, max: { x: midX, y: max.y, z: max.z } }, childDepth),
    createNode({ min: { x: midX, y: midY, z: midZ }, max: { x: max.x, y: max.y, z: max.z } }, childDepth),
  ]
}

// ── Default World Bounds ─────────────────────────────────────────────

export const DEFAULT_WORLD_BOUNDS: AABB = {
  min: { x: -100, y: -100, z: -100 },
  max: { x: 100, y: 100, z: 100 },
}

// ── SpatialIndex Class ──────────────────────────────────────────────

/** Internal record for O(1) object lookups */
interface ObjectEntry {
  id: string
  aabb: AABB
}

export class SpatialIndex {
  private root: OctreeNode
  private readonly maxDepth: number
  private readonly maxObjectsPerNode: number
  private readonly worldBounds: AABB

  /** O(1) lookup: object id -> its AABB (avoids scanning the tree for remove/update) */
  private objectMap: Map<string, ObjectEntry> = new Map()

  constructor(
    bounds: AABB = DEFAULT_WORLD_BOUNDS,
    maxDepth: number = 8,
    maxObjectsPerNode: number = 8,
  ) {
    this.worldBounds = bounds
    this.maxDepth = maxDepth
    this.maxObjectsPerNode = maxObjectsPerNode
    this.root = createNode(bounds, 0)
  }

  // ── Public API ────────────────────────────────────────────────────

  /** Insert an object with its position and half-size */
  insert(id: string, position: Vec3, halfExtents: Vec3): void {
    const aabb = createAABB(position, halfExtents)
    this.objectMap.set(id, { id, aabb })
    this.insertIntoNode(this.root, id, aabb)
  }

  /** Remove an object by id */
  remove(id: string): void {
    const entry = this.objectMap.get(id)
    if (!entry) return

    this.removeFromNode(this.root, id, entry.aabb)
    this.objectMap.delete(id)
  }

  /** Update an object's position (remove + insert) */
  update(id: string, position: Vec3, halfExtents: Vec3): void {
    this.remove(id)
    this.insert(id, position, halfExtents)
  }

  /** Return all object IDs whose bounds intersect the query bounds */
  query(bounds: AABB): string[] {
    const result: string[] = []
    this.queryNode(this.root, bounds, result)
    return result
  }

  /** Return object IDs visible within frustum planes */
  queryFrustum(planes: FrustumPlane[]): string[] {
    const result: string[] = []
    this.queryFrustumNode(this.root, planes, result)
    return result
  }

  /** Return object IDs within radius of center */
  queryRadius(center: Vec3, radius: number): string[] {
    const result: string[] = []
    this.queryRadiusNode(this.root, center, radius, result)
    return result
  }

  /** Remove all objects */
  clear(): void {
    this.objectMap.clear()
    this.root = createNode(this.worldBounds, 0)
  }

  /** Clear and re-insert all objects (for batch updates) */
  rebuild(objects: SceneObject[]): void {
    this.clear()
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i]
      const halfX = Math.abs(obj.scale.x) / 2
      const halfY = Math.abs(obj.scale.y) / 2
      const halfZ = Math.abs(obj.scale.z) / 2
      this.insert(obj.id, obj.position, { x: halfX, y: halfY, z: halfZ })
    }
  }

  /** Debug info about the current octree state */
  getStats(): { nodeCount: number; objectCount: number; maxDepth: number } {
    let nodeCount = 0
    let maxDepthSeen = 0

    const walk = (node: OctreeNode) => {
      nodeCount++
      if (node.depth > maxDepthSeen) maxDepthSeen = node.depth
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          walk(node.children[i])
        }
      }
    }

    walk(this.root)

    return {
      nodeCount,
      objectCount: this.objectMap.size,
      maxDepth: maxDepthSeen,
    }
  }

  // ── Private Methods ───────────────────────────────────────────────

  /** Insert an object into the appropriate node(s) of the tree */
  private insertIntoNode(node: OctreeNode, id: string, aabb: AABB): void {
    // If this node has children, try to push the object down
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (aabbIntersects(child.bounds, aabb)) {
          // If the child fully contains the object, recurse only into that child
          if (aabbContains(child.bounds, aabb)) {
            this.insertIntoNode(child, id, aabb)
            return
          }
        }
      }
      // Object spans multiple children - store it at this level
      node.objects.push(id)
      return
    }

    // Leaf node: add the object
    node.objects.push(id)

    // Check if we should subdivide
    if (
      node.objects.length > this.maxObjectsPerNode &&
      node.depth < this.maxDepth
    ) {
      subdivide(node)

      // Re-distribute existing objects into children
      const existing = node.objects
      node.objects = []

      for (let i = 0; i < existing.length; i++) {
        const objId = existing[i]
        const entry = this.objectMap.get(objId)
        if (entry) {
          this.insertIntoNode(node, objId, entry.aabb)
        }
      }
    }
  }

  /** Remove an object from the tree using its known AABB to guide traversal */
  private removeFromNode(node: OctreeNode, id: string, aabb: AABB): boolean {
    // Check this node's objects
    const idx = node.objects.indexOf(id)
    if (idx !== -1) {
      node.objects.splice(idx, 1)
      this.tryCollapse(node)
      return true
    }

    // Recurse into children that intersect the object's AABB
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (aabbIntersects(child.bounds, aabb)) {
          if (this.removeFromNode(child, id, aabb)) {
            this.tryCollapse(node)
            return true
          }
        }
      }
    }

    return false
  }

  /** Collapse children back into parent if total object count is low enough */
  private tryCollapse(node: OctreeNode): void {
    if (!node.children) return

    let totalObjects = node.objects.length
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      // Don't collapse if any child has its own children (deep subtrees)
      if (child.children) return
      totalObjects += child.objects.length
    }

    if (totalObjects <= this.maxObjectsPerNode) {
      // Gather all child objects into this node
      for (let i = 0; i < node.children.length; i++) {
        const childObjects = node.children[i].objects
        for (let j = 0; j < childObjects.length; j++) {
          node.objects.push(childObjects[j])
        }
      }
      node.children = null
    }
  }

  /** Query AABB intersection */
  private queryNode(node: OctreeNode, bounds: AABB, result: string[]): void {
    if (!aabbIntersects(node.bounds, bounds)) return

    // Check objects at this node level
    for (let i = 0; i < node.objects.length; i++) {
      const id = node.objects[i]
      const entry = this.objectMap.get(id)
      if (entry && aabbIntersects(entry.aabb, bounds)) {
        result.push(id)
      }
    }

    // Recurse into children
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        this.queryNode(node.children[i], bounds, result)
      }
    }
  }

  /** Query frustum culling */
  private queryFrustumNode(
    node: OctreeNode,
    planes: FrustumPlane[],
    result: string[],
  ): void {
    // Early-out: if the node's bounds are entirely outside any plane, skip
    if (!aabbInsideFrustum(node.bounds, planes)) return

    // Check objects at this node level
    for (let i = 0; i < node.objects.length; i++) {
      const id = node.objects[i]
      const entry = this.objectMap.get(id)
      if (entry && aabbInsideFrustum(entry.aabb, planes)) {
        result.push(id)
      }
    }

    // Recurse into children
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        this.queryFrustumNode(node.children[i], planes, result)
      }
    }
  }

  /** Query radius (sphere) intersection */
  private queryRadiusNode(
    node: OctreeNode,
    center: Vec3,
    radius: number,
    result: string[],
  ): void {
    // Early-out: if the sphere doesn't intersect the node bounds, skip
    if (!sphereIntersectsAABB(center, radius, node.bounds)) return

    // Check objects at this node level
    for (let i = 0; i < node.objects.length; i++) {
      const id = node.objects[i]
      const entry = this.objectMap.get(id)
      if (entry && sphereIntersectsAABB(center, radius, entry.aabb)) {
        result.push(id)
      }
    }

    // Recurse into children
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        this.queryRadiusNode(node.children[i], center, radius, result)
      }
    }
  }
}
