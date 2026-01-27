"use client"

import { use, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Save, Loader2, Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { GridLayoutCanvas } from "@/components/warehouse-editor/grid-layout-canvas"
import { ElementTemplateSidebar } from "@/components/warehouse-editor/element-template-sidebar"
import { ElementPropertiesPanel } from "@/components/warehouse-editor/element-properties-panel"
import { api } from "@/trpc/react"
import { GRID_CELL_SIZE } from "@/lib/grid-config"

interface EditorPageProps {
  params: Promise<{ id: string }>
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id } = use(params)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [pendingPlacement, setPendingPlacement] = useState<{
    col: number
    row: number
    templateId: string
    replaceElementId?: string
  } | null>(null)
  const [pendingLabel, setPendingLabel] = useState("")
  const [gridColumns, setGridColumns] = useState<number | null>(null)
  const [gridRows, setGridRows] = useState<number | null>(null)

  const { data: warehouse, isLoading: warehouseLoading } =
    api.warehouse.getById.useQuery({ id })
  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId: id },
      { enabled: !!id }
    )
  const { data: templates, isLoading: templatesLoading } =
    api.element.getAll.useQuery()
  const { data: categories, isLoading: categoriesLoading } =
    api.category.getAll.useQuery()

  const utils = api.useUtils()

  const createMutation = api.placedElement.create.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
      setHasUnsavedChanges(false)
    },
    onError: (error) => {
      alert(error.message || "Failed to create element")
    },
  })

  const createManyMutation = api.placedElement.createMany.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
      setSelectedTemplateId(null)
    },
    onError: (error) => {
      alert(error.message || "Failed to create elements")
    },
  })

  const deleteMutation = api.placedElement.delete.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
      setSelectedElementId(null)
    },
    onError: (error) => {
      alert(error.message || "Failed to delete element")
    },
  })

  const updateElementMutation = api.placedElement.update.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
    },
    onError: (error) => {
      alert(error.message || "Failed to update element")
    },
  })

  const updateWarehouseMutation = api.warehouse.update.useMutation({
    onSuccess: () => {
      utils.warehouse.getById.invalidate({ id })
      setGridColumns(null)
      setGridRows(null)
    },
    onError: (error) => {
      alert(error.message || "Failed to update warehouse")
    },
  })

  const isLoading =
    warehouseLoading || elementsLoading || templatesLoading || categoriesLoading

  // Effective grid dimensions (local state or from warehouse)
  const effectiveGridColumns = gridColumns ?? warehouse?.gridColumns ?? 20
  const effectiveGridRows = gridRows ?? warehouse?.gridRows ?? 15

  const hasGridChanges =
    warehouse &&
    (effectiveGridColumns !== warehouse.gridColumns ||
      effectiveGridRows !== warehouse.gridRows)

  // Get selected element data
  const selectedElement = useMemo(() => {
    if (!selectedElementId || !placedElements) return null
    return placedElements.find((el) => el.id === selectedElementId) ?? null
  }, [selectedElementId, placedElements])

  const selectedElementTemplate = useMemo(() => {
    if (!selectedElement || !templates) return undefined
    return templates.find((t) => t.id === selectedElement.elementTemplateId)
  }, [selectedElement, templates])

  // Build a map of cell positions to elements for collision detection
  const cellToElementMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!placedElements) return map
    for (const el of placedElements) {
      const startCol = Math.floor(el.positionX / GRID_CELL_SIZE)
      const startRow = Math.floor(el.positionY / GRID_CELL_SIZE)
      const endCol = startCol + Math.ceil(el.width / GRID_CELL_SIZE)
      const endRow = startRow + Math.ceil(el.height / GRID_CELL_SIZE)
      for (let col = startCol; col < endCol; col++) {
        for (let row = startRow; row < endRow; row++) {
          map.set(`${col}:${row}`, el.id)
        }
      }
    }
    return map
  }, [placedElements])

  const handleSaveGrid = useCallback(async () => {
    if (!warehouse || !placedElements) return

    const rowDiff = effectiveGridRows - warehouse.gridRows

    // When rows change, shift elements so changes happen at the top
    // Adding rows: shift elements DOWN (increase Y)
    // Removing rows: shift elements UP (decrease Y)
    if (rowDiff !== 0 && placedElements.length > 0) {
      const shiftAmount = rowDiff * GRID_CELL_SIZE

      for (const element of placedElements) {
        const newY = element.positionY + shiftAmount

        // Only update if element stays within bounds
        if (newY >= 0) {
          await updateElementMutation.mutateAsync({
            id: element.id,
            positionY: newY,
          })
        } else {
          // Element would be out of bounds, delete it
          await deleteMutation.mutateAsync({ id: element.id })
        }
      }
    }

    // Then update the warehouse grid dimensions
    updateWarehouseMutation.mutate({
      id: warehouse.id,
      gridColumns: effectiveGridColumns,
      gridRows: effectiveGridRows,
    })
  }, [
    warehouse,
    placedElements,
    effectiveGridColumns,
    effectiveGridRows,
    updateWarehouseMutation,
    updateElementMutation,
    deleteMutation,
  ])

  // Handle clicking on a grid cell to place an element
  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (!selectedTemplateId) return

      // Check if there's an existing element at this position
      const existingElementId = cellToElementMap.get(`${col}:${row}`)

      // Open label dialog
      setPendingPlacement({
        col,
        row,
        templateId: selectedTemplateId,
        replaceElementId: existingElementId,
      })
      setPendingLabel("")
      setLabelDialogOpen(true)
    },
    [selectedTemplateId, cellToElementMap]
  )

  // Confirm placement with label
  const handleConfirmPlacement = useCallback(async () => {
    if (!pendingPlacement || !warehouse) return

    const template = templates?.find(
      (t) => t.id === pendingPlacement.templateId
    )
    if (!template) return

    // If replacing an existing element, delete it first
    if (pendingPlacement.replaceElementId) {
      await deleteMutation.mutateAsync({
        id: pendingPlacement.replaceElementId,
      })
    }

    // Calculate position from grid cell
    const positionX = pendingPlacement.col * GRID_CELL_SIZE
    const positionY = pendingPlacement.row * GRID_CELL_SIZE

    await createMutation.mutateAsync({
      warehouseId: warehouse.id,
      elementTemplateId: template.id,
      excalidrawId: crypto.randomUUID(),
      positionX,
      positionY,
      width: template.defaultWidth,
      height: template.defaultHeight,
      rotation: 0,
      label: pendingLabel.trim() || undefined,
    })

    setLabelDialogOpen(false)
    setPendingPlacement(null)
    setSelectedTemplateId(null)
  }, [
    pendingPlacement,
    warehouse,
    templates,
    createMutation,
    deleteMutation,
    pendingLabel,
  ])

  // Handle element property updates
  const handleElementUpdate = useCallback(
    async (updates: {
      label?: string
      width?: number
      height?: number
      rotation?: number
    }) => {
      if (!selectedElementId) return
      await updateElementMutation.mutateAsync({
        id: selectedElementId,
        ...updates,
      })
    },
    [selectedElementId, updateElementMutation]
  )

  // Handle moving an element to a new grid position
  const handleElementMove = useCallback(
    async (elementId: string, newCol: number, newRow: number) => {
      const newPositionX = newCol * GRID_CELL_SIZE
      const newPositionY = newRow * GRID_CELL_SIZE
      await updateElementMutation.mutateAsync({
        id: elementId,
        positionX: newPositionX,
        positionY: newPositionY,
      })
    },
    [updateElementMutation]
  )

  // Handle resizing an element
  const handleElementResize = useCallback(
    async (
      elementId: string,
      newCol: number,
      newRow: number,
      newWidthCells: number,
      newHeightCells: number
    ) => {
      const newPositionX = newCol * GRID_CELL_SIZE
      const newPositionY = newRow * GRID_CELL_SIZE
      const newWidth = newWidthCells * GRID_CELL_SIZE
      const newHeight = newHeightCells * GRID_CELL_SIZE
      await updateElementMutation.mutateAsync({
        id: elementId,
        positionX: newPositionX,
        positionY: newPositionY,
        width: newWidth,
        height: newHeight,
      })
    },
    [updateElementMutation]
  )

  // Handle clicking on an element to select it
  const handleElementClick = useCallback((elementId: string) => {
    setSelectedElementId((prev) => (prev === elementId ? null : elementId))
    setSelectedTemplateId(null) // Deselect template when selecting element
  }, [])

  // Handle deleting the selected element
  const handleElementDelete = useCallback(
    async (elementId: string) => {
      await deleteMutation.mutateAsync({ id: elementId })
    },
    [deleteMutation]
  )

  // Handle batch placement of multiple elements along a line
  const handleBatchPlace = useCallback(
    async (cells: { col: number; row: number }[]) => {
      if (!selectedTemplateId || !warehouse) return

      const template = templates?.find((t) => t.id === selectedTemplateId)
      if (!template) return

      await createManyMutation.mutateAsync({
        warehouseId: warehouse.id,
        elementTemplateId: template.id,
        width: template.defaultWidth,
        height: template.defaultHeight,
        cells,
      })
    },
    [selectedTemplateId, warehouse, templates, createManyMutation]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!warehouse) {
    notFound()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/warehouses/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">{warehouse.name}</h1>
            <p className="text-xs text-muted-foreground">Layout Editor</p>
          </div>

          {/* Grid Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Grid3X3 className="h-3 w-3" />
                <span className="text-xs">
                  {effectiveGridColumns}×{effectiveGridRows}
                </span>
                {hasGridChanges && (
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Grid Dimensions</h4>
                  <p className="text-xs text-muted-foreground">
                    Adjust the warehouse grid size
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="grid-cols" className="text-xs">
                      Columns
                    </Label>
                    <Input
                      id="grid-cols"
                      type="number"
                      min={5}
                      max={100}
                      value={effectiveGridColumns}
                      onChange={(e) =>
                        setGridColumns(parseInt(e.target.value) || 20)
                      }
                      className="h-8"
                    />
                  </div>
                  <span className="pb-2 text-muted-foreground">×</span>
                  <div className="flex-1">
                    <Label htmlFor="grid-rows" className="text-xs">
                      Rows
                    </Label>
                    <Input
                      id="grid-rows"
                      type="number"
                      min={5}
                      max={100}
                      value={effectiveGridRows}
                      onChange={(e) =>
                        setGridRows(parseInt(e.target.value) || 15)
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {effectiveGridColumns * GRID_CELL_SIZE} ×{" "}
                  {effectiveGridRows * GRID_CELL_SIZE} pixels
                </p>
                {hasGridChanges && (
                  <Button
                    onClick={handleSaveGrid}
                    disabled={updateWarehouseMutation.isPending}
                    size="sm"
                    className="w-full"
                  >
                    {updateWarehouseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-3 w-3" />
                        Save Grid Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {placedElements?.length ?? 0} elements
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Element Template Sidebar */}
        <ElementTemplateSidebar
          templates={templates}
          categories={categories}
          isLoading={templatesLoading || categoriesLoading}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
        />

        {/* Canvas */}
        <div className="relative flex-1 bg-slate-100">
          <GridLayoutCanvas
            placedElements={placedElements ?? []}
            templates={templates ?? []}
            gridColumns={effectiveGridColumns}
            gridRows={effectiveGridRows}
            originalGridRows={warehouse.gridRows}
            selectedTemplateId={selectedTemplateId}
            selectedElementId={selectedElementId}
            onCellClick={handleCellClick}
            onBatchPlace={handleBatchPlace}
            onElementClick={handleElementClick}
            onElementDelete={handleElementDelete}
            onElementMove={handleElementMove}
            onElementResize={handleElementResize}
          />
        </div>

        {/* Element Properties Panel */}
        {selectedElement && (
          <ElementPropertiesPanel
            element={selectedElement}
            template={selectedElementTemplate}
            gridRows={effectiveGridRows}
            onUpdate={handleElementUpdate}
            onDelete={async () => {
              await handleElementDelete(selectedElement.id)
            }}
            isUpdating={updateElementMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </div>

      {/* Label Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingPlacement?.replaceElementId
                ? "Replace Element"
                : "Add Element Label"}
            </DialogTitle>
            <DialogDescription>
              {pendingPlacement?.replaceElementId
                ? "This will replace the existing element at this position. Give the new element a label (optional)."
                : "Give this element a label to identify it (optional)"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Rack A1, Dock 1, Zone B"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmPlacement()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPlacement}
              disabled={createMutation.isPending || deleteMutation.isPending}
            >
              {createMutation.isPending || deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {pendingPlacement?.replaceElementId
                    ? "Replacing..."
                    : "Placing..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {pendingPlacement?.replaceElementId
                    ? "Replace Element"
                    : "Place Element"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
