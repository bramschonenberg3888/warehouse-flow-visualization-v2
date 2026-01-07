import { eq } from "drizzle-orm"
import { db } from "./index"
import {
  elementTemplates,
  type NewElementTemplate,
  type ExcalidrawElementData,
} from "./schema"

// Color palette for warehouse elements
const COLORS = {
  racking: { bg: "#3b82f6", stroke: "#1d4ed8" }, // blue
  lane: { bg: "#22c55e", stroke: "#15803d" }, // green
  area: { bg: "#f59e0b", stroke: "#b45309" }, // amber
  equipment: { bg: "#8b5cf6", stroke: "#6d28d9" }, // violet
}

// Helper to create Excalidraw element data
function createElementData(
  color: { bg: string; stroke: string },
  type: "rectangle" | "ellipse" = "rectangle"
): ExcalidrawElementData {
  return {
    type,
    backgroundColor: color.bg,
    strokeColor: color.stroke,
    strokeWidth: 2,
    fillStyle: "solid",
    roughness: 0,
    opacity: 80,
  }
}

// Predefined warehouse element templates
const predefinedElements: NewElementTemplate[] = [
  // Racking Category
  {
    name: "Racking Unit",
    category: "racking",
    icon: "Warehouse",
    excalidrawData: createElementData(COLORS.racking),
    defaultWidth: 120,
    defaultHeight: 40,
    isSystem: true,
  },
  {
    name: "Shelving",
    category: "racking",
    icon: "LayoutGrid",
    excalidrawData: createElementData(COLORS.racking),
    defaultWidth: 80,
    defaultHeight: 30,
    isSystem: true,
  },

  // Lane Category
  {
    name: "Inbound Lane",
    category: "lane",
    icon: "ArrowDownToLine",
    excalidrawData: createElementData(COLORS.lane),
    defaultWidth: 60,
    defaultHeight: 150,
    isSystem: true,
  },
  {
    name: "Outbound Lane",
    category: "lane",
    icon: "ArrowUpFromLine",
    excalidrawData: createElementData(COLORS.lane),
    defaultWidth: 60,
    defaultHeight: 150,
    isSystem: true,
  },
  {
    name: "Conveyor",
    category: "lane",
    icon: "MoveHorizontal",
    excalidrawData: createElementData(COLORS.lane),
    defaultWidth: 200,
    defaultHeight: 30,
    isSystem: true,
  },

  // Area Category
  {
    name: "Staging Area",
    category: "area",
    icon: "Square",
    excalidrawData: createElementData(COLORS.area),
    defaultWidth: 150,
    defaultHeight: 100,
    isSystem: true,
  },
  {
    name: "Packing Area",
    category: "area",
    icon: "Package",
    excalidrawData: createElementData(COLORS.area),
    defaultWidth: 120,
    defaultHeight: 80,
    isSystem: true,
  },
  {
    name: "Consolidation Area",
    category: "area",
    icon: "Layers",
    excalidrawData: createElementData(COLORS.area),
    defaultWidth: 140,
    defaultHeight: 100,
    isSystem: true,
  },
  {
    name: "Quality Control",
    category: "area",
    icon: "ClipboardCheck",
    excalidrawData: createElementData(COLORS.area),
    defaultWidth: 100,
    defaultHeight: 80,
    isSystem: true,
  },

  // Equipment Category
  {
    name: "Forklift Station",
    category: "equipment",
    icon: "Truck",
    excalidrawData: createElementData(COLORS.equipment, "ellipse"),
    defaultWidth: 50,
    defaultHeight: 50,
    isSystem: true,
  },
  {
    name: "Dock Door",
    category: "equipment",
    icon: "DoorOpen",
    excalidrawData: createElementData(COLORS.equipment),
    defaultWidth: 80,
    defaultHeight: 20,
    isSystem: true,
  },
]

export async function seed() {
  console.log("Seeding predefined element templates...")

  // Clear existing system elements
  await db
    .delete(elementTemplates)
    .where(eq(elementTemplates.isSystem, true))
    .catch(() => {
      // Table might not exist yet, ignore
    })

  // Insert predefined elements
  const inserted = await db
    .insert(elementTemplates)
    .values(predefinedElements)
    .returning()

  console.log(`Seeded ${inserted.length} element templates`)
  return inserted
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seed completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seed failed:", error)
      process.exit(1)
    })
}
