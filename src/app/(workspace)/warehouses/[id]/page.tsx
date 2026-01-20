"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import {
  Edit,
  ArrowLeft,
  Grid3X3,
  Plus,
  Copy,
  Trash2,
  Play,
  Route,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  const router = useRouter()
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateName, setDuplicateName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: warehouse, isLoading } = api.warehouse.getById.useQuery({ id })
  const { data: placedElements } = api.placedElement.getByWarehouse.useQuery(
    { warehouseId: id },
    { enabled: !!id }
  )
  const { data: templates } = api.element.getAll.useQuery()
  const { data: scenarios } = api.scenario.getByWarehouse.useQuery(
    { warehouseId: id },
    { enabled: !!id }
  )

  const utils = api.useUtils()

  const duplicateMutation = api.warehouse.duplicate.useMutation({
    onSuccess: (newWarehouse) => {
      utils.warehouse.getAll.invalidate()
      setDuplicateDialogOpen(false)
      if (newWarehouse) {
        router.push(`/warehouses/${newWarehouse.id}`)
      }
    },
  })

  const deleteMutation = api.warehouse.delete.useMutation({
    onSuccess: () => {
      utils.warehouse.getAll.invalidate()
      router.push("/warehouses")
    },
  })

  // Calculate statistics
  const stats = useMemo(() => {
    if (!placedElements || !templates || !warehouse) {
      return null
    }

    const totalCells = warehouse.gridColumns * warehouse.gridRows
    let coveredCells = 0
    const elementsByTemplate = new Map<string, number>()

    for (const element of placedElements) {
      const widthCells = Math.ceil(element.width / GRID_CELL_SIZE)
      const heightCells = Math.ceil(element.height / GRID_CELL_SIZE)
      coveredCells += widthCells * heightCells

      const template = templates.find((t) => t.id === element.elementTemplateId)
      const templateName = template?.name ?? "Unknown"
      elementsByTemplate.set(
        templateName,
        (elementsByTemplate.get(templateName) ?? 0) + 1
      )
    }

    const coveragePercent = Math.round((coveredCells / totalCells) * 100)

    return {
      totalElements: placedElements.length,
      coveragePercent,
      elementsByTemplate: Array.from(elementsByTemplate.entries()).sort(
        (a, b) => b[1] - a[1]
      ),
    }
  }, [placedElements, templates, warehouse])

  const handleDuplicate = () => {
    if (!duplicateName.trim()) return
    duplicateMutation.mutate({ id, newName: duplicateName.trim() })
  }

  const handleDelete = () => {
    deleteMutation.mutate({ id })
  }

  const openDuplicateDialog = () => {
    setDuplicateName(warehouse ? `${warehouse.name} (Copy)` : "")
    setDuplicateDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Created{" "}
              {formatDistanceToNow(new Date(warehouse.createdAt), {
                addSuffix: true,
              })}
            </span>
            <span>
              Modified{" "}
              {formatDistanceToNow(new Date(warehouse.updatedAt), {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Grid3X3 className="h-3 w-3" />
              {warehouse.gridColumns}x{warehouse.gridRows} grid
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openDuplicateDialog}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button asChild>
            <Link href={`/warehouses/${id}/editor`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Layout
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preview & Stats Column */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Layout Preview</CardTitle>
              <CardDescription>
                {warehouse.gridColumns * GRID_CELL_SIZE} x{" "}
                {warehouse.gridRows * GRID_CELL_SIZE}px canvas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 overflow-hidden">
                {placedElements && placedElements.length > 0 ? (
                  <WarehousePreview
                    placedElements={placedElements}
                    templates={templates ?? []}
                    gridColumns={warehouse.gridColumns}
                    gridRows={warehouse.gridRows}
                    width={500}
                    height={300}
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

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <div className="text-2xl font-bold">
                        {stats.totalElements}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Elements placed
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-2xl font-bold">
                        {stats.coveragePercent}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Grid coverage
                      </div>
                    </div>
                  </div>
                  {stats.elementsByTemplate.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Elements by type
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats.elementsByTemplate.map(([name, count]) => (
                          <Badge key={name} variant="secondary">
                            {name}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No elements placed yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scenarios Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Scenarios</CardTitle>
                  <CardDescription>
                    Flow simulations using this warehouse
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/scenarios/new?warehouseId=${id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Scenario
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scenarios && scenarios.length > 0 ? (
                <div className="space-y-2">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {scenario.name}
                          </div>
                          {scenario.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {scenario.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scenario.isActive ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/scenarios/${scenario.id}`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No scenarios yet</p>
                  <p className="text-xs mt-1">
                    Create a scenario to simulate flow paths
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Delete Warehouse</div>
                  <div className="text-xs text-muted-foreground">
                    Permanently delete this warehouse and all its elements
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Warehouse</DialogTitle>
            <DialogDescription>
              Create a copy of this warehouse with all its elements.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicate-name">New warehouse name</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDuplicate()
              }}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Warehouse</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{warehouse.name}&quot;? This
              will also delete all placed elements and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Warehouse
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
