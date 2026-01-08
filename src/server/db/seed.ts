import { db } from "./index"
import { categories } from "./schema"

// Seed some default categories (optional)
const defaultCategories = [
  {
    name: "Racking",
    bgColor: "#3b82f6",
    strokeColor: "#1d4ed8",
    icon: "LayoutGrid",
  },
  {
    name: "Lanes",
    bgColor: "#22c55e",
    strokeColor: "#15803d",
    icon: "MoveHorizontal",
  },
  {
    name: "Areas",
    bgColor: "#f59e0b",
    strokeColor: "#b45309",
    icon: "Square",
  },
  {
    name: "Equipment",
    bgColor: "#8b5cf6",
    strokeColor: "#6d28d9",
    icon: "Truck",
  },
]

export async function seed() {
  console.log("Seeding default categories...")

  // Check if categories already exist
  const existingCategories = await db.select().from(categories)

  if (existingCategories.length > 0) {
    console.log("Categories already exist, skipping seed")
    return existingCategories
  }

  // Insert default categories
  const inserted = await db
    .insert(categories)
    .values(defaultCategories)
    .returning()

  console.log(`Seeded ${inserted.length} categories`)
  return inserted
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seed completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seed failed:", error)
      process.exit(1)
    })
}
