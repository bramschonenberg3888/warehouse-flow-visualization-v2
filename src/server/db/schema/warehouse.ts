import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  integer,
} from "drizzle-orm/pg-core"

// Warehouse layouts
export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Grid dimensions (cell size is fixed at 40px)
  gridColumns: integer("grid_columns").notNull().default(20),
  gridRows: integer("grid_rows").notNull().default(15),
  // Excalidraw canvas state (viewport, zoom, scroll position, etc.)
  canvasState: jsonb("canvas_state").$type<CanvasState>(),
  // Preview thumbnail as base64 or URL
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS()

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
