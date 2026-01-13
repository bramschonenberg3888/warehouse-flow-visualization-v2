import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"
import { exampleRouter } from "@/server/api/routers/example"
import { warehouseRouter } from "@/server/api/routers/warehouse"
import { elementRouter } from "@/server/api/routers/element"
import { placedElementRouter } from "@/server/api/routers/placed-element"
import { categoryRouter } from "@/server/api/routers/category"
import { flowRouter } from "@/server/api/routers/flow"
import { scenarioRouter } from "@/server/api/routers/scenario"
import { pathRouter } from "@/server/api/routers/path"

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  warehouse: warehouseRouter,
  element: elementRouter,
  placedElement: placedElementRouter,
  category: categoryRouter,
  flow: flowRouter,
  scenario: scenarioRouter,
  path: pathRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
