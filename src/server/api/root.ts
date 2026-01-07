import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"
import { exampleRouter } from "@/server/api/routers/example"
import { warehouseRouter } from "@/server/api/routers/warehouse"
import { elementRouter } from "@/server/api/routers/element"
import { placedElementRouter } from "@/server/api/routers/placed-element"

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  warehouse: warehouseRouter,
  element: elementRouter,
  placedElement: placedElementRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
