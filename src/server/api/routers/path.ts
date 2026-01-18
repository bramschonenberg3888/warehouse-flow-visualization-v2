import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { paths } from "@/server/db/schema"

// Stop items can be either UUIDs (placed elements) or grid cell IDs (grid:{col}:{row})
const stopItemSchema = z.string().refine(
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

export const pathRouter = createTRPCRouter({
  // Get all paths for a scenario
  getByScenario: publicProcedure
    .input(z.object({ scenarioId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(paths)
        .where(eq(paths.scenarioId, input.scenarioId))
        .orderBy(paths.createdAt)
    }),

  // Get a single path by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [path] = await db.select().from(paths).where(eq(paths.id, input.id))
      return path ?? null
    }),

  // Create a new path
  create: publicProcedure
    .input(
      z.object({
        scenarioId: z.string().uuid(),
        name: z.string().min(1).max(100),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .default("#3b82f6"),
        elementTemplateId: z.string().uuid().nullable().optional(),
        stops: z.array(stopItemSchema).default([]),
        spawnInterval: z.number().int().min(500).max(60000).default(5000),
        dwellTime: z.number().int().min(0).max(30000).default(2000),
        speed: z.number().min(0.1).max(5).default(1.0),
        maxActive: z.number().int().min(1).max(50).default(5),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [path] = await db.insert(paths).values(input).returning()
      return path
    }),

  // Update a path
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        elementTemplateId: z.string().uuid().nullable().optional(),
        stops: z.array(stopItemSchema).optional(),
        spawnInterval: z.number().int().min(500).max(60000).optional(),
        dwellTime: z.number().int().min(0).max(30000).optional(),
        speed: z.number().min(0.1).max(5).optional(),
        maxActive: z.number().int().min(1).max(50).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [path] = await db
        .update(paths)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(paths.id, id))
        .returning()

      return path ?? null
    }),

  // Delete a path
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(paths).where(eq(paths.id, input.id))
      return { success: true }
    }),

  // Toggle path active state
  toggleActive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(paths)
        .where(eq(paths.id, input.id))

      if (!existing) {
        throw new Error("Path not found")
      }

      const [path] = await db
        .update(paths)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(paths.id, input.id))
        .returning()

      return path ?? null
    }),

  // Duplicate a path
  duplicate: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newName: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(paths)
        .where(eq(paths.id, input.id))

      if (!existing) {
        throw new Error("Path not found")
      }

      const [path] = await db
        .insert(paths)
        .values({
          scenarioId: existing.scenarioId,
          name: input.newName ?? `${existing.name} (Copy)`,
          color: existing.color,
          elementTemplateId: existing.elementTemplateId,
          stops: existing.stops,
          spawnInterval: existing.spawnInterval,
          dwellTime: existing.dwellTime,
          speed: existing.speed,
          maxActive: existing.maxActive,
          isActive: existing.isActive,
        })
        .returning()

      return path
    }),
})
