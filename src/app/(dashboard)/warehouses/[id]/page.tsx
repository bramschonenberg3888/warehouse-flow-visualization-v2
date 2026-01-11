"use client"

import { use, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Edit, Route, ArrowLeft, Grid3X3, Save, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface WarehouseDetailPageProps {
  params: Promise<{ id: string }>
}

export default function WarehouseDetailPage({
  params,
}: WarehouseDetailPageProps) {
  const { id } = use(params)
  const { data: warehouse, isLoading } = api.warehouse.getById.useQuery({ id })
  const [gridColumns, setGridColumns] = useState<number | null>(null)
  const [gridRows, setGridRows] = useState<number | null>(null)
  const utils = api.useUtils()

  const updateMutation = api.warehouse.update.useMutation({
    onSuccess: () => {
      utils.warehouse.getById.invalidate({ id })
    },
  })

  // Initialize local state when warehouse loads
  const effectiveColumns = gridColumns ?? warehouse?.gridColumns ?? 20
  const effectiveRows = gridRows ?? warehouse?.gridRows ?? 15

  const handleSaveGrid = () => {
    if (!warehouse) return
    updateMutation.mutate({
      id: warehouse.id,
      gridColumns: effectiveColumns,
      gridRows: effectiveRows,
    })
  }

  const hasGridChanges =
    warehouse &&
    (effectiveColumns !== warehouse.gridColumns ||
      effectiveRows !== warehouse.gridRows)

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
          <p className="mt-2 text-sm text-muted-foreground">
            Created{" "}
            {formatDistanceToNow(new Date(warehouse.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/warehouses/${id}/editor`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Layout
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/warehouses/${id}/flows`}>
              <Route className="mr-2 h-4 w-4" />
              Manage Flows
            </Link>
          </Button>
        </div>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Preview</CardTitle>
          <CardDescription>
            Visual preview of your warehouse layout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 max-w-md rounded-lg border bg-muted/50">
            {warehouse.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={warehouse.thumbnailUrl}
                alt={warehouse.name}
                className="h-full w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
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

      {/* Grid Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Grid Settings
          </CardTitle>
          <CardDescription>
            Configure the warehouse grid dimensions (each cell is 40×40 pixels)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-[120px]">
              <label htmlFor="gridColumns" className="text-sm font-medium">
                Columns
              </label>
              <Input
                id="gridColumns"
                type="number"
                min={5}
                max={100}
                value={effectiveColumns}
                onChange={(e) => setGridColumns(parseInt(e.target.value) || 20)}
              />
            </div>
            <span className="pb-2 text-muted-foreground">×</span>
            <div className="flex-1 max-w-[120px]">
              <label htmlFor="gridRows" className="text-sm font-medium">
                Rows
              </label>
              <Input
                id="gridRows"
                type="number"
                min={5}
                max={100}
                value={effectiveRows}
                onChange={(e) => setGridRows(parseInt(e.target.value) || 15)}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {effectiveColumns * 40} × {effectiveRows * 40} pixels
              </p>
            </div>
            {hasGridChanges && (
              <Button
                onClick={handleSaveGrid}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layout Editor</CardTitle>
            <CardDescription>
              Design your warehouse layout using the element library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/warehouses/${id}/editor`}>
                <Edit className="mr-2 h-4 w-4" />
                Open Editor
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Flow Management</CardTitle>
            <CardDescription>
              Define and visualize goods movement paths
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/warehouses/${id}/flows`}>
                <Route className="mr-2 h-4 w-4" />
                Manage Flows
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
