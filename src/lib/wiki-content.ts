export interface WikiArticle {
  slug: string
  title: string
  description: string
  category: string
  content: string
  lastUpdated: string
}

export const wikiArticles: WikiArticle[] = [
  {
    slug: "grid-based-warehouse-model",
    title: "Grid-Based Warehouse Model",
    description:
      "Understanding the foundational grid system that powers warehouse visualizations",
    category: "Core Concepts",
    lastUpdated: "2025-01-11",
    content: `
## Overview

The warehouse simulation system is built on a **grid-based model**. The grid is the foundation - everything else (elements, flows, movement) is defined in relation to the grid.

## The Grid IS the Warehouse

Every warehouse is fundamentally a grid of cells. This grid:
- Has a fixed **cell size of 40 pixels**
- Uses **4-directional (cardinal) movement** - up, down, left, right
- Defines all possible positions where elements can be placed
- Defines all possible waypoints for movement/pathfinding

## Hierarchy of the Model

\`\`\`
Grid (Foundation)
├── Grid Cells - The floor, always present
│   ├── Walkable cells - Where mobile elements can move
│   └── Blocked cells - Occupied by static elements
├── Static Elements - Placed ON the grid
│   ├── Racking, shelving
│   ├── Walls, zones
│   └── Docks, workstations
└── Mobile Elements - Move THROUGH the grid
    ├── Pallets
    ├── Forklifts
    └── AGVs, workers
\`\`\`

## Grid Cells as Waypoints

When defining flows and scenarios, you select **grid cells** as waypoints for movement paths:

- Grid cells are identified by their column and row: \`grid:{col}:{row}\`
- Click on any cell in the flow editor to add it to the path
- Mobile elements travel from cell center to cell center
- The pathfinding algorithm finds the optimal route between cells

## Cell Coordinates

The grid uses a coordinate system:
- **Origin (0,0)** is at the top-left
- **Columns** increase to the right
- **Rows** increase downward
- Each cell is 40x40 pixels in world coordinates

Example: Cell at column 5, row 3 covers world coordinates (200, 120) to (240, 160).

## Static Elements and Grid Blocking

When you place a static element:
1. It occupies one or more grid cells
2. Those cells become **blocked** for movement
3. Pathfinding routes around blocked cells
4. The element is visually rendered on top of the grid

## Practical Example

Consider a simple warehouse:
- Grid size: 20 columns x 15 rows (800x600 pixels)
- Racking at columns 5-8, rows 2-12 (blocks those cells)
- Dock at column 0, rows 5-7
- Packing station at column 18, rows 6-8

A flow might be defined as:
1. Start at cell (0, 6) - dock
2. Move to cell (10, 6) - aisle
3. Move to cell (10, 2) - approach racking
4. End at cell (18, 7) - packing station

The pathfinding will automatically navigate around the blocked racking cells.

## Best Practices

1. **Design with the grid in mind** - Align elements to grid cells for clean layouts
2. **Leave clear aisles** - Ensure mobile elements have unblocked paths
3. **Use grid coordinates** - When defining flows, think in terms of cell positions
4. **Test pathfinding** - Verify that routes don't get blocked by placed elements
    `.trim(),
  },
  {
    slug: "element-types",
    title: "Element Types & Behavior",
    description:
      "Understanding static vs mobile elements and how they interact with the grid",
    category: "Core Concepts",
    lastUpdated: "2025-01-11",
    content: `
## Overview

Elements in the warehouse system are classified by their **behavior** - how they interact with the grid during simulation.

## Element Behavior Classification

### Static Elements

Static elements are **fixed fixtures** placed on the grid. They:
- Occupy grid cells permanently
- Block movement through those cells
- Do not move during simulation
- Form the physical structure of the warehouse

**Examples:**
- Pallet racking and shelving
- Walls and barriers
- Loading docks
- Workstations and packing areas
- Storage zones
- Office areas
- Floor markings and lanes

**Key characteristics:**
- Position is set during warehouse design
- Blocks pathfinding through occupied cells
- Rendered as part of the warehouse background

### Mobile Elements

Mobile elements can **move through the grid** during simulation. They:
- Travel from cell to cell along defined paths
- Cannot occupy blocked cells (must route around)
- Are spawned by the scenario engine
- Have visual states (moving, dwelling, waiting)

**Examples:**
- Pallets and goods
- Forklifts
- AGVs (Automated Guided Vehicles)
- Workers and operators
- Carts and trolleys

**Key characteristics:**
- Position changes during simulation
- Follow paths defined in flows
- Spawned and controlled by scenarios
- Have movement speed and dwell times

## Setting Element Behavior

When creating or editing an element template:
1. Open the element in the **Elements** editor
2. Use the **Behavior** dropdown in the toolbar
3. Select **Static** or **Mobile**

This classification determines how the element behaves when placed in a warehouse and used in simulations.

## Interaction with Flows

- **Static elements** define the warehouse structure that flows navigate around
- **Mobile elements** are what flows actually move - they follow the path through grid cells
- When defining a flow, you're specifying where mobile elements should go

## Practical Example

\`\`\`
Warehouse Layout:
┌─────────────────────────────────┐
│  DOCK   │  AISLE  │  RACKING   │
│ (static)│ (clear) │  (static)  │
│         │         │            │
│   [P]───┼────────→│            │
│         │         │            │
└─────────────────────────────────┘

P = Pallet (mobile element)
→ = Movement path through grid cells
\`\`\`

The pallet (mobile) moves through the aisle (clear grid cells) while avoiding the dock and racking (static, blocked cells).
    `.trim(),
  },
  {
    slug: "element-properties",
    title: "Element Properties",
    description:
      "Understanding how element templates and placed instances work together",
    category: "Elements",
    lastUpdated: "2025-01-11",
    content: `
## Overview

When you place an element from the library onto a warehouse canvas, you're creating an **instance** of an **element template**. Understanding how properties are shared between templates and instances is key to maintaining consistent warehouse designs.

## Template vs Instance Properties

### Template-Controlled Properties (Brand Consistency)

These properties are defined in the element template and **automatically sync** to all placed instances. When you update a template, all instances in all warehouses will reflect the change.

| Property | Description |
|----------|-------------|
| **Shape Type** | Rectangle, ellipse, diamond, line, or arrow |
| **Background Color** | Fill color of the element |
| **Stroke Color** | Border/outline color |
| **Stroke Width** | Thickness of the border |
| **Stroke Style** | Solid, dashed, or dotted lines |
| **Fill Style** | Solid, hachure, or cross-hatch pattern |
| **Roughness** | Hand-drawn "sketchiness" level (0-2) |
| **Roundness** | Sharp or rounded corners |
| **Opacity** | Transparency level (0-100%) |
| **Behavior** | Static or Mobile classification |

**Why template-controlled?** These properties define the visual identity and behavior of each element type. A "Pallet Rack" should always look like a pallet rack and always be static.

### Instance-Controlled Properties (Warehouse Flexibility)

These properties can be customized for each placed instance, allowing you to adapt elements to different warehouse layouts.

| Property | Description |
|----------|-------------|
| **Width** | Horizontal size of the element |
| **Height** | Vertical size of the element |
| **Position X** | Horizontal location on canvas (grid-aligned) |
| **Position Y** | Vertical location on canvas (grid-aligned) |
| **Rotation** | Angle of the element (degrees) |
| **Label** | Custom name for this specific instance |
| **Metadata** | Capacity, notes, tags, etc. |

**Why instance-controlled?** Every warehouse is different. A storage area might be larger in one warehouse than another.

## Grid Alignment

Elements should be aligned to the grid for proper simulation:
- Grid cell size: 40x40 pixels
- Position elements at multiples of 40 for clean alignment
- Element dimensions should ideally be multiples of 40

## Best Practices

1. **Design templates carefully** - Visual properties and behavior sync everywhere
2. **Use categories** - Group related elements (Storage, Transport, Workstations)
3. **Set behavior correctly** - Static for fixtures, Mobile for things that move
4. **Leverage instance labels** - Give meaningful names (e.g., "Dock A", "Overflow Storage")
5. **Align to grid** - Keep elements aligned for clean pathfinding
    `.trim(),
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "Learn the basics of creating warehouse layouts and flow visualizations",
    category: "Guides",
    lastUpdated: "2025-01-11",
    content: `
## Welcome to Warehouse Flow Visualization

This application helps you design warehouse layouts and visualize how goods move through your facilities using a grid-based simulation system.

## Core Concept: The Grid

Every warehouse is built on a **grid** (40px cells). The grid is the foundation:
- **Static elements** (racking, walls) are placed ON the grid
- **Mobile elements** (pallets, forklifts) move THROUGH the grid
- **Flows** are defined by selecting grid cells as waypoints

## Quick Start

### 1. Create a Warehouse

Navigate to **Warehouses** in the sidebar and click **New Warehouse**. Give it a name and optional description.

### 2. Open the Editor

Click on your warehouse card, then click **Edit Layout** to open the canvas editor. You'll see the grid displayed with Excalidraw.

### 3. Add Elements from the Library

Use the element library on the left side to click and add elements:
- **Storage areas** - Pallet racks, shelving, bulk storage (static)
- **Transport** - Conveyors, forklifts, AGV paths (static guides)
- **Workstations** - Packing stations, quality control (static)
- **Infrastructure** - Docks, doors, offices (static)

All these are **static elements** that form the warehouse structure.

### 4. Arrange Your Layout

- **Drag** elements to position them
- **Resize** using the corner handles
- **Rotate** using the rotation handle
- Aim to **align to the grid** (40px increments)

### 5. Create Flows

Navigate to **Flows** to define movement paths:
1. Select your warehouse
2. Click on **grid cells** to define the path waypoints
3. The path shows where mobile elements will travel
4. Save your flow

### 6. Create Scenarios

Navigate to **Scenarios** to configure simulations:
1. Click **New Scenario** and select your warehouse
2. Add flows and configure spawning (how often pallets appear)
3. Set conditions and decision points
4. Save the scenario

### 7. Run the Visualization

Go to **Visualization**:
1. Select the **Scenarios** tab
2. Choose your scenario
3. Click **Play** to watch pallets move through your warehouse

## Key Tips

- **Think in grid cells** - Movement happens from cell to cell
- **Leave aisles clear** - Don't block all paths with static elements
- **Start simple** - Create a 2-3 waypoint flow first
- **Use the flow editor** - Click cells to build paths visually
    `.trim(),
  },
  {
    slug: "flows-and-paths",
    title: "Flows & Path Definition",
    description:
      "How to define movement paths using the grid-based flow editor",
    category: "Simulation",
    lastUpdated: "2025-01-11",
    content: `
## Overview

Flows define how mobile elements move through your warehouse. Paths are defined by selecting **grid cells** as waypoints.

## Grid Cell Selection

In the flow editor:
1. The warehouse grid is displayed with all cells visible
2. Static elements are shown on top of the grid
3. **Click any cell** to add it to the flow path
4. Cells are identified by their coordinates: \`grid:{col}:{row}\`

## Path Building

When you click cells, you're building a sequence of waypoints:

\`\`\`
Click cell (2, 5)  → Waypoint 1
Click cell (8, 5)  → Waypoint 2
Click cell (8, 12) → Waypoint 3
Click cell (15, 12) → Waypoint 4
\`\`\`

The flow editor shows:
- **Highlighted cells** - Cells in your sequence
- **Numbered badges** - Order of waypoints
- **Path line** - Visual connection between waypoints
- **Static elements** - Overlaid on the grid for reference

## Pathfinding

The simulation engine uses pathfinding to move between waypoints:
- Finds the shortest path between consecutive waypoints
- Automatically routes around blocked cells (static elements)
- Uses 4-directional (cardinal) movement

## Dwell Times

Each waypoint can have a **dwell time** - how long the mobile element waits there:

| Type | Description |
|------|-------------|
| **Fixed** | Always same duration (e.g., 2000ms) |
| **Range** | Random between min-max (e.g., 1000-3000ms) |
| **Distribution** | Statistical distribution (mean, stdDev) |

## Flow Sequence List

The sidebar shows your waypoint sequence:
- **Cell coordinates** - Which cell each waypoint represents
- **Drag to reorder** - Change the path order
- **Remove waypoints** - Click X to remove from sequence

## Best Practices

1. **Start at entry points** - Begin flows at docks or receiving areas
2. **End at exit points** - End flows at shipping or storage completion
3. **Use intermediate waypoints** - Guide the path through aisles
4. **Consider traffic** - Multiple flows may need different paths
5. **Test the path** - Run visualization to verify routing works
    `.trim(),
  },
  {
    slug: "scenarios-and-flows",
    title: "Scenarios & Simulation",
    description:
      "Understanding the scenario engine and how to visualize goods movement through your warehouse",
    category: "Simulation",
    lastUpdated: "2025-01-11",
    content: `
## Overview

Scenarios orchestrate the simulation of mobile elements moving through your warehouse. Each scenario contains one or more **flows**, and the scenario engine manages spawning, movement, and completion.

## Key Concepts

### Scenario
A top-level container that holds:
- One or more **flows** (movement patterns)
- Global **settings** (speed multiplier)
- Association with a specific **warehouse**

### Flow
A single movement pattern with:
- **Steps** - Grid cell waypoints in sequence
- **Spawning configuration** - How mobile elements are created
- **Color** - Visual identifier for this flow's elements
- **Active state** - Whether the flow is running

## Path Definition

Flows use grid cells as waypoints (see [Flows & Path Definition](/wiki/flows-and-paths)):

\`\`\`
Flow: "Inbound Receiving"
Steps:
  1. grid:0:6   (Dock)
  2. grid:5:6   (Aisle start)
  3. grid:5:2   (Turn toward storage)
  4. grid:12:2  (Storage area)
\`\`\`

## Spawning Modes

### Interval
Spawn elements at regular intervals:
- **Duration**: Time between spawns (ms)
- **Variance**: Random variation (±ms)

Example: Spawn every 3000ms ±500ms = spawn between 2.5-3.5 seconds

### Batch
Spawn groups of elements together:
- **Size**: Number of elements per batch
- **Spacing**: Delay between elements in batch
- **Batch Interval**: Time between batches

Example: 5 elements instantly, then wait 10 seconds

### Manual
Elements are spawned via triggers or API calls.

## Decision Points

Add branching logic with decision steps:

| Condition Type | Description |
|----------------|-------------|
| **Probability** | Random chance (e.g., 70% path A, 30% path B) |
| **Capacity** | Based on target location capacity |
| **Time** | Based on simulation time |
| **Counter** | Based on how many have passed |

## Element States During Simulation

| State | Visual | Description |
|-------|--------|-------------|
| **Moving** | White border, glow | Traveling between cells |
| **Dwelling** | Yellow border | Waiting at a waypoint |
| **Waiting** | Red border | Blocked (e.g., capacity full) |
| **Completed** | (removed) | Exited the simulation |

## Speed Control

The **speed multiplier** controls simulation speed:
- 1x = Real-time
- 2x = Double speed
- 0.5x = Half speed
- Up to 10x for fast-forward

## Scenario Builder UI

The visual scenario builder allows you to:
1. Create and name flows
2. Build paths by clicking grid cells
3. Configure spawning mode
4. Add decision branches
5. Set dwell times at each step
6. Preview in real-time

## Tips

1. **Start simple** - Create a 2-3 waypoint flow first
2. **Use the grid** - Click cells directly in the flow editor
3. **Test spawning** - Use batch mode with size=1 for debugging
4. **Watch paths** - Verify elements route around obstacles correctly
5. **Adjust speed** - Use higher multiplier for testing
    `.trim(),
  },
  {
    slug: "architecture-overview",
    title: "System Architecture",
    description:
      "Technical overview of the warehouse simulation system architecture",
    category: "Technical",
    lastUpdated: "2025-01-11",
    content: `
## Overview

The warehouse flow visualization system is built with a layered architecture centered around the grid-based model.

## Core Layers

\`\`\`
┌─────────────────────────────────────────────┐
│           Visualization Layer               │
│   (Canvas rendering, animations, UI)        │
├─────────────────────────────────────────────┤
│           Simulation Layer                  │
│   (Scenario engine, pathfinding, state)     │
├─────────────────────────────────────────────┤
│           Data Layer                        │
│   (Warehouses, elements, flows, scenarios)  │
├─────────────────────────────────────────────┤
│           Grid Foundation                   │
│   (40px cells, coordinates, blocking)       │
└─────────────────────────────────────────────┘
\`\`\`

## Grid Foundation

The grid is the coordinate system for everything:

\`\`\`typescript
// Grid configuration
const GRID_CELL_SIZE = 40  // pixels
type GridDirection = "up" | "down" | "left" | "right"

// Cell coordinates
interface GridCell {
  col: number
  row: number
}

// Conversion functions
worldToGrid(x, y) → GridCell
gridToWorld(cell) → { x, y }
\`\`\`

## Data Model

### Element Templates
Define visual appearance and behavior:
- Excalidraw visual properties
- Element behavior (static | mobile)
- Default dimensions

### Placed Elements
Instances in a specific warehouse:
- Position and dimensions
- Reference to template
- Custom label and metadata

### Flows
Movement paths through the warehouse:
- Sequence of grid cell waypoints
- Color for visual identification
- Association with warehouse

### Scenarios
Simulation configurations:
- Multiple flows with spawning rules
- Decision logic
- Speed settings

## Simulation Engine

The scenario engine manages:
1. **Spawning** - Creating mobile elements based on flow config
2. **Pathfinding** - Finding routes between grid cells
3. **Movement** - Animating elements along paths
4. **Dwelling** - Managing wait times at waypoints
5. **Decisions** - Evaluating branch conditions
6. **Completion** - Removing elements at exit points

## Pathfinding

Uses A* algorithm for grid-based navigation:
- Input: Start cell, end cell, blocked cells
- Output: Sequence of cells to traverse
- Constraints: 4-directional movement only

## Visualization

Canvas-based rendering:
- Grid cells rendered as background
- Static elements overlaid on grid
- Mobile elements animated along paths
- State indicators (moving, dwelling, waiting)

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **tRPC** - API layer
- **PostgreSQL + Drizzle** - Database
- **Excalidraw** - Canvas editor
- **Canvas API** - Custom visualization rendering
    `.trim(),
  },
]

export function getArticleBySlug(slug: string): WikiArticle | undefined {
  return wikiArticles.find((article) => article.slug === slug)
}

export function getArticlesByCategory(): Record<string, WikiArticle[]> {
  return wikiArticles.reduce<Record<string, WikiArticle[]>>((acc, article) => {
    const category = acc[article.category]
    if (category) {
      category.push(article)
    } else {
      acc[article.category] = [article]
    }
    return acc
  }, {})
}
