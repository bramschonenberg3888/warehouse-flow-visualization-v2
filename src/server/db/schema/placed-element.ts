import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  real,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { warehouses } from "./warehouse"
import { elementTemplates } from "./element"

// Elements placed on a warehouse canvas
export const placedElements = pgTable("placed_elements", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  elementTemplateId: uuid("element_template_id")
    .notNull()
    .references(() => elementTemplates.id, { onDelete: "restrict" }),
  // Excalidraw element ID for syncing with canvas
  excalidrawId: text("excalidraw_id").notNull(),
  // User-assigned label for this instance
  label: text("label"),
  // Position and dimensions on canvas
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  rotation: real("rotation").notNull().default(0),
  // Additional metadata (capacity, notes, etc.)
  metadata: jsonb("metadata").$type<PlacedElementMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}).enableRLS()

// Relations
export const placedElementsRelations = relations(placedElements, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [placedElements.warehouseId],
    references: [warehouses.id],
  }),
  template: one(elementTemplates, {
    fields: [placedElements.elementTemplateId],
    references: [elementTemplates.id],
  }),
}))

// Type for placed element metadata stored in JSONB
export interface PlacedElementMetadata {
  capacity?: number
  notes?: string
  tags?: string[]
  [key: string]: unknown
}

export type PlacedElement = typeof placedElements.$inferSelect
export type NewPlacedElement = typeof placedElements.$inferInsert
