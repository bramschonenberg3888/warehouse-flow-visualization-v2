"use client"

import { use, useState, useCallback } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Save, Loader2, Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { GridLayoutCanvas } from "@/components/warehouse-editor/grid-layout-canvas"
import { ElementTemplateSidebar } from "@/components/warehouse-editor/element-template-sidebar"
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
  } | null>(null)
  const [pendingLabel, setPendingLabel] = useState("")

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
  })

  const deleteMutation = api.placedElement.delete.useMutation({
    onSuccess: () => {
      utils.placedElement.getByWarehouse.invalidate({ warehouseId: id })
      setSelectedElementId(null)
    },
  })

  const isLoading =
    warehouseLoading || elementsLoading || templatesLoading || categoriesLoading

  // Handle clicking on a grid cell to place an element
  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (!selectedTemplateId) return

      // Open label dialog
      setPendingPlacement({ col, row, templateId: selectedTemplateId })
      setPendingLabel("")
      setLabelDialogOpen(true)
    },
    [selectedTemplateId]
  )

  // Confirm placement with label
  const handleConfirmPlacement = useCallback(async () => {
    if (!pendingPlacement || !warehouse) return

    const template = templates?.find(
      (t) => t.id === pendingPlacement.templateId
    )
    if (!template) return

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
  }, [pendingPlacement, warehouse, templates, createMutation, pendingLabel])

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
          <div className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Grid3X3 className="h-3 w-3" />
            <span>
              {warehouse.gridColumns}×{warehouse.gridRows} grid (
              {warehouse.gridColumns * GRID_CELL_SIZE}×
              {warehouse.gridRows * GRID_CELL_SIZE}px)
            </span>
          </div>
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
            gridColumns={warehouse.gridColumns}
            gridRows={warehouse.gridRows}
            selectedTemplateId={selectedTemplateId}
            selectedElementId={selectedElementId}
            onCellClick={handleCellClick}
            onElementClick={handleElementClick}
            onElementDelete={handleElementDelete}
          />
        </div>
      </div>

      {/* Label Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Element Label</DialogTitle>
            <DialogDescription>
              Give this element a label to identify it (optional)
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
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Place Element
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
