import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  integer,
  boolean,
} from "drizzle-orm/pg-core"

export const elementCategoryEnum = pgEnum("element_category", [
  "racking",
  "lane",
  "area",
  "equipment",
  "custom",
])

// Predefined + custom warehouse element templates
export const elementTemplates = pgTable("element_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  category: elementCategoryEnum("category").notNull(),
  // Excalidraw element definition (shape, color, size, etc.)
  excalidrawData: jsonb("excalidraw_data").$type<ExcalidrawElementData>(),
  // Icon name from lucide-react for library display
  icon: text("icon").notNull(),
  defaultWidth: integer("default_width").notNull().default(100),
  defaultHeight: integer("default_height").notNull().default(100),
  // true = system predefined, false = user-created
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Type for Excalidraw element data stored in JSONB
export interface ExcalidrawElementData {
  type: "rectangle" | "ellipse" | "diamond" | "line" | "arrow"
  backgroundColor: string
  strokeColor: string
  strokeWidth: number
  fillStyle: "solid" | "hachure" | "cross-hatch"
  roughness: number
  opacity: number
  // Additional Excalidraw properties as needed
  [key: string]: unknown
}

export type ElementTemplate = typeof elementTemplates.$inferSelect
export type NewElementTemplate = typeof elementTemplates.$inferInsert
export type ElementCategory = (typeof elementCategoryEnum.enumValues)[number]
