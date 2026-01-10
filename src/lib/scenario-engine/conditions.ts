/**
 * Condition Evaluators for Decision Nodes
 *
 * Evaluates conditions to determine flow branching
 */

import type { Condition, Pallet } from "./types"

export interface ConditionContext {
  /** Current simulation time in ms */
  simulationTime: number
  /** Named counters for counting conditions */
  counters: Map<string, number>
  /** Element capacities (elementId -> current count) */
  elementCapacities: Map<string, number>
  /** Random number generator */
  random: () => number
}

/**
 * Evaluate a condition and return true/false
 */
export function evaluateCondition(
  condition: Condition,
  _pallet: Pallet,
  context: ConditionContext
): boolean {
  switch (condition.type) {
    case "probability":
      return context.random() < condition.chance

    case "capacity": {
      const current = context.elementCapacities.get(condition.elementId) ?? 0
      return compareValues(current, condition.operator, condition.value)
    }

    case "time":
      return compareValues(
        context.simulationTime,
        condition.operator,
        condition.value
      )

    case "counter": {
      const count = context.counters.get(condition.name) ?? 0
      return compareValues(count, condition.operator, condition.value)
    }

    case "random-choice":
      // Random choice returns index, we convert to boolean for simple true/false
      // For more complex cases, use weighted edges instead
      return selectWeightedIndex(condition.weights, context.random()) === 0

    default:
      console.warn("Unknown condition type:", condition)
      return true
  }
}

/**
 * Compare two values with an operator
 */
function compareValues(
  left: number,
  operator: "<" | ">" | "==",
  right: number
): boolean {
  switch (operator) {
    case "<":
      return left < right
    case ">":
      return left > right
    case "==":
      return left === right
    default:
      return false
  }
}

/**
 * Select an index based on weights
 */
export function selectWeightedIndex(
  weights: number[],
  randomValue: number
): number {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight === 0) return 0

  let accumulated = 0
  const target = randomValue * totalWeight

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i]
    if (weight === undefined) continue
    accumulated += weight
    if (target <= accumulated) return i
  }

  return weights.length - 1
}

/**
 * Create a seeded random number generator
 * Simple implementation using xorshift32
 */
export function createSeededRandom(seed?: number): () => number {
  // Use current time if no seed provided
  let state = seed ?? Date.now()

  // Ensure state is non-zero
  if (state === 0) state = 1

  return () => {
    // xorshift32 algorithm
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    // Convert to 0-1 range
    return (state >>> 0) / 4294967296
  }
}
