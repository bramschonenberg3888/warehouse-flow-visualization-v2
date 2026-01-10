"use client"

import { useState } from "react"
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlowFormDialog } from "./flow-form-dialog"
import { FlowSequenceBuilder } from "./flow-sequence-builder"
import { api } from "@/trpc/react"
import type { Flow, PlacedElement } from "@/server/db/schema"
import type { UseFlowSimulationResult } from "@/hooks/use-flow-simulation"

interface FlowSidebarProps {
  warehouseId: string
  flows: Flow[] | undefined
  placedElements: PlacedElement[] | undefined
  isLoading: boolean
  simulation: UseFlowSimulationResult
  selectedFlow: Flow | null
  onSelectFlow: (flow: Flow | null) => void
  buildingSequence: string[]
  onBuildingSequenceChange: (sequence: string[]) => void
  isBuilding: boolean
  onStartBuilding: () => void
  onStopBuilding: () => void
  showPaths: boolean
  onShowPathsChange: (show: boolean) => void
}

export function FlowSidebar({
  warehouseId,
  flows,
  placedElements,
  isLoading,
  simulation,
  selectedFlow,
  onSelectFlow,
  buildingSequence,
  onBuildingSequenceChange,
  isBuilding,
  onStartBuilding,
  onStopBuilding,
  showPaths,
  onShowPathsChange,
}: FlowSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null)

  const utils = api.useUtils()

  const deleteMutation = api.flow.delete.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
      if (selectedFlow) {
        onSelectFlow(null)
      }
    },
  })

  const toggleActiveMutation = api.flow.toggleActive.useMutation({
    onSuccess: () => {
      utils.flow.getByWarehouse.invalidate({ warehouseId })
    },
  })

  const handleDelete = (flow: Flow) => {
    if (confirm(`Delete flow "${flow.name}"?`)) {
      deleteMutation.mutate({ id: flow.id })
    }
  }

  const handleToggleActive = (flow: Flow) => {
    toggleActiveMutation.mutate({ id: flow.id })
  }

  const handleEdit = (flow: Flow) => {
    setEditingFlow(flow)
    onSelectFlow(flow)
    onBuildingSequenceChange(flow.elementSequence)
  }

  const handleCreateNew = () => {
    onSelectFlow(null)
    onBuildingSequenceChange([])
    setShowCreateDialog(true)
  }

  const handleDialogClose = () => {
    setShowCreateDialog(false)
    setEditingFlow(null)
    onStopBuilding()
    onBuildingSequenceChange([])
  }

  const handleFlowSaved = () => {
    utils.flow.getByWarehouse.invalidate({ warehouseId })
    handleDialogClose()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Flow Paths</h3>
            <p className="text-xs text-muted-foreground">
              Define goods movement routes
            </p>
          </div>
          <Button size="icon" variant="outline" onClick={handleCreateNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={simulation.state.isRunning ? "secondary" : "default"}
            onClick={
              simulation.state.isRunning ? simulation.stop : simulation.start
            }
            disabled={!flows || flows.filter((f) => f.isActive).length === 0}
            className="flex-1"
          >
            {simulation.state.isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Play
              </>
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={simulation.reset}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Speed</span>
            <span>{simulation.speed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[simulation.speed]}
            onValueChange={(values) => {
              const value = values[0]
              if (value !== undefined) simulation.setSpeed(value)
            }}
            min={0.5}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Show paths</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onShowPathsChange(!showPaths)}
          >
            {showPaths ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Flow List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : flows && flows.length > 0 ? (
          <div className="space-y-2">
            {flows.map((flow) => (
              <FlowListItem
                key={flow.id}
                flow={flow}
                isSelected={selectedFlow?.id === flow.id}
                onSelect={() => onSelectFlow(flow)}
                onEdit={() => handleEdit(flow)}
                onDelete={() => handleDelete(flow)}
                onToggleActive={() => handleToggleActive(flow)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Route className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No flows yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a flow to define goods movement
            </p>
            <Button size="sm" className="mt-4" onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Flow
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Sequence Builder (when creating/editing) */}
      {(showCreateDialog || editingFlow) && (
        <div className="border-t">
          <FlowSequenceBuilder
            placedElements={placedElements}
            sequence={buildingSequence}
            onSequenceChange={onBuildingSequenceChange}
            isBuilding={isBuilding}
            onStartBuilding={onStartBuilding}
            onStopBuilding={onStopBuilding}
          />
        </div>
      )}

      {/* Create/Edit Dialog */}
      <FlowFormDialog
        open={showCreateDialog || !!editingFlow}
        onOpenChange={(open) => {
          if (!open) handleDialogClose()
        }}
        warehouseId={warehouseId}
        flow={editingFlow}
        elementSequence={buildingSequence}
        onSuccess={handleFlowSaved}
      />
    </div>
  )
}

interface FlowListItemProps {
  flow: Flow
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

function FlowListItem({
  flow,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: FlowListItemProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-accent"
      }`}
    >
      <button
        className="flex flex-1 items-center gap-2 text-left"
        onClick={onSelect}
      >
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: flow.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{flow.name}</p>
          <p className="text-xs text-muted-foreground">
            {flow.elementSequence.length} stops
          </p>
        </div>
      </button>

      <Badge
        variant={flow.isActive ? "default" : "secondary"}
        className="text-xs cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onToggleActive()
        }}
      >
        {flow.isActive ? "Active" : "Inactive"}
      </Badge>

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
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
