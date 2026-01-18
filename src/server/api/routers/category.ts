import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { categories } from "@/server/db/schema"

export const categoryRouter = createTRPCRouter({
  // Get all categories
  getAll: publicProcedure.query(async () => {
    return db.select().from(categories).orderBy(categories.name)
  }),

  // Get a single category by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.id))

      return category ?? null
    }),

  // Create a new category
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        strokeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        icon: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const [category] = await db.insert(categories).values(input).returning()

      return category
    }),

  // Update a category
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(50).optional(),
        bgColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        strokeColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        icon: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [category] = await db
        .update(categories)
        .set(data)
        .where(eq(categories.id, id))
        .returning()

      return category ?? null
    }),

  // Delete a category
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(categories).where(eq(categories.id, input.id))
      return { success: true }
    }),
})
