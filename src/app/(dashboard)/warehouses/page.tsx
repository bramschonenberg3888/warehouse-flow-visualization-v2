"use client"

import { Warehouse, LayoutGrid, MousePointerClick } from "lucide-react"
import { CreateWarehouseDialog } from "@/components/warehouse/warehouse-form"
import { WarehouseCard } from "@/components/warehouse/warehouse-card"
import {
  WarehouseCardSkeleton,
  CardGridSkeleton,
} from "@/components/ui/skeletons"
import { api } from "@/trpc/react"

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = api.warehouse.getAll.useQuery()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground">
            Design warehouse floor plans by placing elements on a grid-based
            canvas to define your facility structure
          </p>
        </div>
        <CreateWarehouseDialog />
      </div>

      {/* Warehouse Grid */}
      {isLoading ? (
        <CardGridSkeleton count={3} CardSkeleton={WarehouseCardSkeleton} />
      ) : warehouses && warehouses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <WarehouseCard key={warehouse.id} warehouse={warehouse} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Warehouse className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">No warehouses yet</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            Create your first warehouse to start designing layouts with the
            grid-based editor.
          </p>
          <div className="mt-6">
            <CreateWarehouseDialog />
          </div>
          <div className="mt-8 flex items-center gap-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>Grid-based layout</span>
            </div>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              <span>Drag & drop elements</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
