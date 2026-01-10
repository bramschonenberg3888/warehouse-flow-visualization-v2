/**
 * Scenario Engine Module
 *
 * Graph-based flow simulation for warehouse visualization.
 */

// Core types
export * from "./types"

// Engine
export { ScenarioEngine } from "./engine"
export type { EngineConfig } from "./engine"

// Conditions
export {
  evaluateCondition,
  selectWeightedIndex,
  createSeededRandom,
} from "./conditions"
export type { ConditionContext } from "./conditions"

// Selection rules
export { selectTargetElement } from "./selection-rules"
export type { PlacedElementInfo, SelectionContext } from "./selection-rules"
