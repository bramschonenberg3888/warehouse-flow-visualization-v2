import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
  boolean,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { categories } from "./category"

// Element behavior classification
// - "static": Fixed elements (racking, zones, walls, floor tiles, aisles)
// - "mobile": Can move during simulation (pallets, forklifts, AGVs, workers)
export type ElementBehavior = "static" | "mobile"

// Predefined + custom warehouse element templates
export const elementTemplates = pgTable("element_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  // Reference to category
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  // Excalidraw element definition (shape, color, size, etc.)
  excalidrawData: jsonb("excalidraw_data").$type<ExcalidrawElementData>(),
  // Icon name from lucide-react for library display
  icon: text("icon").notNull(),
  defaultWidth: integer("default_width").notNull().default(100),
  defaultHeight: integer("default_height").notNull().default(100),
  // Element behavior classification:
  // - "static": Fixed elements (racking, zones, walls, floor tiles, aisles)
  // - "mobile": Can move during simulation (pallets, forklifts, AGVs, workers)
  elementBehavior: text("element_behavior")
    .notNull()
    .default("static")
    .$type<ElementBehavior>(),
  // true = system predefined, false = user-created
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relations
export const elementTemplatesRelations = relations(
  elementTemplates,
  ({ one }) => ({
    category: one(categories, {
      fields: [elementTemplates.categoryId],
      references: [categories.id],
    }),
  })
)

export const categoriesRelations = relations(categories, ({ many }) => ({
  elements: many(elementTemplates),
}))

// Single element within a multi-element template (stores relative position to group origin)
export interface ExcalidrawTemplateElement {
  type: "rectangle" | "ellipse" | "diamond" | "line" | "arrow" | "text"
  // Position relative to group origin (0,0)
  relativeX: number
  relativeY: number
  // Element dimensions
  width: number
  height: number
  angle: number
  // Styling (template-controlled)
  backgroundColor: string
  strokeColor: string
  strokeWidth: number
  strokeStyle: "solid" | "dashed" | "dotted"
  fillStyle: "solid" | "hachure" | "cross-hatch"
  roughness: number
  opacity: number
  roundness: { type: number } | null
  // For text elements
  text?: string
  fontSize?: number
  fontFamily?: number
}

// Type for Excalidraw element data stored in JSONB
// These are TEMPLATE-CONTROLLED properties (sync to all instances)
// Instance-controlled properties (position, size, rotation) are stored in placed_elements
export interface ExcalidrawElementData {
  // Version for format detection (undefined or 1 = legacy single-element, 2 = multi-element)
  version?: 1 | 2
  // Legacy fields (version 1) - kept for backwards compatibility
  // Shape type - defines the element's form
  type?: "rectangle" | "ellipse" | "diamond" | "line" | "arrow"
  // Colors - for brand consistency and recognition
  backgroundColor?: string
  strokeColor?: string
  // Stroke properties - visual style
  strokeWidth?: number
  strokeStyle?: "solid" | "dashed" | "dotted"
  // Fill style - visual pattern
  fillStyle?: "solid" | "hachure" | "cross-hatch"
  // Roughness - hand-drawn "sketchiness" (0-2)
  roughness?: number
  // Opacity - transparency (0-100)
  opacity?: number
  // Roundness - corner style (null = sharp, object = rounded)
  roundness?: { type: number } | null
  // Version 2 field - array of elements with relative positions
  elements?: ExcalidrawTemplateElement[]
}

export type ElementTemplate = typeof elementTemplates.$inferSelect
export type NewElementTemplate = typeof elementTemplates.$inferInsert
