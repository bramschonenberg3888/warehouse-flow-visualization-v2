"use client"

import Link from "next/link"
import { Plus, Pencil, Trash2, Route, Warehouse } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/trpc/react"
import type { Flow, Warehouse as WarehouseType } from "@/server/db/schema"

export default function FlowsPage() {
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  // Get all flows for all warehouses
  const warehouseIds = warehouses?.map((w) => w.id) ?? []
  const flowQueries = api.useQueries((t) =>
    warehouseIds.map((id) => t.flow.getByWarehouse({ warehouseId: id }))
  )

  const isLoading = warehousesLoading || flowQueries.some((q) => q.isLoading)

  // Group flows by warehouse
  const flowsByWarehouse = new Map<
    string,
    { warehouse: WarehouseType; flows: Flow[] }
  >()
  if (warehouses) {
    for (let i = 0; i < warehouses.length; i++) {
      const warehouse = warehouses[i]
      const flows = flowQueries[i]?.data ?? []
      if (warehouse) {
        flowsByWarehouse.set(warehouse.id, { warehouse, flows })
      }
    }
  }

  const totalFlows = Array.from(flowsByWarehouse.values()).reduce(
    (sum, { flows }) => sum + flows.length,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Flows</h1>
          <p className="text-muted-foreground">
            Define goods movement paths through your warehouses
          </p>
        </div>
        <Button asChild>
          <Link href="/flows/new/edit">
            <Plus className="mr-2 h-4 w-4" />
            Create Flow
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : totalFlows === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No flows yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Create your first flow to define how goods move through your
              warehouse.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/flows/new/edit">
                <Plus className="mr-2 h-4 w-4" />
                Create Flow
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(flowsByWarehouse.values()).map(({ warehouse, flows }) => (
            <div key={warehouse.id}>
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{warehouse.name}</h2>
                <Badge variant="secondary">{flows.length} flows</Badge>
              </div>

              {flows.length === 0 ? (
                <p className="text-sm text-muted-foreground ml-6">
                  No flows defined for this warehouse
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {flows.map((flow) => (
                    <FlowCard
                      key={flow.id}
                      flow={flow}
                      warehouseId={warehouse.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface FlowCardProps {
  flow: Flow
  warehouseId: string
}

function FlowCard({ flow, warehouseId }: FlowCardProps) {
  const utils = api.useUtils()

  const deleteMutation = api.flow.delete.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
    },
  })

  const toggleActiveMutation = api.flow.toggleActive.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
    },
  })

  const handleDelete = () => {
    if (confirm(`Delete flow "${flow.name}"?`)) {
      deleteMutation.mutate({ id: flow.id })
    }
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: flow.color }}
            />
            <CardTitle className="text-base">{flow.name}</CardTitle>
          </div>
          <Badge
            variant={flow.isActive ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleActiveMutation.mutate({ id: flow.id })}
          >
            {flow.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {flow.description && (
          <CardDescription className="line-clamp-2">
            {flow.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {flow.elementSequence.length} stops
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/flows/${flow.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
