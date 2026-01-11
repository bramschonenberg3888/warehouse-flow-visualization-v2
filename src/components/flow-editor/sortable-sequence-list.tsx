"use client"

import { useMemo } from "react"
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
import { GripVertical, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PlacedElement } from "@/server/db/schema"

interface SortableSequenceListProps {
  sequence: string[]
  placedElements: PlacedElement[] | undefined
  onSequenceChange: (sequence: string[]) => void
}

export function SortableSequenceList({
  sequence,
  placedElements,
  onSequenceChange,
}: SortableSequenceListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const elementMap = useMemo(() => {
    const map = new Map<string, PlacedElement>()
    if (placedElements) {
      for (const element of placedElements) {
        map.set(element.id, element)
      }
    }
    return map
  }, [placedElements])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sequence.indexOf(active.id as string)
      const newIndex = sequence.indexOf(over.id as string)
      onSequenceChange(arrayMove(sequence, oldIndex, newIndex))
    }
  }

  const handleRemove = (elementId: string) => {
    onSequenceChange(sequence.filter((id) => id !== elementId))
  }

  const handleClear = () => {
    onSequenceChange([])
  }

  if (sequence.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No elements selected yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click elements on the canvas to add them to the flow
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sequence.length} stop{sequence.length !== 1 ? "s" : ""}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Clear all
        </Button>
      </div>

      <ScrollArea className="max-h-[300px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sequence}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {sequence.map((elementId, index) => (
                <SortableItem
                  key={elementId}
                  id={elementId}
                  index={index}
                  element={elementMap.get(elementId)}
                  onRemove={() => handleRemove(elementId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      {sequence.length === 1 && (
        <p className="text-xs text-amber-600 text-center">
          Add at least one more element to create a flow
        </p>
      )}
    </div>
  )
}

interface SortableItemProps {
  id: string
  index: number
  element: PlacedElement | undefined
  onRemove: () => void
}

// Helper to get display label for sequence item
function getItemLabel(id: string, element: PlacedElement | undefined): string {
  // Check if this is a grid cell (format: "grid:{col}:{row}")
  if (id.startsWith("grid:")) {
    const parts = id.split(":")
    if (parts.length === 3) {
      return `Cell (${parts[1]}, ${parts[2]})`
    }
  }
  // Regular placed element
  return element?.label || "Unknown"
}

function isGridCell(id: string): boolean {
  return id.startsWith("grid:")
}

function SortableItem({ id, index, element, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded border bg-muted/50 px-2 py-1.5 ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
          isGridCell(id)
            ? "bg-blue-500 text-white"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {index + 1}
      </div>

      <span className="flex-1 truncate text-sm">
        {getItemLabel(id, element)}
      </span>

      <button
        onClick={onRemove}
        className="p-0.5 text-muted-foreground hover:text-destructive"
        title="Remove from flow"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
