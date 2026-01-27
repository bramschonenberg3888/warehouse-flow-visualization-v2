/**
 * Scenario Engine
 *
 * Tick-based simulation engine for warehouse flow scenarios.
 * Manages pallet spawning, movement, dwelling, and state transitions.
 */

import type {
  Scenario,
  FlowDefinition,
  FlowNode,
  FlowEdge,
  Pallet,
  EngineEvents,
  LocationNode,
  DwellConfig,
} from "./types"
import {
  generatePath,
  getPositionAlongPath,
  getPathLength,
  BASE_SPEED,
  type Point,
} from "@/lib/pathfinding"
import {
  evaluateCondition,
  createSeededRandom,
  type ConditionContext,
} from "./conditions"
import {
  selectTargetElement,
  type PlacedElementInfo,
  type SelectionContext,
} from "./selection-rules"

export interface EngineConfig {
  /** Placed elements in the warehouse */
  elements: PlacedElementInfo[]
  /** Event callbacks */
  events?: EngineEvents
}

interface FlowState {
  /** Time of last spawn */
  lastSpawnTime: number
  /** Total pallets spawned for this flow */
  totalSpawned: number
  /** Currently spawning batch (for batch mode) */
  batchProgress: number
  /** Last batch spawn time (for batch mode) */
  lastBatchSpawnTime: number
  /** Active (non-completed) pallet count for this flow */
  activeCount: number
}

export class ScenarioEngine {
  private scenario: Scenario
  private config: EngineConfig

  // Runtime state
  private pallets: Map<string, Pallet> = new Map()
  private flowStates: Map<string, FlowState> = new Map()
  private clock: number = 0 // Simulation time in ms
  private random: () => number

  // Context for condition evaluation
  private counters: Map<string, number> = new Map()
  private elementCapacities: Map<string, number> = new Map()
  private visitCounts: Map<string, number> = new Map()
  private roundRobinState: Map<string, number> = new Map()

  // Lookup caches
  private nodeMap: Map<string, { flow: FlowDefinition; node: FlowNode }> =
    new Map()
  private edgeMap: Map<string, FlowEdge[]> = new Map() // nodeId -> outgoing edges
  private elementMap: Map<string, PlacedElementInfo> = new Map()

  constructor(scenario: Scenario, config: EngineConfig) {
    this.scenario = scenario
    this.config = config

    // Initialize random number generator
    this.random = createSeededRandom(scenario.settings.seed)

    // Build lookup caches
    this.buildCaches()

    // Initialize flow states
    for (const flow of scenario.flows) {
      if (flow.isActive) {
        this.flowStates.set(flow.id, {
          lastSpawnTime: 0,
          totalSpawned: 0,
          batchProgress: 0,
          lastBatchSpawnTime: 0,
          activeCount: 0,
        })
      }
    }
  }

  private buildCaches(): void {
    // Build node lookup
    for (const flow of this.scenario.flows) {
      for (const node of flow.nodes) {
        this.nodeMap.set(node.id, { flow, node })
      }

      // Build edge lookup (grouped by from node)
      for (const edge of flow.edges) {
        const edges = this.edgeMap.get(edge.from) ?? []
        edges.push(edge)
        this.edgeMap.set(edge.from, edges)
      }
    }

    // Build element lookup
    for (const element of this.config.elements) {
      this.elementMap.set(element.id, element)
    }
  }

  /**
   * Advance simulation by deltaTime milliseconds
   */
  tick(deltaTime: number): void {
    // Ensure speedMultiplier has a valid value (default to 1 if undefined/0)
    const speedMultiplier = this.scenario.settings.speedMultiplier || 1
    const adjustedDelta = deltaTime * speedMultiplier
    this.clock += adjustedDelta

    // Check for spawns
    this.checkSpawns()

    // Update all pallets
    for (const pallet of this.pallets.values()) {
      this.updatePallet(pallet, adjustedDelta)
    }

    // Check simulation duration limit
    if (
      this.scenario.settings.duration &&
      this.clock >= this.scenario.settings.duration
    ) {
      // Simulation complete - could emit an event
    }
  }

  /**
   * Check if any flows should spawn new pallets
   */
  private checkSpawns(): void {
    for (const flow of this.scenario.flows) {
      if (!flow.isActive) continue

      const state = this.flowStates.get(flow.id)
      if (!state) continue

      const spawning = flow.spawning

      // Check limits
      if (spawning.maxActive) {
        if (state.activeCount >= spawning.maxActive) continue
      }

      if (spawning.totalLimit && state.totalSpawned >= spawning.totalLimit) {
        continue
      }

      // Check spawn timing based on mode
      let shouldSpawn = false

      if (spawning.mode === "interval") {
        const interval = spawning.duration
        const variance = spawning.variance ?? 0
        const actualInterval = interval + (this.random() - 0.5) * 2 * variance

        if (this.clock - state.lastSpawnTime >= actualInterval) {
          shouldSpawn = true
        }
      } else if (spawning.mode === "batch") {
        // Batch spawning logic
        const timeSinceLastBatch = this.clock - state.lastBatchSpawnTime

        if (state.batchProgress < spawning.size) {
          // Still spawning current batch
          const timeSinceLastSpawn = this.clock - state.lastSpawnTime
          if (timeSinceLastSpawn >= spawning.spacing) {
            shouldSpawn = true
            state.batchProgress++
          }
        } else if (timeSinceLastBatch >= spawning.batchInterval) {
          // Start new batch
          shouldSpawn = true
          state.batchProgress = 1
          state.lastBatchSpawnTime = this.clock
        }
      }
      // Manual mode: spawning is triggered externally via spawnPallet()

      if (shouldSpawn) {
        this.spawnPallet(flow)
        state.lastSpawnTime = this.clock
        state.totalSpawned++
      }
    }
  }

  /**
   * Spawn a new pallet for a flow
   */
  spawnPallet(flow: FlowDefinition): Pallet | null {
    // Find entry node
    const entryInfo = this.nodeMap.get(flow.entryNode)
    if (!entryInfo) {
      console.warn(`Entry node ${flow.entryNode} not found in flow ${flow.id}`)
      return null
    }

    // Get starting position
    const position = this.getNodePosition(entryInfo.node)
    if (!position) {
      console.warn(`Could not determine position for entry node`)
      return null
    }

    const pallet: Pallet = {
      id: crypto.randomUUID(),
      flowId: flow.id,
      state: "dwelling",
      currentNodeId: flow.entryNode,
      position,
      stateStartTime: this.clock,
      dwellRemaining: this.calculateDwellTime(entryInfo.node),
      pathProgress: 0,
      visitedNodes: [flow.entryNode],
      spawnTime: this.clock,
    }

    this.pallets.set(pallet.id, pallet)
    this.incrementVisitCount(pallet.currentNodeId)

    // Increment active count for this flow
    const flowState = this.flowStates.get(flow.id)
    if (flowState) {
      flowState.activeCount++
    }

    this.config.events?.onPalletSpawned?.(pallet)

    return pallet
  }

  /**
   * Update a single pallet
   */
  private updatePallet(pallet: Pallet, deltaTime: number): void {
    switch (pallet.state) {
      case "dwelling":
        this.updateDwelling(pallet, deltaTime)
        break
      case "moving":
        this.updateMoving(pallet, deltaTime)
        break
      case "waiting":
        this.updateWaiting(pallet)
        break
      case "completed":
        // Remove completed pallets after a short delay
        // (or keep them for analytics)
        break
    }
  }

  private updateDwelling(pallet: Pallet, deltaTime: number): void {
    if (pallet.dwellRemaining === undefined) {
      // No dwell time, move immediately
      this.transitionToNextNode(pallet)
      return
    }

    pallet.dwellRemaining -= deltaTime

    if (pallet.dwellRemaining <= 0) {
      pallet.dwellRemaining = undefined
      this.transitionToNextNode(pallet)
    }
  }

  private updateMoving(pallet: Pallet, deltaTime: number): void {
    if (!pallet.currentPath || pallet.currentPath.length === 0) {
      // No path, arrive immediately
      this.arriveAtNode(pallet)
      return
    }

    // Calculate movement
    const pathLength = getPathLength(pallet.currentPath)
    const speed = BASE_SPEED * (this.scenario.settings.speedMultiplier || 1)
    const distanceToMove = (speed * deltaTime) / 1000

    if (pathLength === 0) {
      pallet.pathProgress = 1
    } else {
      pallet.pathProgress += distanceToMove / pathLength
    }

    // Update position
    pallet.position = getPositionAlongPath(
      pallet.currentPath,
      pallet.pathProgress
    )

    this.config.events?.onPalletMoved?.(pallet)

    // Check if arrived
    if (pallet.pathProgress >= 1) {
      this.arriveAtNode(pallet)
    }
  }

  private updateWaiting(pallet: Pallet): void {
    // Check if we can now proceed (e.g., capacity freed up)
    // For now, just try to transition again
    this.transitionToNextNode(pallet)
  }

  /**
   * Transition pallet to the next node
   */
  private transitionToNextNode(pallet: Pallet): void {
    const currentInfo = this.nodeMap.get(pallet.currentNodeId)
    if (!currentInfo) return

    const { node } = currentInfo

    // Handle based on node type
    if (node.type === "exit") {
      this.completePallet(pallet)
      return
    }

    if (node.type === "decision") {
      // Evaluate condition and select edge
      const edge = this.selectEdgeFromDecision(pallet, node)
      if (edge) {
        this.startMovingToNode(pallet, edge.to)
      }
      return
    }

    // Location node - find outgoing edge
    const edges = this.edgeMap.get(pallet.currentNodeId) ?? []
    if (edges.length === 0) {
      // Dead end - complete the pallet
      this.completePallet(pallet)
      return
    }

    // If multiple edges without conditions, select based on weights or first
    const edge = this.selectEdge(edges)
    if (edge) {
      this.startMovingToNode(pallet, edge.to)
    }
  }

  private selectEdgeFromDecision(
    pallet: Pallet,
    node: FlowNode
  ): FlowEdge | null {
    if (node.type !== "decision") return null

    const edges = this.edgeMap.get(node.id) ?? []
    const context = this.getConditionContext()

    const result = evaluateCondition(node.condition, pallet, context)

    // Find edge matching the result
    const conditionStr = result ? "true" : "false"
    return edges.find((e) => e.condition === conditionStr) ?? null
  }

  private selectEdge(edges: FlowEdge[]): FlowEdge | null {
    if (edges.length === 0) return null
    if (edges.length === 1) return edges[0] ?? null

    // Check for weighted edges
    const hasWeights = edges.some((e) => e.weight !== undefined)
    if (hasWeights) {
      const weights = edges.map((e) => e.weight ?? 1)
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let random = this.random() * totalWeight
      for (let i = 0; i < edges.length; i++) {
        const weight = weights[i] ?? 1
        random -= weight
        if (random <= 0) return edges[i] ?? null
      }
    }

    // Default: first edge
    return edges[0] ?? null
  }

  private startMovingToNode(pallet: Pallet, nodeId: string): void {
    const targetInfo = this.nodeMap.get(nodeId)
    if (!targetInfo) {
      console.warn(`[Engine] Node ${nodeId} not found`)
      return
    }

    const targetPosition = this.getNodePosition(targetInfo.node)
    if (!targetPosition) {
      console.warn(
        `[Engine] Could not get position for node ${nodeId}`,
        targetInfo.node
      )
      return
    }

    // Generate path
    const path = generatePath(pallet.position, targetPosition)

    const oldState = pallet.state
    pallet.state = "moving"
    pallet.nextNodeId = nodeId
    pallet.currentPath = path
    pallet.pathProgress = 0
    pallet.stateStartTime = this.clock

    if (oldState !== "moving") {
      this.config.events?.onPalletStateChanged?.(pallet, oldState)
    }
  }

  private arriveAtNode(pallet: Pallet): void {
    if (!pallet.nextNodeId) return

    const nodeInfo = this.nodeMap.get(pallet.nextNodeId)
    if (!nodeInfo) return

    const oldState = pallet.state
    pallet.currentNodeId = pallet.nextNodeId
    pallet.nextNodeId = undefined
    pallet.currentPath = undefined
    pallet.pathProgress = 0
    pallet.visitedNodes.push(pallet.currentNodeId)

    this.incrementVisitCount(pallet.currentNodeId)

    // Determine new state based on node type
    const { node } = nodeInfo

    if (node.type === "exit") {
      this.completePallet(pallet)
      return
    }

    if (node.type === "decision") {
      // Decision nodes don't have dwell time, transition immediately
      pallet.state = "dwelling"
      pallet.dwellRemaining = 0
      pallet.stateStartTime = this.clock
    } else {
      // Location node - start dwelling
      pallet.state = "dwelling"
      pallet.dwellRemaining = this.calculateDwellTime(node)
      pallet.stateStartTime = this.clock
    }

    if (oldState !== pallet.state) {
      this.config.events?.onPalletStateChanged?.(pallet, oldState)
    }
  }

  private completePallet(pallet: Pallet): void {
    const oldState = pallet.state
    pallet.state = "completed"
    pallet.stateStartTime = this.clock

    if (oldState !== "completed") {
      this.config.events?.onPalletStateChanged?.(pallet, oldState)
    }

    this.config.events?.onPalletCompleted?.(pallet)

    // Decrement active count for this flow
    const flowState = this.flowStates.get(pallet.flowId)
    if (flowState) {
      flowState.activeCount--
    }

    // Remove pallet after completion
    this.pallets.delete(pallet.id)
  }

  /**
   * Get position for a node
   */
  private getNodePosition(node: FlowNode): Point | null {
    if (node.type !== "location") {
      // Decision and exit nodes don't have positions by themselves
      // They should be at the same position as the previous location
      return null
    }

    const elementId = this.resolveLocationTarget(node.target)
    if (!elementId) {
      console.warn(`[Engine] Could not resolve location target`, node.target)
      return null
    }

    const element = this.elementMap.get(elementId)
    if (!element) {
      console.warn(
        `[Engine] Element ${elementId} not found in elementMap. Available:`,
        Array.from(this.elementMap.keys())
      )
      return null
    }

    return {
      x: element.positionX + element.width / 2,
      y: element.positionY + element.height / 2,
    }
  }

  /**
   * Resolve a location target to an element ID
   */
  private resolveLocationTarget(
    target: LocationNode["target"],
    pallet?: Pallet
  ): string | null {
    if (target.type === "fixed") {
      return target.elementId
    }

    if (!pallet) {
      // For initial position without pallet context
      if (target.type === "random" && target.pool.length > 0) {
        return (
          target.pool[Math.floor(this.random() * target.pool.length)] ?? null
        )
      }

      // Handle category target for initial spawn
      if (target.type === "category") {
        const elements = this.config.elements.filter(
          (e) => e.categoryId === target.categoryId
        )
        if (elements.length > 0) {
          // Use random selection for initial spawn
          const element = elements[Math.floor(this.random() * elements.length)]
          return element?.id ?? null
        }
      }

      // Handle zone target for initial spawn
      if (target.type === "zone") {
        const elements = this.config.elements.filter(
          (e) => e.metadata?.["zone"] === target.zone
        )
        if (elements.length > 0) {
          const element = elements[Math.floor(this.random() * elements.length)]
          return element?.id ?? null
        }
      }

      return null
    }

    const context = this.getSelectionContext()
    return selectTargetElement(target, pallet, context)
  }

  /**
   * Calculate dwell time based on config
   */
  private calculateDwellTime(node: FlowNode): number | undefined {
    if (node.type !== "location") return undefined

    const dwell = node.action.dwell
    return this.resolveDwellConfig(dwell)
  }

  private resolveDwellConfig(dwell: DwellConfig): number {
    switch (dwell.type) {
      case "fixed":
        return dwell.duration

      case "range": {
        const min = Math.min(dwell.min, dwell.max)
        const max = Math.max(dwell.min, dwell.max)
        return min + this.random() * (max - min)
      }

      case "distribution": {
        // Box-Muller transform for normal distribution
        // Clamp u1 to avoid log(0) which produces -Infinity
        const u1 = Math.max(Number.EPSILON, this.random())
        const u2 = this.random()
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
        return Math.max(0, dwell.mean + z * dwell.stdDev)
      }

      default:
        return 0
    }
  }

  private getConditionContext(): ConditionContext {
    return {
      simulationTime: this.clock,
      counters: this.counters,
      elementCapacities: this.elementCapacities,
      random: this.random,
    }
  }

  private getSelectionContext(): SelectionContext {
    return {
      elements: this.config.elements,
      visitCounts: this.visitCounts,
      capacities: this.elementCapacities,
      maxCapacities: new Map(), // TODO: populate from node configs
      roundRobinState: this.roundRobinState,
      random: this.random,
    }
  }

  private incrementVisitCount(nodeId: string): void {
    const current = this.visitCounts.get(nodeId) ?? 0
    this.visitCounts.set(nodeId, current + 1)
  }

  private getActivePalletCount(flowId: string): number {
    const flowState = this.flowStates.get(flowId)
    return flowState?.activeCount ?? 0
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Get all current pallets
   */
  getPallets(): Pallet[] {
    return Array.from(this.pallets.values())
  }

  /**
   * Get current simulation time
   */
  getSimulationTime(): number {
    return this.clock
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    this.pallets.clear()
    this.clock = 0
    this.counters.clear()
    this.elementCapacities.clear()
    this.visitCounts.clear()
    this.roundRobinState.clear()

    // Reset flow states
    for (const flow of this.scenario.flows) {
      if (flow.isActive) {
        this.flowStates.set(flow.id, {
          lastSpawnTime: 0,
          totalSpawned: 0,
          batchProgress: 0,
          lastBatchSpawnTime: 0,
          activeCount: 0,
        })
      }
    }

    // Re-initialize random with same seed for reproducibility
    this.random = createSeededRandom(this.scenario.settings.seed)
  }

  /**
   * Manually trigger a pallet spawn for a specific flow (for manual mode)
   */
  triggerSpawn(flowId: string): Pallet | null {
    const flow = this.scenario.flows.find((f) => f.id === flowId)
    if (!flow) return null
    return this.spawnPallet(flow)
  }

  /**
   * Update scenario configuration (e.g., speed change)
   */
  updateSettings(settings: Partial<Scenario["settings"]>): void {
    Object.assign(this.scenario.settings, settings)
  }

  /**
   * Get the scenario
   */
  getScenario(): Scenario {
    return this.scenario
  }
}
