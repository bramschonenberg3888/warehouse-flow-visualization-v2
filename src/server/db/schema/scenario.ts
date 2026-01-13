import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
  real,
  integer,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { warehouses } from "./warehouse"
import { paths } from "./path"
import type { ScenarioDefinition } from "@/lib/scenario-engine/types"

// Scenarios for flow simulation
export const scenarios = pgTable("scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),

  // Legacy: Full scenario definition as JSONB (deprecated, use paths relation instead)
  definition: jsonb("definition").$type<ScenarioDefinition>(),

  // Global settings
  speedMultiplier: real("speed_multiplier").notNull().default(1.0),
  duration: integer("duration"), // optional max duration in ms

  // Whether this scenario is active for visualization
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Relations
export const scenariosRelations = relations(scenarios, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [scenarios.warehouseId],
    references: [warehouses.id],
  }),
  paths: many(paths),
}))

export type Scenario = typeof scenarios.$inferSelect
export type NewScenario = typeof scenarios.$inferInsert
