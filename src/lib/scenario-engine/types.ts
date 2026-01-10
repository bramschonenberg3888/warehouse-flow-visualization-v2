/**
 * Scenario Engine Type Definitions
 *
 * Graph-based flow simulation model supporting:
 * - Multiple flows per scenario
 * - Location, Decision, and Exit nodes
 * - Conditional branching
 * - Multi-pallet spawning
 */

// =============================================================================
// SCENARIO (Top-Level Container)
// =============================================================================

export interface Scenario {
  id: string
  name: string
  warehouseId: string
  description?: string

  /** Multiple flows can run simultaneously */
  flows: FlowDefinition[]

  /** Global simulation settings */
  settings: ScenarioSettings
}

export interface ScenarioSettings {
  /** Max simulation time (ms), undefined = infinite */
  duration?: number
  /** Speed multiplier: 0.5x - 10x */
  speedMultiplier: number
  /** Seed for reproducible randomness */
  seed?: number
}

// =============================================================================
// FLOW DEFINITION
// =============================================================================

export interface FlowDefinition {
  id: string
  name: string
  color: string
  isActive: boolean

  /** Entry point node ID - where pallets spawn */
  entryNode: string

  /** All nodes in this flow (graph structure) */
  nodes: FlowNode[]

  /** Connections between nodes */
  edges: FlowEdge[]

  /** Spawning configuration */
  spawning: SpawnConfig
}

// =============================================================================
// FLOW NODES
// =============================================================================

export type FlowNode = LocationNode | DecisionNode | ExitNode

/** Physical location in warehouse */
export interface LocationNode {
  type: "location"
  id: string

  /** Location selection strategy */
  target: LocationTarget

  /** What happens at this location */
  action: NodeAction
}

/** Conditional branching point */
export interface DecisionNode {
  type: "decision"
  id: string

  /** Condition to evaluate */
  condition: Condition
}

/** Flow termination point */
export interface ExitNode {
  type: "exit"
  id: string
}

// =============================================================================
// LOCATION TARGETING
// =============================================================================

export type LocationTarget =
  | FixedTarget
  | RandomTarget
  | CategoryTarget
  | ZoneTarget

/** Fixed element by ID */
export interface FixedTarget {
  type: "fixed"
  elementId: string
}

/** Random selection from pool */
export interface RandomTarget {
  type: "random"
  pool: string[]
}

/** Category-based selection with rule */
export interface CategoryTarget {
  type: "category"
  categoryId: string
  rule: SelectionRule
}

/** Zone-based selection with rule */
export interface ZoneTarget {
  type: "zone"
  zone: string
  rule: SelectionRule
}

export type SelectionRule =
  | "random"
  | "nearest"
  | "furthest"
  | "least-visited"
  | "most-available"
  | "round-robin"

// =============================================================================
// NODE ACTIONS
// =============================================================================

export interface NodeAction {
  /** Dwell time configuration */
  dwell: DwellConfig

  /** Optional: operation type for analytics */
  operation?: OperationType

  /** Optional: capacity constraints */
  capacity?: CapacityConfig
}

export type DwellConfig = FixedDwell | RangeDwell | DistributionDwell

export interface FixedDwell {
  type: "fixed"
  /** Duration in milliseconds */
  duration: number
}

export interface RangeDwell {
  type: "range"
  /** Minimum duration in ms */
  min: number
  /** Maximum duration in ms */
  max: number
}

export interface DistributionDwell {
  type: "distribution"
  /** Mean duration in ms */
  mean: number
  /** Standard deviation in ms */
  stdDev: number
}

export type OperationType =
  | "receive"
  | "store"
  | "pick"
  | "pack"
  | "ship"
  | "inspect"

export interface CapacityConfig {
  /** Maximum pallets at this location */
  max: number
  /** Block incoming pallets when full */
  blockWhenFull: boolean
}

// =============================================================================
// FLOW EDGES
// =============================================================================

export interface FlowEdge {
  id: string
  from: string
  to: string

  /** For decision nodes: which condition outcome triggers this edge */
  condition?: "true" | "false"

  /** Optional: probability weight for random branching */
  weight?: number
}

// =============================================================================
// CONDITIONS
// =============================================================================

export type Condition =
  | ProbabilityCondition
  | CapacityCondition
  | TimeCondition
  | CounterCondition
  | RandomChoiceCondition

export interface ProbabilityCondition {
  type: "probability"
  /** Chance of true outcome (0-1) */
  chance: number
}

export interface CapacityCondition {
  type: "capacity"
  elementId: string
  operator: "<" | ">" | "=="
  value: number
}

export interface TimeCondition {
  type: "time"
  /** Simulation time in ms */
  operator: "<" | ">"
  value: number
}

export interface CounterCondition {
  type: "counter"
  name: string
  operator: "<" | ">" | "=="
  value: number
}

export interface RandomChoiceCondition {
  type: "random-choice"
  /** Weights for each outgoing edge */
  weights: number[]
}

// =============================================================================
// SPAWN CONFIGURATION
// =============================================================================

export type SpawnConfig = IntervalSpawn | BatchSpawn | ManualSpawn

export interface IntervalSpawn {
  mode: "interval"
  /** Milliseconds between spawns */
  duration: number
  /** Optional random variance in ms */
  variance?: number
  /** Maximum concurrent pallets */
  maxActive?: number
  /** Maximum total spawned */
  totalLimit?: number
}

export interface BatchSpawn {
  mode: "batch"
  /** Pallets per batch */
  size: number
  /** Milliseconds between pallets in batch */
  spacing: number
  /** Milliseconds between batches */
  batchInterval: number
  /** Maximum concurrent pallets */
  maxActive?: number
  /** Maximum total spawned */
  totalLimit?: number
}

export interface ManualSpawn {
  mode: "manual"
  /** Maximum concurrent pallets */
  maxActive?: number
  /** Maximum total spawned */
  totalLimit?: number
}

// =============================================================================
// RUNTIME STATE (Used by Engine)
// =============================================================================

export type PalletState = "moving" | "dwelling" | "waiting" | "completed"

export interface Pallet {
  id: string
  flowId: string

  /** Current state */
  state: PalletState

  /** Current node ID */
  currentNodeId: string
  /** Next node ID (when moving) */
  nextNodeId?: string

  /** Current position */
  position: { x: number; y: number }

  /** Timing */
  stateStartTime: number
  /** Remaining dwell time (when dwelling) */
  dwellRemaining?: number

  /** Path for current segment */
  currentPath?: Array<{ x: number; y: number }>
  /** Progress along current path (0-1) */
  pathProgress: number

  /** History for analytics */
  visitedNodes: string[]
  spawnTime: number
}

// =============================================================================
// ENGINE EVENTS
// =============================================================================

export interface EngineEvents {
  onPalletSpawned?: (pallet: Pallet) => void
  onPalletMoved?: (pallet: Pallet) => void
  onPalletStateChanged?: (pallet: Pallet, oldState: PalletState) => void
  onPalletCompleted?: (pallet: Pallet) => void
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/** Database row type (scenario stored as JSONB) */
export interface ScenarioRow {
  id: string
  warehouseId: string
  name: string
  description: string | null
  definition: ScenarioDefinition
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/** The JSONB content stored in database */
export interface ScenarioDefinition {
  flows: FlowDefinition[]
  settings: ScenarioSettings
}
