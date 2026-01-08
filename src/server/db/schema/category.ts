import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// User-defined element categories
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  // Colors for elements in this category
  bgColor: text("bg_color").notNull().default("#6b7280"),
  strokeColor: text("stroke_color").notNull().default("#374151"),
  // Icon name from lucide-react
  icon: text("icon").notNull().default("Folder"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
