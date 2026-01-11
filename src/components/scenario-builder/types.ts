/**
 * UI-friendly types for the Scenario Builder
 *
 * These types make the graph structure more intuitive for users
 * by presenting flows as ordered step lists rather than node/edge graphs.
 */

import type {
  FlowDefinition,
  LocationTarget,
  DwellConfig,
  Condition,
  SpawnConfig,
  OperationType,
  CapacityConfig,
} from "@/lib/scenario-engine/types"

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface UIFlow {
  id: string
  name: string
  color: string
  isActive: boolean
  steps: UIStep[]
  spawning: SpawnConfig
}

export type UIStep = UILocationStep | UIDecisionStep | UIExitStep

export interface UILocationStep {
  type: "location"
  id: string
  target: LocationTarget
  dwell: DwellConfig
  operation?: OperationType
  capacity?: CapacityConfig
}

export interface UIDecisionStep {
  type: "decision"
  id: string
  condition: Condition
  /** Step ID for true outcome - if not set, continues to next step */
  truePath?: string
  /** Step ID for false outcome - if not set, continues to next step */
  falsePath?: string
}

export interface UIExitStep {
  type: "exit"
  id: string
}

// =============================================================================
// EDITOR STATE
// =============================================================================

export interface ScenarioEditorState {
  // Metadata
  name: string
  description: string
  warehouseId: string

  // Flows
  flows: UIFlow[]
  selectedFlowId: string | null

  // Settings
  speedMultiplier: number

  // UI state
  isDirty: boolean
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert engine FlowDefinition to UI-friendly UIFlow
 */
export function flowDefinitionToUIFlow(flow: FlowDefinition): UIFlow {
  // Build adjacency map from edges
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()

  for (const edge of flow.edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, [])
    outgoing.get(edge.from)!.push(edge.to)

    if (!incoming.has(edge.to)) incoming.set(edge.to, [])
    incoming.get(edge.to)!.push(edge.from)
  }

  // Topological sort starting from entry node
  const visited = new Set<string>()
  const ordered: string[] = []

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    ordered.push(nodeId)

    // Visit outgoing nodes
    const targets = outgoing.get(nodeId) ?? []
    for (const target of targets) {
      visit(target)
    }
  }

  visit(flow.entryNode)

  // Convert nodes to steps in order
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]))
  const steps: UIStep[] = []

  for (const nodeId of ordered) {
    const node = nodeMap.get(nodeId)
    if (!node) continue

    if (node.type === "location") {
      steps.push({
        type: "location",
        id: node.id,
        target: node.target,
        dwell: node.action.dwell,
        operation: node.action.operation,
        capacity: node.action.capacity,
      })
    } else if (node.type === "decision") {
      // Find true/false paths from edges
      const edges = flow.edges.filter((e) => e.from === node.id)
      const trueEdge = edges.find((e) => e.condition === "true")
      const falseEdge = edges.find((e) => e.condition === "false")

      steps.push({
        type: "decision",
        id: node.id,
        condition: node.condition,
        truePath: trueEdge?.to,
        falsePath: falseEdge?.to,
      })
    } else if (node.type === "exit") {
      steps.push({
        type: "exit",
        id: node.id,
      })
    }
  }

  return {
    id: flow.id,
    name: flow.name,
    color: flow.color,
    isActive: flow.isActive,
    steps,
    spawning: flow.spawning,
  }
}

/**
 * Convert UI-friendly UIFlow back to engine FlowDefinition
 */
export function uiFlowToFlowDefinition(flow: UIFlow): FlowDefinition {
  const nodes: FlowDefinition["nodes"] = []
  const edges: FlowDefinition["edges"] = []

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i]
    if (!step) continue
    const nextStep = flow.steps[i + 1]

    if (step.type === "location") {
      nodes.push({
        type: "location",
        id: step.id,
        target: step.target,
        action: {
          dwell: step.dwell,
          operation: step.operation,
          capacity: step.capacity,
        },
      })

      // Add edge to next step if exists
      if (nextStep) {
        edges.push({
          id: `edge-${step.id}-${nextStep.id}`,
          from: step.id,
          to: nextStep.id,
        })
      }
    } else if (step.type === "decision") {
      nodes.push({
        type: "decision",
        id: step.id,
        condition: step.condition,
      })

      // Add conditional edges
      if (step.truePath) {
        edges.push({
          id: `edge-${step.id}-true`,
          from: step.id,
          to: step.truePath,
          condition: "true",
        })
      } else if (nextStep) {
        // Default: true goes to next step
        edges.push({
          id: `edge-${step.id}-true`,
          from: step.id,
          to: nextStep.id,
          condition: "true",
        })
      }

      if (step.falsePath) {
        edges.push({
          id: `edge-${step.id}-false`,
          from: step.id,
          to: step.falsePath,
          condition: "false",
        })
      }
    } else if (step.type === "exit") {
      nodes.push({
        type: "exit",
        id: step.id,
      })
    }
  }

  return {
    id: flow.id,
    name: flow.name,
    color: flow.color,
    isActive: flow.isActive,
    entryNode: flow.steps[0]?.id ?? "",
    nodes,
    edges,
    spawning: flow.spawning,
  }
}

/**
 * Generate a unique step ID
 */
export function generateStepId(type: UIStep["type"]): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Create a default location step
 */
export function createDefaultLocationStep(elementId?: string): UILocationStep {
  return {
    type: "location",
    id: generateStepId("location"),
    target: elementId
      ? { type: "fixed", elementId }
      : { type: "random", pool: [] },
    dwell: { type: "fixed", duration: 2000 },
  }
}

/**
 * Create a default decision step
 */
export function createDefaultDecisionStep(): UIDecisionStep {
  return {
    type: "decision",
    id: generateStepId("decision"),
    condition: { type: "probability", chance: 0.5 },
  }
}

/**
 * Create a default exit step
 */
export function createDefaultExitStep(): UIExitStep {
  return {
    type: "exit",
    id: generateStepId("exit"),
  }
}

/**
 * Create a default spawning config
 */
export function createDefaultSpawning(): SpawnConfig {
  return {
    mode: "interval",
    duration: 3000,
    variance: 500,
    maxActive: 5,
  }
}

/**
 * Create a new empty flow
 */
export function createDefaultFlow(name?: string): UIFlow {
  return {
    id: `flow-${Date.now()}`,
    name: name ?? "New Flow",
    color: "#3b82f6",
    isActive: true,
    steps: [],
    spawning: createDefaultSpawning(),
  }
}

/**
 * Get human-readable description of a step
 */
export function getStepDescription(
  step: UIStep,
  elementLabels?: Map<string, string>
): string {
  if (step.type === "location") {
    const target = step.target
    if (target.type === "fixed") {
      const label = elementLabels?.get(target.elementId) ?? target.elementId
      return `Go to ${label}`
    } else if (target.type === "category") {
      return `Go to ${target.rule} in category`
    } else if (target.type === "random") {
      return "Go to random location"
    } else if (target.type === "zone") {
      return `Go to ${target.rule} in zone`
    }
    return "Go to location"
  } else if (step.type === "decision") {
    const cond = step.condition
    if (cond.type === "probability") {
      return `${Math.round(cond.chance * 100)}% chance`
    } else if (cond.type === "capacity") {
      return `If capacity ${cond.operator} ${cond.value}`
    } else if (cond.type === "time") {
      return `If time ${cond.operator} ${cond.value}ms`
    } else if (cond.type === "counter") {
      return `If ${cond.name} ${cond.operator} ${cond.value}`
    }
    return "Decision"
  } else if (step.type === "exit") {
    return "End flow"
  }
  return "Unknown step"
}

/**
 * Validate a flow and return errors
 */
export function validateFlow(flow: UIFlow): string[] {
  const errors: string[] = []

  if (!flow.name.trim()) {
    errors.push("Flow must have a name")
  }

  if (flow.steps.length === 0) {
    errors.push("Flow must have at least one step")
  }

  // Check that flow ends with exit
  const lastStep = flow.steps[flow.steps.length - 1]
  if (lastStep && lastStep.type !== "exit") {
    errors.push("Flow should end with an exit step")
  }

  // Check for unresolved targets in location steps
  for (const step of flow.steps) {
    if (step.type === "location" && step.target.type === "fixed") {
      if (!step.target.elementId || step.target.elementId === "") {
        errors.push(`Location step "${step.id}" needs an element selected`)
      }
    }
  }

  // Check decision steps have valid paths
  for (const step of flow.steps) {
    if (step.type === "decision") {
      const stepIds = new Set(flow.steps.map((s) => s.id))
      if (step.truePath && !stepIds.has(step.truePath)) {
        errors.push(`Decision "${step.id}" true path points to unknown step`)
      }
      if (step.falsePath && !stepIds.has(step.falsePath)) {
        errors.push(`Decision "${step.id}" false path points to unknown step`)
      }
    }
  }

  return errors
}
