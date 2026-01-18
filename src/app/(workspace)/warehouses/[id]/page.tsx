"use client"

import { use } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Edit, ArrowLeft, Grid3X3 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { WarehousePreview } from "@/components/warehouse/warehouse-preview"
import { api } from "@/trpc/react"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

interface WarehouseDetailPageProps {
  params: Promise<{ id: string }>
}

export default function WarehouseDetailPage({
  params,
}: WarehouseDetailPageProps) {
  const { id } = use(params)
  const { data: warehouse, isLoading } = api.warehouse.getById.useQuery({ id })
  const { data: placedElements } = api.placedElement.getByWarehouse.useQuery(
    { warehouseId: id },
    { enabled: !!id }
  )
  const { data: templates } = api.element.getAll.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="aspect-video w-full max-w-2xl" />
      </div>
    )
  }

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/warehouses">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Warehouses
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {warehouse.name}
          </h1>
          {warehouse.description && (
            <p className="mt-1 text-muted-foreground">
              {warehouse.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Created{" "}
              {formatDistanceToNow(new Date(warehouse.createdAt), {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Grid3X3 className="h-3 w-3" />
              {warehouse.gridColumns}×{warehouse.gridRows} grid
            </span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/warehouses/${id}/editor`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Layout
          </Link>
        </Button>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Preview</CardTitle>
          <CardDescription>
            {placedElements && placedElements.length > 0
              ? `${placedElements.length} element${placedElements.length === 1 ? "" : "s"} placed on a ${warehouse.gridColumns * GRID_CELL_SIZE}×${warehouse.gridRows * GRID_CELL_SIZE}px canvas`
              : "No elements placed yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md rounded-lg border bg-muted/50 overflow-hidden">
            {placedElements && placedElements.length > 0 ? (
              <WarehousePreview
                placedElements={placedElements}
                templates={templates ?? []}
                gridColumns={warehouse.gridColumns}
                gridRows={warehouse.gridRows}
                width={400}
                height={200}
              />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <p>No layout yet</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href={`/warehouses/${id}/editor`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Start Designing
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
