import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import {
  elementTemplates,
  elementCategoryEnum,
  type ExcalidrawElementData,
} from "@/server/db/schema"

export const elementRouter = createTRPCRouter({
  // Get all element templates
  getAll: publicProcedure.query(async () => {
    return db.select().from(elementTemplates).orderBy(elementTemplates.name)
  }),

  // Get element templates by category
  getByCategory: publicProcedure
    .input(
      z.object({
        category: z.enum(elementCategoryEnum.enumValues),
      })
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(elementTemplates)
        .where(eq(elementTemplates.category, input.category))
        .orderBy(elementTemplates.name)
    }),

  // Get a single element template by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [element] = await db
        .select()
        .from(elementTemplates)
        .where(eq(elementTemplates.id, input.id))

      return element ?? null
    }),

  // Create a custom element template
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        category: z.enum(elementCategoryEnum.enumValues),
        icon: z.string(),
        excalidrawData: z.custom<ExcalidrawElementData>(),
        defaultWidth: z.number().int().positive(),
        defaultHeight: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const [element] = await db
        .insert(elementTemplates)
        .values({
          ...input,
          isSystem: false, // User-created elements are not system elements
        })
        .returning()

      return element
    }),

  // Delete a custom element template (only non-system elements)
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Only allow deleting non-system elements
      const [element] = await db
        .select()
        .from(elementTemplates)
        .where(eq(elementTemplates.id, input.id))

      if (!element) {
        throw new Error("Element not found")
      }

      if (element.isSystem) {
        throw new Error("Cannot delete system elements")
      }

      await db.delete(elementTemplates).where(eq(elementTemplates.id, input.id))
      return { success: true }
    }),
})
