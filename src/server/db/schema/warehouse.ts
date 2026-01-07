import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core"

// Warehouse layouts
export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Excalidraw canvas state (viewport, zoom, scroll position, etc.)
  canvasState: jsonb("canvas_state").$type<CanvasState>(),
  // Preview thumbnail as base64 or URL
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Type for Excalidraw canvas state stored in JSONB
export interface CanvasState {
  viewBackgroundColor?: string
  zoom?: { value: number }
  scrollX?: number
  scrollY?: number
  // Additional appState properties
  [key: string]: unknown
}

export type Warehouse = typeof warehouses.$inferSelect
export type NewWarehouse = typeof warehouses.$inferInsert
