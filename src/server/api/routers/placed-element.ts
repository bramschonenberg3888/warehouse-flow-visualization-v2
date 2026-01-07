import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { placedElements, type PlacedElementMetadata } from "@/server/db/schema"

export const placedElementRouter = createTRPCRouter({
  // Get all placed elements for a warehouse
  getByWarehouse: publicProcedure
    .input(z.object({ warehouseId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(placedElements)
        .where(eq(placedElements.warehouseId, input.warehouseId))
    }),

  // Get a single placed element by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [element] = await db
        .select()
        .from(placedElements)
        .where(eq(placedElements.id, input.id))

      return element ?? null
    }),

  // Create a placed element
  create: publicProcedure
    .input(
      z.object({
        warehouseId: z.string().uuid(),
        elementTemplateId: z.string().uuid(),
        excalidrawId: z.string(),
        label: z.string().optional(),
        positionX: z.number(),
        positionY: z.number(),
        width: z.number().positive(),
        height: z.number().positive(),
        rotation: z.number().default(0),
        metadata: z.custom<PlacedElementMetadata>().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [element] = await db
        .insert(placedElements)
        .values(input)
        .returning()

      return element
    }),

  // Update a placed element
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        label: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        rotation: z.number().optional(),
        metadata: z.custom<PlacedElementMetadata>().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [element] = await db
        .update(placedElements)
        .set(data)
        .where(eq(placedElements.id, id))
        .returning()

      return element
    }),

  // Delete a placed element
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(placedElements).where(eq(placedElements.id, input.id))
      return { success: true }
    }),

  // Bulk sync placed elements (for saving entire canvas state)
  syncWarehouse: publicProcedure
    .input(
      z.object({
        warehouseId: z.string().uuid(),
        elements: z.array(
          z.object({
            id: z.string().uuid().optional(), // Existing element ID
            elementTemplateId: z.string().uuid(),
            excalidrawId: z.string(),
            label: z.string().optional(),
            positionX: z.number(),
            positionY: z.number(),
            width: z.number().positive(),
            height: z.number().positive(),
            rotation: z.number().default(0),
            metadata: z.custom<PlacedElementMetadata>().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { warehouseId, elements } = input

      // Get existing elements
      const existing = await db
        .select()
        .from(placedElements)
        .where(eq(placedElements.warehouseId, warehouseId))

      const existingIds = new Set(existing.map((e) => e.id))
      const inputIds = new Set(elements.filter((e) => e.id).map((e) => e.id!))

      // Delete elements that are no longer present
      const toDelete = existing.filter((e) => !inputIds.has(e.id))
      for (const element of toDelete) {
        await db.delete(placedElements).where(eq(placedElements.id, element.id))
      }

      // Upsert elements
      const results = []
      for (const element of elements) {
        if (element.id && existingIds.has(element.id)) {
          // Update existing element
          const { id, ...data } = element
          const [updated] = await db
            .update(placedElements)
            .set(data)
            .where(eq(placedElements.id, id))
            .returning()
          results.push(updated)
        } else {
          // Create new element
          const { id: _id, ...data } = element
          const [created] = await db
            .insert(placedElements)
            .values({
              ...data,
              warehouseId,
            })
            .returning()
          results.push(created)
        }
      }

      return results
    }),
})
