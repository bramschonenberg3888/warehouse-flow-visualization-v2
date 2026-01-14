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
import { elementTemplates } from "./element"

// Paths define movement routes within a scenario
export const paths = pgTable("paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  scenarioId: uuid("scenario_id")
    .notNull()
    .references(() => scenarios.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),

  // Reference to a mobile element template that moves along this path
  elementTemplateId: uuid("element_template_id").references(
    () => elementTemplates.id,
    { onDelete: "set null" }
  ),

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
  elementTemplate: one(elementTemplates, {
    fields: [paths.elementTemplateId],
    references: [elementTemplates.id],
  }),
}))

export type Path = typeof paths.$inferSelect
export type NewPath = typeof paths.$inferInsert
