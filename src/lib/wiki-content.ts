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
    slug: "path-settings",
    title: "Path Settings Guide",
    description:
      "Configure spawn intervals, dwell times, speed, and path behavior",
    category: "Simulation",
    lastUpdated: "2025-01-14",
    content: `
## Overview

Each path in a scenario has configurable settings that control how mobile elements are spawned, how fast they move, and how long they wait at each stop.

## Path Settings

### Spawn Interval

Controls how often new mobile elements appear at the path's starting point.

| Setting | Description | Example |
|---------|-------------|---------|
| **Interval (ms)** | Time between spawns | 3000ms = new element every 3 seconds |
| **Min Active** | Minimum elements before spawning pauses | Keep at least 2 active |
| **Max Active** | Maximum simultaneous elements | Cap at 10 elements |

**Tips:**
- Lower intervals = more elements, busier simulation
- Use max active to prevent overcrowding
- Start with 5000ms intervals for testing

### Dwell Time

How long elements pause at each stop along the path.

| Mode | Description | Use Case |
|------|-------------|----------|
| **Fixed** | Always same duration | Consistent process times |
| **Range** | Random min-max | Realistic variation |
| **None** | No waiting (pass through) | Transit points |

**Example dwell times:**
- Loading dock: 5000-10000ms (loading/unloading)
- Checkpoint: 1000ms (scanning)
- Intersection: 0ms (pass through)

### Movement Speed

Controls how fast elements travel between grid cells.

| Setting | Effect |
|---------|--------|
| **Speed** | Pixels per second (default: 80) |
| **Global multiplier** | Scenario-level speed control |

**Speed reference:**
- 40 px/s = 1 cell per second (slow, detailed view)
- 80 px/s = 2 cells per second (normal pace)
- 160 px/s = 4 cells per second (fast simulation)

## Path Requirements

For a path to be valid and runnable:

1. **Minimum 2 stops** - Need start and end points
2. **Valid stop references** - Grid cells must exist or element IDs must be valid
3. **Connected warehouse** - Path must be linked to a warehouse
4. **Passable route** - Pathfinding must find a route between consecutive stops

## Stop Types

Stops can reference either grid positions or placed elements:

| Type | Format | Description |
|------|--------|-------------|
| **Grid cell** | \`grid:5:10\` | Column 5, row 10 |
| **Element** | \`elem:uuid-here\` | Center of placed element |

## Common Configurations

### High-throughput receiving
\`\`\`
Spawn interval: 2000ms
Max active: 20
Dwell at dock: 8000-12000ms
Speed: 120 px/s
\`\`\`

### Quality inspection flow
\`\`\`
Spawn interval: 10000ms
Max active: 5
Dwell at station: 15000-30000ms
Speed: 60 px/s
\`\`\`

### Fast transit corridor
\`\`\`
Spawn interval: 1500ms
Max active: 15
Dwell: 0ms (all stops)
Speed: 160 px/s
\`\`\`
    `.trim(),
  },
  {
    slug: "best-practices",
    title: "Warehouse Design Best Practices",
    description:
      "Tips and recommendations for creating effective warehouse layouts",
    category: "Guides",
    lastUpdated: "2025-01-14",
    content: `
## Overview

Follow these best practices to create warehouse layouts that are both visually clear and simulation-friendly.

## Layout Design

### Grid Alignment

Always align elements to the 40px grid:
- Position elements at multiples of 40 (0, 40, 80, 120...)
- Size elements in grid units (1x1 = 40x40, 2x3 = 80x120)
- This ensures clean pathfinding and visual consistency

### Clear Aisles

Leave unobstructed paths for mobile elements:
- **Main aisles**: At least 2 cells wide (80px)
- **Secondary aisles**: 1 cell wide minimum (40px)
- Avoid dead ends unless intentional

### Logical Zones

Organize your warehouse into functional areas:

| Zone | Purpose | Element Types |
|------|---------|---------------|
| **Receiving** | Incoming goods | Docks, staging areas |
| **Storage** | Inventory holding | Racking, bulk storage |
| **Processing** | Value-add operations | Workstations, QC areas |
| **Shipping** | Outbound preparation | Docks, staging, packing |
| **Transit** | Movement corridors | Clear aisles, intersections |

### Color Coding

Use consistent colors for element categories:
- **Blue** - Storage and racking
- **Green** - Entry points (receiving docks)
- **Orange** - Exit points (shipping docks)
- **Yellow** - Workstations and processing
- **Gray** - Infrastructure (walls, offices)

## Path Design

### Natural Flow

Design paths that follow real-world material flow:
1. Receiving → Storage → Processing → Shipping
2. Avoid backtracking when possible
3. Consider one-way aisles for high-traffic areas

### Intermediate Waypoints

Add waypoints at key decision points:
- **Intersections** - Where paths might diverge
- **Zone boundaries** - Entry/exit of functional areas
- **Queue points** - Before workstations or docks

### Traffic Separation

For complex warehouses:
- Designate lanes for different flow types
- Use different colored paths for clarity
- Consider time-based separation

## Scenario Configuration

### Start Simple

When creating new scenarios:
1. Begin with a single, short path (3-4 stops)
2. Test with slow spawn rates (10+ seconds)
3. Verify pathfinding works correctly
4. Gradually add complexity

### Realistic Timing

Set spawn intervals and dwell times based on reality:
- **Forklift unload**: 30-60 seconds
- **Pallet put-away**: 45-90 seconds
- **Pick operation**: 20-40 seconds
- **Quality check**: 60-120 seconds

### Capacity Planning

Consider throughput limits:
- How many elements can a path handle?
- Where are bottlenecks likely?
- Use max active limits to prevent gridlock

## Common Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Blocked paths | Elements can't reach destination | Leave clear aisles, test pathfinding |
| Overlapping elements | Visual confusion, collision | Use grid snapping, check placement |
| Too many simultaneous elements | Performance issues, visual clutter | Use max active limits |
| Unrealistic speeds | Doesn't match real operations | Base settings on actual timings |
| Missing waypoints | Paths cut through obstacles | Add intermediate stops |

## Performance Tips

- **Limit active elements**: 50-100 max for smooth animation
- **Reasonable grid size**: 50x50 cells is plenty for most layouts
- **Batch testing**: Use single spawns to debug before scaling up
    `.trim(),
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description: "Quick reference for keyboard shortcuts throughout the app",
    category: "Reference",
    lastUpdated: "2025-01-14",
    content: `
## Overview

Use keyboard shortcuts to work more efficiently in the warehouse editor and visualization views.

## Warehouse Editor (Excalidraw)

### Selection & Navigation

| Shortcut | Action |
|----------|--------|
| \`V\` | Selection tool |
| \`H\` | Hand tool (pan) |
| \`Space + Drag\` | Pan canvas |
| \`Scroll\` | Zoom in/out |
| \`Ctrl + 0\` | Reset zoom to 100% |
| \`Ctrl + 1\` | Zoom to fit |

### Element Manipulation

| Shortcut | Action |
|----------|--------|
| \`Ctrl + D\` | Duplicate selection |
| \`Ctrl + C\` | Copy selection |
| \`Ctrl + V\` | Paste |
| \`Delete\` / \`Backspace\` | Delete selection |
| \`Ctrl + A\` | Select all |
| \`Escape\` | Deselect / Cancel |

### Drawing Tools

| Shortcut | Action |
|----------|--------|
| \`R\` | Rectangle tool |
| \`E\` | Ellipse tool |
| \`D\` | Diamond tool |
| \`L\` | Line tool |
| \`A\` | Arrow tool |
| \`P\` | Pencil (freehand) |

### Editing

| Shortcut | Action |
|----------|--------|
| \`Ctrl + Z\` | Undo |
| \`Ctrl + Shift + Z\` | Redo |
| \`Ctrl + G\` | Group selection |
| \`Ctrl + Shift + G\` | Ungroup |

### Alignment

| Shortcut | Action |
|----------|--------|
| \`Ctrl + Shift + L\` | Align left |
| \`Ctrl + Shift + R\` | Align right |
| \`Ctrl + Shift + C\` | Center horizontally |

## Scenario Editor

### Path Building

| Shortcut | Action |
|----------|--------|
| \`Click cell\` | Add stop to path |
| \`Right-click stop\` | Remove stop |
| \`Drag stop\` | Reorder in list |

### Visualization Controls

| Shortcut | Action |
|----------|--------|
| \`Space\` | Play / Pause |
| \`R\` | Reset simulation |
| \`+\` / \`-\` | Adjust speed |

## General Navigation

| Shortcut | Action |
|----------|--------|
| \`Ctrl + S\` | Save changes |
| \`Escape\` | Close dialog / Cancel |

## Tips

- **Grid snapping** is automatic - elements align to 40px grid
- **Hold Shift** while resizing to maintain aspect ratio
- **Hold Ctrl** while dragging to duplicate
- Use **Tab** to cycle through elements in a selection
    `.trim(),
  },
  {
    slug: "faq",
    title: "FAQ & Troubleshooting",
    description: "Answers to common questions and solutions to frequent issues",
    category: "Reference",
    lastUpdated: "2025-01-14",
    content: `
## Frequently Asked Questions

### General

**Q: What is the grid cell size?**
A: All grids use 40x40 pixel cells. This is a fixed constant throughout the application.

**Q: Can I change the grid cell size?**
A: No, the 40px cell size is fundamental to the system. Design your warehouses with this in mind.

**Q: What's the difference between static and mobile elements?**
A: Static elements (racking, walls) are fixed in place and block movement. Mobile elements (pallets, forklifts) move through the grid during simulation.

### Elements

**Q: Why do my element changes affect all warehouses?**
A: Template properties (colors, behavior) sync to all instances. Only position, size, rotation, and labels are instance-specific.

**Q: How do I create a new element type?**
A: Go to Elements → New Element. Design the visual appearance and set the behavior (static/mobile).

**Q: Can elements overlap?**
A: Yes, elements can visually overlap, but for simulation accuracy, static elements should occupy distinct grid cells.

### Paths & Scenarios

**Q: Why won't my path work?**
A: Check these common issues:
- Path needs at least 2 stops
- Stops must be valid grid cells or element IDs
- Route must not be completely blocked
- Warehouse must be saved

**Q: Elements are stuck and not moving. Why?**
A: Possible causes:
- Path is blocked by static elements
- Max active limit reached
- Dwell time set very high
- Spawn interval too long

**Q: Can paths cross each other?**
A: Yes, multiple paths can share grid cells. Elements from different paths may pass through the same areas.

### Visualization

**Q: The simulation is too slow/fast. How do I adjust?**
A: Use the speed multiplier in the scenario settings. 1x is real-time, 2x is double speed, etc.

**Q: Why do elements disappear?**
A: Elements are removed when they reach the final stop of their path. This represents completion of the flow.

**Q: Can I pause the simulation?**
A: Yes, use the play/pause button or press Space.

## Troubleshooting

### "No path found" Error

**Cause:** Pathfinding cannot find a route between two stops.

**Solutions:**
1. Check for blocking elements between stops
2. Ensure aisles are clear (at least 1 cell wide)
3. Add intermediate waypoints to guide the path
4. Verify stop coordinates are within warehouse bounds

### Elements Not Spawning

**Cause:** Spawn configuration issues.

**Solutions:**
1. Check spawn interval is reasonable (not 0 or very large)
2. Verify max active limit hasn't been reached
3. Ensure the path has valid stops
4. Check that the scenario is playing (not paused)

### Slow Performance

**Cause:** Too many active elements or large grid.

**Solutions:**
1. Reduce max active elements per path
2. Increase spawn intervals
3. Use smaller warehouse dimensions
4. Close other browser tabs

### Elements Taking Wrong Route

**Cause:** Unexpected pathfinding results.

**Solutions:**
1. Add intermediate waypoints to guide the path
2. Check for unexpected blocked cells
3. Ensure static elements are properly placed
4. Test with a single element first

### Changes Not Saving

**Cause:** Browser or connection issues.

**Solutions:**
1. Check your internet connection
2. Refresh the page and try again
3. Clear browser cache
4. Check for error messages in the console

## Getting Help

If you encounter issues not covered here:
1. Check the other wiki articles for detailed explanations
2. Review your configuration step by step
3. Test with a minimal example (simple path, few elements)
4. Check the browser console for error messages
    `.trim(),
  },
  {
    slug: "glossary",
    title: "Glossary",
    description: "Definitions of key terms used throughout the application",
    category: "Reference",
    lastUpdated: "2025-01-14",
    content: `
## Terms & Definitions

### A-D

**Active Element**
A mobile element currently in the simulation, moving or dwelling along a path.

**Aisle**
Clear grid cells forming a passage for mobile elements to travel through.

**Behavior**
Classification of an element as either static (fixed) or mobile (moving).

**Blocked Cell**
A grid cell occupied by a static element that mobile elements cannot pass through.

**Cell**
A single unit of the grid, measuring 40x40 pixels. The fundamental unit of position.

**Category**
A grouping for organizing element templates (e.g., Storage, Transport, Infrastructure).

**Dwell Time**
Duration that a mobile element waits at a stop before continuing to the next stop.

### E-H

**Element**
A visual object in the warehouse. Can be static (racking) or mobile (pallet).

**Element Instance**
A specific placement of an element template in a warehouse, with its own position and size.

**Element Template**
A reusable element definition with visual properties and behavior settings.

**Flow**
A movement pattern consisting of a sequence of stops (waypoints) and settings.

**Grid**
The coordinate system underlying all warehouses. Composed of 40x40 pixel cells.

**Grid Coordinates**
Position specified as column and row numbers (e.g., grid:5:10 = column 5, row 10).

### I-P

**Instance**
See Element Instance.

**Max Active**
Maximum number of mobile elements that can be simultaneously active on a path.

**Mobile Element**
An element that moves during simulation (pallets, forklifts, AGVs).

**Path**
A defined route through the warehouse consisting of stops and movement settings.

**Pathfinding**
The algorithm (A*) that calculates routes between stops, avoiding blocked cells.

### Q-S

**Scenario**
A simulation configuration containing one or more paths with spawning rules.

**Spawn**
The creation of a new mobile element at the start of a path.

**Spawn Interval**
Time between successive spawns of mobile elements on a path.

**Speed**
Rate of movement for mobile elements, measured in pixels per second.

**Static Element**
An element fixed in place that blocks grid cells (racking, walls, docks).

**Stop**
A waypoint in a path, referenced by grid coordinates or element ID.

### T-Z

**Template**
See Element Template.

**Throughput**
Rate of elements completing a path, often measured per minute or hour.

**Visualization**
The animated display of mobile elements moving through the warehouse.

**Walkable Cell**
A grid cell not blocked by static elements, available for mobile element movement.

**Warehouse**
A layout containing placed elements on a grid canvas.

**Waypoint**
A point along a path where mobile elements travel to or through.
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
