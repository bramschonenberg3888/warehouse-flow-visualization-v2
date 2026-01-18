import { z } from "zod"
import { eq } from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { scenarios, paths } from "@/server/db/schema"

// =============================================================================
// Zod Schemas for Scenario Definition Validation
// =============================================================================

const FixedDwellSchema = z.object({
  type: z.literal("fixed"),
  duration: z.number().min(0),
})

const RangeDwellSchema = z.object({
  type: z.literal("range"),
  min: z.number().min(0),
  max: z.number().min(0),
})

const DistributionDwellSchema = z.object({
  type: z.literal("distribution"),
  mean: z.number().min(0),
  stdDev: z.number().min(0),
})

const DwellConfigSchema = z.discriminatedUnion("type", [
  FixedDwellSchema,
  RangeDwellSchema,
  DistributionDwellSchema,
])

const NodeActionSchema = z.object({
  dwell: DwellConfigSchema,
  operation: z
    .enum(["receive", "store", "pick", "pack", "ship", "inspect"])
    .optional(),
  capacity: z
    .object({
      max: z.number().min(1),
      blockWhenFull: z.boolean(),
    })
    .optional(),
})

const FixedTargetSchema = z.object({
  type: z.literal("fixed"),
  elementId: z.string(),
})

const RandomTargetSchema = z.object({
  type: z.literal("random"),
  pool: z.array(z.string()),
})

const CategoryTargetSchema = z.object({
  type: z.literal("category"),
  categoryId: z.string(),
  rule: z.enum([
    "random",
    "nearest",
    "furthest",
    "least-visited",
    "most-available",
    "round-robin",
  ]),
})

const ZoneTargetSchema = z.object({
  type: z.literal("zone"),
  zone: z.string(),
  rule: z.enum([
    "random",
    "nearest",
    "furthest",
    "least-visited",
    "most-available",
    "round-robin",
  ]),
})

const LocationTargetSchema = z.discriminatedUnion("type", [
  FixedTargetSchema,
  RandomTargetSchema,
  CategoryTargetSchema,
  ZoneTargetSchema,
])

const LocationNodeSchema = z.object({
  type: z.literal("location"),
  id: z.string(),
  target: LocationTargetSchema,
  action: NodeActionSchema,
})

const ProbabilityConditionSchema = z.object({
  type: z.literal("probability"),
  chance: z.number().min(0).max(1),
})

const CapacityConditionSchema = z.object({
  type: z.literal("capacity"),
  elementId: z.string(),
  operator: z.enum(["<", ">", "=="]),
  value: z.number(),
})

const TimeConditionSchema = z.object({
  type: z.literal("time"),
  operator: z.enum(["<", ">"]),
  value: z.number(),
})

const CounterConditionSchema = z.object({
  type: z.literal("counter"),
  name: z.string(),
  operator: z.enum(["<", ">", "=="]),
  value: z.number(),
})

const RandomChoiceConditionSchema = z.object({
  type: z.literal("random-choice"),
  weights: z.array(z.number()),
})

const ConditionSchema = z.discriminatedUnion("type", [
  ProbabilityConditionSchema,
  CapacityConditionSchema,
  TimeConditionSchema,
  CounterConditionSchema,
  RandomChoiceConditionSchema,
])

const DecisionNodeSchema = z.object({
  type: z.literal("decision"),
  id: z.string(),
  condition: ConditionSchema,
})

const ExitNodeSchema = z.object({
  type: z.literal("exit"),
  id: z.string(),
})

const FlowNodeSchema = z.discriminatedUnion("type", [
  LocationNodeSchema,
  DecisionNodeSchema,
  ExitNodeSchema,
])

const FlowEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  condition: z.enum(["true", "false"]).optional(),
  weight: z.number().optional(),
})

const IntervalSpawnSchema = z.object({
  mode: z.literal("interval"),
  duration: z.number().min(100),
  variance: z.number().min(0).optional(),
  maxActive: z.number().min(1).optional(),
  totalLimit: z.number().min(1).optional(),
})

const BatchSpawnSchema = z.object({
  mode: z.literal("batch"),
  size: z.number().min(1),
  spacing: z.number().min(0),
  batchInterval: z.number().min(100),
  maxActive: z.number().min(1).optional(),
  totalLimit: z.number().min(1).optional(),
})

const ManualSpawnSchema = z.object({
  mode: z.literal("manual"),
  maxActive: z.number().min(1).optional(),
  totalLimit: z.number().min(1).optional(),
})

const SpawnConfigSchema = z.discriminatedUnion("mode", [
  IntervalSpawnSchema,
  BatchSpawnSchema,
  ManualSpawnSchema,
])

const FlowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isActive: z.boolean(),
  entryNode: z.string(),
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
  spawning: SpawnConfigSchema,
})

const ScenarioSettingsSchema = z.object({
  duration: z.number().min(0).optional(),
  speedMultiplier: z.number().min(0.1).max(10),
  seed: z.number().optional(),
})

const ScenarioDefinitionSchema = z.object({
  flows: z.array(FlowDefinitionSchema),
  settings: ScenarioSettingsSchema,
})

// =============================================================================
// Router
// =============================================================================

export const scenarioRouter = createTRPCRouter({
  // Get all scenarios
  getAll: publicProcedure.query(async () => {
    return db.select().from(scenarios).orderBy(scenarios.createdAt)
  }),

  // Get all scenarios for a warehouse
  getByWarehouse: publicProcedure
    .input(z.object({ warehouseId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(scenarios)
        .where(eq(scenarios.warehouseId, input.warehouseId))
        .orderBy(scenarios.createdAt)
    }),

  // Get a single scenario by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [scenario] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, input.id))

      return scenario ?? null
    }),

  // Create a new scenario
  create: publicProcedure
    .input(
      z.object({
        warehouseId: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        // Legacy definition (optional for new path-based scenarios)
        definition: ScenarioDefinitionSchema.optional(),
        // New global settings
        speedMultiplier: z.number().min(0.1).max(10).default(1.0),
        duration: z.number().min(0).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [scenario] = await db.insert(scenarios).values(input).returning()
      return scenario
    }),

  // Update a scenario
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        // Legacy definition (optional)
        definition: ScenarioDefinitionSchema.optional(),
        // New global settings
        speedMultiplier: z.number().min(0.1).max(10).optional(),
        duration: z.number().min(0).nullish(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const [scenario] = await db
        .update(scenarios)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scenarios.id, id))
        .returning()

      return scenario ?? null
    }),

  // Delete a scenario
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(scenarios).where(eq(scenarios.id, input.id))
      return { success: true }
    }),

  // Toggle scenario active state
  toggleActive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, input.id))

      if (!existing) {
        throw new Error("Scenario not found")
      }

      const [scenario] = await db
        .update(scenarios)
        .set({ isActive: !existing.isActive, updatedAt: new Date() })
        .where(eq(scenarios.id, input.id))
        .returning()

      return scenario ?? null
    }),

  // Duplicate a scenario (also copies all paths)
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
        .from(scenarios)
        .where(eq(scenarios.id, input.id))

      if (!existing) {
        throw new Error("Scenario not found")
      }

      // Create the new scenario
      const [scenario] = await db
        .insert(scenarios)
        .values({
          warehouseId: existing.warehouseId,
          name: input.newName,
          description: existing.description,
          definition: existing.definition,
          speedMultiplier: existing.speedMultiplier,
          duration: existing.duration,
          isActive: false, // Start as inactive
        })
        .returning()

      if (!scenario) {
        throw new Error("Failed to create scenario")
      }

      // Copy all paths from the original scenario
      const existingPaths = await db
        .select()
        .from(paths)
        .where(eq(paths.scenarioId, input.id))

      if (existingPaths.length > 0) {
        await db.insert(paths).values(
          existingPaths.map((p) => ({
            scenarioId: scenario.id,
            name: p.name,
            color: p.color,
            elementTemplateId: p.elementTemplateId,
            stops: p.stops,
            spawnInterval: p.spawnInterval,
            dwellTime: p.dwellTime,
            speed: p.speed,
            maxActive: p.maxActive,
            isActive: p.isActive,
          }))
        )
      }

      return scenario
    }),
})
