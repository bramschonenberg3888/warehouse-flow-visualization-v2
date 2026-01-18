import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { warehouses, type CanvasState } from "@/server/db/schema"

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
})
