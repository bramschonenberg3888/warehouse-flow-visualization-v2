# Flow Engine Conceptual Model - Scenario Planning

## Overview

Design a flexible scenario planning engine that supports complex warehouse flow simulations with branching logic, rule-based location selection, configurable timing, and multi-pallet spawning.

---

## Research Sources

Patterns gathered from similar projects on GitHub:

- **bytedance/flowgram.ai** - Flow node structures with JSON schemas, node registries, and metadata
- **VoltAgent/voltagent** - Workflow steps with parallel/sequential/conditional types
- **nyaruka/floweditor** - Flow definitions with nodes, edges, and localization
- **matrix-org/matrix-appservice-bridge** - Event queue patterns for ordered processing
- **ondras/rot.js** - Event queue with time-based scheduling (MinHeap)
- **lobehub/lobe-chat** - Agent state machines with status tracking
- **metersphere/metersphere** - Scenario step details with execution conditions

---

## Core Conceptual Model

### 1. Scenario (Top-Level Container)

```typescript
interface Scenario {
  id: string
  name: string
  warehouseId: string
  description?: string

  // Multiple flows can run simultaneously
  flows: FlowDefinition[]

  // Global simulation settings
  settings: {
    duration?: number // Max simulation time (ms), null = infinite
    speedMultiplier: number // 0.5x - 10x
    seed?: number // For reproducible randomness
  }
}
```

### 2. Flow Definition (A Single Flow Type)

```typescript
interface FlowDefinition {
  id: string
  name: string
  color: string
  isActive: boolean

  // Entry point - where pallets spawn
  entryNode: NodeId

  // All nodes in this flow (graph structure)
  nodes: FlowNode[]

  // Connections between nodes
  edges: FlowEdge[]

  // Spawning configuration
  spawning: SpawnConfig
}
```

### 3. Flow Node (Step in the Flow)

A node represents a location or decision point:

```typescript
type FlowNode = LocationNode | DecisionNode | ExitNode

// Physical location in warehouse
interface LocationNode {
  type: "location"
  id: string

  // Location selection strategy
  target: LocationTarget

  // What happens here
  action: NodeAction
}

// Conditional branching point
interface DecisionNode {
  type: "decision"
  id: string
  condition: Condition
}

// Flow termination point
interface ExitNode {
  type: "exit"
  id: string
}
```

### 4. Location Target (Where to Go)

Supports fixed, random, and rule-based selection:

```typescript
type LocationTarget =
  | { type: "fixed"; elementId: string }
  | { type: "random"; pool: string[] } // Random from list
  | { type: "category"; categoryId: string; rule: SelectionRule }
  | { type: "zone"; zone: string; rule: SelectionRule }
  | { type: "any"; rule: SelectionRule }

type SelectionRule =
  | "random"
  | "nearest" // Closest to current position
  | "furthest" // Furthest from current
  | "least-visited" // Least utilized in simulation
  | "most-available" // Based on capacity
  | "round-robin" // Cycle through options
```

### 5. Node Action (What Happens at Location)

```typescript
interface NodeAction {
  // Dwell time configuration
  dwell: DwellConfig

  // Optional: operation type for analytics
  operation?: "receive" | "store" | "pick" | "pack" | "ship" | "inspect"

  // Optional: capacity constraints
  capacity?: {
    max: number // Max pallets at this location
    blockWhenFull: boolean
  }
}

type DwellConfig =
  | { type: "fixed"; duration: number } // Fixed ms
  | { type: "range"; min: number; max: number } // Random between min-max
  | { type: "distribution"; mean: number; stdDev: number } // Normal dist
```

### 6. Flow Edge (Connection Between Nodes)

```typescript
interface FlowEdge {
  id: string
  from: NodeId
  to: NodeId

  // For decision nodes: which condition outcome
  condition?: "true" | "false"

  // Optional: probability weight for random branching
  weight?: number
}
```

### 7. Condition (For Decision Nodes)

```typescript
type Condition =
  | { type: "probability"; chance: number } // 0-1, random branch
  | {
      type: "capacity"
      elementId: string
      operator: "<" | ">" | "=="
      value: number
    }
  | { type: "time"; operator: "<" | ">"; value: number } // Simulation time
  | { type: "counter"; name: string; operator: "<" | ">" | "=="; value: number }
  | { type: "random-choice"; weights: number[] } // Weighted random
```

### 8. Spawn Configuration

```typescript
interface SpawnConfig {
  mode: "interval" | "batch" | "manual"

  // For interval mode
  interval?: {
    duration: number // ms between spawns
    variance?: number // Optional randomness
  }

  // For batch mode
  batch?: {
    size: number // Pallets per batch
    spacing: number // ms between pallets in batch
    batchInterval: number // ms between batches
  }

  // Limits
  maxActive?: number // Max concurrent pallets
  totalLimit?: number // Max total spawned
}
```

---

## Runtime Model (Execution Engine)

### Pallet State (Runtime Entity)

```typescript
interface Pallet {
  id: string
  flowId: string

  // Current state
  state: "moving" | "dwelling" | "waiting" | "completed"

  // Position tracking
  currentNodeId: string
  nextNodeId?: string
  position: { x: number; y: number }

  // Timing
  stateStartTime: number
  dwellRemaining?: number

  // Path for current segment
  currentPath?: Point[]
  pathProgress: number // 0-1

  // History for analytics
  visitedNodes: string[]
  spawnTime: number
}
```

### Simulation Engine

```typescript
class ScenarioEngine {
  private scenario: Scenario
  private pallets: Map<string, Pallet>
  private clock: number // Simulation time
  private rng: SeededRandom

  // Core loop
  tick(deltaTime: number): void

  // Spawn management
  private checkSpawns(): void

  // Movement & decisions
  private updatePallet(pallet: Pallet, dt: number): void
  private evaluateCondition(condition: Condition, pallet: Pallet): boolean
  private selectLocation(target: LocationTarget, pallet: Pallet): string

  // Events
  onPalletSpawned: (pallet: Pallet) => void
  onPalletMoved: (pallet: Pallet) => void
  onPalletCompleted: (pallet: Pallet) => void
}
```

---

## Example Scenario: Inbound Receiving

```typescript
const receivingScenario: Scenario = {
  id: "receiving-flow",
  name: "Inbound Receiving Process",
  warehouseId: "wh-1",
  settings: { speedMultiplier: 1 },
  flows: [
    {
      id: "inbound",
      name: "Receiving to Storage",
      color: "#3b82f6",
      isActive: true,
      entryNode: "dock",
      spawning: {
        mode: "interval",
        interval: { duration: 30000, variance: 5000 },
        maxActive: 10,
      },
      nodes: [
        // Start at receiving dock
        {
          type: "location",
          id: "dock",
          target: { type: "fixed", elementId: "receiving-dock-1" },
          action: {
            dwell: { type: "range", min: 5000, max: 15000 },
            operation: "receive",
          },
        },
        // Inspection decision
        {
          type: "decision",
          id: "needs-inspection",
          condition: { type: "probability", chance: 0.2 },
        },
        // Inspection station
        {
          type: "location",
          id: "inspection",
          target: { type: "fixed", elementId: "qc-station" },
          action: {
            dwell: { type: "fixed", duration: 20000 },
            operation: "inspect",
          },
        },
        // Go to nearest available storage
        {
          type: "location",
          id: "storage",
          target: {
            type: "category",
            categoryId: "storage-racks",
            rule: "nearest",
          },
          action: {
            dwell: { type: "range", min: 3000, max: 8000 },
            operation: "store",
          },
        },
        // Done
        { type: "exit", id: "complete" },
      ],
      edges: [
        { id: "e1", from: "dock", to: "needs-inspection" },
        {
          id: "e2",
          from: "needs-inspection",
          to: "inspection",
          condition: "true",
        },
        {
          id: "e3",
          from: "needs-inspection",
          to: "storage",
          condition: "false",
        },
        { id: "e4", from: "inspection", to: "storage" },
        { id: "e5", from: "storage", to: "complete" },
      ],
    },
  ],
}
```

**Visual representation:**

```
                              ┌─────────────┐
                              │   Receive   │
                              │    Dock     │
                              └──────┬──────┘
                                     │
                                     ▼
                            ┌────────────────┐
                            │ Needs Inspect? │
                            │   (20% yes)    │
                            └───────┬────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ yes                       no  │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  QC Station   │               │    Nearest    │
            │  (20s dwell)  │               │  Storage Rack │
            └───────┬───────┘               └───────┬───────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │   Exit    │
                              └───────────┘
```

---

## Database Schema Changes

### New Tables

```sql
-- Scenarios table (replaces or extends flows)
CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  warehouse_id UUID REFERENCES warehouses(id),
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,  -- Full scenario JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Optional: Simulation runs for history/analytics
CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  settings JSONB,
  metrics JSONB  -- Throughput, times, etc.
);
```

---

## Current Implementation Gap Analysis

Based on exploration of the existing codebase:

### What Exists Now

- Simple linear sequences (`elementSequence: string[]`)
- Single pallet per flow, looping forever
- Fixed locations only (no selection rules)
- No branching logic
- Manhattan pathfinding between points
- Basic canvas animation with speed control

### What's Missing

1. **No Step Metadata** - Cannot configure dwell time, operations, or capacity
2. **No Flow Variants** - Single linear sequence only, no conditionals
3. **Single Pallet** - No spawn rates or concurrent pallets
4. **Fixed Locations Only** - No rule-based or random selection
5. **No Analytics** - No metrics, timing, or throughput tracking

---

## Implementation Phases

### Phase 1: Core Model & Simple Execution

1. Define TypeScript types for the conceptual model
2. Create `ScenarioEngine` class with basic tick loop
3. Implement fixed location nodes with dwell times
4. Spawn pallets at intervals
5. Basic visualization (extend current canvas)

### Phase 2: Rule-Based Selection

1. Implement `SelectionRule` strategies (nearest, random, etc.)
2. Add category/zone-based targeting
3. Track element utilization for "least-visited" rule

### Phase 3: Conditional Branching

1. Implement `DecisionNode` evaluation
2. Add probability-based branching
3. Add capacity-based conditions

### Phase 4: Advanced Features

1. Batch spawning modes
2. Capacity constraints at locations
3. Metrics collection and display
4. Scenario comparison tools

---

## UI Considerations

### Scenario Editor (New Page)

- Visual node-graph editor (consider React Flow library)
- Node palette: Location, Decision, Exit
- Property panels for each node type
- Edge drawing for connections
- Spawn configuration panel

### Visualization Updates

- Multiple pallet rendering per flow
- Pallet state indicators (moving/dwelling/waiting)
- Decision point visualization
- Real-time metrics overlay

---

## Files to Create/Modify

### New Files

- `src/lib/scenario-engine/types.ts` - Core type definitions
- `src/lib/scenario-engine/engine.ts` - Simulation engine
- `src/lib/scenario-engine/selection-rules.ts` - Location selection strategies
- `src/lib/scenario-engine/conditions.ts` - Condition evaluators
- `src/server/db/schema/scenario.ts` - Database schema
- `src/server/api/routers/scenario.ts` - API router
- `src/components/scenario-editor/` - New editor components

### Modified Files

- `src/components/visualization/visualization-canvas.tsx` - Multi-pallet support
- `src/hooks/use-visualization.ts` - Integrate scenario engine
- `src/app/(dashboard)/` - New scenario routes

---

## Verification Plan

1. **Unit Tests**: Test engine tick logic, condition evaluation, selection rules
2. **Integration Tests**: Create scenario, run simulation, verify pallet movements
3. **Visual Testing**:
   - Create test scenario with all node types
   - Verify pallets spawn at correct intervals
   - Verify conditional branching works
   - Verify rule-based selection picks correct locations
4. **Performance**: Test with 50+ concurrent pallets

---

## Alternative Approaches Considered

### 1. State Machine Per Pallet

Each pallet has its own state machine instance. More flexible but higher memory usage.

### 2. Event-Driven Architecture

Use discrete event simulation with priority queue. Better for complex timing but more complex implementation.

### 3. BPMN-Style Workflow

Full BPMN notation with gateways, events, activities. More standardized but overkill for warehouse flows.

**Chosen approach**: Graph-based flow definition with centralized engine - balances flexibility with simplicity.
