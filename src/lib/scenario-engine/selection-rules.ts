/**
 * Location Selection Rules
 *
 * Strategies for selecting target elements when using
 * category, zone, or random targeting.
 */

import type { SelectionRule, LocationTarget, Pallet } from "./types"
import type { Point } from "@/lib/pathfinding"

export interface PlacedElementInfo {
  id: string
  categoryId: string | null
  positionX: number
  positionY: number
  width: number
  height: number
  metadata?: Record<string, unknown>
}

export interface SelectionContext {
  /** All placed elements in the warehouse */
  elements: PlacedElementInfo[]
  /** Visit counts per element (for least-visited rule) */
  visitCounts: Map<string, number>
  /** Current capacity per element (for most-available rule) */
  capacities: Map<string, number>
  /** Max capacity per element */
  maxCapacities: Map<string, number>
  /** Round-robin state per flow (flowId -> last selected index) */
  roundRobinState: Map<string, number>
  /** Random number generator */
  random: () => number
}

/**
 * Select a target element based on location target configuration
 */
export function selectTargetElement(
  target: LocationTarget,
  pallet: Pallet,
  context: SelectionContext
): string | null {
  switch (target.type) {
    case "fixed":
      return target.elementId

    case "random":
      return selectFromPool(target.pool, "random", pallet, context)

    case "category": {
      const pool = context.elements
        .filter((e) => e.categoryId === target.categoryId)
        .map((e) => e.id)
      return selectFromPool(pool, target.rule, pallet, context)
    }

    case "zone": {
      // Zone-based selection - filter by zone metadata
      const pool = context.elements
        .filter((e) => {
          const zone = e.metadata?.["zone"]
          return zone === target.zone
        })
        .map((e) => e.id)
      return selectFromPool(pool, target.rule, pallet, context)
    }

    default:
      console.warn("Unknown target type:", target)
      return null
  }
}

/**
 * Select from a pool of element IDs using the specified rule
 */
function selectFromPool(
  pool: string[],
  rule: SelectionRule,
  pallet: Pallet,
  context: SelectionContext
): string | null {
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0] ?? null

  switch (rule) {
    case "random":
      return selectRandom(pool, context.random)

    case "nearest":
      return selectNearest(pool, pallet.position, context.elements)

    case "furthest":
      return selectFurthest(pool, pallet.position, context.elements)

    case "least-visited":
      return selectLeastVisited(pool, context.visitCounts, context.random)

    case "most-available":
      return selectMostAvailable(
        pool,
        context.capacities,
        context.maxCapacities,
        context.random
      )

    case "round-robin":
      return selectRoundRobin(pool, pallet.flowId, context.roundRobinState)

    default:
      return selectRandom(pool, context.random)
  }
}

/**
 * Random selection
 */
function selectRandom(pool: string[], random: () => number): string | null {
  const index = Math.floor(random() * pool.length)
  return pool[index] ?? null
}

/**
 * Select nearest element to current position
 */
function selectNearest(
  pool: string[],
  position: Point,
  elements: PlacedElementInfo[]
): string | null {
  let nearest: string | null = null
  let minDistance = Infinity

  for (const id of pool) {
    const element = elements.find((e) => e.id === id)
    if (!element) continue

    const center = getElementCenter(element)
    const distance = manhattanDistance(position, center)

    if (distance < minDistance) {
      minDistance = distance
      nearest = id
    }
  }

  return nearest
}

/**
 * Select furthest element from current position
 */
function selectFurthest(
  pool: string[],
  position: Point,
  elements: PlacedElementInfo[]
): string | null {
  let furthest: string | null = null
  let maxDistance = -1

  for (const id of pool) {
    const element = elements.find((e) => e.id === id)
    if (!element) continue

    const center = getElementCenter(element)
    const distance = manhattanDistance(position, center)

    if (distance > maxDistance) {
      maxDistance = distance
      furthest = id
    }
  }

  return furthest
}

/**
 * Select least visited element
 */
function selectLeastVisited(
  pool: string[],
  visitCounts: Map<string, number>,
  random: () => number
): string | null {
  // Find minimum visit count
  let minVisits = Infinity
  for (const id of pool) {
    const visits = visitCounts.get(id) ?? 0
    if (visits < minVisits) minVisits = visits
  }

  // Get all elements with minimum visits
  const candidates = pool.filter((id) => {
    const visits = visitCounts.get(id) ?? 0
    return visits === minVisits
  })

  // Random selection among tied elements
  return selectRandom(candidates, random)
}

/**
 * Select element with most available capacity
 */
function selectMostAvailable(
  pool: string[],
  capacities: Map<string, number>,
  maxCapacities: Map<string, number>,
  random: () => number
): string | null {
  // Calculate available capacity for each
  const availabilities: Array<{ id: string; available: number }> = []

  for (const id of pool) {
    const current = capacities.get(id) ?? 0
    const max = maxCapacities.get(id) ?? Infinity
    const available = max - current
    if (available > 0) {
      availabilities.push({ id, available })
    }
  }

  if (availabilities.length === 0) return null

  // Find max available
  const maxAvailable = Math.max(...availabilities.map((a) => a.available))

  // Get all elements with max availability
  const candidates = availabilities
    .filter((a) => a.available === maxAvailable)
    .map((a) => a.id)

  return selectRandom(candidates, random)
}

/**
 * Round-robin selection
 */
function selectRoundRobin(
  pool: string[],
  flowId: string,
  state: Map<string, number>
): string | null {
  const lastIndex = state.get(flowId) ?? -1
  const nextIndex = (lastIndex + 1) % pool.length
  state.set(flowId, nextIndex)
  return pool[nextIndex] ?? null
}

/**
 * Get center point of an element
 */
function getElementCenter(element: PlacedElementInfo): Point {
  return {
    x: element.positionX + element.width / 2,
    y: element.positionY + element.height / 2,
  }
}

/**
 * Manhattan distance between two points
 */
function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
}
