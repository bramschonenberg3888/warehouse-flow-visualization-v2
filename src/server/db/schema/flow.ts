import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { warehouses } from "./warehouse"

// Flow routes through the warehouse
export const flows = pgTable("flows", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // Ordered array of placed_element IDs representing the flow path
  elementSequence: jsonb("element_sequence").$type<string[]>().notNull(),
  // Path visualization color (hex)
  color: text("color").notNull().default("#3b82f6"),
  // Whether to show this flow in visualization
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS()

// Relations
export const flowsRelations = relations(flows, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [flows.warehouseId],
    references: [warehouses.id],
  }),
}))

export type Flow = typeof flows.$inferSelect
export type NewFlow = typeof flows.$inferInsert
