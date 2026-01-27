import { z } from "zod"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import {
  elementTemplates,
  categories,
  placedElements,
  type ExcalidrawElementData,
  type ElementBehavior,
  type FrontDirection,
} from "@/server/db/schema"

export const elementRouter = createTRPCRouter({
  // Get all element templates with their categories
  getAll: publicProcedure.query(async () => {
    return db
      .select({
        id: elementTemplates.id,
        name: elementTemplates.name,
        categoryId: elementTemplates.categoryId,
        excalidrawData: elementTemplates.excalidrawData,
        icon: elementTemplates.icon,
        defaultWidth: elementTemplates.defaultWidth,
        defaultHeight: elementTemplates.defaultHeight,
        elementBehavior: elementTemplates.elementBehavior,
        isSystem: elementTemplates.isSystem,
        rotateWithMovement: elementTemplates.rotateWithMovement,
        frontDirection: elementTemplates.frontDirection,
        createdAt: elementTemplates.createdAt,
        category: categories,
      })
      .from(elementTemplates)
      .leftJoin(categories, eq(elementTemplates.categoryId, categories.id))
      .orderBy(elementTemplates.name)
  }),

  // Get element templates by category
  getByCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(elementTemplates)
        .where(eq(elementTemplates.categoryId, input.categoryId))
        .orderBy(elementTemplates.name)
    }),

  // Get only mobile element templates (for path selection)
  getMobileElements: publicProcedure.query(async () => {
    return db
      .select({
        id: elementTemplates.id,
        name: elementTemplates.name,
        categoryId: elementTemplates.categoryId,
        excalidrawData: elementTemplates.excalidrawData,
        icon: elementTemplates.icon,
        defaultWidth: elementTemplates.defaultWidth,
        defaultHeight: elementTemplates.defaultHeight,
        elementBehavior: elementTemplates.elementBehavior,
        isSystem: elementTemplates.isSystem,
        rotateWithMovement: elementTemplates.rotateWithMovement,
        frontDirection: elementTemplates.frontDirection,
        createdAt: elementTemplates.createdAt,
        category: categories,
      })
      .from(elementTemplates)
      .leftJoin(categories, eq(elementTemplates.categoryId, categories.id))
      .where(eq(elementTemplates.elementBehavior, "mobile"))
      .orderBy(elementTemplates.name)
  }),

  // Get a single element template by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [element] = await db
        .select({
          id: elementTemplates.id,
          name: elementTemplates.name,
          categoryId: elementTemplates.categoryId,
          excalidrawData: elementTemplates.excalidrawData,
          icon: elementTemplates.icon,
          defaultWidth: elementTemplates.defaultWidth,
          defaultHeight: elementTemplates.defaultHeight,
          elementBehavior: elementTemplates.elementBehavior,
          isSystem: elementTemplates.isSystem,
          rotateWithMovement: elementTemplates.rotateWithMovement,
          frontDirection: elementTemplates.frontDirection,
          createdAt: elementTemplates.createdAt,
          category: categories,
        })
        .from(elementTemplates)
        .leftJoin(categories, eq(elementTemplates.categoryId, categories.id))
        .where(eq(elementTemplates.id, input.id))

      return element ?? null
    }),

  // Create a custom element template
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        categoryId: z.string().uuid().nullable(),
        icon: z.string(),
        excalidrawData: z.custom<ExcalidrawElementData>(),
        defaultWidth: z.number().int().positive(),
        defaultHeight: z.number().int().positive(),
        elementBehavior: z
          .custom<ElementBehavior>()
          .optional()
          .default("static"),
        rotateWithMovement: z.boolean().optional().default(false),
        frontDirection: z.custom<FrontDirection>().optional().default("up"),
      })
    )
    .mutation(async ({ input }) => {
      const [element] = await db
        .insert(elementTemplates)
        .values({
          ...input,
          isSystem: false,
        })
        .returning()

      return element
    }),

  // Update a custom element template (only non-system elements)
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        icon: z.string().optional(),
        excalidrawData: z.custom<ExcalidrawElementData>().optional(),
        defaultWidth: z.number().int().positive().optional(),
        defaultHeight: z.number().int().positive().optional(),
        elementBehavior: z.custom<ElementBehavior>().optional(),
        rotateWithMovement: z.boolean().optional(),
        frontDirection: z.custom<FrontDirection>().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      // Only allow updating non-system elements
      const [existing] = await db
        .select()
        .from(elementTemplates)
        .where(eq(elementTemplates.id, id))

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Element not found",
        })
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update system elements",
        })
      }

      const [element] = await db
        .update(elementTemplates)
        .set(data)
        .where(eq(elementTemplates.id, id))
        .returning()

      return element ?? null
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Element not found",
        })
      }

      if (element.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system elements",
        })
      }

      // Check if element is used in any warehouses
      const usedIn = await db
        .select({ id: placedElements.id })
        .from(placedElements)
        .where(eq(placedElements.elementTemplateId, input.id))
        .limit(1)

      if (usedIn.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Cannot delete element: it is used in one or more warehouses. Remove all instances first.",
        })
      }

      await db.delete(elementTemplates).where(eq(elementTemplates.id, input.id))
      return { success: true }
    }),
})
