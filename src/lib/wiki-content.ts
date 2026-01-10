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
    slug: "element-properties",
    title: "Element Properties",
    description:
      "Understanding how element templates and placed instances work together",
    category: "Elements",
    lastUpdated: "2025-01-09",
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

**Why template-controlled?** These properties define the visual identity of each element type. A "Pallet Rack" should always look like a pallet rack across all your warehouses, ensuring instant recognition and brand consistency.

### Instance-Controlled Properties (Warehouse Flexibility)

These properties can be customized for each placed instance, allowing you to adapt elements to different warehouse layouts.

| Property | Description |
|----------|-------------|
| **Width** | Horizontal size of the element |
| **Height** | Vertical size of the element |
| **Position X** | Horizontal location on canvas |
| **Position Y** | Vertical location on canvas |
| **Rotation** | Angle of the element (degrees) |
| **Label** | Custom name for this specific instance |
| **Metadata** | Capacity, notes, tags, etc. |

**Why instance-controlled?** Every warehouse is different. A storage area might be larger in one warehouse than another. Docks might face different directions. These properties give you the flexibility to adapt.

## Practical Example

Imagine you have a "Loading Dock" element template:
- Template defines: Blue rectangle, dashed stroke, 50% opacity
- Instance A in Warehouse 1: 200x100 at position (100, 50), rotated 0°
- Instance B in Warehouse 2: 150x80 at position (500, 200), rotated 90°

If you change the template's color to green, **both instances** will become green. But their sizes, positions, and rotations remain independent.

## Best Practices

1. **Design templates carefully** - Since visual properties sync everywhere, take time to define your element library with consistent styling
2. **Use categories** - Group related elements (Storage, Transport, Workstations) for easier management
3. **Leverage instance labels** - Give meaningful names to placed elements for clarity (e.g., "Dock A", "Overflow Storage")
4. **Test changes first** - Before modifying a template, consider how it will affect existing warehouses
    `.trim(),
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "Learn the basics of creating warehouse layouts and flow visualizations",
    category: "Guides",
    lastUpdated: "2025-01-09",
    content: `
## Welcome to Warehouse Flow Visualization

This application helps you design warehouse layouts and visualize how goods move through your facilities.

## Quick Start

### 1. Create a Warehouse

Navigate to **Warehouses** in the sidebar and click **New Warehouse**. Give it a name and optional description.

### 2. Open the Editor

Click on your warehouse card, then click **Edit Layout** to open the canvas editor.

### 3. Add Elements

Use the element library on the left side to drag and drop elements onto your canvas:
- **Storage areas** - Pallet racks, shelving, bulk storage
- **Transport** - Conveyors, forklifts, AGV paths
- **Workstations** - Packing stations, quality control areas
- **Infrastructure** - Docks, doors, offices

### 4. Arrange Your Layout

- **Drag** elements to position them
- **Resize** using the corner handles
- **Rotate** using the rotation handle
- **Select multiple** elements to move them together

### 5. Create Scenarios

Navigate to **Scenarios** to define how goods move through your warehouse:
1. Click **New Scenario** and select your warehouse
2. Define flows using the JSON editor (see [Scenarios & Flow Simulation](/wiki/scenarios-and-flows))
3. Go to **Visualization** and select the Scenarios tab
4. Choose your scenario and click **Play** to watch the simulation

## Tips

- Use the **zoom controls** to navigate large layouts
- **Save frequently** - your work is auto-saved but manual saves ensure nothing is lost
- **Use categories** to organize your element library
    `.trim(),
  },
  {
    slug: "scenarios-and-flows",
    title: "Scenarios & Flow Simulation",
    description:
      "Understanding the scenario engine and how to simulate goods movement through your warehouse",
    category: "Simulation",
    lastUpdated: "2025-01-10",
    content: `
## Overview

Scenarios allow you to simulate how goods (pallets) move through your warehouse. Each scenario contains one or more **flows**, and each flow defines a graph of **nodes** connected by **edges**.

## Key Concepts

### Scenario
A top-level container that holds:
- One or more **flows** (movement patterns)
- Global **settings** (speed multiplier, duration, seed)
- Association with a specific **warehouse**

### Flow
A single movement pattern with:
- **Nodes** - Locations, decision points, or exit points
- **Edges** - Connections between nodes
- **Spawning configuration** - How pallets are created
- **Color** - Visual identifier for this flow's pallets

### Node Types

| Type | Purpose |
|------|---------|
| **Location** | A physical position in the warehouse (racking, lane, dock) |
| **Decision** | A branching point based on conditions (probability, capacity) |
| **Exit** | Where pallets leave the simulation |

### Location Targeting

Location nodes can target elements in several ways:

| Target Type | Description |
|-------------|-------------|
| **Fixed** | Specific element by ID |
| **Random** | Random element from a pool of IDs |
| **Category** | Random element from a category (e.g., all "Racking") |
| **Zone** | Elements within a named zone |

### Selection Rules

When using category or zone targeting, you can specify how to choose:
- **random** - Pick any element randomly
- **nearest** - Closest to current position
- **furthest** - Farthest from current position
- **round-robin** - Cycle through elements in order
- **least-visited** - Prefer less-used elements
- **most-available** - Prefer elements with capacity

## Spawning Modes

### Interval
Spawn pallets at regular intervals:
\`\`\`json
{
  "mode": "interval",
  "duration": 3000,
  "variance": 500
}
\`\`\`
Spawns every 3 seconds (±500ms variance).

### Batch
Spawn groups of pallets together:
\`\`\`json
{
  "mode": "batch",
  "size": 5,
  "spacing": 0,
  "batchInterval": 10000
}
\`\`\`
Spawns 5 pallets instantly, then waits 10 seconds for next batch.

### Manual
Pallets are spawned externally (via API or triggers).

## Dwell Times

Each location node has a **dwell time** - how long pallets wait there:

| Type | Example |
|------|---------|
| **Fixed** | Always 2000ms |
| **Range** | Random between 1000-3000ms |
| **Distribution** | Normal distribution with mean/stdDev |

## Example Scenario JSON

\`\`\`json
{
  "flows": [
    {
      "id": "inbound-flow",
      "name": "Inbound Receiving",
      "color": "#3b82f6",
      "isActive": true,
      "entryNode": "dock",
      "nodes": [
        {
          "type": "location",
          "id": "dock",
          "target": { "type": "fixed", "elementId": "dock-1" },
          "action": { "dwell": { "type": "fixed", "duration": 2000 } }
        },
        {
          "type": "location",
          "id": "storage",
          "target": {
            "type": "category",
            "categoryId": "racking-category-id",
            "rule": "random"
          },
          "action": { "dwell": { "type": "fixed", "duration": 1000 } }
        },
        { "type": "exit", "id": "done" }
      ],
      "edges": [
        { "id": "e1", "from": "dock", "to": "storage" },
        { "id": "e2", "from": "storage", "to": "done" }
      ],
      "spawning": {
        "mode": "interval",
        "duration": 5000
      }
    }
  ],
  "settings": {
    "speedMultiplier": 1
  }
}
\`\`\`

## Decision Nodes

Add branching logic with decision nodes:

\`\`\`json
{
  "type": "decision",
  "id": "branch",
  "condition": { "type": "probability", "chance": 0.7 }
}
\`\`\`

Connect with conditional edges:
\`\`\`json
{ "id": "e1", "from": "branch", "to": "path-a", "condition": "true" },
{ "id": "e2", "from": "branch", "to": "path-b", "condition": "false" }
\`\`\`

70% of pallets go to path-a, 30% to path-b.

## Pallet States

During simulation, pallets can be in these states:

| State | Visual | Description |
|-------|--------|-------------|
| **Moving** | White border, glow | Traveling between locations |
| **Dwelling** | Yellow border | Waiting at a location |
| **Waiting** | Red border | Blocked (e.g., capacity full) |
| **Completed** | (removed) | Exited the simulation |

## Tips

1. **Start simple** - Create a 2-node flow first, then add complexity
2. **Use categories** - Category targeting is more flexible than fixed IDs
3. **Test spawning** - Use batch mode with size=1 for debugging
4. **Check the console** - Debug logs show pallet states and transitions
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
