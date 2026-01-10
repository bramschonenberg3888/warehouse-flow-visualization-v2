/**
 * Pathfinding utilities for flow visualization
 * Ported from warehouse_flow_visualization_app prototype
 */

// Base speed in pixels per second
export const BASE_SPEED = 100

export interface Point {
  x: number
  y: number
}

/**
 * Calculate Manhattan distance between two points
 */
export function manhattanDistance(from: Point, to: Point): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
}

/**
 * Generate a path from start to end using Manhattan movement (no diagonals)
 * Returns array of points: start -> horizontal waypoint -> end
 */
export function generatePath(start: Point, end: Point): Point[] {
  // If same position, just return start
  if (start.x === end.x && start.y === end.y) {
    return [{ x: start.x, y: start.y }]
  }

  // Manhattan path: first horizontal, then vertical
  // Create waypoint at (end.x, start.y)
  const waypoint: Point = { x: end.x, y: start.y }

  // If already aligned horizontally, just go vertical
  if (start.x === end.x) {
    return [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y },
    ]
  }

  // If already aligned vertically, just go horizontal
  if (start.y === end.y) {
    return [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y },
    ]
  }

  // Full L-shaped path
  return [{ x: start.x, y: start.y }, waypoint, { x: end.x, y: end.y }]
}

/**
 * Generate a multi-segment path through multiple points
 * Each segment uses Manhattan movement
 */
export function generateMultiPath(points: Point[]): Point[] {
  if (points.length === 0) return []
  const first = points[0]
  if (!first) return []
  if (points.length === 1) return [{ x: first.x, y: first.y }]

  const fullPath: Point[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    if (!current || !next) continue

    const segment = generatePath(current, next)
    // Skip first point of segment if not the first segment (avoid duplicates)
    if (i === 0) {
      fullPath.push(...segment)
    } else {
      fullPath.push(...segment.slice(1))
    }
  }

  return fullPath
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Get position along path at given progress (0 to 1)
 */
export function getPositionAlongPath(path: Point[], progress: number): Point {
  if (path.length === 0) return { x: 0, y: 0 }
  const first = path[0]
  if (!first) return { x: 0, y: 0 }
  if (path.length === 1) return { x: first.x, y: first.y }
  if (progress <= 0) return { x: first.x, y: first.y }

  const last = path[path.length - 1]
  if (!last) return { x: first.x, y: first.y }
  if (progress >= 1) return { x: last.x, y: last.y }

  // Calculate total path length
  let totalLength = 0
  const segmentLengths: number[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i]
    const next = path[i + 1]
    if (!current || !next) continue
    const length = Math.abs(next.x - current.x) + Math.abs(next.y - current.y)
    segmentLengths.push(length)
    totalLength += length
  }

  if (totalLength === 0) return { x: first.x, y: first.y }

  // Find which segment we're on based on progress
  const targetDistance = progress * totalLength
  let accumulatedDistance = 0

  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i]
    if (segmentLength === undefined) continue

    if (accumulatedDistance + segmentLength >= targetDistance) {
      const current = path[i]
      const next = path[i + 1]
      if (!current || !next) break

      // We're in this segment
      const segmentProgress =
        segmentLength > 0
          ? (targetDistance - accumulatedDistance) / segmentLength
          : 0
      return {
        x: lerp(current.x, next.x, segmentProgress),
        y: lerp(current.y, next.y, segmentProgress),
      }
    }
    accumulatedDistance += segmentLength
  }

  return { x: last.x, y: last.y }
}

/**
 * Calculate total path length in pixels
 */
export function getPathLength(path: Point[]): number {
  if (path.length <= 1) return 0
  let total = 0
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i]
    const next = path[i + 1]
    if (!current || !next) continue
    total += Math.abs(next.x - current.x) + Math.abs(next.y - current.y)
  }
  return total
}

/**
 * Calculate duration for path based on speed
 * @param path - The path points
 * @param speedMultiplier - Speed multiplier (1.0 = normal, 2.0 = double speed)
 * @returns Duration in milliseconds
 */
export function getPathDuration(
  path: Point[],
  speedMultiplier: number = 1.0
): number {
  const length = getPathLength(path)
  const speed = BASE_SPEED * speedMultiplier
  return (length / speed) * 1000 // milliseconds
}

/**
 * Get the center point of an element
 */
export function getElementCenter(element: {
  positionX: number
  positionY: number
  width: number
  height: number
}): Point {
  return {
    x: element.positionX + element.width / 2,
    y: element.positionY + element.height / 2,
  }
}
