"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { FlowEditorCanvas } from "@/components/flow-editor/flow-editor-canvas"
import { SortableSequenceList } from "@/components/flow-editor/sortable-sequence-list"
import type { ExcalidrawElementType } from "@/components/editor/excalidraw-wrapper"
import { api } from "@/trpc/react"

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

export default function FlowEditorPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const flowId = params["id"] as string
  const isNew = flowId === "new"

  // Fetch existing flow first to get initial values
  const { data: existingFlow, isLoading: flowLoading } =
    api.flow.getById.useQuery({ id: flowId }, { enabled: !isNew })

  // Form state - initialize from existingFlow or defaults
  const [warehouseId, setWarehouseId] = useState(
    searchParams.get("warehouse") ?? ""
  )
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0] ?? "#3b82f6")
  const [sequence, setSequence] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  // Initialize form with existing flow data (once, after data loads)
  if (existingFlow && !initialized) {
    setInitialized(true)
    setWarehouseId(existingFlow.warehouseId)
    setName(existingFlow.name)
    setDescription(existingFlow.description ?? "")
    setColor(existingFlow.color)
    setSequence(existingFlow.elementSequence)
  }

  // Fetch other data
  const { data: warehouses, isLoading: warehousesLoading } =
    api.warehouse.getAll.useQuery()

  const { data: placedElements, isLoading: elementsLoading } =
    api.placedElement.getByWarehouse.useQuery(
      { warehouseId },
      { enabled: !!warehouseId }
    )

  const { data: warehouse } = api.warehouse.getById.useQuery(
    { id: warehouseId },
    { enabled: !!warehouseId }
  )

  const { data: templates } = api.element.getAll.useQuery()

  const utils = api.useUtils()

  const createMutation = api.flow.create.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
      router.push("/flows")
    },
    onError: (error) => {
      alert(error.message || "Failed to create flow")
    },
  })

  const updateMutation = api.flow.update.useMutation({
    onSuccess: () => {
      if (existingFlow) {
        utils.flow.getByWarehouse.invalidate({
          warehouseId: existingFlow.warehouseId,
        })
      }
      router.push("/flows")
    },
    onError: (error) => {
      alert(error.message || "Failed to update flow")
    },
  })

  const selectedWarehouse = warehouses?.find((w) => w.id === warehouseId)

  const handleElementClick = (elementId: string) => {
    // Toggle element in sequence
    if (sequence.includes(elementId)) {
      setSequence(sequence.filter((id) => id !== elementId))
    } else {
      setSequence([...sequence, elementId])
    }
  }

  const handleSequenceChange = (newSequence: string[]) => {
    setSequence(newSequence)
  }

  const handleSave = () => {
    if (!name.trim() || !warehouseId || sequence.length < 2) return

    if (isNew) {
      createMutation.mutate({
        warehouseId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence: sequence,
      })
    } else {
      updateMutation.mutate({
        id: flowId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence: sequence,
      })
    }
  }

  const canSave =
    name.trim() &&
    warehouseId &&
    sequence.length >= 2 &&
    !createMutation.isPending &&
    !updateMutation.isPending

  const isLoading = warehousesLoading || (!isNew && flowLoading)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-[1fr_350px] gap-6 h-[calc(100vh-200px)]">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      </div>
    )
  }

  // Show warehouse selector if new flow without warehouse
  if (isNew && !warehouseId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/flows")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Create Flow</h1>
        </div>

        <div className="max-w-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Warehouse</label>
              <p className="text-sm text-muted-foreground">
                Choose the warehouse where this flow will be created.
              </p>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/flows")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {isNew ? "Create Flow" : "Edit Flow"}
            </h1>
            {selectedWarehouse && (
              <p className="text-sm text-muted-foreground">
                {selectedWarehouse.name}
              </p>
            )}
          </div>
          {warehouse && (
            <div className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              <Grid3X3 className="h-3 w-3" />
              <span>
                {warehouse.gridColumns}×{warehouse.gridRows} grid
              </span>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : "Save Flow"}
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-[1fr_350px] gap-6 h-full">
        {/* Canvas */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {elementsLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading elements...</p>
            </div>
          ) : (
            <FlowEditorCanvas
              placedElements={placedElements ?? []}
              templates={templates ?? []}
              orphanElements={
                (warehouse?.canvasState?.["elements"] as
                  | ExcalidrawElementType[]
                  | undefined) ?? []
              }
              sequence={sequence}
              flowColor={color}
              onElementClick={handleElementClick}
              gridColumns={warehouse?.gridColumns ?? 20}
              gridRows={warehouse?.gridRows ?? 15}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 overflow-auto">
          {/* Flow Details */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-semibold">Flow Details</h3>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="Inbound to Storage"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="description"
                placeholder="Flow path for incoming goods"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      color === presetColor
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Flow Sequence */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-semibold">Flow Sequence</h3>
            <p className="text-sm text-muted-foreground">
              Click elements on the canvas to add them to the flow path. Drag to
              reorder.
            </p>
            <SortableSequenceList
              sequence={sequence}
              placedElements={placedElements}
              onSequenceChange={handleSequenceChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
