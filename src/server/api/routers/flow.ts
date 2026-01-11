import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { flows } from "@/server/db/schema"

// Sequence items can be either UUIDs (placed elements) or grid cell IDs (grid:{col}:{row})
const sequenceItemSchema = z.string().refine(
  (val) => {
    // Check if it's a grid cell ID
    if (val.startsWith("grid:")) {
      const parts = val.split(":")
      if (parts.length !== 3) return false
      const col = parseInt(parts[1]!, 10)
      const row = parseInt(parts[2]!, 10)
      return !isNaN(col) && !isNaN(row) && col >= 0 && row >= 0
    }
    // Otherwise validate as UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val)
  },
  { message: "Must be a valid UUID or grid cell ID (grid:{col}:{row})" }
)

export const flowRouter = createTRPCRouter({
  // Get all flows for a warehouse
  getByWarehouse: publicProcedure
    .input(z.object({ warehouseId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(flows)
        .where(eq(flows.warehouseId, input.warehouseId))
        .orderBy(flows.createdAt)
    }),

  // Get a single flow by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [flow] = await db.select().from(flows).where(eq(flows.id, input.id))

      return flow ?? null
    }),

  // Create a new flow
  create: publicProcedure
    .input(
      z.object({
        warehouseId: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        elementSequence: z.array(sequenceItemSchema),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .default("#3b82f6"),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [flow] = await db.insert(flows).values(input).returning()
      return flow
    }),

  // Update a flow
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        elementSequence: z.array(sequenceItemSchema).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [flow] = await db
        .update(flows)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(flows.id, id))
        .returning()

      return flow
    }),

  // Delete a flow
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(flows).where(eq(flows.id, input.id))
      return { success: true }
    }),

  // Toggle flow active state
  toggleActive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(flows)
        .where(eq(flows.id, input.id))

      if (!existing) {
        throw new Error("Flow not found")
      }

      const [flow] = await db
        .update(flows)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(flows.id, input.id))
        .returning()

      return flow
    }),
})
