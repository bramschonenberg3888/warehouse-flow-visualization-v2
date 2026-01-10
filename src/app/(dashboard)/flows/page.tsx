"use client"

import { useState } from "react"
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Route,
  Warehouse,
} from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/trpc/react"
import type { Flow, Warehouse as WarehouseType } from "@/server/db/schema"

// Preset colors for flow paths
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

export default function FlowsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null)

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
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Flow
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
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Flow
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
                      onEdit={() => setEditingFlow(flow)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Flow Dialog */}
      <FlowFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        warehouses={warehouses ?? []}
      />

      {/* Edit Flow Dialog */}
      {editingFlow && (
        <FlowFormDialog
          open={!!editingFlow}
          onOpenChange={(open) => !open && setEditingFlow(null)}
          warehouses={warehouses ?? []}
          flow={editingFlow}
        />
      )}
    </div>
  )
}

interface FlowCardProps {
  flow: Flow
  warehouseId: string
  onEdit: () => void
}

function FlowCard({ flow, warehouseId, onEdit }: FlowCardProps) {
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: flow.color }}
            />
            <CardTitle className="text-base">{flow.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Badge
            variant={flow.isActive ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleActiveMutation.mutate({ id: flow.id })}
          >
            {flow.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

interface FlowFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouses: WarehouseType[]
  flow?: Flow
}

function FlowFormDialog({
  open,
  onOpenChange,
  warehouses,
  flow,
}: FlowFormDialogProps) {
  const isEditing = !!flow
  const [warehouseId, setWarehouseId] = useState(flow?.warehouseId ?? "")
  const [name, setName] = useState(flow?.name ?? "")
  const [description, setDescription] = useState(flow?.description ?? "")
  const [color, setColor] = useState(flow?.color ?? PRESET_COLORS[0])

  const utils = api.useUtils()

  const createMutation = api.flow.create.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
      onOpenChange(false)
      resetForm()
    },
  })

  const updateMutation = api.flow.update.useMutation({
    onSuccess: () => {
      if (flow) {
        utils.flow.getByWarehouse.invalidate({ warehouseId: flow.warehouseId })
      }
      onOpenChange(false)
    },
  })

  const resetForm = () => {
    setWarehouseId("")
    setName("")
    setDescription("")
    setColor(PRESET_COLORS[0] ?? "#3b82f6")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (isEditing && flow) {
      updateMutation.mutate({
        id: flow.id,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence: flow.elementSequence, // Keep existing sequence
      })
    } else {
      if (!warehouseId) return
      createMutation.mutate({
        warehouseId,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        elementSequence: [], // Empty sequence - will be built in visualization
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Flow" : "Create Flow"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the flow details"
                : "Create a new flow definition. You can build the path sequence in the Visualization page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse</label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="Inbound to Storage"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || !name.trim() || (!isEditing && !warehouseId)
              }
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
