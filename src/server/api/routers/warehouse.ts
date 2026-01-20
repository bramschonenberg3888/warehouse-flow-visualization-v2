import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import {
  warehouses,
  placedElements,
  type CanvasState,
} from "@/server/db/schema"

export const warehouseRouter = createTRPCRouter({
  // Get all warehouses
  getAll: publicProcedure.query(async () => {
    return db.select().from(warehouses).orderBy(warehouses.createdAt)
  }),

  // Get a single warehouse by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [warehouse] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, input.id))

      return warehouse ?? null
    }),

  // Create a new warehouse
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        gridColumns: z.number().int().min(5).max(100).default(20),
        gridRows: z.number().int().min(5).max(100).default(15),
      })
    )
    .mutation(async ({ input }) => {
      const [warehouse] = await db
        .insert(warehouses)
        .values({
          name: input.name,
          description: input.description,
          gridColumns: input.gridColumns,
          gridRows: input.gridRows,
        })
        .returning()

      return warehouse
    }),

  // Update a warehouse
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        gridColumns: z.number().int().min(5).max(100).optional(),
        gridRows: z.number().int().min(5).max(100).optional(),
        canvasState: z.custom<CanvasState>().optional(),
        thumbnailUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [warehouse] = await db
        .update(warehouses)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(warehouses.id, id))
        .returning()

      return warehouse ?? null
    }),

  // Delete a warehouse
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(warehouses).where(eq(warehouses.id, input.id))
      return { success: true }
    }),

  // Duplicate a warehouse (copies all placed elements)
  duplicate: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, input.id))

      if (!existing) {
        throw new Error("Warehouse not found")
      }

      // Create the new warehouse
      const [warehouse] = await db
        .insert(warehouses)
        .values({
          name: input.newName,
          description: existing.description,
          gridColumns: existing.gridColumns,
          gridRows: existing.gridRows,
        })
        .returning()

      if (!warehouse) {
        throw new Error("Failed to create warehouse")
      }

      // Copy all placed elements from the original warehouse
      const existingElements = await db
        .select()
        .from(placedElements)
        .where(eq(placedElements.warehouseId, input.id))

      if (existingElements.length > 0) {
        await db.insert(placedElements).values(
          existingElements.map((el) => ({
            warehouseId: warehouse.id,
            elementTemplateId: el.elementTemplateId,
            excalidrawId: crypto.randomUUID(),
            label: el.label,
            positionX: el.positionX,
            positionY: el.positionY,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            metadata: el.metadata,
          }))
        )
      }

      return warehouse
    }),
})
