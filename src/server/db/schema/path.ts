import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { scenarios } from "./scenario"

// Element types that can move along paths
export type PathElementType = "pallet" | "forklift" | "cart" | "person"

// Paths define movement routes within a scenario
export const paths = pgTable("paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  scenarioId: uuid("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),

  // What type of element moves along this path
  elementType: text("element_type")
    .$type<PathElementType>()
    .notNull()
    .default("pallet"),

  // Ordered sequence of stops (element IDs or grid coords "grid:col:row")
  stops: jsonb("stops").$type<string[]>().notNull().default([]),

  // Behavior settings
  spawnInterval: integer("spawn_interval").notNull().default(5000), // ms between spawns
  dwellTime: integer("dwell_time").notNull().default(2000), // ms at each stop
  speed: real("speed").notNull().default(1.0), // speed multiplier
  maxActive: integer("max_active").notNull().default(5), // max concurrent pallets

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Relations
export const pathsRelations = relations(paths, ({ one }) => ({
  scenario: one(scenarios, {
    fields: [paths.scenarioId],
    references: [scenarios.id],
  }),
}))

export type Path = typeof paths.$inferSelect
export type NewPath = typeof paths.$inferInsert
