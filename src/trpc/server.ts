import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { createCaller } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"

const createContext = cache(async () => {
  const heads = await headers()
  return createTRPCContext({
    headers: new Headers({
      cookie: heads.get("cookie") ?? "",
      "x-trpc-source": "rsc",
    }),
  })
})

export const api = createCaller(createContext)
