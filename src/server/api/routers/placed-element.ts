import { z } from "zod"
import { eq, inArray } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import {
  placedElements,
  warehouses,
  type PlacedElementMetadata,
} from "@/server/db/schema"

// Helper to update warehouse's updatedAt timestamp
async function touchWarehouse(warehouseId: string) {
  await db
    .update(warehouses)
    .set({ updatedAt: new Date() })
    .where(eq(warehouses.id, warehouseId))
}

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

      await touchWarehouse(input.warehouseId)

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
      const {
        id,
        label,
        positionX,
        positionY,
        width,
        height,
        rotation,
        metadata,
      } = input

      // Build update object with only defined values
      const updateData: Partial<{
        label: string
        positionX: number
        positionY: number
        width: number
        height: number
        rotation: number
        metadata: PlacedElementMetadata
      }> = {}

      if (label !== undefined) updateData.label = label
      if (positionX !== undefined) updateData.positionX = positionX
      if (positionY !== undefined) updateData.positionY = positionY
      if (width !== undefined) updateData.width = width
      if (height !== undefined) updateData.height = height
      if (rotation !== undefined) updateData.rotation = rotation
      if (metadata !== undefined) updateData.metadata = metadata

      const [element] = await db
        .update(placedElements)
        .set(updateData)
        .where(eq(placedElements.id, id))
        .returning()

      if (element) {
        await touchWarehouse(element.warehouseId)
      }

      return element ?? null
    }),

  // Delete a placed element
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Get the element first to find the warehouseId
      const [element] = await db
        .select({ warehouseId: placedElements.warehouseId })
        .from(placedElements)
        .where(eq(placedElements.id, input.id))

      await db.delete(placedElements).where(eq(placedElements.id, input.id))

      if (element) {
        await touchWarehouse(element.warehouseId)
      }

      return { success: true }
    }),

  // Create multiple placed elements at once (for batch placement)
  createMany: publicProcedure
    .input(
      z.object({
        warehouseId: z.string().uuid(),
        elementTemplateId: z.string().uuid(),
        width: z.number().positive(),
        height: z.number().positive(),
        cells: z.array(
          z.object({
            col: z.number().int().min(0),
            row: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { warehouseId, elementTemplateId, width, height, cells } = input

      if (cells.length === 0) {
        return []
      }

      const values = cells.map((cell) => ({
        warehouseId,
        elementTemplateId,
        excalidrawId: crypto.randomUUID(),
        positionX: cell.col * 40, // GRID_CELL_SIZE
        positionY: cell.row * 40,
        width,
        height,
        rotation: 0,
      }))

      const elements = await db
        .insert(placedElements)
        .values(values)
        .returning()

      await touchWarehouse(warehouseId)

      return elements
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

      // Wrap in transaction to prevent race conditions
      return await db.transaction(async (tx) => {
        // Get existing elements
        const existing = await tx
          .select()
          .from(placedElements)
          .where(eq(placedElements.warehouseId, warehouseId))

        const existingIds = new Set(existing.map((e) => e.id))
        const inputIds = new Set(elements.filter((e) => e.id).map((e) => e.id!))

        // Delete elements that are no longer present (bulk delete)
        const toDeleteIds = existing
          .filter((e) => !inputIds.has(e.id))
          .map((e) => e.id)
        if (toDeleteIds.length > 0) {
          await tx
            .delete(placedElements)
            .where(inArray(placedElements.id, toDeleteIds))
        }

        // Upsert elements
        const results = []
        for (const element of elements) {
          if (element.id && existingIds.has(element.id)) {
            // Update existing element
            const { id, ...data } = element
            const [updated] = await tx
              .update(placedElements)
              .set(data)
              .where(eq(placedElements.id, id))
              .returning()
            if (updated) results.push(updated)
          } else {
            // Create new element
            const { id: _id, ...data } = element
            const [created] = await tx
              .insert(placedElements)
              .values({
                ...data,
                warehouseId,
              })
              .returning()
            if (created) results.push(created)
          }
        }

        // Update warehouse's updatedAt timestamp
        await tx
          .update(warehouses)
          .set({ updatedAt: new Date() })
          .where(eq(warehouses.id, warehouseId))

        return results
      })
    }),
})
