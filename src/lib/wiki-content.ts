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

### 5. Define Flows (Coming Soon)

Create flow paths by selecting elements in sequence to show how goods move through your warehouse.

## Tips

- Use the **zoom controls** to navigate large layouts
- **Save frequently** - your work is auto-saved but manual saves ensure nothing is lost
- **Use categories** to organize your element library
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
