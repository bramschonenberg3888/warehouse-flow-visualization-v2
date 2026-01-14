"use client"

import { Warehouse } from "lucide-react"
import { CreateWarehouseDialog } from "@/components/warehouse/warehouse-form"
import { WarehouseCard } from "@/components/warehouse/warehouse-card"
import { Skeleton } from "@/components/ui/skeleton"
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="aspect-video w-full" />
            </div>
          ))}
        </div>
      ) : warehouses && warehouses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <WarehouseCard key={warehouse.id} warehouse={warehouse} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Warehouse className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No warehouses yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first warehouse to start designing layouts
          </p>
          <div className="mt-6">
            <CreateWarehouseDialog />
          </div>
        </div>
      )}
    </div>
  )
}
