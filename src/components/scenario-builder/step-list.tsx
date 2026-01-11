"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  MapPin,
  GitBranch,
  LogOut,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UIStep } from "./types"
import { getStepDescription } from "./types"

interface StepListProps {
  steps: UIStep[]
  onStepsChange: (steps: UIStep[]) => void
  onEditStep: (step: UIStep, index: number) => void
  onDeleteStep: (index: number) => void
  onAddStep: (type: UIStep["type"]) => void
  elementLabels?: Map<string, string>
}

export function StepList({
  steps,
  onStepsChange,
  onEditStep,
  onDeleteStep,
  onAddStep,
  elementLabels,
}: StepListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)
      onStepsChange(arrayMove(steps, oldIndex, newIndex))
    }
  }

  const handleAddStepType = (type: UIStep["type"]) => {
    onAddStep(type)
    setShowAddDialog(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Steps</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            No steps yet. Add steps to define how items flow through locations.
          </p>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Step
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {steps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={() => onEditStep(step, index)}
                  onDelete={() => onDeleteStep(index)}
                  elementLabels={elementLabels}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Step Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
            <DialogDescription>
              What should happen at this step?
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <button
              className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
              onClick={() => handleAddStepType("location")}
            >
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Location</div>
                <div className="text-sm text-muted-foreground">
                  Go to a place in the warehouse and wait there
                </div>
              </div>
            </button>

            <button
              className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
              onClick={() => handleAddStepType("decision")}
            >
              <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Decision</div>
                <div className="text-sm text-muted-foreground">
                  Split the path based on a condition
                </div>
              </div>
            </button>

            <button
              className="flex items-start gap-4 rounded-lg border p-4 text-left hover:bg-accent transition-colors"
              onClick={() => handleAddStepType("exit")}
            >
              <div className="rounded-full bg-gray-100 p-2 text-gray-600">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Exit</div>
                <div className="text-sm text-muted-foreground">
                  End the flow - item leaves the simulation
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SortableStepItemProps {
  step: UIStep
  index: number
  onEdit: () => void
  onDelete: () => void
  elementLabels?: Map<string, string>
}

function SortableStepItem({
  step,
  index,
  onEdit,
  onDelete,
  elementLabels,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getStepIcon = () => {
    switch (step.type) {
      case "location":
        return <MapPin className="h-4 w-4" />
      case "decision":
        return <GitBranch className="h-4 w-4" />
      case "exit":
        return <LogOut className="h-4 w-4" />
    }
  }

  const getStepColor = () => {
    switch (step.type) {
      case "location":
        return "bg-blue-100 text-blue-600"
      case "decision":
        return "bg-amber-100 text-amber-600"
      case "exit":
        return "bg-gray-100 text-gray-600"
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-lg border bg-card p-3"
    >
      {/* Drag handle */}
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Step number */}
      <Badge variant="outline" className="shrink-0">
        {index + 1}
      </Badge>

      {/* Step icon */}
      <div className={`rounded-full p-1.5 ${getStepColor()}`}>
        {getStepIcon()}
      </div>

      {/* Step description */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {getStepDescription(step, elementLabels)}
        </div>
        {step.type === "location" && step.operation && (
          <div className="text-xs text-muted-foreground capitalize">
            {step.operation}
          </div>
        )}
        {step.type === "decision" && (step.truePath || step.falsePath) && (
          <div className="text-xs text-muted-foreground">
            {step.truePath && `Yes: Step ${step.truePath.slice(-5)}`}
            {step.truePath && step.falsePath && " | "}
            {step.falsePath && `No: Step ${step.falsePath.slice(-5)}`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
